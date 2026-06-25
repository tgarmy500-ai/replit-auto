const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { OWNER_IDS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to this deal channel')
    .addUserOption(o => o.setName('user').setDescription('The user to add').setRequired(true)),

  async execute(interaction) {
    const deal = db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.reply({ embeds: [errorEmbed('This is not a deal channel.')], ephemeral: true });

    const isParty = interaction.user.id === deal.buyer_id || interaction.user.id === deal.seller_id;
    if (!isParty && !OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Only deal participants or admins can add users.')], ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    await interaction.channel.permissionOverwrites.edit(user, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.reply({ embeds: [successEmbed('User Added', `<@${user.id}> has been added to this deal channel.`)] });
  },
};
