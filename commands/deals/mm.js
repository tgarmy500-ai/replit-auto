const { SlashCommandBuilder } = require('discord.js');
const { mainEmbed, currencySelectRow } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sendmm')
    .setDescription('Post the deal panel publicly so everyone in the channel can start a deal'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [mainEmbed()],
      components: [currencySelectRow()],
    });
  },
};
