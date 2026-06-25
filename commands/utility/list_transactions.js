const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTransactions } = require('../../wallets');
const { COLORS, CRYPTOCURRENCIES } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list_transactions')
    .setDescription('List recent transactions for an address')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const address = interaction.options.getString('address');
    const coin = interaction.options.getString('coin');
    const txs = await getTransactions(coin, address);
    const coinInfo = CRYPTOCURRENCIES[coin];

    if (!txs.length) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('📜 Transactions').setColor(COLORS.INFO).setDescription('No recent transactions found.').setTimestamp()] });

    const lines = txs.slice(0, 5).map((tx, i) =>
      `**${i + 1}.** \`${tx.hash?.substring(0, 20)}...\`\nAmount: ${tx.amount?.toFixed(8)} ${coin} | Confirmations: ${tx.confirmations}`
    ).join('\n\n');

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`📜 Recent ${coin} Transactions`)
        .setColor(coinInfo.color)
        .setDescription(lines)
        .addFields({ name: '📬 Address', value: `\`${address}\`` })
        .setFooter({ text: `${coinInfo.explorerAddr}${address}` })
        .setTimestamp()
      ],
    });
  },
};
