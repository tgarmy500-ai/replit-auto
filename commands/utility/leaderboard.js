const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Show top users by trading volume'),

  async execute(interaction) {
    await interaction.deferReply();
    const top = db.getLeaderboard(10);
    const medals = ['🥇', '🥈', '🥉'];

    const lines = await Promise.all(top.map(async (u, i) => {
      const user = await interaction.client.users.fetch(u.user_id).catch(() => null);
      const name = user ? user.username : `Unknown (${u.user_id})`;
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} **${name}** — $${u.total_volume_usd?.toFixed(2) || '0.00'} • ${u.completed_deals} deals`;
    }));

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle('🏆 Leaderboard — Top Traders')
        .setColor(COLORS.GOLD)
        .setDescription(lines.length ? lines.join('\n') : 'No deals completed yet.')
        .setFooter({ text: 'SMMuggler Escrow • Leaderboard' })
        .setTimestamp()
      ],
    });
  },
};
