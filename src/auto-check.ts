import { getAllUsersWithLeetcode, recordSolve } from "./db.js";
import { getAcceptedSince } from "./leetcode.js";

// 26h, not 24h — a small overlap so a slightly-delayed run never misses a
// submission right at the boundary. recordSolve's UNIQUE constraint makes
// re-seeing the same solve on the same day a harmless no-op.
const LOOKBACK_SECONDS = 26 * 60 * 60;

export async function runAutoCheck(): Promise<{ checked: number; newSolves: number; errors: string[] }> {
  const users = getAllUsersWithLeetcode();
  const since = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;
  let newSolves = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      const accepted = await getAcceptedSince(user.leetcode_username as string, since);
      for (const sub of accepted) {
        const { inserted } = recordSolve({
          discordId: user.discord_id,
          slug: sub.titleSlug,
          title: sub.title,
          source: "auto",
          solvedAt: new Date(Number(sub.timestamp) * 1000),
        });
        if (inserted) newSolves++;
      }
    } catch (err) {
      errors.push(`${user.leetcode_username}: ${(err as Error).message}`);
    }
  }

  return { checked: users.length, newSolves, errors };
}
