const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_lock')
    .setDescription('Lock Release/Cancel buttons for a deal (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (blank = current channel)').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    const deal = interaction.options.getString('deal_id') ? db.getDeal(interaction.options.getString('deal_id').toUpperCase()) : db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
    db.updateDeal(deal.deal_id, { buttons_locked: 1 });
    await interaction.reply({ embeds: [successEmbed('Deal Locked', `Release/Cancel buttons for **${deal.deal_id}** are now locked. Use \`/mod_unlock\` to re-enable.`)] });
  },
};
