import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';

/**
 * Invisible component that bridges the socket 'notification' event
 * to the NotificationContext badge counter.
 * Must be rendered inside both SocketProvider and NotificationProvider.
 */
export default function NotificationSocketBridge() {
  const { on } = useSocket();
  const { setUnreadCount } = useNotifications();

  useEffect(() => {
    const unsub = on('notification', ({ unreadDelta }) => {
      if (unreadDelta) {
        setUnreadCount((prev) => prev + unreadDelta);
      }
    });
    return unsub;
  }, [on, setUnreadCount]);

  return null;
}
