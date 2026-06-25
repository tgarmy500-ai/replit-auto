const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS, WITHDRAW_WALLETS } = require('../../config');
const { sendFunds, getBalance } = require('../../wallets');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Sweep all completed deal funds to your wallets (Owner Only)')
    .addStringOption(o =>
      o.setName('currency')
        .setDescription('Only sweep this currency (leave blank for all)')
        .setRequired(false)
        .addChoices(
          { name: 'LTC - Litecoin', value: 'LTC' },
          { name: 'SOL - Solana', value: 'SOL' },
          { name: 'USDT - Tether TRC20', value: 'USDT' },
        )
    ),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const filterCurrency = interaction.options.getString('currency');

    const withdrawWallets = db.getWithdrawWallets();
    const merged = {
      LTC:  withdrawWallets.LTC  || WITHDRAW_WALLETS?.LTC  || null,
      SOL:  withdrawWallets.SOL  || WITHDRAW_WALLETS?.SOL  || null,
      USDT: withdrawWallets.USDT || WITHDRAW_WALLETS?.USDT || null,
    };

    const currencies = filterCurrency ? [filterCurrency] : ['LTC', 'SOL', 'USDT'];
    const missing = currencies.filter(c => !merged[c]);
    if (missing.length === currencies.length) {
      return interaction.editReply({
        embeds: [errorEmbed(`No withdrawal wallet set for ${missing.join(', ')}.\nUse \`/setwallets\` to set your addresses first.`)],
      });
    }

    const completedDeals = db.getAllCompletedUnswept(filterCurrency);

    if (!completedDeals.length) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('💤 Nothing to Withdraw')
          .setColor(COLORS.INFO)
          .setDescription(filterCurrency
            ? `No completed ${filterCurrency} deals with unswept funds found.`
            : 'No completed deals with unswept funds found.')
          .setTimestamp()
        ],
      });
    }

    const results = [];
    let totalSuccess = 0;
    let totalFail = 0;

    for (const deal of completedDeals) {
      const ownerAddr = merged[deal.currency];
      if (!ownerAddr) {
        results.push({ deal_id: deal.deal_id, currency: deal.currency, success: false, error: 'No withdrawal wallet set for ' + deal.currency });
        totalFail++;
        continue;
      }

      const wallet = db.getWallet(deal.deal_id);
      if (!wallet) {
        results.push({ deal_id: deal.deal_id, currency: deal.currency, success: false, error: 'Wallet not found in DB' });
        totalFail++;
        continue;
      }

      try {
        const bal = await getBalance(deal.currency, wallet.address);
        if (bal.confirmed <= 0) {
          results.push({ deal_id: deal.deal_id, currency: deal.currency, success: false, error: 'No confirmed balance' });
          totalFail++;
          continue;
        }

        const res = await sendFunds(deal.currency, wallet.private_key, ownerAddr, bal.confirmed);
        if (res.success) {
          db.saveTransaction({
            deal_id: deal.deal_id,
            tx_hash: res.txHash,
            currency: deal.currency,
            amount: bal.confirmed,
            from_address: wallet.address,
            to_address: ownerAddr,
            status: 'swept',
          });
          db.markDealSwept(deal.deal_id);
          results.push({ deal_id: deal.deal_id, currency: deal.currency, amount: bal.confirmed, success: true, txHash: res.txHash });
          totalSuccess++;
        } else {
          results.push({ deal_id: deal.deal_id, currency: deal.currency, success: false, error: res.error });
          totalFail++;
        }
      } catch (e) {
        results.push({ deal_id: deal.deal_id, currency: deal.currency, success: false, error: e.message });
        totalFail++;
      }
    }

    const successLines = results
      .filter(r => r.success)
      .map(r => `✅ \`${r.deal_id}\` — ${r.amount.toFixed(6)} ${r.currency}\n   TX: \`${r.txHash?.substring(0, 24)}...\``)
      .join('\n') || 'None';

    const failLines = results
      .filter(r => !r.success)
      .map(r => `❌ \`${r.deal_id}\` (${r.currency}) — ${r.error}`)
      .join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setTitle('💸 Withdraw Complete')
      .setColor(totalSuccess > 0 ? COLORS.SUCCESS : COLORS.WARNING)
      .addFields(
        { name: `✅ Swept (${totalSuccess})`, value: successLines.substring(0, 1020) },
      )
      .setTimestamp();

    if (totalFail > 0) {
      embed.addFields({ name: `❌ Failed (${totalFail})`, value: failLines.substring(0, 1020) });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
