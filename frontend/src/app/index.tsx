import { Redirect } from 'expo-router';

// El punto de entrada de la app redirige a la pantalla de bienvenida
export default function Index() {
  return <Redirect href="/bienvenida" />;
}
