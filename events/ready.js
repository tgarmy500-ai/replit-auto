const { Events, ActivityType } = require('discord.js');
const https = require('https');
const { startAllMonitors, startPriceAlertMonitor, startTxTracker, setClient } = require('../monitor');
const { GUILD_ID } = require('../config');
const db = require('../database');
const emojiCache = require('../emojiCache');

const CRYPTO_LOGOS = {
  LTC:  'https://assets.coingecko.com/coins/images/2/thumb/litecoin.png',
  SOL:  'https://assets.coingecko.com/coins/images/4128/thumb/solana.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png',
};

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function setupCryptoEmojis(client) {
  try {
    const guild = client.guilds.cache.get(GUILD_ID) || client.guilds.cache.first();
    if (!guild) return;

    const existingEmojis = await guild.emojis.fetch();

    for (const [currency, logoUrl] of Object.entries(CRYPTO_LOGOS)) {
      const dbKey = `emoji_id_${currency}`;
      const savedId = db.getSetting(dbKey);

      if (savedId) {
        const existing = existingEmojis.get(savedId);
        if (existing) {
          emojiCache.set(currency, { id: existing.id, name: existing.name });
          console.log(`✅ Emoji loaded: ${currency} → <:${existing.name}:${existing.id}>`);
          continue;
        }
      }

      const emojiName = existingEmojis.find(e => e.name === `crypto_${currency.toLowerCase()}`);
      if (emojiName) {
        emojiCache.set(currency, { id: emojiName.id, name: emojiName.name });
        db.setSetting(dbKey, emojiName.id);
        console.log(`✅ Emoji found: ${currency} → <:${emojiName.name}:${emojiName.id}>`);
        continue;
      }

      try {
        console.log(`⬆️  Uploading ${currency} logo...`);
        const imgBuffer = await downloadImage(logoUrl);
        const base64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
        const created = await guild.emojis.create({
          attachment: base64,
          name: `crypto_${currency.toLowerCase()}`,
        });
        emojiCache.set(currency, { id: created.id, name: created.name });
        db.setSetting(dbKey, created.id);
        console.log(`✅ Emoji uploaded: ${currency} → <:${created.name}:${created.id}>`);
      } catch (e) {
        console.warn(`⚠️  Could not upload ${currency} emoji: ${e.message} — using default`);
      }
    }
  } catch (e) {
    console.warn('⚠️  Emoji setup skipped:', e.message);
  }
}

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
    await setupCryptoEmojis(client);

    setInterval(() => {
      client.user.setPresence({
        activities: [{ name: 'smmuggler slots', type: ActivityType.Watching }],
        status: 'online',
      });
    }, 60 * 60 * 1000);

    console.log('🟢 All monitors started. Bot is ready!\n');
  },
};
