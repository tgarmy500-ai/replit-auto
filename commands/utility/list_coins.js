const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, CRYPTOCURRENCIES } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder().setName('list_coins').setDescription('List all enabled and disabled coins'),

  async execute(interaction) {
    const fields = Object.entries(CRYPTOCURRENCIES).map(([sym, c]) => ({
      name: `${c.enabled ? '✅' : '❌'} ${c.name} (${sym})`,
      value: `Network: \`${c.network}\`\nStatus: ${c.enabled ? '**Enabled**' : '**Disabled**'}`,
      inline: true,
    }));

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🪙 Supported Currencies')
        .setColor(COLORS.INFO)
        .addFields(fields)
        .setFooter({ text: 'SMMuggler Escrow' })
        .setTimestamp()
      ],
      ephemeral: true,
    });
  },
};
