const { SlashCommandBuilder } = require('discord.js');
const balance = require('./balance');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_balance')
    .setDescription('Check balance for any currency address')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),
  execute: balance.execute,
};
