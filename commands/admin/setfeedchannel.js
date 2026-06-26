const { SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../../config');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setfeedchannel')
    .setDescription('Set the channel where completed deal activity is posted (Owner Only)'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });
    }

    db.setSetting('fake_completed_channel_id', interaction.channel.id);

    return interaction.reply({
      embeds: [successEmbed('Feed Channel Set', `Completed deal activity will now be posted in <#${interaction.channel.id}> every 30–60 minutes.\n\nThe bot will start posting automatically — no restart needed.`)],
      ephemeral: true,
    });
  },
};
