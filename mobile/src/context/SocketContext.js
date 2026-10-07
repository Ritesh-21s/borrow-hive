import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { storage } from '../utils/storage';
import { API_URL } from '../constants/config';

const SocketContext = createContext(null);

// Strip /api suffix for socket URL
const SOCKET_URL = API_URL.replace('/api', '');

export const SocketProvider = ({ children, enabled }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let socket;
    const connect = async () => {
      try {
        const token = await storage.getItem('authToken');
        if (!token) return;

        socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
          setConnected(true);
          console.log('🔌 Socket connected');
        });

        socket.on('disconnect', () => {
          setConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.log('Socket error:', err.message);
        });

        socketRef.current = socket;
      } catch (err) {
        console.error('Socket setup error:', err);
      }
    };

    connect();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  // CRITICAL FIX: All functions MUST be wrapped in useCallback with empty deps [].
  // Without this, every time `connected` state toggles (socket connect/reconnect),
  // SocketProvider re-renders and creates NEW function references. Any component that
  // has these functions in a useEffect dep array (e.g. NotificationSocketBridge) will
  // re-run its effect, calling setUnreadCount, which re-renders NotificationContext,
  // which re-renders every screen — destroying input focus on each keystroke or connection event.
  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('join_conversation', conversationId);
  }, []);

  const sendMessage = useCallback((conversationId, text) => {
    socketRef.current?.emit('send_message', { conversationId, text });
  }, []);

  const sendImageMessage = useCallback((conversationId, image, text = '') => {
    socketRef.current?.emit('send_message', { conversationId, text, image });
  }, []);

  const emitTyping = useCallback((conversationId, isTyping) => {
    socketRef.current?.emit('typing', { conversationId, isTyping });
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, joinConversation, sendMessage, sendImageMessage, emitTyping, on, off, socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
