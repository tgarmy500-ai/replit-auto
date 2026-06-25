const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot health and latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const status = latency < 200 ? '🟢 Excellent' : latency < 500 ? '🟡 Good' : '🔴 High';

    await interaction.editReply({
      content: null,
      embeds: [new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(latency < 200 ? COLORS.SUCCESS : latency < 500 ? COLORS.WARNING : COLORS.DANGER)
        .addFields(
          { name: '📶 Bot Latency', value: `**${latency}ms**`, inline: true },
          { name: '🌐 WebSocket', value: `**${wsLatency}ms**`, inline: true },
          { name: '📊 Status', value: status, inline: true },
          { name: '⏰ Uptime', value: `<t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`, inline: true },
        )
        .setFooter({ text: 'SMMuggler Escrow • Online 24/7' })
        .setTimestamp()
      ],
    });
  },
};
