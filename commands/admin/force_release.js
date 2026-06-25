const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS } = require('../../config');
const { stopMonitoring } = require('../../monitor');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force_release')
    .setDescription('Force release funds to the seller (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (blank = current channel)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });

    await interaction.deferReply();
    const dealId = interaction.options.getString('deal_id');
    const reason = interaction.options.getString('reason') || 'Admin decision';
    const deal = dealId ? db.getDeal(dealId.toUpperCase()) : db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.editReply({ embeds: [errorEmbed('Deal not found.')] });

    stopMonitoring(deal.deal_id);
    db.updateDeal(deal.deal_id, { status: 'completed', funds_released: 1, closed_at: Math.floor(Date.now() / 1000) });

    const buyerStats = db.getUserStats(deal.buyer_id);
    const sellerStats = db.getUserStats(deal.seller_id);
    db.updateUserStats(deal.buyer_id, { completed_deals: buyerStats.completed_deals + 1, total_volume_usd: (buyerStats.total_volume_usd || 0) + (deal.amount_usd || 0), last_deal_at: Math.floor(Date.now() / 1000) });
    db.updateUserStats(deal.seller_id, { completed_deals: sellerStats.completed_deals + 1, total_volume_usd: (sellerStats.total_volume_usd || 0) + (deal.amount_usd || 0), last_deal_at: Math.floor(Date.now() / 1000) });

    const embed = new EmbedBuilder()
      .setTitle('✅ Funds Force Released')
      .setColor(COLORS.SUCCESS)
      .addFields(
        { name: '🆔 Deal', value: deal.deal_id, inline: true },
        { name: '💰 Amount', value: `${deal.amount_crypto?.toFixed(8)} ${deal.currency}`, inline: true },
        { name: '🏪 Seller', value: `<@${deal.seller_id}>`, inline: true },
        { name: '❓ Reason', value: reason },
        { name: '⚠️ Action Required', value: `Owner must manually send **${deal.amount_crypto?.toFixed(8)} ${deal.currency}** from the deal wallet to seller's address.` },
      )
      .setTimestamp();

    await interaction.editReply({ content: `<@${deal.buyer_id}> <@${deal.seller_id}>`, embeds: [embed] });
  },
};
