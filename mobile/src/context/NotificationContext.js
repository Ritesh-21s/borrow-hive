import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notificationAPI } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({ unreadCount: 0, refresh: () => {}, setUnreadCount: () => {} });

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // We store a socket listener ref separately to avoid circular dep with SocketContext
  // (SocketContext is a child of NotificationProvider, so we can't use useSocket here).
  // Instead we subscribe directly to the underlying socket via a callback set from outside.
  const [socketListenerSetter, setSocketListenerSetter] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getNotifications();
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch (_) {}
  }, [user]);

  // Poll every 60 seconds as fallback
  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refresh, socketListenerSetter, setSocketListenerSetter }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
