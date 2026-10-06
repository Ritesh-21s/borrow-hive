const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification');
const { getIo } = require('./ioInstance');

const expo = new Expo();

/**
 * Send a push notification, persist it to DB, and emit a real-time socket event.
 * @param {Object} params
 * @param {string} params.pushToken   - Expo push token for device
 * @param {Object} params.user        - User document (for DB record)
 * @param {string} params.type        - Notification type key
 * @param {string} params.title
 * @param {string} params.body
 * @param {Object} params.data        - Extra payload for deep-linking
 */
const sendPushNotification = async ({ pushToken, user, type, title, body, data = {} }) => {
  let saved;

  // Always persist notification in DB
  try {
    saved = await Notification.create({
      userId: user._id,
      communityId: user.communityId,
      type,
      title,
      body,
      data,
    });
  } catch (err) {
    console.error('Failed to save notification:', err.message);
  }

  // Emit real-time in-app event to the user's personal socket room
  try {
    const io = getIo();
    if (io && saved) {
      io.to(`user:${user._id.toString()}`).emit('notification', {
        notification: saved,
        unreadDelta: 1,
      });
    }
  } catch (err) {
    console.error('Socket notification emit error:', err.message);
  }

  // Send push only when token is valid
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

module.exports = { sendPushNotification };
