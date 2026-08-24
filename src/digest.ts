import { EmbedBuilder, TextChannel, type Client } from "discord.js";
import { getDigestData } from "./db.js";
import { runAutoCheck } from "./auto-check.js";
import { env } from "./env.js";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function postDailyDigest(client: Client): Promise<void> {
  // Catch anything the auto-checker missed before summarizing the day.
  await runAutoCheck().catch((err) => console.error("Auto-check before digest failed:", err));

  const today = isoDate(new Date());
  const data = getDigestData(today);
  if (data.length === 0) return;

  const lines = data
    .sort((a, b) => b.streak - a.streak)
    .map((u) => {
      const status = u.solvedToday.length > 0 ? "✅" : "❌";
      const solvedText = u.solvedToday.length > 0 ? u.solvedToday.join(", ") : "missed";
      return `${status} <@${u.discordId}> — ${solvedText} — 🔥 ${u.streak}-day streak — ${u.listName}: ${u.progress.solved}/${u.progress.total}`;
    });

  const embed = new EmbedBuilder()
    .setTitle("📊 Daily LeetCode Check-in")
    .setDescription(lines.join("\n"))
    .setColor(0x2ecc71)
    .setTimestamp();

  const channel = await client.channels.fetch(env.digestChannelId);
  if (channel instanceof TextChannel) {
    await channel.send({ embeds: [embed] });
  } else {
    console.error(`DIGEST_CHANNEL_ID (${env.digestChannelId}) is not a text channel the bot can post in.`);
  }
}
