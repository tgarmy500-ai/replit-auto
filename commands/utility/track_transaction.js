const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('track-transaction')
    .setDescription('Track a transaction and get notified on confirmation')
    .addStringOption(o => o.setName('hash').setDescription('Transaction hash').setRequired(true))
    .addStringOption(o => o.setName('coin').setDescription('Cryptocurrency').setRequired(true)
      .addChoices({ name: 'Litecoin (LTC)', value: 'LTC' }, { name: 'Solana (SOL)', value: 'SOL' }, { name: 'Tether (USDT)', value: 'USDT' })),

  async execute(interaction) {
    const hash = interaction.options.getString('hash');
    const coin = interaction.options.getString('coin');
    db.addTrackedTx(interaction.user.id, hash, coin, interaction.channelId);
    await interaction.reply({
      embeds: [successEmbed('Transaction Tracked', `Tracking \`${hash.substring(0, 30)}...\`\nYou will be notified in this channel when it confirms.`)],
      ephemeral: true,
    });
  },
};
