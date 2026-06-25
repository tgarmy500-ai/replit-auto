const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Check deal statistics for yourself or another user')
    .addUserOption(o => o.setName('user').setDescription('User to check (leave blank for yourself)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user') || interaction.user;
    const stats = db.getUserStats(target.id);
    const rate = stats.total_deals > 0 ? Math.round((stats.completed_deals / stats.total_deals) * 100) : 0;

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`📊 Deal Statistics — ${target.username}`)
        .setColor(COLORS.PRIMARY)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '📦 Total Deals', value: `**${stats.total_deals}**`, inline: true },
          { name: '✅ Completed', value: `**${stats.completed_deals}**`, inline: true },
          { name: '📈 Success Rate', value: `**${rate}%**`, inline: true },
          { name: '💵 Total Volume', value: `**$${stats.total_volume_usd?.toFixed(2) || '0.00'}**`, inline: true },
          { name: '🛒 As Buyer', value: `**${stats.deals_as_buyer}**`, inline: true },
          { name: '🏪 As Seller', value: `**${stats.deals_as_seller}**`, inline: true },
          { name: '🔥 Current Streak', value: `**${stats.streak} days**`, inline: true },
          { name: '📅 Last Deal', value: stats.last_deal_at ? `<t:${stats.last_deal_at}:R>` : 'Never', inline: true },
        )
        .setFooter({ text: 'SMMuggler Escrow • Statistics' })
        .setTimestamp()
      ],
    });
  },
};
