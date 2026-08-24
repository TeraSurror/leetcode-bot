import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  discordToken: required("DISCORD_TOKEN"),
  discordClientId: required("DISCORD_CLIENT_ID"),
  discordGuildId: process.env.DISCORD_GUILD_ID || undefined,
  digestChannelId: required("DIGEST_CHANNEL_ID"),
  digestCron: process.env.DIGEST_CRON || "0 8 * * *",
  dbPath: process.env.DB_PATH || "./data/bot.db",
};
