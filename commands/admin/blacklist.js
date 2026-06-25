const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { OWNER_IDS, COLORS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist or whitelist a user or address')
    .addSubcommand(s => s.setName('user').setDescription('Blacklist/Whitelist a Discord user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices({ name: 'Blacklist', value: 'add' }, { name: 'Whitelist (Remove)', value: 'remove' }))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))
    .addSubcommand(s => s.setName('address').setDescription('Blacklist/Whitelist an address')
      .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices({ name: 'Blacklist', value: 'add' }, { name: 'Whitelist (Remove)', value: 'remove' }))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason') || 'No reason';

    if (sub === 'user') {
      const user = interaction.options.getUser('user');
      if (action === 'add') {
        db.addBlacklist('user', user.id, reason, interaction.user.id);
        await interaction.reply({ embeds: [successEmbed('User Blacklisted', `<@${user.id}> has been blacklisted.\nReason: ${reason}`)], ephemeral: true });
      } else {
        db.removeBlacklist('user', user.id);
        await interaction.reply({ embeds: [successEmbed('User Whitelisted', `<@${user.id}> has been removed from the blacklist.`)], ephemeral: true });
      }
    } else {
      const address = interaction.options.getString('address');
      if (action === 'add') {
        db.addBlacklist('address', address, reason, interaction.user.id);
        await interaction.reply({ embeds: [successEmbed('Address Blacklisted', `\`${address}\` has been blacklisted.\nReason: ${reason}`)], ephemeral: true });
      } else {
        db.removeBlacklist('address', address);
        await interaction.reply({ embeds: [successEmbed('Address Whitelisted', `\`${address}\` has been removed from the blacklist.`)], ephemeral: true });
      }
    }
  },
};
