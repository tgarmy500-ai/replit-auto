const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { OWNER_IDS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from this deal channel')
    .addUserOption(o => o.setName('user').setDescription('The user to remove').setRequired(true)),

  async execute(interaction) {
    const deal = db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.reply({ embeds: [errorEmbed('This is not a deal channel.')], ephemeral: true });

    const isParty = interaction.user.id === deal.buyer_id || interaction.user.id === deal.seller_id;
    if (!isParty && !OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Only deal participants or admins can remove users.')], ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    if (user.id === deal.buyer_id || user.id === deal.seller_id) {
      return interaction.reply({ embeds: [errorEmbed('Cannot remove a deal party. Use `/change-buyer` or `/change-seller` instead.')], ephemeral: true });
    }

    await interaction.channel.permissionOverwrites.delete(user);
    await interaction.reply({ embeds: [successEmbed('User Removed', `<@${user.id}> has been removed from this deal channel.`)] });
  },
};
