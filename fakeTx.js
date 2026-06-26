const { EmbedBuilder } = require('discord.js');
const db = require('./database');

let clientRef = null;

const BASE58 = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';

function randHex(len) {
  return [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randBase58(len) {
  return [...Array(len)].map(() => BASE58[Math.floor(Math.random() * BASE58.length)]).join('');
}

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function fakeAddress(currency) {
  if (currency === 'LTC') return 'L' + randBase58(33);
  if (currency === 'SOL') return randBase58(44);
  if (currency === 'USDT') return 'T' + randBase58(33);
}

function fakeTxHash(currency) {
  if (currency === 'SOL') return randBase58(88);
  return randHex(64);
}

function fakeDealId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const part1 = [...Array(3)].map(() => letters[Math.floor(Math.random() * 26)]).join('');
  const part2 = Math.floor(Math.random() * 9000 + 1000);
  return `DEAL-${part1}${part2}`;
}

function buildFakeEmbed() {
  const currencies = ['LTC', 'SOL', 'USDT'];
  const currency = currencies[Math.floor(Math.random() * currencies.length)];

  const usdAmount = parseFloat(randBetween(15, 750).toFixed(2));

  let cryptoAmount;
  if (currency === 'LTC')  cryptoAmount = (usdAmount / randBetween(78, 88)).toFixed(6);
  else if (currency === 'SOL') cryptoAmount = (usdAmount / randBetween(145, 165)).toFixed(4);
  else cryptoAmount = usdAmount.toFixed(2);

  const txHash = fakeTxHash(currency);
  const buyerAddr = fakeAddress(currency);
  const sellerAddr = fakeAddress(currency);
  const dealId = fakeDealId();

  const emoji  = { LTC: '🥈', SOL: '☀️', USDT: '💲' };
  const color  = { LTC: 0xA6A9AA, SOL: 0x9945FF, USDT: 0x26A17B };

  const shortHash = `${txHash.slice(0, 18)}...${txHash.slice(-8)}`;
  const shortBuyer  = `${buyerAddr.slice(0, 8)}...${buyerAddr.slice(-5)}`;
  const shortSeller = `${sellerAddr.slice(0, 8)}...${sellerAddr.slice(-5)}`;

  return new EmbedBuilder()
    .setTitle(`✅ Deal Completed — ${emoji[currency]} ${currency}`)
    .setColor(color[currency])
    .setDescription('A deal has been successfully completed and funds have been released to the seller.')
    .addFields(
      { name: '🆔 Deal ID',        value: dealId,                          inline: true  },
      { name: '💱 Currency',       value: `${emoji[currency]} **${currency}**`, inline: true },
      { name: '💵 USD Value',      value: `**$${usdAmount.toFixed(2)}**`,   inline: true  },
      { name: `🪙 Crypto Sent`,   value: `**${cryptoAmount} ${currency}**`,inline: true  },
      { name: '📤 From (Buyer)',   value: `\`${shortBuyer}\``,              inline: true  },
      { name: '📥 To (Seller)',    value: `\`${shortSeller}\``,             inline: true  },
      { name: '🔗 TX Hash',        value: `\`${shortHash}\``,               inline: false },
    )
    .setFooter({ text: 'Smuggler Auto MM • Transaction Verified ✅' })
    .setTimestamp();
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
