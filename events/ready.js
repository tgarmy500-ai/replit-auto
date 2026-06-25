const { Events, ActivityType } = require('discord.js');
const { startAllMonitors, startPriceAlertMonitor, startTxTracker, setClient } = require('../monitor');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`🤖 Bot ID: ${client.user.id}\n`);

    setClient(client);

    client.user.setPresence({
      activities: [{ name: 'smmuggler slots', type: ActivityType.Watching }],
      status: 'online',
    });

    await startAllMonitors();
    startPriceAlertMonitor();
    startTxTracker();

    setInterval(() => {
      client.user.setPresence({
        activities: [{ name: 'smmuggler slots', type: ActivityType.Watching }],
        status: 'online',
      });
    }, 60 * 60 * 1000);

    console.log('🟢 All monitors started. Bot is ready!\n');
  },
};
