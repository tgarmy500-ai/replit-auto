const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alertremove')
    .setDescription('Remove an active price alert by ID')
    .addIntegerOption(o => o.setName('id').setDescription('Alert ID').setRequired(true)),

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const removed = db.removePriceAlert(id, interaction.user.id);
    if (removed) {
      await interaction.reply({ embeds: [successEmbed('Alert Removed', `Price alert #${id} has been removed.`)], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed(`Alert #${id} not found or does not belong to you.`)], ephemeral: true });
    }
  },
};
