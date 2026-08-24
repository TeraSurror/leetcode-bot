import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { runAutoCheck } from "../auto-check.js";

export const sync: Command = {
  data: new SlashCommandBuilder().setName("sync").setDescription("Manually re-check everyone's LeetCode activity right now"),

  async execute(interaction) {
    await interaction.deferReply();
    const result = await runAutoCheck();
    await interaction.editReply(
      `Checked ${result.checked} linked account(s), found ${result.newSolves} new solve(s).` +
        (result.errors.length > 0 ? `\n⚠️ ${result.errors.length} error(s): ${result.errors.slice(0, 3).join("; ")}` : "")
    );
  },
};
