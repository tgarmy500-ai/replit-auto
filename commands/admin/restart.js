const { SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('restart').setDescription('Restart the bot (Owner Only)'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    await interaction.reply({ embeds: [successEmbed('Restarting', '♻️ Bot is restarting in 3 seconds...')] });
    setTimeout(() => process.exit(0), 3000);
  },
};
