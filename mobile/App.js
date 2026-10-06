import React from 'react';
import './src/utils/alertPolyfill';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';


import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import NotificationSocketBridge from './src/components/NotificationSocketBridge';
import { Colors } from './src/constants/theme';

// IMPORTANT: RootWrapper MUST be defined outside the App component.
// Defining a component inside a render function causes React to treat it as a
// new type on every render, unmounting and remounting the entire tree — which
// destroys input focus every time any state changes (e.g. Input focused state).
const WebWrapper = ({ children, style }) => <View style={style}>{children}</View>;
const GestureHandlerRootView = Platform.OS !== 'web'
  ? require('react-native-gesture-handler').GestureHandlerRootView
  : null;
const RootWrapper = Platform.OS === 'web' ? WebWrapper : GestureHandlerRootView;

// Inner component that can use context hooks
function AppInner() {
  const { user } = useAuth();
  usePushNotifications(user);

  return (
    <NotificationProvider>
      <SocketProvider enabled={!!user}>
        <NotificationSocketBridge />
        <AppNavigator />
      </SocketProvider>
    </NotificationProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.ink }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  // Inject global CSS for Web to eliminate default browser focus outline/rings completely
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const styleId = 'borrowhive-global-input-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        input, textarea, [contenteditable="true"] {
          outline: none !important;
          box-shadow: none !important;
        }
        input:focus, textarea:focus {
          outline: none !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  return (
    <RootWrapper style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </RootWrapper>
  );
}
