const cron = require('node-cron');
const Favor = require('../models/Favor');
const { sendPushNotification } = require('./pushNotification');

/**
 * Runs every hour:
 *  1. Auto-cancel favors whose deadline has passed and are still 'open' or 'accepted'
 *  2. Notify the requester (and helper if accepted) of the expiry
 */
const startFavorExpiryCheck = () => {
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    try {
      const expiredFavors = await Favor.find({
        status: { $in: ['open', 'accepted'] },
        deadline: { $lt: now },
      })
        .populate('requesterId', 'name pushToken communityId')
        .populate('helperId', 'name pushToken communityId');

      for (const favor of expiredFavors) {
        favor.status = 'cancelled';
        await favor.save();

        // Notify requester
        if (favor.requesterId) {
          await sendPushNotification({
            pushToken: favor.requesterId.pushToken,
            user: favor.requesterId,
            type: 'favor_completed',
            title: 'Favor expired',
            body: `Your favor "${favor.title}" has expired past its deadline and was auto-cancelled.`,
            data: { favorId: favor._id },
          });
        }

        // Notify helper if one was assigned
        if (favor.helperId) {
          await sendPushNotification({
            pushToken: favor.helperId.pushToken,
            user: favor.helperId,
            type: 'favor_completed',
            title: 'Favor expired',
            body: `The favor "${favor.title}" you accepted has expired past its deadline.`,
            data: { favorId: favor._id },
          });
        }
      }

      if (expiredFavors.length > 0) {
        console.log(`[FavorExpiry] Auto-cancelled ${expiredFavors.length} expired favor(s).`);
      }
    } catch (err) {
      console.error('[FavorExpiry] Cron error:', err.message);
    }
  });

  console.log('⏱  Favor expiry cron started (every hour)');
};

module.exports = { startFavorExpiryCheck };
