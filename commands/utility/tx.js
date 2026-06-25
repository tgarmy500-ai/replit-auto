const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTxDetails } = require('../../wallets');
const { CRYPTOCURRENCIES, COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tx')
    .setDescription('Check Transaction Details')
    .addStringOption(o => o.setName('hash').setDescription('Transaction hash').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const hash = interaction.options.getString('hash');
    const coin = interaction.options.getString('coin');
    const coinInfo = CRYPTOCURRENCIES[coin];
    const details = await getTxDetails(coin, hash);

    if (!details) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Transaction Not Found').setColor(COLORS.DANGER).setDescription('Could not find that transaction. It may be pending or invalid.').setTimestamp()] });
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`🔍 Transaction Details — ${coin}`)
        .setColor(coinInfo.color)
        .addFields(
          { name: '🔗 Hash', value: `\`${details.hash}\`` },
          { name: '✅ Confirmations', value: `${details.confirmations}`, inline: true },
          { name: '💰 Amount', value: `${details.amount?.toFixed(8)} ${coin}`, inline: true },
          { name: '⛽ Fee', value: `${details.fee?.toFixed(8)} ${coin}`, inline: true },
          { name: '🕐 Time', value: details.time ? `<t:${Math.floor(new Date(details.time).getTime() / 1000)}:F>` : 'Unknown', inline: true },
        )
        .setFooter({ text: `View on explorer: ${coinInfo.explorerTx}${hash}` })
        .setTimestamp()
      ],
    });
  },
};
