const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { OWNER_IDS, STATS_CATEGORY_NAME, COLORS } = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create_stats_channels')
    .setDescription('Create stats voice channels (Owner Only)'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Owner only.')], ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    let category = interaction.guild.channels.cache.find(c => c.name === STATS_CATEGORY_NAME && c.type === 4);
    if (!category) {
      category = await interaction.guild.channels.create({ name: STATS_CATEGORY_NAME, type: 4 });
    }

    const allDeals = db.db.prepare("SELECT COUNT(*) as c FROM deals").get();
    const completedDeals = db.db.prepare("SELECT COUNT(*) as c FROM deals WHERE status = 'completed'").get();
    const activeDeals = db.db.prepare("SELECT COUNT(*) as c FROM deals WHERE status NOT IN ('completed','cancelled','refunded')").get();

    const statsData = [
      { name: `📦 Total Deals: ${allDeals.c}`, id: 'total_deals' },
      { name: `✅ Completed: ${completedDeals.c}`, id: 'completed_deals' },
      { name: `🔄 Active: ${activeDeals.c}`, id: 'active_deals' },
    ];

    for (const stat of statsData) {
      const existing = interaction.guild.channels.cache.find(c => c.name.startsWith(stat.name.split(':')[0]) && c.parentId === category.id);
      if (existing) {
        await existing.setName(stat.name).catch(() => {});
      } else {
        await interaction.guild.channels.create({
          name: stat.name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: [{ id: interaction.guild.roles.everyone, deny: ['Connect'] }],
        });
      }
    }

    await interaction.editReply({ embeds: [successEmbed('Stats Channels Created', `Statistics channels have been set up in the **${STATS_CATEGORY_NAME}** category.`)] });
  },
};
