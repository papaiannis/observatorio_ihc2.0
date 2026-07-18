import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../utils/authStore';

/**
 * Punto de entrada de la app.
 * - Si hay sesión activa  → va directo al observatorio.
 * - Si no hay sesión      → va a la pantalla de bienvenida (login/registro/invitado).
 * - Mientras carga        → muestra un spinner neutral.
 */
export default function Index() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#9EB36D" />
      </View>
    );
  }

  return <Redirect href={user ? '/observatorio' : '/bienvenida'} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
