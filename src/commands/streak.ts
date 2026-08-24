import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { getOrCreateUser, getStreak, getListProgress } from "../db.js";

export const streak: Command = {
  data: new SlashCommandBuilder()
    .setName("streak")
    .setDescription("Check your (or someone else's) current streak and list progress")
    .addUserOption((opt) => opt.setName("user").setDescription("Whose streak to check (defaults to you)")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const user = getOrCreateUser(target.id);
    const streakCount = getStreak(target.id);
    const progress = getListProgress(target.id, user.active_list);

    await interaction.reply(
      `**${target.username}** — 🔥 ${streakCount}-day streak · **${user.active_list}** list: ${progress.solved}/${progress.total} solved`
    );
  },
};
