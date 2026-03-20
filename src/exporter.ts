import * as vscode from 'vscode';
import { StoredThread } from './storage';

export function buildMarkdown(threads: StoredThread[]): string {
  if (threads.length === 0) {
    return '# Review Comments\n\n> No comments yet.\n';
  }

  const now = new Date().toISOString();
  const lines: string[] = [
    '# Review Comments',
    '',
    `> ${threads.length} thread(s) / Generated at ${now}`,
    '',
  ];

  // Group by relativePath
  const byFile = new Map<string, StoredThread[]>();
  for (const t of threads) {
    const list = byFile.get(t.relativePath) ?? [];
    list.push(t);
    byFile.set(t.relativePath, list);
  }

  for (const [relativePath, fileThreads] of byFile) {
    lines.push(`## ${relativePath}`, '');

    // Sort threads by start line
    const sorted = [...fileThreads].sort((a, b) => a.startLine - b.startLine);
    for (const thread of sorted) {
      const rangeLabel =
        thread.startLine === thread.endLine
          ? `L${thread.startLine}`
          : `L${thread.startLine}-${thread.endLine}`;

      lines.push(`### ${rangeLabel}`, '');
      for (const comment of thread.comments) {
        lines.push(`**${comment.author}**: ${comment.body}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function exportToFile(
  folder: vscode.WorkspaceFolder,
  threads: StoredThread[]
): Promise<void> {
  const md = buildMarkdown(threads);
  const outUri = vscode.Uri.joinPath(folder.uri, 'liveshare-review-comments.md');
  await vscode.workspace.fs.writeFile(outUri, Buffer.from(md, 'utf-8'));
  const doc = await vscode.workspace.openTextDocument(outUri);
  await vscode.window.showTextDocument(doc);
}

export async function copyToClipboard(threads: StoredThread[]): Promise<void> {
  const md = buildMarkdown(threads);
  await vscode.env.clipboard.writeText(md);
  vscode.window.showInformationMessage('Review comments copied to clipboard.');
}
