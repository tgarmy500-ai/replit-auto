const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('change_channel_id')
    .setDescription('Change the channel ID for a deal (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('New channel').setRequired(true)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    const dealId = interaction.options.getString('deal_id').toUpperCase();
    const channel = interaction.options.getChannel('channel');
    const deal = db.getDeal(dealId);
    if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
    db.updateDeal(dealId, { channel_id: channel.id });
    await interaction.reply({ embeds: [successEmbed('Channel Updated', `Deal **${dealId}** is now linked to <#${channel.id}>`)], ephemeral: true });
  },
};
