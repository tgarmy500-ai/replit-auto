const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { OWNER_IDS, COLORS } = require('../../config');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post the Start a Deal panel in this channel (Owner Only)'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Owner only command.')], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('💎 Smuggler Auto MM')
      .setDescription(
        '**Smuggler Auto MM** is your trusted middleman service for secure, peer-to-peer cryptocurrency transactions. ' +
        'We act as a neutral third party — holding funds in escrow until both sides confirm everything is complete.\n\n' +
        '## How It Works\n' +
        'Our automated system oversees every step of the deal. Funds are only released upon buyer confirmation, ensuring full protection against fraud and disputes for every party involved.\n\n' +
        'Click the button below to initiate a deal.\n\n' +
        '~ **Smuggler Auto MM**'
      )
      .setColor(COLORS.PRIMARY)
      .setFooter({ text: 'Smuggler Auto MM • Secure P2P Trading' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_deal_panel')
        .setLabel('🤝 Start a Deal')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel posted!', ephemeral: true });
  },
};
