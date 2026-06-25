const { SlashCommandBuilder } = require('discord.js');
const { helpEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Open the interactive help dashboard'),
  async execute(interaction) {
    await interaction.reply({ embeds: [helpEmbed()], ephemeral: true });
  },
};
