const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS } = require('../../config');
const { stopMonitoring } = require('../../monitor');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force_cancel')
    .setDescription('Force cancel a deal and issue a refund (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (blank = current channel)').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason for cancellation').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });

    await interaction.deferReply();
    const dealId = interaction.options.getString('deal_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deal = dealId ? db.getDeal(dealId.toUpperCase()) : db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.editReply({ embeds: [errorEmbed('Deal not found.')] });

    stopMonitoring(deal.deal_id);
    db.updateDeal(deal.deal_id, { status: 'cancelled', closed_at: Math.floor(Date.now() / 1000) });

    const embed = new EmbedBuilder()
      .setTitle('🚫 Deal Force Cancelled')
      .setColor(COLORS.DANGER)
      .addFields(
        { name: '🆔 Deal ID', value: deal.deal_id, inline: true },
        { name: '❓ Reason', value: reason, inline: true },
        { name: '👤 Cancelled By', value: `<@${interaction.user.id}>`, inline: true },
        { name: '💳 Refund', value: deal.payment_received ? `⚠️ Payment was received. Manually send **${deal.amount_crypto?.toFixed(8)} ${deal.currency}** back to buyer.` : '✅ No payment was made.' },
      )
      .setTimestamp();

    await interaction.editReply({ content: `<@${deal.buyer_id}> <@${deal.seller_id}>`, embeds: [embed] });
  },
};
