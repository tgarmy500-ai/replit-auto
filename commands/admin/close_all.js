const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS } = require('../../config');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close_all')
    .setDescription('Owner Only: Delete ALL deal channels and cancel all active deals'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_close_all').setLabel('⚠️ YES, DELETE ALL').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_close_all').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('⚠️ Confirm Close All Deals')
        .setColor(COLORS.DANGER)
        .setDescription('This will **permanently delete all deal channels** and cancel all active deals. This action **cannot be undone**.\n\nAre you sure?')
        .setTimestamp()
      ],
      components: [confirmRow],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id && ['confirm_close_all', 'cancel_close_all'].includes(i.customId), time: 30000, max: 1 });
    collector.on('collect', async i => {
      if (i.customId === 'cancel_close_all') return i.update({ content: '❌ Cancelled.', embeds: [], components: [] });

      await i.update({ content: '🔄 Processing...', embeds: [], components: [] });
      const deals = db.getAllActiveDeals();
      let deleted = 0;
      for (const deal of deals) {
        if (deal.channel_id) {
          const ch = await interaction.guild.channels.fetch(deal.channel_id).catch(() => null);
          if (ch) { await ch.delete().catch(() => {}); deleted++; }
        }
        db.updateDeal(deal.deal_id, { status: 'cancelled', closed_at: Math.floor(Date.now() / 1000) });
      }
      await interaction.followUp({ content: `✅ Closed and deleted **${deleted}** deal channels.`, ephemeral: true });
    });
  },
};
