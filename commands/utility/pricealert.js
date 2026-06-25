const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pricealert')
    .setDescription('Set a price alert for a cryptocurrency')
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' }))
    .addNumberOption(o => o.setName('price').setDescription('Target price in USD').setRequired(true))
    .addStringOption(o => o.setName('direction').setDescription('Alert when price goes above or below').setRequired(true)
      .addChoices({ name: 'Above target', value: 'above' }, { name: 'Below target', value: 'below' })),

  async execute(interaction) {
    const coin = interaction.options.getString('coin');
    const price = interaction.options.getNumber('price');
    const direction = interaction.options.getString('direction');

    const id = db.addPriceAlert({ user_id: interaction.user.id, currency: coin, target_price: price, direction, channel_id: interaction.channelId });
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🔔 Price Alert Set')
        .setColor(COLORS.SUCCESS)
        .addFields(
          { name: '🪙 Coin', value: coin, inline: true },
          { name: '💵 Target', value: `$${price}`, inline: true },
          { name: '📊 Direction', value: direction === 'above' ? '📈 Above' : '📉 Below', inline: true },
          { name: '🆔 Alert ID', value: `${id}`, inline: true },
        )
        .setFooter({ text: 'You will be notified in this channel when triggered.' })
        .setTimestamp()
      ],
      ephemeral: true,
    });
  },
};
