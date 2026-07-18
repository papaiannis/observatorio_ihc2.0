import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"         options={{ animation: 'fade' }} />
      <Stack.Screen name="bienvenida"    options={{ animation: 'fade' }} />
      <Stack.Screen name="login"         options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="registro"      options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding"    options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="observatorio"  options={{ animation: 'fade' }} />
      <Stack.Screen name="welcome"       options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
