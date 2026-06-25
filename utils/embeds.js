const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { COLORS, CRYPTOCURRENCIES } = require('../config');

function mainEmbed() {
  return new EmbedBuilder()
    .setTitle('💎 SMMuggler MM & Escrow')
    .setDescription(
      '**SMMuggler Escrow** makes your cryptocurrency trades safe and easy.\nWe provide a secure environment for peer-to-peer deals, protecting you from fraud and scams.\n\n' +
      '## How this works?\n' +
      'Our automated system handles everything. Funds are only released when both parties are satisfied, ensuring a fair and reliable experience for every user.\n\n' +
      'Select an asset below to start your deal.\n\n' +
      '~ **SMMuggler MM & Escrow**'
    )
    .setColor(COLORS.PRIMARY)
    .setFooter({ text: 'SMMuggler Escrow • Secure P2P Trading' })
    .setTimestamp();
}

function currencySelectRow() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_currency')
    .setPlaceholder('Select The Cryptocurrency')
    .addOptions([
      { label: 'Litecoin (LTC)', value: 'LTC', emoji: '🔵', description: 'Fast and low-fee transactions' },
      { label: 'Solana (SOL)', value: 'SOL', emoji: '🟣', description: 'High-speed blockchain' },
      { label: 'Tether (USDT)', value: 'USDT', emoji: '💚', description: 'Stable USD-pegged (TRC20)' },
    ]);
  return new ActionRowBuilder().addComponents(select);
}

function dealInfoEmbed(deal, buyer, seller) {
  const coin = CRYPTOCURRENCIES[deal.currency];
  const statusEmojis = {
    pending_confirm: '⏳',
    confirmed: '✅',
    awaiting_payment: '💳',
    payment_received: '💰',
    awaiting_delivery: '📦',
    completed: '🎉',
    cancelled: '❌',
    refunded: '↩️',
  };
  const statusNames = {
    pending_confirm: 'Pending Confirmation',
    confirmed: 'Confirmed',
    awaiting_payment: 'Awaiting Payment',
    payment_received: 'Payment Received',
    awaiting_delivery: 'Awaiting Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  return new EmbedBuilder()
    .setTitle(`${statusEmojis[deal.status] || '📋'} Deal #${deal.deal_id}`)
    .setColor(coin?.color || COLORS.PRIMARY)
    .addFields(
      { name: '👤 Buyer', value: buyer ? `<@${buyer.id}> (${buyer.tag || buyer.username})` : `<@${deal.buyer_id}>`, inline: true },
      { name: '🏪 Seller', value: seller ? `<@${seller.id}> (${seller.tag || seller.username})` : `<@${deal.seller_id}>`, inline: true },
      { name: '💱 Currency', value: `${coin?.emoji || ''} **${deal.currency}**`, inline: true },
      { name: '💵 Amount (USD)', value: deal.amount_usd ? `$${deal.amount_usd.toFixed(2)}` : 'Not set', inline: true },
      { name: `🪙 Amount (${deal.currency})`, value: deal.amount_crypto ? `${deal.amount_crypto.toFixed(8)} ${deal.currency}` : 'Not set', inline: true },
      { name: '📦 Item', value: deal.item_name || 'Not specified', inline: true },
      { name: '📊 Status', value: `${statusEmojis[deal.status] || '❓'} ${statusNames[deal.status] || deal.status}`, inline: true },
      { name: '✅ Confirmations', value: `Buyer: ${deal.buyer_confirmed ? '✅' : '❌'} | Seller: ${deal.seller_confirmed ? '✅' : '❌'}`, inline: true },
    )
    .setFooter({ text: `Deal ID: ${deal.deal_id} • Created` })
    .setTimestamp(new Date(deal.created_at * 1000));
}

function paymentEmbed(deal, address) {
  const coin = CRYPTOCURRENCIES[deal.currency];
  return new EmbedBuilder()
    .setTitle('💳 Payment Required')
    .setColor(COLORS.WARNING)
    .setDescription(`Send exactly **${deal.amount_crypto?.toFixed(8)} ${deal.currency}** to the address below.\n\nThe bot will automatically detect your payment.`)
    .addFields(
      { name: '📬 Payment Address', value: `\`\`\`${address}\`\`\`` },
      { name: '💵 USD Amount', value: `$${deal.amount_usd?.toFixed(2)}`, inline: true },
      { name: `🪙 Crypto Amount`, value: `${deal.amount_crypto?.toFixed(8)} ${deal.currency}`, inline: true },
      { name: '⏰ Expires', value: `<t:${Math.floor(Date.now() / 1000) + 172800}:R>`, inline: true },
      { name: '⚠️ Important', value: '• Send the **exact** amount\n• Only send **' + deal.currency + '**\n• Do NOT close this channel\n• Payment monitoring is active' },
    )
    .setFooter({ text: 'SMMuggler Escrow • Payment Monitor Active 🟢' })
    .setTimestamp();
}

function confirmRow(deal_id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_buyer_${deal_id}`).setLabel('✅ Confirm Deal').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cancel_deal_${deal_id}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
  );
}

function dealActionRow(deal_id, locked = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`release_${deal_id}`).setLabel('✅ Release Funds').setStyle(ButtonStyle.Success).setDisabled(locked),
    new ButtonBuilder().setCustomId(`cancel_deal_${deal_id}`).setLabel('❌ Cancel Deal').setStyle(ButtonStyle.Danger).setDisabled(locked),
    new ButtonBuilder().setCustomId(`get_info_${deal_id}`).setLabel('ℹ️ Deal Info').setStyle(ButtonStyle.Secondary),
  );
}

function successEmbed(title, description) {
  return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(description).setColor(COLORS.SUCCESS).setTimestamp();
}

function errorEmbed(description) {
  return new EmbedBuilder().setTitle('❌ Error').setDescription(description).setColor(COLORS.DANGER).setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder().setTitle(`ℹ️ ${title}`).setDescription(description).setColor(COLORS.INFO).setTimestamp();
}

function paymentReceivedEmbed(deal, txHash) {
  return new EmbedBuilder()
    .setTitle('💰 Payment Received!')
    .setColor(COLORS.SUCCESS)
    .setDescription(`**${deal.amount_crypto?.toFixed(8)} ${deal.currency}** has been received and is held in escrow.\n\n**Seller:** Please deliver the item to the buyer.\n**Buyer:** Click **Release Funds** once you receive your item.`)
    .addFields(
      { name: '🔗 Transaction', value: txHash ? `\`${txHash}\`` : 'Confirmed', inline: false },
      { name: '📦 Next Steps', value: '1. Seller delivers the item\n2. Buyer verifies receipt\n3. Buyer clicks **Release Funds**\n4. Seller receives payment' },
    )
    .setFooter({ text: 'Funds are safely held in escrow' })
    .setTimestamp();
}

