const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { dealInfoEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('get_deal_info')
    .setDescription('Get full information about a deal')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID (leave blank to use current channel)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    let deal = null;
    const dealId = interaction.options.getString('deal_id');
    if (dealId) {
      deal = db.getDeal(dealId.toUpperCase());
    } else {
      deal = db.getDealByChannel(interaction.channelId);
    }
    if (!deal) return interaction.editReply({ embeds: [errorEmbed('No deal found. Use this command in a deal channel or provide a deal ID.')] });

    const buyer = await interaction.client.users.fetch(deal.buyer_id).catch(() => null);
    const seller = await interaction.client.users.fetch(deal.seller_id).catch(() => null);
    await interaction.editReply({ embeds: [dealInfoEmbed(deal, buyer, seller)] });
  },
};
