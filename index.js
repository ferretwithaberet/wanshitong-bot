const {
  Client,
  REST,
  Routes,
  Events,
  GatewayIntentBits,
} = require("discord.js");

const { IS_DEV, DEV_GUILD_ID } = require("./utils/constants");
const COMMANDS = require("./services/commands");

// Configure .env variables
if (IS_DEV) require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const init = async () => {
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
  const slashCommands = Object.values(COMMANDS).map((command) => command.data);

  const endpoint = IS_DEV
    ? Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, DEV_GUILD_ID)
    : Routes.applicationCommands(process.env.DISCORD_APP_ID);

  await rest.put(endpoint, {
    body: slashCommands,
  });

  client.on(Events.ClientReady, () => {
    console.info(`Logged in as ${client.user.tag}!`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    // Ignore command if triggered by this bot
    if (interaction.user.id === client.user.id) return;

    // Ignore interactions that are not commands
    if (!interaction.isChatInputCommand()) return;

    const command = COMMANDS[interaction.commandName];
    command.handler(interaction);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
};
init();
