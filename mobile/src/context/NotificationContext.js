import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notificationAPI } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({ unreadCount: 0, refresh: () => {}, setUnreadCount: () => {} });

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // CRITICAL FIX: use user?._id (a stable string) instead of the entire `user` object.
  // The `user` object reference changes on every AuthContext re-render even if the
  // underlying data is the same. Using `user?._id` as the dep keeps `refresh` stable,
  // which prevents the setInterval from being torn down and re-created on every render,
  // which would spam setUnreadCount calls and cause re-renders that destroy input focus.
  const userId = user?._id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await notificationAPI.getNotifications();
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch (_) {}
  }, [userId]);

  // Poll every 60 seconds as fallback
  useEffect(() => {
    if (!userId) return;
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [userId, refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
