const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { TOKEN, CLIENT_ID, GUILD_ID } = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(full);
    } else if (entry.name.endsWith('.js')) {
      try {
        const cmd = require(full);
        if (cmd.data && cmd.execute) {
          client.commands.set(cmd.data.name, cmd);
        }
      } catch (e) {
        console.error(`Failed to load command ${entry.name}:`, e.message);
      }
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));
console.log(`📋 Loaded ${client.commands.size} commands`);

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

async function deployCommands() {
  const commands = [];
  client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log(`⬆️  Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Commands registered!');
  } catch (e) {
    console.error('❌ Command registration failed:', e.message);
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await deployCommands();
});

process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
process.on('uncaughtException', e => { console.error('Uncaught exception:', e); });

client.login(TOKEN).catch(e => {
  console.error('❌ Failed to login:', e.message);
  process.exit(1);
});
