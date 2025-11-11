const cron = require("node-cron");
const Request = require("../models/Request");

function scheduleReminder(requestId, eta) {
  let hours = parseInt(eta);
  const reminderTime = hours - 1; // remind 1 hour before ETA

  // Example: run every minute (for demo), ideally use setTimeout or a queue
  cron.schedule(`0 */${reminderTime} * * *`, async () => {
    const req = await Request.findById(requestId);
    if (req && req.vendorStatus === "awaiting_vendor") {
      console.log(`⏰ Reminder: Vendor ETA approaching for request ${req._id}`);
      // Optionally notify user via email or push
    }
  });
}

module.exports = { scheduleReminder };
