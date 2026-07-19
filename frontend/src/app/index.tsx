import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../utils/authStore';

export default function Index() {
  const { loading } = useSession();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#9EB36D" />
      </View>
    );
  }

  // Siempre redirige a /bienvenida en el arranque inicial de la app
  return <Redirect href="/bienvenida" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
