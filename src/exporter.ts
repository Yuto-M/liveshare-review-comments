import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { StoredThread } from './storage';

export function buildMarkdown(threads: StoredThread[], workspaceRoot?: string): string {
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

  // Group by uri
  const byFile = new Map<string, StoredThread[]>();
  for (const t of threads) {
    const list = byFile.get(t.uri) ?? [];
    list.push(t);
    byFile.set(t.uri, list);
  }

  for (const [uri, fileThreads] of byFile) {
    const displayPath = workspaceRoot
      ? path.relative(workspaceRoot, vscode.Uri.parse(uri).fsPath)
      : vscode.Uri.parse(uri).fsPath;

    lines.push(`## ${displayPath}`, '');

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
  workspaceRoot: string,
  threads: StoredThread[]
): Promise<void> {
  const md = buildMarkdown(threads, workspaceRoot);
  const outPath = path.join(workspaceRoot, 'REVIEW.md');
  fs.writeFileSync(outPath, md, 'utf-8');
  const doc = await vscode.workspace.openTextDocument(outPath);
  await vscode.window.showTextDocument(doc);
}

export async function copyToClipboard(threads: StoredThread[], workspaceRoot?: string): Promise<void> {
  const md = buildMarkdown(threads, workspaceRoot);
  await vscode.env.clipboard.writeText(md);
  vscode.window.showInformationMessage('Review comments copied to clipboard.');
}
