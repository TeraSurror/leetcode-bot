import { REST, Routes } from "discord.js";
import { env } from "./env.js";
import { commands } from "./commands/index.js";

const rest = new REST().setToken(env.discordToken);
const body = commands.map((c) => c.data.toJSON());

async function main() {
  const route = env.discordGuildId
    ? Routes.applicationGuildCommands(env.discordClientId, env.discordGuildId)
    : Routes.applicationCommands(env.discordClientId);

  const result = (await rest.put(route, { body })) as unknown[];
  console.log(
    `Registered ${result.length} slash command(s)${env.discordGuildId ? ` to guild ${env.discordGuildId}` : " globally (can take up to ~1h to appear)"}.`
  );
}

main().catch((err) => {
  console.error("Failed to deploy commands:", err);
  process.exit(1);
});
