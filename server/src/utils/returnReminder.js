const cron = require('node-cron');
const BorrowRequest = require('../models/BorrowRequest');
const User = require('../models/User');
const Listing = require('../models/Listing');
const { sendPushNotification } = require('./pushNotification');

/**
 * Runs every 15 minutes:
 *  1. Send return reminders 30 min before endTime (once)
 *  2. Mark overdue items
 */
const startReturnReminderCron = () => {
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);

    try {
      // Send reminders for items due within 30 min that haven't been reminded yet
      const soonDue = await BorrowRequest.find({
        status: { $in: ['ACCEPTED', 'BORROWED'] },
        endTime: { $lte: in30, $gte: now },
        returnReminderSent: false,
      }).populate('borrowerId').populate('listingId', 'title');

      for (const br of soonDue) {
        if (br.borrowerId?.pushToken) {
          await sendPushNotification({
            pushToken: br.borrowerId.pushToken,
            user: br.borrowerId,
            type: 'return_reminder',
            title: 'Return reminder 🕐',
            body: `${br.listingId?.title} is due back in ~30 minutes.`,
            data: { borrowRequestId: br._id },
          });
        }
        await BorrowRequest.findByIdAndUpdate(br._id, { returnReminderSent: true });
      }

      // Mark overdue
      await BorrowRequest.updateMany(
        { status: { $in: ['ACCEPTED', 'BORROWED'] }, endTime: { $lt: now } },
        { status: 'OVERDUE' }
      );
    } catch (err) {
      console.error('Cron error:', err.message);
    }
  });

  console.log('⏱  Return reminder cron started (every 15 min)');
};

module.exports = { startReturnReminderCron };
