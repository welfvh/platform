// Local storage utilities for managing evaluation runs and prompt versions
import type { EvaluationRun, PromptVersion } from './types';

const RUNS_KEY = 'eval_runs';
const PROMPT_VERSIONS_KEY = 'prompt_versions';
const CURRENT_PROMPT_VERSION_KEY = 'current_prompt_version';

// Evaluation Runs
export function saveRun(run: EvaluationRun): void {
  if (typeof window === 'undefined') return;

  const runs = getRuns();
  const existingIndex = runs.findIndex(r => r.id === run.id);

  if (existingIndex >= 0) {
    runs[existingIndex] = run;
  } else {
    runs.push(run);
  }

  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

export function getRuns(): EvaluationRun[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(RUNS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getRun(id: string): EvaluationRun | null {
  const runs = getRuns();
  return runs.find(r => r.id === id) || null;
}

export function deleteRun(id: string): void {
  if (typeof window === 'undefined') return;

  const runs = getRuns().filter(r => r.id !== id);
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

// Prompt Versions
export function savePromptVersion(version: PromptVersion): void {
  if (typeof window === 'undefined') return;

  const versions = getPromptVersions();
  const existingIndex = versions.findIndex(v => v.id === version.id);

  if (existingIndex >= 0) {
    versions[existingIndex] = version;
  } else {
    versions.push(version);
  }

  localStorage.setItem(PROMPT_VERSIONS_KEY, JSON.stringify(versions));
}

export function getPromptVersions(): PromptVersion[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(PROMPT_VERSIONS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getPromptVersion(id: string): PromptVersion | null {
  const versions = getPromptVersions();
  return versions.find(v => v.id === id) || null;
}

export function setCurrentPromptVersionId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_PROMPT_VERSION_KEY, id);
}

export function getCurrentPromptVersionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_PROMPT_VERSION_KEY);
}

// Initialize default prompt version if none exists
export function initializeDefaultPromptVersion(content: string): PromptVersion {
  const versions = getPromptVersions();
  let currentId = getCurrentPromptVersionId();

  // If we have a current version, return it
  if (currentId) {
    const existing = getPromptVersion(currentId);
    if (existing) return existing;
  }

  // Check if we have any versions
  if (versions.length > 0) {
    const latest = versions[versions.length - 1];
    setCurrentPromptVersionId(latest.id);
    return latest;
  }

  // Create the first version
  const firstVersion: PromptVersion = {
    id: 'v1',
    version: 'v2.3',
    content: content,
    createdAt: Date.now(),
    description: 'Initial version',
  };

  savePromptVersion(firstVersion);
  setCurrentPromptVersionId(firstVersion.id);

  return firstVersion;
}
