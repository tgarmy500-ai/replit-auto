const { EmbedBuilder } = require('discord.js');
const db = require('./database');

let clientRef = null;

const BASE58 = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
const HEX    = '0123456789abcdef';

function rand(chars, len) {
  return [...Array(len)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function fakeTxId(currency) {
  if (currency === 'SOL')  return rand(BASE58, 88);
  if (currency === 'USDT') return '0x' + rand(HEX, 64);
  return rand(HEX, 64);
}

function shortTxId(txId) {
  return `${txId.slice(0, 10)}...${txId.slice(-10)}`;
}

function buildFakeEmbed() {
  const currencies = ['LTC', 'SOL', 'USDT'];
  const currency   = currencies[Math.floor(Math.random() * currencies.length)];

  const usdAmount = parseFloat(randBetween(1, 100).toFixed(2));

  let cryptoAmount, displayAmount;
  if (currency === 'LTC') {
    const ltcPrice  = parseFloat(randBetween(78, 88).toFixed(2));
    cryptoAmount    = (usdAmount / ltcPrice).toFixed(8);
    displayAmount   = `**${cryptoAmount} LTC** ($${usdAmount.toFixed(2)} USD)`;
  } else if (currency === 'SOL') {
    const solPrice  = parseFloat(randBetween(145, 165).toFixed(2));
    cryptoAmount    = (usdAmount / solPrice).toFixed(6);
    displayAmount   = `**${cryptoAmount} SOL** ($${usdAmount.toFixed(2)} USD)`;
  } else {
    cryptoAmount    = parseFloat(randBetween(usdAmount * 0.997, usdAmount * 1.003).toFixed(2));
    displayAmount   = `**${cryptoAmount} USDT** ($${usdAmount.toFixed(2)} USD)`;
  }

  const txId = fakeTxId(currency);
  const shortId = shortTxId(txId);

  const emoji = { LTC: '🥈', SOL: '☀️', USDT: '💲' };
  const color = { LTC: 0xA6A9AA, SOL: 0x9945FF, USDT: 0x26A17B };

  return new EmbedBuilder()
    .setTitle(`${emoji[currency]} • Trade Completed`)
    .setColor(color[currency])
    .setDescription(displayAmount)
    .addFields(
      { name: 'Sender',         value: 'Anonymous', inline: false },
      { name: 'Receiver',       value: 'Anonymous', inline: false },
      { name: 'Transaction ID', value: `\`${shortId}\``, inline: false },
    );
}

async function postFakeTx() {
  try {
    if (!clientRef) return;
    const channelId = db.getSetting('fake_completed_channel_id');
    if (!channelId) return;
    const channel = await clientRef.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    await channel.send({ embeds: [buildFakeEmbed()] });
  } catch (e) {
    console.warn('⚠️  Fake tx post failed:', e.message);
  }
}

function startFakeTxPoster(client) {
  clientRef = client;

  const channelId = db.getSetting('fake_completed_channel_id');
  if (!channelId) {
    console.log('ℹ️  Fake tx poster: no channel set. Use /setfeedchannel to enable.');
    return;
  }

  function scheduleNext() {
    const mins = Math.floor(Math.random() * 31) + 30;
    setTimeout(async () => {
      await postFakeTx();
      scheduleNext();
    }, mins * 60 * 1000);
  }

  scheduleNext();
  console.log('📊 Fake completed tx poster started (30–60 min random interval)');
}

module.exports = { startFakeTxPoster };
