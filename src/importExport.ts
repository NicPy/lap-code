import * as vscode from 'vscode';
import type { TaskRecord } from './types';

// ── Validation ───────────────────────────────────────────────────────────────

const VALID_STATUSES: ReadonlySet<string> = new Set(['successfully', 'failed', 'paused']);
const VALID_SOURCES: ReadonlySet<string> = new Set(['manual', 'leetcode', 'neetcode']);
const VALID_DIFFICULTIES: ReadonlySet<string> = new Set(['Easy', 'Medium', 'Hard']);

function sanitiseRecord(raw: Record<string, unknown>): TaskRecord | null {
  const id = String(raw.id ?? '');
  const name = String(raw.name ?? '');
  if (!id || !name) { return null; }

  const status = VALID_STATUSES.has(String(raw.status)) ? String(raw.status) as TaskRecord['status'] : 'paused';
  const source = VALID_SOURCES.has(String(raw.source)) ? String(raw.source) as TaskRecord['source'] : 'manual';
  const diff = String(raw.difficulty ?? '');
  const lang = String(raw.language ?? '');

  return {
    id,
    name,
    plannedSeconds: Math.max(0, parseInt(String(raw.plannedSeconds), 10) || 0),
    elapsedSeconds: Math.max(0, parseInt(String(raw.elapsedSeconds), 10) || 0),
    completedAt: parseInt(String(raw.completedAt), 10) || Date.now(),
    status,
    source,
    language: lang || undefined,
    difficulty: VALID_DIFFICULTIES.has(diff) ? diff as TaskRecord['difficulty'] : undefined,
    isFavourite: String(raw.isFavourite) === 'true',
  };
}

// ── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

function parseCSV(raw: string): TaskRecord[] {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length < 2) { throw new Error('CSV file has no data rows'); }
  const headers = lines[0].split(',').map(h => h.trim());
  const results: TaskRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = values[idx]?.trim() ?? ''; });
    const record = sanitiseRecord(obj);
    if (record) { results.push(record); }
  }
  return results;
}

function parseJSON(raw: string): TaskRecord[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) { throw new Error('Expected a JSON array'); }
  const results: TaskRecord[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) { continue; }
    const record = sanitiseRecord(entry);
    if (record) { results.push(record); }
  }
  return results;
}

function detectFormat(raw: string): 'json' | 'csv' {
  const trimmed = raw.trimStart();
  return trimmed.startsWith('[') || trimmed.startsWith('{') ? 'json' : 'csv';
}

// ── Public API ───────────────────────────────────────────────────────────────

export function exportToJSON(history: TaskRecord[]): string {
  return JSON.stringify(history, null, 2);
}

export function exportToCSV(history: TaskRecord[]): string {
  const headers = 'id,name,plannedSeconds,elapsedSeconds,completedAt,status,source,language,difficulty,isFavourite';
  const rows = history.map(t => [
    t.id,
    `"${(t.name ?? '').replace(/"/g, '""')}"`,
    t.plannedSeconds,
    t.elapsedSeconds,
    t.completedAt,
    t.status,
    t.source,
    t.language ?? '',
    t.difficulty ?? '',
    t.isFavourite ? 'true' : 'false',
  ].join(','));
  return [headers, ...rows].join('\n');
}

export async function importTasksFromFile(): Promise<TaskRecord[]> {
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { 'Lap Code Export': ['json', 'csv'] },
  });
  if (!uris || uris.length === 0) { return []; }

  const raw = Buffer.from(await vscode.workspace.fs.readFile(uris[0])).toString('utf8');

  const format = detectFormat(raw);
  return format === 'json' ? parseJSON(raw) : parseCSV(raw);
}
