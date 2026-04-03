export const VIEW_TYPE = 'lap-code.timerView';
export const GLOBALSTATE_KEY = 'lap-code.taskHistory';
export const CMD_FOCUS_PANEL = 'lap-code.focusPanel';

export const DEFAULT_SOURCE = 'leetcode' as const;
export const DEFAULT_LANGUAGE = 'javascript' as const;

import type { TaskSource } from './types';

export interface SourceDisplayConfig {
  label: string;
  badgeClass: string;
}

/** Add a new entry here when a new TaskSource is introduced. */
export const SOURCE_DISPLAY: Record<TaskSource, SourceDisplayConfig> = {
  leetcode: { label: 'LeetCode', badgeClass: 'badge--source-lc' },
  neetcode: { label: 'NeetCode', badgeClass: 'badge--source-nc' },
  manual:   { label: 'Manual',   badgeClass: 'badge--source-manual' },
};

export const LEETCODE_LANGUAGES = [
  { slug: 'javascript', label: 'JavaScript', ext: 'js' },
  { slug: 'typescript', label: 'TypeScript', ext: 'ts' },
  { slug: 'python3',    label: 'Python 3',   ext: 'py' },
  { slug: 'python',     label: 'Python 2',   ext: 'py' },
  { slug: 'java',       label: 'Java',        ext: 'java' },
  { slug: 'cpp',        label: 'C++',         ext: 'cpp' },
  { slug: 'c',          label: 'C',           ext: 'c' },
  { slug: 'csharp',     label: 'C#',          ext: 'cs' },
  { slug: 'golang',     label: 'Go',          ext: 'go' },
  { slug: 'kotlin',     label: 'Kotlin',      ext: 'kt' },
  { slug: 'swift',      label: 'Swift',       ext: 'swift' },
  { slug: 'rust',       label: 'Rust',        ext: 'rs' },
  { slug: 'ruby',       label: 'Ruby',        ext: 'rb' },
  { slug: 'scala',      label: 'Scala',       ext: 'scala' },
  { slug: 'php',        label: 'PHP',         ext: 'php' },
  { slug: 'dart',       label: 'Dart',        ext: 'dart' },
] as const;

export type LeetcodeLanguageSlug = typeof LEETCODE_LANGUAGES[number]['slug'];
