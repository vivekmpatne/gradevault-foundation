/**
 * Server function that proxies LeetCode's public GraphQL endpoint.
 * Solves the browser CORS failure ("Failed to fetch") seen on production
 * by performing the request server-side.
 */
import { createServerFn } from "@tanstack/react-start";

export type LeetCodeServerStats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  contestRating: number | null;
  contestCount: number | null;
  history: { contest: string; rating: number; attendedAt: number }[];
};

const QUERY = `
  query gradeVaultUser($username: String!) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      contest { title startTime }
    }
  }
`;

type LcResponse = {
  data?: {
    matchedUser: {
      username: string;
      profile: { ranking: number } | null;
      submitStatsGlobal: {
        acSubmissionNum: { difficulty: string; count: number }[];
      };
    } | null;
    userContestRanking: {
      attendedContestsCount: number;
      rating: number;
    } | null;
    userContestRankingHistory:
      | {
          attended: boolean;
          rating: number;
          contest: { title: string; startTime: number };
        }[]
      | null;
  };
  errors?: { message: string }[];
};

export const fetchLeetCodeStats = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) => {
    const u = (input?.username ?? "").trim().replace(/^@+/, "").slice(0, 40);
    if (!u || !/^[A-Za-z0-9_\-.]+$/.test(u)) {
      throw new Error("Invalid LeetCode username");
    }
    return { username: u };
  })
  .handler(async ({ data }): Promise<LeetCodeServerStats> => {
    const res = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: `https://leetcode.com/${data.username}/`,
        "User-Agent":
          "Mozilla/5.0 (compatible; GradeVault/1.0; +https://gradevault.app)",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { username: data.username },
        operationName: "gradeVaultUser",
      }),
    });

    if (!res.ok) {
      throw new Error(`LeetCode upstream returned ${res.status}`);
    }

    const json = (await res.json()) as LcResponse;
    if (json.errors?.length) {
      throw new Error(json.errors[0].message || "LeetCode error");
    }
    const user = json.data?.matchedUser;
    if (!user) throw new Error("LeetCode user not found");

    const counts = Object.fromEntries(
      user.submitStatsGlobal.acSubmissionNum.map((s) => [s.difficulty, s.count]),
    );

    const history =
      json.data?.userContestRankingHistory
        ?.filter((h) => h.attended)
        .map((h) => ({
          contest: h.contest.title,
          rating: Math.round(h.rating),
          attendedAt: h.contest.startTime * 1000,
        })) ?? [];

    return {
      username: user.username,
      totalSolved: counts.All ?? 0,
      easySolved: counts.Easy ?? 0,
      mediumSolved: counts.Medium ?? 0,
      hardSolved: counts.Hard ?? 0,
      ranking: user.profile?.ranking ?? 0,
      contestRating:
        typeof json.data?.userContestRanking?.rating === "number"
          ? Math.round(json.data.userContestRanking.rating)
          : null,
      contestCount:
        json.data?.userContestRanking?.attendedContestsCount ?? null,
      history,
    };
  });
