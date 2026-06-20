-- Permitir inserts solo a usuarios autenticados con su propio user_id
CREATE POLICY "Usuarios autenticados pueden insertar sus contribuciones"
ON investigation_contributions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permitir selects a todos (para el feed público)
CREATE POLICY "Todos pueden ver contribuciones"
ON investigation_contributions FOR SELECT
TO public
USING (true);

-- (Opcional) Restringir updates solo al especialista (para validación)
-- Esto se podría habilitar más adelante para la semana 3
