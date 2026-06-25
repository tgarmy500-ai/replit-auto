const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCryptoPrice } = require('../../wallets');
const { COLORS, CRYPTOCURRENCIES } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('price')
    .setDescription('Check current price of a cryptocurrency')
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),

  async execute(interaction) {
    await interaction.deferReply();
    const coin = interaction.options.getString('coin');
    const { price, change24h } = await getCryptoPrice(coin);
    const coinInfo = CRYPTOCURRENCIES[coin];
    const changeEmoji = change24h >= 0 ? '📈' : '📉';
    const changeStr = change24h ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : 'N/A';

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`${changeEmoji} ${coinInfo.name} (${coin}) Price`)
        .setColor(coinInfo.color)
        .addFields(
          { name: '💵 Current Price', value: `**$${price?.toFixed(4) || 'N/A'}**`, inline: true },
          { name: '📊 24h Change', value: `**${changeStr}**`, inline: true },
        )
        .setFooter({ text: 'Prices via CoinGecko • SMMuggler Escrow' })
        .setTimestamp()
      ],
    });
  },
};
