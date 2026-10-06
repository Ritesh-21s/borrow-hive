import { useEffect } from 'react';
import { Platform } from 'react-native';
import { userAPI } from '../api';

// expo-notifications is not supported on web — guard all calls
let Notifications, Device;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Registers device for push notifications and syncs token to server.
 * Call this once after user is authenticated.
 */
export const usePushNotifications = (user) => {
  useEffect(() => {
    if (!user) return;
    registerForPush();
  }, [user?._id]);
};

const registerForPush = async () => {
  try {
    if (Platform.OS === 'web') return; // Push not supported on web
    if (!Device.isDevice) return; // Expo Go simulator won't get real tokens

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied.');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'borrowhive', // replace with your Expo project ID
    });

    const pushToken = tokenData.data;
    await userAPI.updatePushToken(pushToken);
    console.log('Push token registered:', pushToken);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BorrowHive',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F0A93A',
      });
    }
  } catch (err) {
    console.error('Push registration error:', err.message);
  }
};
