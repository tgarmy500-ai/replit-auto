const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder().setName('alerts').setDescription('List or manage your active price alerts'),

  async execute(interaction) {
    const alerts = db.getPriceAlerts(interaction.user.id);
    if (!alerts.length) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔔 Your Price Alerts').setColor(COLORS.INFO).setDescription('You have no active price alerts. Use `/pricealert` to set one.').setTimestamp()], ephemeral: true });

    const lines = alerts.map(a => `**#${a.id}** — ${a.currency} ${a.direction === 'above' ? '📈 above' : '📉 below'} **$${a.target_price}**`).join('\n');
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🔔 Your Price Alerts')
        .setColor(COLORS.INFO)
        .setDescription(lines)
        .setFooter({ text: 'Use /alertremove [id] to remove an alert' })
        .setTimestamp()
      ],
      ephemeral: true,
    });
  },
};
