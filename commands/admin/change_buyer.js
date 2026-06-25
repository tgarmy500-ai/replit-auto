const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('change-buyer')
    .setDescription('Change the Buyer of a deal (Owner Only)')
    .addUserOption(o => o.setName('user').setDescription('New buyer').setRequired(true))
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (blank = current channel)').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    const deal = interaction.options.getString('deal_id') ? db.getDeal(interaction.options.getString('deal_id').toUpperCase()) : db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
    const newBuyer = interaction.options.getUser('user');
    db.updateDeal(deal.deal_id, { buyer_id: newBuyer.id });
    if (interaction.channel) await interaction.channel.permissionOverwrites.edit(newBuyer, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.reply({ embeds: [successEmbed('Buyer Updated', `Buyer changed to <@${newBuyer.id}> for deal **${deal.deal_id}**`)] });
  },
};
