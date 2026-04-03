import { useRef, useState, useEffect } from 'preact/hooks';
import { vscode } from '../vscode';
import type { LeetcodeProblem, TaskSource } from '@shared/types';
import { DEFAULT_SOURCE, DEFAULT_LANGUAGE, LEETCODE_LANGUAGES } from '@shared/constants';

// ── Debounce helper ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Generic problem combobox ───────────────────────────────────────────────────

type SearchMsgType = 'searchLeetcode' | 'searchNeetcode';
type ResultsMsgType = 'leetcodeSearchResults' | 'neetcodeSearchResults';
type ErrorMsgType = 'leetcodeError' | 'neetcodeError';

interface ProblemComboboxProps {
  onSelect: (problem: LeetcodeProblem) => void;
  searchMsg: SearchMsgType;
  resultsMsg: ResultsMsgType;
  errorMsg: ErrorMsgType;
}

function ProblemCombobox({ onSelect, searchMsg, resultsMsg, errorMsg }: ProblemComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<LeetcodeProblem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selected, setSelected] = useState<LeetcodeProblem | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedInput = useDebounce(inputValue, 400);

  // Reset state when the search message type changes (source switched)
  useEffect(() => {
    setInputValue('');
    setResults([]);
    setIsOpen(false);
    setSelected(null);
    setSearchError('');
    onSelect(null!);
  }, [searchMsg]);

  // Trigger search when debounced input changes (and no problem is already selected)
  useEffect(() => {
    if (selected) { return; }
    const q = debouncedInput.trim();
    if (!q) { setResults([]); setIsOpen(false); return; }
    setIsSearching(true);
    setSearchError('');
    vscode.postMessage({ type: searchMsg, query: q });
  }, [debouncedInput, selected]);

  // Receive search results from host
  useEffect(() => {
    function handler(event: MessageEvent) {
      const msg = event.data;
      if (msg.type === resultsMsg) {
        setResults(msg.problems as LeetcodeProblem[]);
        setIsSearching(false);
        setIsOpen((msg.problems as LeetcodeProblem[]).length > 0);
        setFocusedIndex(-1);
      }
      if (msg.type === errorMsg) {
        setSearchError(msg.message as string);
        setIsSearching(false);
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [resultsMsg, errorMsg]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectProblem(problem: LeetcodeProblem) {
    setSelected(problem);
    setInputValue(`${problem.frontendId ? problem.frontendId + '. ' : ''}${problem.title}`);
    setIsOpen(false);
    setResults([]);
    onSelect(problem);
  }

  function handleInput(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    setInputValue(val);
    setSelected(null);
    onSelect(null!);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) { return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0) { selectProblem(results[focusedIndex]); }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const difficultyClass = (d: string) =>
    d === 'Easy' ? 'diff--easy' : d === 'Hard' ? 'diff--hard' : 'diff--medium';

  return (
    <div class="combobox" ref={wrapperRef}>
      <input
        type="text"
        placeholder="e.g. Two Sum"
        value={inputValue}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0 && !selected) { setIsOpen(true); } }}
        autoFocus
        aria-autocomplete="list"
        aria-expanded={isOpen}
      />
      {isSearching && <div class="combobox__status">Searching…</div>}
      {searchError && <div class="form-error">{searchError}</div>}
      {isOpen && results.length > 0 && (
        <ul class="combobox__dropdown" role="listbox">
          {results.map((p, i) => (
            <li
              key={p.slug}
              role="option"
              class={`combobox__option${i === focusedIndex ? ' combobox__option--focused' : ''}`}
              onMouseDown={() => selectProblem(p)}
              onMouseEnter={() => setFocusedIndex(i)}
            >
              <span class="combobox__option-id">{p.frontendId}.</span>
              <span class="combobox__option-title">{p.title}</span>
              <span class={`combobox__option-diff ${difficultyClass(p.difficulty)}`}>{p.difficulty[0]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── StartForm ─────────────────────────────────────────────────────────────────

export function StartForm() {
  const [source, setSource] = useState<TaskSource>(DEFAULT_SOURCE);
  const [selectedProblem, setSelectedProblem] = useState<LeetcodeProblem | null>(null);
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const nameRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  function handleStart() {
    const plannedMinutes = parseInt(minutesRef.current?.value ?? '45', 10) || 45;

    if (source === 'leetcode') {
      if (!selectedProblem) { return; }
      vscode.postMessage({
        type: 'startTask',
        name: selectedProblem.title,
        plannedMinutes,
        source: 'leetcode',
        leetcodeProblem: selectedProblem,
        language,
      });
    } else if (source === 'neetcode') {
      if (!selectedProblem) { return; }
      vscode.postMessage({
        type: 'startTask',
        name: selectedProblem.title,
        plannedMinutes,
        source: 'neetcode',
        neetcodeProblem: selectedProblem,
        language,
      });
    } else {
      const name = nameRef.current?.value.trim() ?? '';
      if (!name) { nameRef.current?.focus(); return; }
      vscode.postMessage({ type: 'startTask', name, plannedMinutes, source: 'manual' });
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { handleStart(); }
  }

  const isProblemSource = source === 'leetcode' || source === 'neetcode';

  return (
    <div class="start-form">

      {/* ── Source selector ── */}
      <div class="form-group">
        <label for="source-select">Source</label>
        <select
          id="source-select"
          class="select-full"
          value={source}
          onChange={e => setSource((e.currentTarget as HTMLSelectElement).value as TaskSource)}
        >
          <option value="leetcode">LeetCode</option>
          <option value="neetcode">NeetCode</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {isProblemSource ? (
        <>
          {/* ── Problem combobox ── */}
          <div class="form-group">
            <label>Problem</label>
            <ProblemCombobox
              onSelect={setSelectedProblem}
              searchMsg={source === 'neetcode' ? 'searchNeetcode' : 'searchLeetcode'}
              resultsMsg={source === 'neetcode' ? 'neetcodeSearchResults' : 'leetcodeSearchResults'}
              errorMsg={source === 'neetcode' ? 'neetcodeError' : 'leetcodeError'}
            />
          </div>

          {/* ── Language selector ── */}
          <div class="form-group">
            <label for="lc-lang">Language</label>
            <select
              id="lc-lang"
              class="select-full"
              value={language}
              onChange={e => setLanguage((e.currentTarget as HTMLSelectElement).value)}
            >
              {LEETCODE_LANGUAGES.map(l => (
                <option key={l.slug} value={l.slug}>{l.label}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div class="form-group">
          <label for="task-name">Task Name</label>
          <input
            id="task-name"
            ref={nameRef}
            type="text"
            placeholder="e.g. Two Sum"
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}

      {/* ── Planned time (shared) ── */}
      <div class="form-group">
        <label for="planned-time">Planned Time (minutes)</label>
        <input
          id="planned-time"
          ref={minutesRef}
          type="number"
          value={45}
          min={1}
          max={300}
          onKeyDown={handleKeyDown}
        />
      </div>

      <button
        class="btn-primary btn-full"
        onClick={handleStart}
        disabled={isProblemSource && !selectedProblem}
      >
        Start Task
      </button>
    </div>
  );
}
