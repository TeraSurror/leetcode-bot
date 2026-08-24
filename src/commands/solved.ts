import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { recordSolve, getStreak, getOrCreateUser, getListProgress } from "../db.js";

/**
 * Best-effort guess at a LeetCode slug from a typed title. Won't always
 * match the platform's canonical titleSlug exactly (e.g. unusual
 * phrasing) — good enough for streaks, but see README for the note on
 * resolving to the exact slug via a problem-search lookup as a follow-up.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export const solved: Command = {
  data: new SlashCommandBuilder()
    .setName("solved")
    .setDescription("Log a problem you just solved")
    .addStringOption((opt) =>
      opt.setName("problem").setDescription('Problem title, e.g. "Two Sum"').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("difficulty")
        .setDescription("Difficulty")
        .addChoices({ name: "Easy", value: "Easy" }, { name: "Medium", value: "Medium" }, { name: "Hard", value: "Hard" })
    ),

  async execute(interaction) {
    const title = interaction.options.getString("problem", true);
    const difficulty = interaction.options.getString("difficulty") ?? undefined;
    const slug = slugify(title);

    const { inserted } = recordSolve({
      discordId: interaction.user.id,
      slug,
      title,
      difficulty,
      source: "manual",
    });

    const user = getOrCreateUser(interaction.user.id);
    const streakCount = getStreak(interaction.user.id);
    const progress = getListProgress(interaction.user.id, user.active_list);

    if (!inserted) {
      await interaction.reply({
        content: `Already had **${title}** logged for today — nice consistency though.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(
      `✅ **${interaction.user.username}** solved **${title}**${difficulty ? ` (${difficulty})` : ""}. ` +
        `🔥 ${streakCount}-day streak · **${user.active_list}** list: ${progress.solved}/${progress.total}`
    );
  },
};
