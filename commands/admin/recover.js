const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, DEAL_CATEGORY_NAME } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { dealInfoEmbed, dealActionRow } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recover')
    .setDescription('Recover a deleted deal channel (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID to recover').setRequired(true)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const dealId = interaction.options.getString('deal_id').toUpperCase();
    const deal = db.getDeal(dealId);
    if (!deal) return interaction.editReply({ embeds: [errorEmbed('Deal not found in database.')] });

    const existingChannel = deal.channel_id ? await interaction.guild.channels.fetch(deal.channel_id).catch(() => null) : null;
    if (existingChannel) return interaction.editReply({ embeds: [errorEmbed(`Deal channel already exists: <#${deal.channel_id}>`)] });

    let category = interaction.guild.channels.cache.find(c => c.name === DEAL_CATEGORY_NAME && c.type === 4);
    if (!category) category = await interaction.guild.channels.create({ name: DEAL_CATEGORY_NAME, type: 4 });

    const buyer = await interaction.client.users.fetch(deal.buyer_id).catch(() => null);
    const seller = await interaction.client.users.fetch(deal.seller_id).catch(() => null);

    const channel = await interaction.guild.channels.create({
      name: `deal-${deal.deal_id.toLowerCase()}`,
      type: 0,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
        { id: deal.buyer_id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: deal.seller_id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'] },
      ],
    });

    db.updateDeal(deal.deal_id, { channel_id: channel.id, status: deal.status === 'cancelled' ? 'confirmed' : deal.status });

    await channel.send({
      content: `<@${deal.buyer_id}> <@${deal.seller_id}> — 🔄 **Deal channel recovered by admin.**`,
      embeds: [dealInfoEmbed(deal, buyer, seller)],
      components: deal.payment_received ? [dealActionRow(deal.deal_id, !!deal.buttons_locked)] : [],
    });

    await interaction.editReply({ embeds: [successEmbed('Channel Recovered', `Deal **${dealId}** channel has been recreated: <#${channel.id}>`)] });
  },
};
