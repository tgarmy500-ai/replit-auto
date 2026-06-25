const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { mainEmbed, currencySelectRow } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm')
    .setDescription('Start a new escrow deal between a buyer and seller'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [mainEmbed()],
      components: [currencySelectRow()],
      ephemeral: false,
    });
  },
};
