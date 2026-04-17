import * as vscode from 'vscode';
import { LEETCODE_LANGUAGES } from './constants';
import type { LeetcodeProblem } from './types';
import { getProblemDetails, buildFileContent } from './leetcode';
import { getProblemDetails as getNeetcodeProblemDetails, buildNeetcodeFileContent } from './neetcode';
import type { TaskSource } from './types';

interface ProblemFileConfig {
  dirName: string;
  getDetails: (slug: string) => Promise<{ content: string; codeSnippets: Record<string, string> }>;
  buildContent: (problem: LeetcodeProblem, details: { content: string; codeSnippets: Record<string, string> }, langSlug: string) => string;
}

const SOURCE_CONFIG: Record<string, ProblemFileConfig> = {
  leetcode: {
    dirName: 'leetcode',
    getDetails: getProblemDetails,
    buildContent: buildFileContent,
  },
  neetcode: {
    dirName: 'neetcode',
    getDetails: getNeetcodeProblemDetails,
    buildContent: buildNeetcodeFileContent,
  },
};

/** Create a problem file in the workspace for the given source. */
export async function createProblemFile(
  source: TaskSource,
  problem: LeetcodeProblem,
  langSlug: string,
): Promise<void> {
  const config = SOURCE_CONFIG[source];
  if (!config) { return; }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) { return; }

  const ext = LEETCODE_LANGUAGES.find(l => l.slug === langSlug)?.ext ?? 'js';
  const details = await config.getDetails(problem.slug);
  const content = config.buildContent(problem, details, langSlug);

  const dir = vscode.Uri.joinPath(workspaceRoot, config.dirName);
  const fileUri = vscode.Uri.joinPath(dir, `${problem.slug}.${ext}`);

  await vscode.workspace.fs.createDirectory(dir);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));

  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc, { preview: false });
}
