import { Client, Events, GatewayIntentBits } from "discord.js";
import cron from "node-cron";
import { env } from "./env.js";
import { commands } from "./commands/index.js";
import { postDailyDigest } from "./digest.js";
import { createList, importProblems, listExists } from "./db.js";
import { STARTER_LIST, STARTER_LIST_NAME } from "./data/starter-list.js";

// Seed the demo list once so /list next works immediately. Real usage is
// expected to layer /list create + /list import on top of (or instead of)
// this — see README.
if (!listExists(STARTER_LIST_NAME)) {
  createList(STARTER_LIST_NAME, "system");
  importProblems(STARTER_LIST_NAME, STARTER_LIST);
}

const commandMap = new Map(commands.map((c) => [c.data.name, c]));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  cron.schedule(env.digestCron, () => {
    postDailyDigest(client).catch((err) => console.error("Failed to post digest:", err));
  });
  console.log(`Daily digest scheduled ("${env.digestCron}") -> channel ${env.digestChannelId}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const payload = { content: "Something went wrong running that command.", ephemeral: true } as const;
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

client.login(env.discordToken);
