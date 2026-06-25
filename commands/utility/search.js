const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTxDetails, getBalance } = require('../../wallets');
const { COLORS } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Intelligently search for any address or transaction')
    .addStringOption(o => o.setName('query').setDescription('Address or transaction hash').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const query = interaction.options.getString('query');
    const coin = interaction.options.getString('coin');

    const [txDetails, balance] = await Promise.all([
      getTxDetails(coin, query).catch(() => null),
      getBalance(coin, query).catch(() => null),
    ]);

    const embed = new EmbedBuilder().setTitle(`🔍 Search Results — ${coin}`).setColor(COLORS.INFO).setDescription(`Query: \`${query}\``);

    if (txDetails) {
      embed.addFields({ name: '🔗 Transaction Found', value: `Confirmations: ${txDetails.confirmations}\nAmount: ${txDetails.amount?.toFixed(8)} ${coin}` });
    }
    if (balance && balance.total > 0) {
      embed.addFields({ name: '💰 Address Balance', value: `Total: ${balance.total.toFixed(8)} ${coin}` });
    }
    if (!txDetails && (!balance || balance.total === 0)) {
      embed.setDescription('No results found for that query.');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
