const { getBalance, getTransactions, getCryptoPrice } = require('./wallets');
const db = require('./database');
const { PAYMENT_POLL_INTERVAL_MS, PRICE_ALERT_POLL_INTERVAL_MS } = require('./config');

let client = null;
const monitoredDeals = new Map();
const paymentTimers = new Map();
let priceAlertInterval = null;
let txTrackerInterval = null;

function setClient(c) { client = c; }

async function checkPayment(deal) {
  if (!deal.wallet_address || !deal.currency) return;
  try {
    const balance = await getBalance(deal.currency, deal.wallet_address);
    const required = deal.amount_crypto;
    if (!required) return;

    const received = balance.total;
    if (received >= required * 0.99) {
      return { paid: true, amount: received, balance };
    }
    return { paid: false, amount: received, balance };
  } catch (e) {
    console.error('Payment check error:', e.message);
    return { paid: false, amount: 0, balance: { confirmed: 0, unconfirmed: 0, total: 0 } };
  }
}

async function startMonitoring(deal_id) {
  if (paymentTimers.has(deal_id)) return;

  const runCheck = async () => {
    const deal = db.getDeal(deal_id);
    if (!deal || deal.payment_received || ['completed', 'cancelled', 'refunded'].includes(deal.status)) {
      stopMonitoring(deal_id);
      return;
    }

    const result = await checkPayment(deal);
    if (result?.paid) {
      stopMonitoring(deal_id);
      await handlePaymentReceived(deal);
    }
  };

  await runCheck();
  const timer = setInterval(runCheck, PAYMENT_POLL_INTERVAL_MS);
  paymentTimers.set(deal_id, timer);
  monitoredDeals.set(deal_id, true);
}

function stopMonitoring(deal_id) {
  const timer = paymentTimers.get(deal_id);
  if (timer) {
    clearInterval(timer);
    paymentTimers.delete(deal_id);
    monitoredDeals.delete(deal_id);
  }
}

async function handlePaymentReceived(deal) {
  if (!client) return;
  try {
    const txList = await getTransactions(deal.currency, deal.wallet_address);
    const latestTx = txList[0];

    db.updateDeal(deal.deal_id, {
      payment_received: 1,
      status: 'payment_received',
      payment_tx: latestTx?.hash || null,
    });

    if (latestTx?.hash) {
      db.saveTransaction({
        deal_id: deal.deal_id,
        tx_hash: latestTx.hash,
        currency: deal.currency,
        amount: latestTx.amount,
        from_address: 'external',
        to_address: deal.wallet_address,
        status: 'confirmed',
      });
    }

    const channel = await client.channels.fetch(deal.channel_id).catch(() => null);
    if (!channel) return;

    const { paymentReceivedEmbed, dealActionRow } = require('./utils/embeds');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    await channel.send({
      content: `<@${deal.buyer_id}> <@${deal.seller_id}>`,
      embeds: [paymentReceivedEmbed(deal, latestTx?.hash)],
      components: [dealActionRow(deal.deal_id, !!deal.buttons_locked)],
    });

    db.updateUserStats(deal.buyer_id, { total_deals: db.getUserStats(deal.buyer_id).total_deals });
    db.updateUserStats(deal.seller_id, { total_deals: db.getUserStats(deal.seller_id).total_deals });

  } catch (e) {
    console.error('Handle payment error:', e.message);
  }
}

async function startAllMonitors() {
  const deals = db.getAllActiveDeals();
  for (const deal of deals) {
    if (deal.status === 'awaiting_payment' && !deal.payment_received) {
      startMonitoring(deal.deal_id);
    }
  }
  console.log(`[Monitor] Resumed ${deals.filter(d => d.status === 'awaiting_payment').length} payment monitors`);
}

function startPriceAlertMonitor() {
  if (priceAlertInterval) clearInterval(priceAlertInterval);
  priceAlertInterval = setInterval(async () => {
    if (!client) return;
    try {
      const alerts = db.getAllActivePriceAlerts();
      for (const alert of alerts) {
        const { price } = await getCryptoPrice(alert.currency);
        if (!price) continue;
        const triggered = (alert.direction === 'above' && price >= alert.target_price) ||
                          (alert.direction === 'below' && price <= alert.target_price);
        if (triggered) {
          db.triggerPriceAlert(alert.id);
          const { EmbedBuilder } = require('discord.js');
          const { COLORS } = require('./config');
          const ch = await client.channels.fetch(alert.channel_id).catch(() => null);
          if (ch) {
            await ch.send({
              content: `<@${alert.user_id}>`,
              embeds: [new EmbedBuilder()
                .setTitle('🔔 Price Alert Triggered!')
                .setColor(COLORS.WARNING)
                .setDescription(`**${alert.currency}** is now **$${price.toFixed(4)}**\nYour alert: ${alert.direction === 'above' ? 'above' : 'below'} $${alert.target_price}`)
                .setTimestamp()
              ],
            });
          }
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) { console.error('Price alert error:', e.message); }
  }, PRICE_ALERT_POLL_INTERVAL_MS);
}

function startTxTracker() {
  if (txTrackerInterval) clearInterval(txTrackerInterval);
  txTrackerInterval = setInterval(async () => {
    if (!client) return;
    try {
      const tracked = db.getTrackedTxs();
      for (const t of tracked) {
        const { getTxDetails } = require('./wallets');
        const details = await getTxDetails(t.currency, t.tx_hash);
        if (details && details.confirmations >= 1) {
          const { EmbedBuilder } = require('discord.js');
          const { COLORS } = require('./config');
          const ch = await client.channels.fetch(t.channel_id).catch(() => null);
          if (ch) {
            await ch.send({
              content: `<@${t.user_id}>`,
              embeds: [new EmbedBuilder()
                .setTitle('✅ Transaction Confirmed!')
                .setColor(COLORS.SUCCESS)
                .setDescription(`Transaction \`${t.tx_hash.substring(0, 20)}...\` has been confirmed!\n**Confirmations:** ${details.confirmations}`)
                .setTimestamp()
              ],
            });
          }
          db.removeTrackedTx(t.id);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) { console.error('TX tracker error:', e.message); }
  }, 60000);
}

module.exports = { setClient, startMonitoring, stopMonitoring, startAllMonitors, startPriceAlertMonitor, startTxTracker, checkPayment, monitoredDeals };
