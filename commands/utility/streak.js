const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder().setName('streak').setDescription('Check your current deal activity streak'),

  async execute(interaction) {
    const stats = db.getUserStats(interaction.user.id);
    const fire = stats.streak >= 7 ? '🔥' : stats.streak >= 3 ? '✨' : '⭐';
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle(`${fire} Deal Streak`)
        .setColor(stats.streak >= 7 ? COLORS.WARNING : COLORS.PRIMARY)
        .setDescription(`You have a **${stats.streak}-day** deal streak!`)
        .addFields(
          { name: '🔥 Current Streak', value: `${stats.streak} days`, inline: true },
          { name: '📅 Last Deal', value: stats.last_deal_at ? `<t:${stats.last_deal_at}:R>` : 'Never', inline: true },
        )
        .setFooter({ text: 'Complete a deal daily to keep your streak!' })
        .setTimestamp()
      ],
      ephemeral: true,
    });
  },
};
