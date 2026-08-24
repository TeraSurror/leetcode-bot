import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import {
  createList,
  listExists,
  importProblems,
  setActiveList,
  getNextUnsolved,
  getListProgress,
  getOrCreateUser,
} from "../db.js";
import type { ListProblem } from "../db.js";

/** Expects one problem per line: title,slug,difficulty (difficulty optional).
 *  A header row starting with "title," is skipped automatically. */
export function parseCsv(text: string): ListProblem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("title,"))
    .map((line) => {
      const [title, slug, difficulty] = line.split(",").map((s) => s?.trim());
      return { title, slug, difficulty: difficulty || null };
    })
    .filter((p): p is ListProblem => Boolean(p.title && p.slug));
}

export const list: Command = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("Manage curated problem lists")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new empty list")
        .addStringOption((opt) => opt.setName("name").setDescription("List name, e.g. hrt-prep").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("import")
        .setDescription("Add problems to a list from a CSV file (title,slug,difficulty per line)")
        .addStringOption((opt) => opt.setName("name").setDescription("List name to import into").setRequired(true))
        .addAttachmentOption((opt) => opt.setName("csv").setDescription("CSV file").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("switch")
        .setDescription("Set your active list")
        .addStringOption((opt) => opt.setName("name").setDescription("List name").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("next").setDescription("Get your next unsolved problem on your active list"))
    .addSubcommand((sub) =>
      sub
        .setName("progress")
        .setDescription("Show list completion")
        .addUserOption((opt) => opt.setName("user").setDescription("Whose progress to check"))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const name = interaction.options.getString("name", true);
      const ok = createList(name, interaction.user.id);
      await interaction.reply(
        ok ? `Created list **${name}**. Import problems with \`/list import\`.` : `A list named **${name}** already exists.`
      );
      return;
    }

    if (sub === "import") {
      const name = interaction.options.getString("name", true);
      const attachment = interaction.options.getAttachment("csv", true);

      if (!listExists(name)) {
        await interaction.reply({ content: `No list named **${name}** — create it first with \`/list create\`.`, ephemeral: true });
        return;
      }

      await interaction.deferReply();
      const res = await fetch(attachment.url);
      const text = await res.text();
      const problems = parseCsv(text);

      if (problems.length === 0) {
        await interaction.editReply(`Couldn't find any valid rows. Expected \`title,slug,difficulty\` per line.`);
        return;
      }

      const inserted = importProblems(name, problems);
      await interaction.editReply(
        `Imported ${inserted} new problem(s) into **${name}** (${problems.length - inserted} were already there).`
      );
      return;
    }

    if (sub === "switch") {
      const name = interaction.options.getString("name", true);
      if (!listExists(name)) {
        await interaction.reply({ content: `No list named **${name}**.`, ephemeral: true });
        return;
      }
      setActiveList(interaction.user.id, name);
      await interaction.reply({ content: `Your active list is now **${name}**.`, ephemeral: true });
      return;
    }

    if (sub === "next") {
      const user = getOrCreateUser(interaction.user.id);
      const next = getNextUnsolved(interaction.user.id, user.active_list);
      if (!next) {
        await interaction.reply(`You've solved everything on **${user.active_list}** — nice. Try \`/list switch\` to move to a new one.`);
        return;
      }
      await interaction.reply(
        `Next up on **${user.active_list}**: **${next.title}**${next.difficulty ? ` (${next.difficulty})` : ""} — https://leetcode.com/problems/${next.slug}/`
      );
      return;
    }

    if (sub === "progress") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const user = getOrCreateUser(target.id);
      const progress = getListProgress(target.id, user.active_list);
      const pct = progress.total === 0 ? 0 : Math.round((progress.solved / progress.total) * 100);
      await interaction.reply(`**${target.username}** — **${user.active_list}** list: ${progress.solved}/${progress.total} (${pct}%)`);
      return;
    }
  },
};
