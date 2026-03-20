import * as vscode from 'vscode';

export interface StoredComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface StoredThread {
  id: string;
  relativePath: string; // workspace-relative path (e.g. "src/file.ts")
  startLine: number; // 1-based
  endLine: number;   // 1-based
  comments: StoredComment[];
}

interface StorageData {
  threads: StoredThread[];
}

const STORAGE_FILE = '.review-comments.json';

export function storageUri(folder: vscode.WorkspaceFolder): vscode.Uri {
  return vscode.Uri.joinPath(folder.uri, STORAGE_FILE);
}

function isValidThread(t: unknown): t is StoredThread {
  if (!t || typeof t !== 'object') {
    return false;
  }
  const obj = t as Record<string, unknown>;
  if (
    typeof obj.id !== 'string' ||
    typeof obj.relativePath !== 'string' ||
    typeof obj.startLine !== 'number' ||
    typeof obj.endLine !== 'number' ||
    !Array.isArray(obj.comments)
  ) {
    return false;
  }
  // Reject path traversal
  if (obj.relativePath.includes('..') || (obj.relativePath as string).startsWith('/')) {
    return false;
  }
  if (obj.startLine < 1 || obj.endLine < 1 || obj.startLine > 100000 || obj.endLine > 100000) {
    return false;
  }
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

export async function loadThreads(folder: vscode.WorkspaceFolder): Promise<StoredThread[]> {
  const uri = storageUri(folder);
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const raw = Buffer.from(bytes).toString('utf-8');
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>).threads)) {
      return [];
    }
    const threads = (data as Record<string, unknown>).threads as unknown[];
    return threads.filter(isValidThread) as StoredThread[];
  } catch {
    return [];
  }
}

export async function saveThreads(folder: vscode.WorkspaceFolder, threads: StoredThread[]): Promise<void> {
  const uri = storageUri(folder);
  const content = JSON.stringify({ threads } satisfies StorageData, null, 2);

  // Use WorkspaceEdit + doc.save() so LiveShare propagates the write to HOST's disk.
  // vscode.workspace.fs.writeFile() does not propagate from GUEST to HOST in LiveShare.

  // Step 1: ensure the file exists.
  // createFile() with ignoreIfExists:true propagates through LiveShare (unlike writeFile).
  const createEdit = new vscode.WorkspaceEdit();
  createEdit.createFile(uri, { ignoreIfExists: true });
  await vscode.workspace.applyEdit(createEdit);

  // Step 2: open (or reuse the already-open) document and overwrite its full content.
  const doc = await vscode.workspace.openTextDocument(uri);
  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, fullRange, content);
  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    throw new Error('WorkspaceEdit.applyEdit() returned false — changes were not saved');
  }
  await doc.save();
}

export function watchStorage(
  folder: vscode.WorkspaceFolder,
  onChange: () => void
): vscode.FileSystemWatcher {
  const pattern = new vscode.RelativePattern(folder, STORAGE_FILE);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  return watcher;
}