function helpEmbed() {
  return new EmbedBuilder()
    .setTitle('📚 SMMuggler Bot — Help Center')
    .setColor(COLORS.PRIMARY)
    .setDescription('All available commands and how to use them:')
    .addFields(
      { name: '💼 Deal Commands', value: '`/mm` — Start a new escrow deal\n`/get_deal_info` — View deal details\n`/close` — Close deal and save transcript\n`/add` — Add user to deal channel\n`/remove` — Remove user from deal channel' },
      { name: '💰 Finance Commands', value: '`/price [coin]` — Current crypto price\n`/calc [amount] [coin]` — USD ↔ Crypto conversion\n`/balance [address] [coin]` — Check wallet balance\n`/check_balance` — Check any address balance\n`/tx [hash] [coin]` — Transaction details\n`/list_transactions` — Recent transactions\n`/track-transaction` — Track a transaction' },
      { name: '📊 Stats Commands', value: '`/stats` — Your deal statistics\n`/leaderboard` — Top traders by volume\n`/streak` — Your deal streak\n`/list_coins` — Enabled currencies' },
      { name: '🔔 Alert Commands', value: '`/pricealert [coin] [price] [above/below]` — Set price alert\n`/alerts` — List your active alerts\n`/alertremove [id]` — Remove a price alert' },
      { name: '🔧 Utility Commands', value: '`/ping` — Bot health check\n`/help` — This help menu\n`/search` — Search address or transaction\n`/transcript` — Export channel transcript' },
      { name: '👑 Admin Commands', value: '`/force_cancel` — Force cancel deal\n`/force_release` — Force release funds\n`/send_funds` — Send from deal wallet\n`/blacklist user/address` — Manage blacklist\n`/change-buyer` / `/change-seller` — Swap parties\n`/mod_lock` / `/mod_unlock` — Lock/unlock deal buttons\n`/close_all` — Delete all deal channels\n`/admin_rescan` — Restart payment scan\n`/recover` — Recover deleted channel\n`/create_stats_channels` — Create stats VCs\n`/restart` — Restart the bot' },
    )
    .setFooter({ text: 'SMMuggler Escrow • Secure P2P Trading' })
    .setTimestamp();
}

module.exports = { mainEmbed, currencySelectRow, dealInfoEmbed, paymentEmbed, confirmRow, dealActionRow, successEmbed, errorEmbed, infoEmbed, paymentReceivedEmbed, helpEmbed };
