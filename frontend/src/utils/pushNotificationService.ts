import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { authStore } from './authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const isExpoGo = Constants.appOwnership === 'expo';
let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Configurar cómo se comportan las notificaciones al llegar con la app abierta en primer plano
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('Error cargando expo-notifications:', error);
  }
}

/**
 * Solicita permisos de notificación al dispositivo, obtiene el token de push de Expo,
 * y lo envía al backend si el usuario está autenticado.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) {
    console.log('Aviso: Ejecutando en web o Expo Go. Las notificaciones push están deshabilitadas.');
    return null;
  }

  // Si estamos en Android, configurar el canal predeterminado con sonido y prioridad alta
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3A9E6D',
    });
  }

  if (!Device.isDevice) {
    console.log('Aviso: Ejecutando en emulador/simulador. Las notificaciones push requieren dispositivo físico para recibirse de forma remota.');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permiso de notificaciones no concedido.');
    return null;
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    let tokenData;
    try {
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
    } catch (tokenErr) {
      console.log('Aviso: No se pudo obtener el token de notificaciones push (es normal si corres localmente o en un emulador sin projectId/EAS configurado).');
      return null;
    }
    const token = tokenData.data;

    // Enviar el token al backend si el usuario está autenticado
    const { token: userToken } = await authStore.getSession();
    if (userToken && token) {
      try {
        await fetch(`${API_URL}/api/v1/notifications/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
          },
          body: JSON.stringify({ push_token: token }),
        });
      } catch (err) {
        console.warn('No se pudo enviar el token de push al servidor:', err);
      }
    }

    return token;
  } catch (error) {
    console.warn('Error obteniendo token de notificaciones push:', error);
    return null;
  }
}
