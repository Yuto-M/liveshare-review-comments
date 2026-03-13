import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface StoredComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface StoredThread {
  id: string;
  uri: string;
  startLine: number; // 1-based
  endLine: number;   // 1-based
  comments: StoredComment[];
}

interface StorageData {
  threads: StoredThread[];
}

const STORAGE_FILE = '.review-comments.json';

function storagePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, STORAGE_FILE);
}

function isValidThread(t: unknown, workspaceRoot: string): t is StoredThread {
  if (!t || typeof t !== 'object') {
    return false;
  }
  const obj = t as Record<string, unknown>;
  if (
    typeof obj.id !== 'string' ||
    typeof obj.uri !== 'string' ||
    typeof obj.startLine !== 'number' ||
    typeof obj.endLine !== 'number' ||
    !Array.isArray(obj.comments)
  ) {
    return false;
  }
  // Reject negative or excessively large line numbers
  if (obj.startLine < 1 || obj.endLine < 1 || obj.startLine > 100000 || obj.endLine > 100000) {
    return false;
  }
  // Reject URIs outside the workspace
  try {
    const fsPath = vscode.Uri.parse(obj.uri as string).fsPath;
    const normalized = path.normalize(fsPath);
    const root = path.normalize(workspaceRoot);
    if (!normalized.startsWith(root + path.sep) && normalized !== root) {
      return false;
    }
  } catch {
    return false;
  }
  // Validate each comment entry
  for (const c of obj.comments as unknown[]) {
    if (!c || typeof c !== 'object') {
      return false;
    }
    const comment = c as Record<string, unknown>;
    if (
      typeof comment.id !== 'string' ||
      typeof comment.author !== 'string' ||
      typeof comment.body !== 'string' ||
      typeof comment.createdAt !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

export function loadThreads(workspaceRoot: string): StoredThread[] {
  const file = storagePath(workspaceRoot);
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>).threads)) {
      return [];
    }
    const threads = (data as Record<string, unknown>).threads as unknown[];
    return threads.filter((t) => isValidThread(t, workspaceRoot)) as StoredThread[];
  } catch {
    return [];
  }
}

export function saveThreads(workspaceRoot: string, threads: StoredThread[]): void {
  const file = storagePath(workspaceRoot);
  const data: StorageData = { threads };
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export function watchStorage(
  workspaceRoot: string,
  onChange: () => void
): vscode.FileSystemWatcher {
  const pattern = new vscode.RelativePattern(workspaceRoot, STORAGE_FILE);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  return watcher;
}
