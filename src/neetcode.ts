import type { LeetcodeProblem } from './types';
import { getProblemDetails, buildFileContent } from './leetcode';
import type { ProblemDetails } from './leetcode';

export { getProblemDetails };
export type { ProblemDetails };

const DATA_URL =
  'https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json';

interface RawProblem {
  problem: string;
  difficulty: string;
  link: string;    // e.g. "contains-duplicate/"
  code: string;    // e.g. "0217-contains-duplicate"
  premium?: boolean;
}

let cache: LeetcodeProblem[] | null = null;

async function loadAll(): Promise<LeetcodeProblem[]> {
  if (cache) { return cache; }
  const res = await fetch(DATA_URL);
  if (!res.ok) { throw new Error(`NeetCode data error: ${res.status}`); }
  const raw = await res.json() as RawProblem[];
  cache = raw
    .filter(p => !p.premium)
    .map(p => {
      const dashIdx = p.code.indexOf('-');
      const id = parseInt(p.code.slice(0, dashIdx), 10).toString();
      const lcSlug = p.code.slice(dashIdx + 1);
      return {
        slug: lcSlug,
        title: p.problem,
        frontendId: id,
        difficulty: p.difficulty as LeetcodeProblem['difficulty'],
      };
    });
  return cache;
}

/** Search NeetCode problems by keyword. Returns up to 20 results. */
export async function searchProblems(query: string): Promise<LeetcodeProblem[]> {
  const all = await loadAll();
  const q = query.toLowerCase();
  return all
    .filter(p => p.title.toLowerCase().includes(q) || p.frontendId === q)
    .slice(0, 20);
}

/** Build file content with a NeetCode problem URL instead of LeetCode URL. */
export function buildNeetcodeFileContent(
  problem: LeetcodeProblem,
  details: ProblemDetails,
  langSlug: string,
): string {
  return buildFileContent(
    problem,
    details,
    langSlug,
    `https://neetcode.io/problems/${problem.slug}`,
  );
}
