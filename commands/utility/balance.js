const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, getCryptoPrice } = require('../../wallets');
const { CRYPTOCURRENCIES } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check wallet balance for an address')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const address = interaction.options.getString('address');
    const coin = interaction.options.getString('coin');
    const coinInfo = CRYPTOCURRENCIES[coin];

    const [bal, { price }] = await Promise.all([getBalance(coin, address), getCryptoPrice(coin)]);
    const usdValue = bal.total * price;

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`💰 ${coin} Wallet Balance`)
        .setColor(coinInfo.color)
        .addFields(
          { name: '📬 Address', value: `\`${address}\`` },
          { name: '✅ Confirmed', value: `${bal.confirmed.toFixed(8)} ${coin}`, inline: true },
          { name: '⏳ Unconfirmed', value: `${bal.unconfirmed.toFixed(8)} ${coin}`, inline: true },
          { name: '💰 Total', value: `${bal.total.toFixed(8)} ${coin}`, inline: true },
          { name: '💵 USD Value', value: `≈ $${usdValue.toFixed(2)}`, inline: true },
        )
        .setFooter({ text: `${coinInfo.explorerAddr}${address}` })
        .setTimestamp()
      ],
    });
  },
};
