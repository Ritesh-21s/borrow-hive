const cron = require('node-cron');
const Ride = require('../models/Ride');
const RideRequest = require('../models/RideRequest');
const { sendPushNotification } = require('./pushNotification');

/**
 * Runs every 15 minutes:
 *  1. Send 1-hour pre-departure reminder to driver + accepted passengers
 *  2. Send 15-minute pre-departure reminder
 */
const startRideReminderCron = () => {
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 60 * 1000);
    const in75 = new Date(now.getTime() + 75 * 60 * 1000);
    const in15 = new Date(now.getTime() + 15 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);

    try {
      // 1-hour reminder (between 60 and 75 minutes from now)
      const hourReminders = await Ride.find({
        status: { $in: ['active', 'full'] },
        departureTime: { $gte: in60, $lte: in75 },
        hourReminderSent: { $ne: true },
      }).populate('driverId', 'name pushToken');

      for (const ride of hourReminders) {
        // Notify driver
        if (ride.driverId) {
          await sendPushNotification({
            pushToken: ride.driverId.pushToken,
            user: ride.driverId,
            type: 'ride_published',
            title: 'Your ride departs in 1 hour 🚗',
            body: `${ride.from} → ${ride.to} departs soon. Check your passenger list.`,
            data: { rideId: ride._id },
          });
        }
        // Notify accepted passengers
        const accepted = await RideRequest.find({ rideId: ride._id, status: 'ACCEPTED' })
          .populate('requesterId', 'name pushToken');
        for (const rr of accepted) {
          if (rr.requesterId) {
            await sendPushNotification({
              pushToken: rr.requesterId.pushToken,
              user: rr.requesterId,
              type: 'ride_accepted',
              title: 'Your ride departs in 1 hour 🚗',
              body: `${ride.from} → ${ride.to} is leaving soon. Be ready!`,
              data: { rideId: ride._id },
            });
          }
        }
        await Ride.findByIdAndUpdate(ride._id, { hourReminderSent: true });
      }

      // 15-minute reminder
      const fifteenReminders = await Ride.find({
        status: { $in: ['active', 'full'] },
        departureTime: { $gte: in15, $lte: in30 },
        fifteenReminderSent: { $ne: true },
      }).populate('driverId', 'name pushToken');

      for (const ride of fifteenReminders) {
        if (ride.driverId) {
          await sendPushNotification({
            pushToken: ride.driverId.pushToken,
            user: ride.driverId,
            type: 'ride_published',
            title: 'Departing in 15 minutes! 🚗',
            body: `Your ride to ${ride.to} is almost time.`,
            data: { rideId: ride._id },
          });
        }
        const accepted = await RideRequest.find({ rideId: ride._id, status: 'ACCEPTED' })
          .populate('requesterId', 'name pushToken');
        for (const rr of accepted) {
          if (rr.requesterId) {
            await sendPushNotification({
              pushToken: rr.requesterId.pushToken,
              user: rr.requesterId,
              type: 'ride_accepted',
              title: 'Departing in 15 minutes! 🚗',
              body: `Your ride to ${ride.to} leaves very soon!`,
              data: { rideId: ride._id },
            });
          }
        }
        await Ride.findByIdAndUpdate(ride._id, { fifteenReminderSent: true });
      }
    } catch (err) {
      console.error('[RideReminder] Cron error:', err.message);
    }
  });

  console.log('⏱  Ride reminder cron started (every 15 min)');
};

module.exports = { startRideReminderCron };
