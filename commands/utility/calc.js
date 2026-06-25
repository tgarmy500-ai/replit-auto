const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCryptoPrice } = require('../../wallets');
const { COLORS, CRYPTOCURRENCIES } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Convert between USD and Crypto')
    .addNumberOption(o => o.setName('amount').setDescription('Amount to convert').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' }))
    .addStringOption(o => o.setName('from').setDescription('Convert from').setRequired(false)
      .addChoices({ name: 'USD to Crypto', value: 'usd' }, { name: 'Crypto to USD', value: 'crypto' })),

  async execute(interaction) {
    await interaction.deferReply();
    const amount = interaction.options.getNumber('amount');
    const coin = interaction.options.getString('coin');
    const from = interaction.options.getString('from') || 'usd';
    const coinInfo = CRYPTOCURRENCIES[coin];
    const { price } = await getCryptoPrice(coin);

    if (!price) return interaction.editReply({ content: '❌ Could not fetch price data.' });

    let usdAmount, cryptoAmount, title;
    if (from === 'usd') {
      usdAmount = amount;
      cryptoAmount = amount / price;
      title = `$${amount.toFixed(2)} USD → ${coin}`;
    } else {
      cryptoAmount = amount;
      usdAmount = amount * price;
      title = `${amount} ${coin} → USD`;
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`💱 ${title}`)
        .setColor(coinInfo.color)
        .addFields(
          { name: '💵 USD', value: `**$${usdAmount.toFixed(4)}**`, inline: true },
          { name: `🪙 ${coin}`, value: `**${cryptoAmount.toFixed(8)}**`, inline: true },
          { name: '📊 Rate', value: `1 ${coin} = $${price.toFixed(4)}`, inline: true },
        )
        .setFooter({ text: 'SMMuggler Escrow • Live Rates' })
        .setTimestamp()
      ],
    });
  },
};
