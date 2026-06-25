const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS } = require('../../config');
const { sendFunds } = require('../../wallets');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send_funds')
    .setDescription('Send funds from a deal wallet to an address (Owner Only)')
    .addStringOption(o => o.setName('deal_id').setDescription('Deal ID').setRequired(true))
    .addStringOption(o => o.setName('to_address').setDescription('Destination address').setRequired(true))
    .addNumberOption(o => o.setName('amount').setDescription('Amount to send (0 = all)').setRequired(false)),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const dealId = interaction.options.getString('deal_id').toUpperCase();
    const toAddress = interaction.options.getString('to_address');
    const requestedAmount = interaction.options.getNumber('amount') || 0;

    const deal = db.getDeal(dealId);
    if (!deal) return interaction.editReply({ embeds: [errorEmbed('Deal not found.')] });

    const wallet = db.getWallet(dealId);
    if (!wallet) return interaction.editReply({ embeds: [errorEmbed('No wallet found for this deal.')] });

    const { getBalance } = require('../../wallets');
    const bal = await getBalance(deal.currency, wallet.address);
    const amount = requestedAmount > 0 ? requestedAmount : bal.confirmed;

    if (amount <= 0) return interaction.editReply({ embeds: [errorEmbed(`No confirmed balance available. Current: ${bal.confirmed} ${deal.currency}`)] });

    const result = await sendFunds(deal.currency, wallet.private_key, toAddress, amount);

    if (result.success) {
      db.saveTransaction({ deal_id: dealId, tx_hash: result.txHash, currency: deal.currency, amount, from_address: wallet.address, to_address: toAddress, status: 'sent' });
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('✅ Funds Sent')
          .setColor(COLORS.SUCCESS)
          .addFields(
            { name: '💰 Amount', value: `${amount} ${deal.currency}`, inline: true },
            { name: '📬 To', value: `\`${toAddress}\``, inline: true },
            { name: '🔗 TX Hash', value: result.txHash ? `\`${result.txHash}\`` : 'N/A' },
          )
          .setTimestamp()
        ],
      });
    } else {
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Send Failed').setColor(COLORS.DANGER).setDescription(`Error: ${result.error}\n\n**Wallet address:** \`${wallet.address}\`\n**Private key saved in database** — use wallet software to withdraw manually.`).setTimestamp()] });
    }
  },
};
