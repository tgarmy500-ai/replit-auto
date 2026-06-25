const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { generateId, generateWallet, usdToCrypto, getCryptoPrice, sendFunds, getBalance } = require('../wallets');
const { DEAL_CATEGORY_NAME, OWNER_IDS, COLORS, CRYPTOCURRENCIES, WITHDRAW_WALLETS } = require('../config');
const { dealInfoEmbed, paymentEmbed, confirmRow, dealActionRow, successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');
const { startMonitoring, stopMonitoring } = require('../monitor');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        if (db.isBlacklisted('user', interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('You are blacklisted from using this bot.')], ephemeral: true });
        }
        await command.execute(interaction);
      } catch (e) {
        console.error(`Command error [${interaction.commandName}]:`, e);
        const msg = { embeds: [errorEmbed(`An error occurred: ${e.message}`)], ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      }
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_currency') {
      const currency = interaction.values[0];
      const coinInfo = CRYPTOCURRENCIES[currency];
      if (!coinInfo?.enabled) return interaction.reply({ embeds: [errorEmbed(`${currency} is currently disabled.`)], ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`deal_info_${currency}`)
        .setTitle('Deal Info');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('other_party_id').setLabel('Enter Seller/Buyer User ID').setStyle(TextInputStyle.Short).setPlaceholder('Enter the Discord User ID...').setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('item_name').setLabel('Item / Service Name').setStyle(TextInputStyle.Short).setPlaceholder('What is being traded?').setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('amount_usd').setLabel('Amount in USD ($)').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 50.00').setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('role').setLabel('Your role in this deal').setStyle(TextInputStyle.Short).setPlaceholder('buyer OR seller').setRequired(true)
        ),
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('deal_info_')) {
      const currency = interaction.customId.replace('deal_info_', '');
      const otherPartyId = interaction.fields.getTextInputValue('other_party_id').trim();
      const itemName = interaction.fields.getTextInputValue('item_name').trim();
      const amountUsdStr = interaction.fields.getTextInputValue('amount_usd').trim().replace('$', '');
      const role = interaction.fields.getTextInputValue('role').trim().toLowerCase();

      const amountUsd = parseFloat(amountUsdStr);
      if (isNaN(amountUsd) || amountUsd <= 0) return interaction.reply({ embeds: [errorEmbed('Invalid USD amount.')], ephemeral: true });
      if (!['buyer', 'seller'].includes(role)) return interaction.reply({ embeds: [errorEmbed('Role must be "buyer" or "seller".')], ephemeral: true });

      let otherUser;
      try { otherUser = await interaction.client.users.fetch(otherPartyId); } catch {
        return interaction.reply({ embeds: [errorEmbed('Invalid User ID. Could not find that Discord user.')], ephemeral: true });
      }

      if (otherUser.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('You cannot trade with yourself.')], ephemeral: true });
      if (db.isBlacklisted('user', otherUser.id)) return interaction.reply({ embeds: [errorEmbed('The other party is blacklisted from using this bot.')], ephemeral: true });

      const buyerId = role === 'buyer' ? interaction.user.id : otherUser.id;
      const sellerId = role === 'seller' ? interaction.user.id : otherUser.id;

      await interaction.deferReply({ ephemeral: true });

      const dealId = generateId('DEAL');

      const feeUsd = amountUsd >= 250 ? 1.50 : amountUsd >= 50 ? 0.50 : 0;
      const dealCrypto = await usdToCrypto(amountUsd, currency);
      if (!dealCrypto) return interaction.editReply({ embeds: [errorEmbed('Could not fetch current price. Try again in a moment.')] });
      const feeCrypto = feeUsd > 0 ? await usdToCrypto(feeUsd, currency) : 0;
      const cryptoAmount = dealCrypto + (feeCrypto || 0);
      const totalUsd = amountUsd + feeUsd;

      let category = interaction.guild.channels.cache.find(c => c.name === DEAL_CATEGORY_NAME && c.type === 4);
      if (!category) {
        category = await interaction.guild.channels.create({ name: DEAL_CATEGORY_NAME, type: 4 });
      }

      const channel = await interaction.guild.channels.create({
        name: `deal-${dealId.toLowerCase()}`,
        type: 0,
        parent: category.id,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
          { id: buyerId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: sellerId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels', 'ManageMessages'] },
        ],
      });

      db.createDeal({ deal_id: dealId, guild_id: interaction.guild.id, buyer_id: buyerId, seller_id: sellerId, currency, item_name: itemName });
      db.updateDeal(dealId, { channel_id: channel.id, amount_usd: totalUsd, amount_crypto: cryptoAmount, fee_usd: feeUsd });

      const buyer = await interaction.client.users.fetch(buyerId).catch(() => null);
      const seller = await interaction.client.users.fetch(sellerId).catch(() => null);

      const feeDisplay = feeUsd > 0 ? `$${feeUsd.toFixed(2)}` : '**FREE** 🎉';
      const confirmEmbed = new EmbedBuilder()
        .setTitle('🤝 New Deal — Awaiting Confirmation')
        .setColor(CRYPTOCURRENCIES[currency]?.color || COLORS.PRIMARY)
        .setDescription('Both parties must confirm to proceed with the deal.')
        .addFields(
          { name: '🛒 Buyer', value: `<@${buyerId}> (${buyer?.tag || buyerId})`, inline: true },
          { name: '🏪 Seller', value: `<@${sellerId}> (${seller?.tag || sellerId})`, inline: true },
          { name: '💱 Currency', value: `**${currency}**`, inline: true },
          { name: '💵 Deal Value', value: `$${amountUsd.toFixed(2)}`, inline: true },
          { name: '💸 Service Fee', value: feeDisplay, inline: true },
          { name: `🪙 Total (${currency})`, value: `${cryptoAmount.toFixed(8)} ${currency}`, inline: true },
          { name: '📦 Item', value: itemName, inline: true },
          { name: '🆔 Deal ID', value: dealId, inline: true },
        )
        .setFooter({ text: 'SMMuggler Escrow • Both parties must confirm' })
        .setTimestamp();

      await channel.send({
        content: `<@${buyerId}> <@${sellerId}> — A new deal has been created! Both parties must confirm below.`,
        embeds: [confirmEmbed],
        components: [confirmRow(dealId)],
      });

      await interaction.editReply({ embeds: [successEmbed('Deal Created!', `Your deal channel has been created: <#${channel.id}>\n\nDeal ID: **${dealId}**`)] });
      return;
    }

    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith('confirm_buyer_') || customId.startsWith('confirm_')) {
        const dealId = customId.replace('confirm_buyer_', '').replace('confirm_', '');
        const deal = db.getDeal(dealId);
        if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });

        const isBuyer = interaction.user.id === deal.buyer_id;
        const isSeller = interaction.user.id === deal.seller_id;
        if (!isBuyer && !isSeller) return interaction.reply({ embeds: [errorEmbed('You are not a party in this deal.')], ephemeral: true });

        const updates = {};
        if (isBuyer && !deal.buyer_confirmed) updates.buyer_confirmed = 1;
        if (isSeller && !deal.seller_confirmed) updates.seller_confirmed = 1;
        if (!Object.keys(updates).length) return interaction.reply({ embeds: [infoEmbed('Already Confirmed', 'You have already confirmed this deal.')], ephemeral: true });

        db.updateDeal(dealId, updates);
        await interaction.reply({ embeds: [successEmbed('Confirmed!', `You have confirmed the deal.`)], ephemeral: true });

        const updatedDeal = db.getDeal(dealId);
        if (updatedDeal.buyer_confirmed && updatedDeal.seller_confirmed) {
          db.updateDeal(dealId, { status: 'awaiting_payment' });

          let wallet;
          try {
            wallet = await generateWallet(deal.currency);
            db.saveWallet({ deal_id: dealId, currency: deal.currency, address: wallet.address, private_key: wallet.privateKey, mnemonic: wallet.mnemonic });
            db.updateDeal(dealId, { wallet_address: wallet.address, status: 'awaiting_payment' });
          } catch (e) {
            console.error('Wallet generation error:', e);
            await interaction.channel.send({ embeds: [errorEmbed(`Wallet generation failed: ${e.message}. Contact admin.`)] });
            return;
          }

          const buyer = await interaction.client.users.fetch(deal.buyer_id).catch(() => null);
          const seller = await interaction.client.users.fetch(deal.seller_id).catch(() => null);
          const payMsg = await interaction.channel.send({
            content: `<@${deal.buyer_id}> — Both parties have confirmed! Please send your payment.`,
            embeds: [paymentEmbed(updatedDeal, wallet.address)],
          });
          db.updateDeal(dealId, { payment_message_id: payMsg.id });
          startMonitoring(dealId);
        }
        return;
      }

      if (customId.startsWith('cancel_deal_')) {
        const dealId = customId.replace('cancel_deal_', '');
        const deal = db.getDeal(dealId);
        if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
        if (deal.buttons_locked && !OWNER_IDS.includes(interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('Deal buttons are locked by admin.')], ephemeral: true });
        }

        const isParty = interaction.user.id === deal.buyer_id || interaction.user.id === deal.seller_id;
        const isOwner = OWNER_IDS.includes(interaction.user.id);
        if (!isParty && !isOwner) return interaction.reply({ embeds: [errorEmbed('Not authorized.')], ephemeral: true });
        if (deal.payment_received && !isOwner) return interaction.reply({ embeds: [errorEmbed('Cannot cancel after payment received. Contact admin.')], ephemeral: true });

        stopMonitoring(dealId);
        db.updateDeal(dealId, { status: 'cancelled', closed_at: Math.floor(Date.now() / 1000) });
        await interaction.reply({ content: `<@${deal.buyer_id}> <@${deal.seller_id}>`, embeds: [new EmbedBuilder().setTitle('❌ Deal Cancelled').setColor(COLORS.DANGER).setDescription(`Deal **${dealId}** has been cancelled by <@${interaction.user.id}>.`).setTimestamp()] });
        setTimeout(() => interaction.channel?.delete().catch(() => {}), 30000);
        return;
      }

      if (customId.startsWith('release_')) {
        const dealId = customId.replace('release_', '');
        const deal = db.getDeal(dealId);
        if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
        if (deal.buttons_locked && !OWNER_IDS.includes(interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('Deal buttons are locked by admin.')], ephemeral: true });
        }

        if (interaction.user.id !== deal.buyer_id && !OWNER_IDS.includes(interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('Only the buyer can release funds.')], ephemeral: true });
        }
        if (!deal.payment_received) return interaction.reply({ embeds: [errorEmbed('Payment not yet received.')], ephemeral: true });
        if (deal.funds_released) return interaction.reply({ embeds: [errorEmbed('Funds already released.')], ephemeral: true });

        db.updateDeal(dealId, { status: 'completed', funds_released: 1, closed_at: Math.floor(Date.now() / 1000) });

        const buyerStats = db.getUserStats(deal.buyer_id);
        const sellerStats = db.getUserStats(deal.seller_id);
        db.updateUserStats(deal.buyer_id, { total_deals: buyerStats.total_deals + 1, completed_deals: buyerStats.completed_deals + 1, deals_as_buyer: buyerStats.deals_as_buyer + 1, total_volume_usd: (buyerStats.total_volume_usd || 0) + (deal.amount_usd || 0), last_deal_at: Math.floor(Date.now() / 1000) });
        db.updateUserStats(deal.seller_id, { total_deals: sellerStats.total_deals + 1, completed_deals: sellerStats.completed_deals + 1, deals_as_seller: sellerStats.deals_as_seller + 1, total_volume_usd: (sellerStats.total_volume_usd || 0) + (deal.amount_usd || 0), last_deal_at: Math.floor(Date.now() / 1000) });

        const withdrawWallets = db.getWithdrawWallets();
        const ownerAddress = withdrawWallets[deal.currency] || WITHDRAW_WALLETS[deal.currency] || null;
        const dealWallet = db.getWallet(dealId);
        let sweepResult = null;

        if (ownerAddress && dealWallet) {
          const bal = await getBalance(deal.currency, dealWallet.address);
          if (bal.confirmed > 0) {
            sweepResult = await sendFunds(deal.currency, dealWallet.private_key, ownerAddress, bal.confirmed);
            if (sweepResult.success) {
              db.saveTransaction({ deal_id: dealId, tx_hash: sweepResult.txHash, currency: deal.currency, amount: bal.confirmed, from_address: dealWallet.address, to_address: ownerAddress, status: 'swept' });
            }
          }
        }

        const sweepField = ownerAddress
          ? sweepResult?.success
            ? { name: '⚡ Auto-Sweep', value: `Funds sent to your wallet!\nTX: \`${sweepResult.txHash}\`` }
            : { name: '⚠️ Auto-Sweep Failed', value: sweepResult?.error || 'No balance yet. Use `/send_funds` to withdraw manually.' }
          : { name: '⚠️ Withdrawal', value: 'No withdrawal wallet set. Use `/setwallets` to set one, or `/send_funds` to withdraw manually.' };

        await interaction.reply({
          content: `<@${deal.buyer_id}> <@${deal.seller_id}>`,
          embeds: [new EmbedBuilder()
            .setTitle('🎉 Deal Completed!')
            .setColor(COLORS.SUCCESS)
            .setDescription(`<@${deal.buyer_id}> has released the funds!\n**Deal ID:** ${dealId}`)
            .addFields(
              { name: '💰 Amount', value: `${deal.amount_crypto?.toFixed(8)} ${deal.currency}`, inline: true },
              { name: '💵 USD', value: `$${deal.amount_usd?.toFixed(2)}`, inline: true },
              sweepField,
            )
            .setTimestamp()
          ],
        });

        setTimeout(() => interaction.channel?.delete().catch(() => {}), 60000);
        return;
      }

      if (customId.startsWith('get_info_')) {
        const dealId = customId.replace('get_info_', '');
        const deal = db.getDeal(dealId);
        if (!deal) return interaction.reply({ embeds: [errorEmbed('Deal not found.')], ephemeral: true });
        const buyer = await interaction.client.users.fetch(deal.buyer_id).catch(() => null);
        const seller = await interaction.client.users.fetch(deal.seller_id).catch(() => null);
        await interaction.reply({ embeds: [dealInfoEmbed(deal, buyer, seller)], ephemeral: true });
        return;
      }

      if (customId === 'start_deal_panel') {
        const { currencySelectRow, mainEmbed } = require('../utils/embeds');
        await interaction.reply({
          embeds: [mainEmbed()],
          components: [currencySelectRow()],
          ephemeral: true,
        });
        return;
      }

      if (customId === 'confirm_close_all' || customId === 'cancel_close_all') return;
    }
  },
};
