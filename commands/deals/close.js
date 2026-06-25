const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the deal channel and save a transcript'),

  async execute(interaction) {
    await interaction.deferReply();
    const deal = db.getDealByChannel(interaction.channelId);
    if (!deal) return interaction.editReply({ embeds: [errorEmbed('This is not a deal channel.')] });

    const isParty = interaction.user.id === deal.buyer_id || interaction.user.id === deal.seller_id;
    const { OWNER_IDS } = require('../../config');
    const isOwner = OWNER_IDS.includes(interaction.user.id);
    if (!isParty && !isOwner) return interaction.editReply({ embeds: [errorEmbed('Only deal participants or admins can close this channel.')] });

    const messages = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (messages) {
      const transcript = messages.reverse().map(m =>
        `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}${m.embeds.length ? ' [embed]' : ''}`
      ).join('\n');
      db.saveTranscript(deal.deal_id, interaction.channel.name, transcript);
    }

    db.updateDeal(deal.deal_id, { status: 'cancelled', closed_at: Math.floor(Date.now() / 1000) });

    await interaction.editReply({ embeds: [successEmbed('Channel Closing', 'This deal channel will be deleted in 10 seconds. Transcript has been saved.')] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
  },
};
