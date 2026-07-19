-- 1. Habilitar RLS en sightings (y crear tabla si no existe)
CREATE TABLE IF NOT EXISTS sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  preliminary_species TEXT,
  validated_species_id UUID REFERENCES species(id) ON DELETE SET NULL,
  observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decimal_latitude DOUBLE PRECISION,
  decimal_longitude DOUBLE PRECISION,
  geom GEOGRAPHY(Point, 4326),
  gps_accuracy DOUBLE PRECISION,
  metadata_edited BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'in_review')),
  expert_comment TEXT,
  expert_rating INTEGER CHECK (expert_rating >= 1 AND expert_rating <= 5),
  rated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

-- Políticas para sightings
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sightings" ON sightings;
CREATE POLICY "Usuarios autenticados pueden insertar sightings"
ON sightings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cualquiera puede ver sightings (público)" ON sightings;
CREATE POLICY "Cualquiera puede ver sightings (público)"
ON sightings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Solo especialistas pueden actualizar sightings" ON sightings;
CREATE POLICY "Solo especialistas pueden actualizar sightings"
ON sightings FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Especialista')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Especialista')
);

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios sightings" ON sightings;
CREATE POLICY "Usuarios pueden eliminar sus propios sightings"
ON sightings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_sightings_status ON sightings(status);
CREATE INDEX IF NOT EXISTS idx_sightings_user_id ON sightings(user_id);
CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON sightings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sightings_geom ON sightings USING GIST(geom);

-- Asegurarse de que curation_logs acepte sighting_id
-- (Asumiendo que curation_logs ya tiene esta columna o necesita ser agregada)
ALTER TABLE curation_logs ADD COLUMN IF NOT EXISTS sighting_id UUID REFERENCES sightings(id) ON DELETE CASCADE;

-- 3. Crear trigger para logs y notificaciones en sightings
CREATE OR REPLACE FUNCTION handle_sighting_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en curation_logs
  INSERT INTO curation_logs (
    sighting_id, specialist_id, previous_status, new_status, action_type, notes, created_at
  ) VALUES (
    NEW.id,
    auth.uid(),
    OLD.status,
    NEW.status,
    'validation',
    COALESCE(NEW.expert_comment, ''),
    NOW()
  );

  -- Insertar notificación para el dueño
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, sighting_id, is_read, created_at)
    VALUES (
      NEW.user_id,
      'Estado de tu avistamiento actualizado',
      'Tu avistamiento "' || COALESCE(NEW.preliminary_species, 'Sin especie') || '" cambió a: ' || NEW.status,
      NEW.id,
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sighting_status_change ON sightings;
CREATE TRIGGER trg_sighting_status_change
AFTER UPDATE ON sightings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION handle_sighting_status_change();
