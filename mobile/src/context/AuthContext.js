import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: try to restore session from secure store
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedToken = await storage.getItem('authToken');
        if (savedToken) {
          setToken(savedToken);
          const res = await authAPI.getMe();
          setUser(res.data.data.user);
          setCommunity(res.data.data.community);
        }
      } catch (_) {
        // Token invalid or expired — clear it
        await storage.removeItem('authToken');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser, community: newCommunity } = res.data.data;
    await storage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(newUser);
    setCommunity(newCommunity);
    return { user: newUser, community: newCommunity };
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: newUser, community: newCommunity } = res.data.data;
    await storage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(newUser);
    setCommunity(newCommunity);
    return { user: newUser, community: newCommunity };
  }, []);

  const logout = useCallback(async () => {
    await storage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setCommunity(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.data.user);
      setCommunity(res.data.data.community);
    } catch (_) {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, community, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
