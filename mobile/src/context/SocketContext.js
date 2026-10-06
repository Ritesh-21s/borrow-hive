import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

  const joinConversation = (conversationId) => {
    socketRef.current?.emit('join_conversation', conversationId);
  };

  const sendMessage = (conversationId, text) => {
    socketRef.current?.emit('send_message', { conversationId, text });
  };

  const sendImageMessage = (conversationId, image, text = '') => {
    socketRef.current?.emit('send_message', { conversationId, text, image });
  };

  const emitTyping = (conversationId, isTyping) => {
    socketRef.current?.emit('typing', { conversationId, isTyping });
  };

  const on = (event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  };

  const off = (event, handler) => socketRef.current?.off(event, handler);

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
