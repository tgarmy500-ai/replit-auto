const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS } = require('../../config');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwallets')
    .setDescription('Set your personal withdrawal wallet addresses (Owner Only)')
    .addStringOption(o =>
      o.setName('ltc')
        .setDescription('Your Litecoin (LTC) wallet address')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('sol')
        .setDescription('Your Solana (SOL) wallet address')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('usdt')
        .setDescription('Your USDT (TRC20 / Tron) wallet address')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });
    }

    const ltc  = interaction.options.getString('ltc');
    const sol  = interaction.options.getString('sol');
    const usdt = interaction.options.getString('usdt');

    if (!ltc && !sol && !usdt) {
      const wallets = db.getWithdrawWallets();
      const embed = new EmbedBuilder()
        .setTitle('💳 Current Withdrawal Wallets')
        .setColor(COLORS.INFO)
        .setDescription('Use `/setwallets ltc:<addr> sol:<addr> usdt:<addr>` to update any wallet.\nFunds are auto-sent to these addresses when a buyer releases.')
        .addFields(
          { name: '🟦 LTC',  value: wallets.LTC  ? `\`${wallets.LTC}\``  : '*Not set*', inline: false },
          { name: '◎ SOL',   value: wallets.SOL  ? `\`${wallets.SOL}\``  : '*Not set*', inline: false },
          { name: '💚 USDT', value: wallets.USDT ? `\`${wallets.USDT}\`` : '*Not set*', inline: false },
        )
        .setFooter({ text: 'These are stored securely in the database' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const updated = [];

    if (ltc) {
      if (!ltc.startsWith('L') && !ltc.startsWith('M') && !ltc.startsWith('ltc1')) {
        return interaction.reply({ embeds: [errorEmbed('Invalid LTC address. Must start with L, M, or ltc1.')], ephemeral: true });
      }
      db.setWithdrawWallet('LTC', ltc);
      updated.push(`🟦 **LTC:** \`${ltc}\``);
    }

    if (sol) {
      if (sol.length < 32 || sol.length > 44) {
        return interaction.reply({ embeds: [errorEmbed('Invalid SOL address. Must be 32–44 characters.')], ephemeral: true });
      }
      db.setWithdrawWallet('SOL', sol);
      updated.push(`◎ **SOL:** \`${sol}\``);
    }

    if (usdt) {
      if (!usdt.startsWith('T') || usdt.length !== 34) {
        return interaction.reply({ embeds: [errorEmbed('Invalid USDT (TRC20) address. Must start with T and be 34 characters.')], ephemeral: true });
      }
      db.setWithdrawWallet('USDT', usdt);
      updated.push(`💚 **USDT:** \`${usdt}\``);
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Withdrawal Wallets Updated')
      .setColor(COLORS.SUCCESS)
      .setDescription(updated.join('\n'))
      .addFields({
        name: '⚡ Auto-Sweep Active',
        value: 'When a buyer clicks **Release Funds**, the bot will automatically send the deal balance to your wallet for that currency.',
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
