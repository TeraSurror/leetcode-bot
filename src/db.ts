import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";

fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

export const db = new Database(env.dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    leetcode_username TEXT,
    active_list TEXT NOT NULL DEFAULT 'starter'
  );

  CREATE TABLE IF NOT EXISTS solves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    problem_slug TEXT NOT NULL,
    problem_title TEXT NOT NULL,
    difficulty TEXT,
    source TEXT NOT NULL CHECK (source IN ('manual', 'auto')),
    solved_date TEXT NOT NULL,   -- YYYY-MM-DD, drives streaks
    solved_at TEXT NOT NULL,     -- full ISO timestamp, for display/audit
    UNIQUE(discord_id, problem_slug, solved_date)
  );

  CREATE TABLE IF NOT EXISTS lists (
    name TEXT PRIMARY KEY,
    created_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS list_problems (
    list_name TEXT NOT NULL REFERENCES lists(name),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (list_name, slug)
  );
`);

export interface UserRow {
  discord_id: string;
  leetcode_username: string | null;
  active_list: string;
}

export interface ListProblem {
  slug: string;
  title: string;
  difficulty: string | null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------- users ----------

export function getOrCreateUser(discordId: string): UserRow {
  db.prepare(`INSERT OR IGNORE INTO users (discord_id, active_list) VALUES (?, 'starter')`).run(discordId);
  return db.prepare(`SELECT * FROM users WHERE discord_id = ?`).get(discordId) as UserRow;
}

export function setLeetcodeUsername(discordId: string, username: string): void {
  getOrCreateUser(discordId);
  db.prepare(`UPDATE users SET leetcode_username = ? WHERE discord_id = ?`).run(username, discordId);
}

export function setActiveList(discordId: string, listName: string): void {
  getOrCreateUser(discordId);
  db.prepare(`UPDATE users SET active_list = ? WHERE discord_id = ?`).run(listName, discordId);
}

export function getAllUsersWithLeetcode(): UserRow[] {
  return db.prepare(`SELECT * FROM users WHERE leetcode_username IS NOT NULL`).all() as UserRow[];
}

export function getAllUsers(): UserRow[] {
  return db.prepare(`SELECT * FROM users`).all() as UserRow[];
}

// ---------- solves ----------

export function recordSolve(params: {
  discordId: string;
  slug: string;
  title: string;
  difficulty?: string | null;
  source: "manual" | "auto";
  solvedAt?: Date;
}): { inserted: boolean } {
  getOrCreateUser(params.discordId);
  const when = params.solvedAt ?? new Date();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO solves (discord_id, problem_slug, problem_title, difficulty, source, solved_date, solved_at)
       VALUES (@discordId, @slug, @title, @difficulty, @source, @solvedDate, @solvedAt)`
    )
    .run({
      discordId: params.discordId,
      slug: params.slug,
      title: params.title,
      difficulty: params.difficulty ?? null,
      source: params.source,
      solvedDate: isoDate(when),
      solvedAt: when.toISOString(),
    });
  return { inserted: result.changes > 0 };
}

/** Consecutive-day streak. A day with no solve YET doesn't break the streak
 *  until it actually ends — so this counts back from today if today already
 *  has a solve, otherwise from yesterday. */
export function getStreak(discordId: string): number {
  const rows = db
    .prepare(`SELECT DISTINCT solved_date FROM solves WHERE discord_id = ? ORDER BY solved_date DESC`)
    .all(discordId) as { solved_date: string }[];
  if (rows.length === 0) return 0;

  const dates = new Set(rows.map((r) => r.solved_date));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  if (!dates.has(isoDate(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (dates.has(isoDate(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function getSolvedTitlesOnDate(discordId: string, dateIso: string): string[] {
  const rows = db
    .prepare(`SELECT problem_title FROM solves WHERE discord_id = ? AND solved_date = ?`)
    .all(discordId, dateIso) as { problem_title: string }[];
  return rows.map((r) => r.problem_title);
}

export function hasSolvedSlug(discordId: string, slug: string): boolean {
  return !!db.prepare(`SELECT 1 FROM solves WHERE discord_id = ? AND problem_slug = ?`).get(discordId, slug);
}

// ---------- lists ----------

export function createList(name: string, createdBy: string): boolean {
  try {
    db.prepare(`INSERT INTO lists (name, created_by, created_at) VALUES (?, ?, ?)`).run(
      name,
      createdBy,
      new Date().toISOString()
    );
    return true;
  } catch {
    return false; // name already taken
  }
}

export function listExists(name: string): boolean {
  return !!db.prepare(`SELECT 1 FROM lists WHERE name = ?`).get(name);
}

export function importProblems(listName: string, problems: ListProblem[]): number {
  const { maxIdx } = db
    .prepare(`SELECT COALESCE(MAX(order_index), -1) AS maxIdx FROM list_problems WHERE list_name = ?`)
    .get(listName) as { maxIdx: number };

  const insert = db.prepare(
    `INSERT OR IGNORE INTO list_problems (list_name, slug, title, difficulty, order_index)
     VALUES (@listName, @slug, @title, @difficulty, @orderIndex)`
  );

  const insertMany = db.transaction((rows: ListProblem[]) => {
    let idx = maxIdx + 1;
    let inserted = 0;
    for (const p of rows) {
      const res = insert.run({
        listName,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty ?? null,
        orderIndex: idx,
      });
      if (res.changes > 0) {
        idx++;
        inserted++;
      }
    }
    return inserted;
  });

  return insertMany(problems);
}

export function getNextUnsolved(discordId: string, listName: string): ListProblem | undefined {
  return db
    .prepare(
      `SELECT slug, title, difficulty FROM list_problems
       WHERE list_name = ?
         AND slug NOT IN (SELECT problem_slug FROM solves WHERE discord_id = ?)
       ORDER BY order_index ASC
       LIMIT 1`
    )
    .get(listName, discordId) as ListProblem | undefined;
}

export function getListProgress(discordId: string, listName: string): { total: number; solved: number } {
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM list_problems WHERE list_name = ?`).get(listName) as { c: number }
  ).c;
  const solved = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM list_problems lp
         JOIN solves s ON s.problem_slug = lp.slug AND s.discord_id = ?
         WHERE lp.list_name = ?`
      )
      .get(discordId, listName) as { c: number }
  ).c;
  return { total, solved };
}

// ---------- digest ----------

export function getDigestData(dateIso: string) {
  return getAllUsers().map((u) => ({
    discordId: u.discord_id,
    solvedToday: getSolvedTitlesOnDate(u.discord_id, dateIso),
    streak: getStreak(u.discord_id),
    listName: u.active_list,
    progress: getListProgress(u.discord_id, u.active_list),
  }));
}
