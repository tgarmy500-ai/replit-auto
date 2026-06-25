const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../database');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Export transcript of this deal channel'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const deal = db.getDealByChannel(interaction.channelId);

    const messages = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return interaction.editReply({ embeds: [errorEmbed('Could not fetch messages.')] });

    const lines = messages.reverse().map(m =>
      `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag} (${m.author.id}): ${m.content}${m.embeds.length ? ` [${m.embeds.length} embed(s)]` : ''}${m.attachments.size ? ` [${m.attachments.size} attachment(s)]` : ''}`
    ).join('\n');

    const header = `═══════════════════════════════════════\nDEAL TRANSCRIPT\nChannel: #${interaction.channel.name}\n${deal ? `Deal ID: ${deal.deal_id}\nBuyer: ${deal.buyer_id} | Seller: ${deal.seller_id}` : ''}\nExported: ${new Date().toISOString()}\nExported by: ${interaction.user.tag}\n═══════════════════════════════════════\n\n`;

    const content = header + lines;
    const buffer = Buffer.from(content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}-${Date.now()}.txt` });

    await interaction.editReply({ files: [attachment], embeds: [infoEmbed('Transcript Exported', 'The transcript has been exported successfully.')] });
  },
};
