const { SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../../config');
const { startMonitoring, stopMonitoring } = require('../../monitor');
const db = require('../../database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_rescan')
    .setDescription('Force restart payment monitoring for a deal (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (blank = all active deals)').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const dealId = interaction.options.getString('deal_id');
    if (dealId) {
      const deal = db.getDeal(dealId.toUpperCase());
      if (!deal) return interaction.editReply({ embeds: [errorEmbed('Deal not found.')] });
      stopMonitoring(deal.deal_id);
      await startMonitoring(deal.deal_id);
      await interaction.editReply({ embeds: [successEmbed('Rescan Started', `Payment monitoring restarted for **${deal.deal_id}**`)] });
    } else {
      const deals = db.getAllActiveDeals().filter(d => d.status === 'awaiting_payment' && !d.payment_received);
      for (const d of deals) {
        stopMonitoring(d.deal_id);
        startMonitoring(d.deal_id);
      }
      await interaction.editReply({ embeds: [successEmbed('Rescan Started', `Restarted payment monitoring for **${deals.length}** active deals.`)] });
    }
  },
};
