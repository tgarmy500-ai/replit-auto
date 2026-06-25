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
      .setTitle('💎 SMMuggler MM & Escrow')
      .setDescription(
        '**SMMuggler Escrow** makes your cryptocurrency trades safe and easy.\n' +
        'We provide a secure environment for peer-to-peer deals, protecting you from fraud and scams.\n\n' +
        '## How this works?\n' +
        'Our automated system handles everything. Funds are only released when both parties are satisfied, ensuring a fair and reliable experience for every user.\n\n' +
        'Click the button below to start your deal.\n\n' +
        '~ **SMMuggler MM & Escrow**'
      )
      .setColor(COLORS.PRIMARY)
      .setFooter({ text: 'SMMuggler Escrow • Secure P2P Trading' });

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
