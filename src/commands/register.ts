import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { setLeetcodeUsername } from "../db.js";
import { getAcceptedSince } from "../leetcode.js";

export const register: Command = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Link your LeetCode username so solves can be auto-detected")
    .addStringOption((opt) => opt.setName("username").setDescription("Your exact LeetCode username").setRequired(true)),

  async execute(interaction) {
    const username = interaction.options.getString("username", true);
    await interaction.deferReply({ ephemeral: true });

    try {
      // Cheap reachability check — a bad username usually just comes back
      // empty rather than erroring, so this mainly catches network/HTTP
      // failures and obvious typos, not every possible mistake.
      await getAcceptedSince(username, Math.floor(Date.now() / 1000));
    } catch (err) {
      await interaction.editReply(
        `Couldn't reach LeetCode for username "${username}" (${(err as Error).message}). Double-check the spelling and try again.`
      );
      return;
    }

    setLeetcodeUsername(interaction.user.id, username);
    await interaction.editReply(
      `Linked! I'll auto-detect accepted submissions from **${username}** during the daily check. You can also log manually any time with \`/solved\`.`
    );
  },
};
