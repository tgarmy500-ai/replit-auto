const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('change-seller')
    .setDescription('Change the Seller of a deal (Owner Only)')
    .addUserOption(o => o.setName('user').setDescription('New seller').setRequired(true))
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (blank = current channel)').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    const deal = interaction.options.getString('deal_id') ? db.getDeal(interaction.options.getString('deal_id').toUpperCase()) : db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
    const newSeller = interaction.options.getUser('user');
    db.updateDeal(deal.deal_id, { seller_id: newSeller.id });
    if (interaction.channel) await interaction.channel.permissionOverwrites.edit(newSeller, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.reply({ embeds: [successEmbed('Seller Updated', `Seller changed to <@${newSeller.id}> for deal **${deal.deal_id}**`)] });
  },
};
