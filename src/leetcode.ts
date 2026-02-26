import type { LeetcodeProblem } from './types';
import { LEETCODE_LANGUAGES } from './constants';

const GRAPHQL_URL = 'https://leetcode.com/graphql/';

const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
};

/** Search for problems by keyword. Returns up to 20 results. */
export async function searchProblems(query: string): Promise<LeetcodeProblem[]> {
  const body = JSON.stringify({
    query: `
      query problemsetQuestionList($filters: QuestionListFilterInput, $limit: Int, $skip: Int) {
        problemsetQuestionList: questionList(
          categorySlug: ""
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          questions: data {
            frontendQuestionId: questionFrontendId
            title
            titleSlug
            difficulty
            isPaidOnly
          }
        }
      }
    `,
    variables: {
      filters: { searchKeywords: query },
      limit: 20,
      skip: 0,
    },
  });

  const res = await fetch(GRAPHQL_URL, { method: 'POST', headers: HEADERS, body });
  if (!res.ok) { throw new Error(`LeetCode API error: ${res.status}`); }

  const json = await res.json() as {
    data: {
      problemsetQuestionList: {
        questions: Array<{
          frontendQuestionId: string;
          title: string;
          titleSlug: string;
          difficulty: string;
          isPaidOnly: boolean;
        }>;
      };
    };
  };

  return (json.data.problemsetQuestionList.questions ?? [])
    .filter(q => !q.isPaidOnly)
    .map(q => ({
      slug: q.titleSlug,
      title: q.title,
      frontendId: q.frontendQuestionId,
      difficulty: q.difficulty as LeetcodeProblem['difficulty'],
    }));
}

export interface ProblemDetails {
  content: string;                  // raw HTML description
  codeSnippets: Record<string, string>; // langSlug → starter code
}

/** Fetch the full problem details including HTML content and starter code snippets. */
export async function getProblemDetails(slug: string): Promise<ProblemDetails> {
  const body = JSON.stringify({
    query: `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          content
          codeSnippets {
            langSlug
            code
          }
        }
      }
    `,
    variables: { titleSlug: slug },
  });

  const res = await fetch(GRAPHQL_URL, { method: 'POST', headers: HEADERS, body });
  if (!res.ok) { throw new Error(`LeetCode API error: ${res.status}`); }

  const json = await res.json() as {
    data: {
      question: {
        content: string;
        codeSnippets: Array<{ langSlug: string; code: string }> | null;
      } | null;
    };
  };

  const question = json.data.question;
  if (!question) { throw new Error(`Problem "${slug}" not found`); }

  const codeSnippets: Record<string, string> = {};
  for (const snippet of question.codeSnippets ?? []) {
    codeSnippets[snippet.langSlug] = snippet.code;
  }

  return { content: question.content ?? '', codeSnippets };
}

/** Strip HTML tags and decode basic entities for use in file comments. */
export function htmlToText(html: string): string {
  return html
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) =>
      inner.replace(/<[^>]+>/g, '').trim() + '\n',
    )
    .replace(/<li[^>]*>/gi, '  - ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Build the file content: description as block comment + starter code. */
export function buildFileContent(
  problem: LeetcodeProblem,
  details: ProblemDetails,
  langSlug: string,
): string {
  const desc = htmlToText(details.content);
  const lang = LEETCODE_LANGUAGES.find(l => l.slug === langSlug);
  const snippet = details.codeSnippets[langSlug] ?? '';

  const commentLines = [
    `${problem.frontendId}. ${problem.title}`,
    `Difficulty: ${problem.difficulty}`,
    `URL: https://leetcode.com/problems/${problem.slug}/`,
    '',
    ...desc.split('\n'),
  ];

  let header: string;
  if (langSlug === 'python' || langSlug === 'python3') {
    header = `"""\n${commentLines.join('\n')}\n"""`;
  } else if (langSlug === 'c' || langSlug === 'cpp' || langSlug === 'csharp'
          || langSlug === 'java' || langSlug === 'javascript' || langSlug === 'typescript'
          || langSlug === 'kotlin' || langSlug === 'swift' || langSlug === 'rust'
          || langSlug === 'scala' || langSlug === 'golang' || langSlug === 'dart'
          || langSlug === 'php') {
    header = `/*\n${commentLines.map(l => ` * ${l}`).join('\n')}\n */`;
  } else {
    // fallback: line comments
    header = commentLines.map(l => `// ${l}`).join('\n');
  }

  return snippet ? `${header}\n\n${snippet}\n` : `${header}\n`;
}
