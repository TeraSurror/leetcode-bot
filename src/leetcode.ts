const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

export interface RecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: string; // unix seconds, as a string
  statusDisplay: string;
  lang: string;
}

const RECENT_SUBMISSIONS_QUERY = `
  query recentSubmissions($username: String!) {
    recentSubmissionList(username: $username) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

/**
 * Public, unofficial endpoint — undocumented and can change without notice.
 * Kept as a single small function so it's easy to patch if LeetCode alters
 * the schema. Only returns up to the last 20 submissions per LeetCode's own
 * limit, so a user who goes quiet for a while and comes back with >20 new
 * accepted submissions will only show the most recent 20 here.
 */
export async function getAcceptedSince(username: string, sinceEpochSeconds: number): Promise<RecentSubmission[]> {
  const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; leetcode-accountability-bot/0.1)",
    },
    body: JSON.stringify({
      query: RECENT_SUBMISSIONS_QUERY,
      variables: { username },
      operationName: "recentSubmissions",
    }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API returned HTTP ${res.status} for user "${username}"`);
  }

  const json = (await res.json()) as {
    data?: { recentSubmissionList?: RecentSubmission[] };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    throw new Error(`LeetCode API error for "${username}": ${json.errors[0].message}`);
  }

  const submissions = json.data?.recentSubmissionList ?? [];
  return submissions.filter((s) => s.statusDisplay === "Accepted" && Number(s.timestamp) >= sinceEpochSeconds);
}
