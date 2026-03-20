import * as vscode from 'vscode';
import { StoredThread, StoredComment, loadThreads, saveThreads } from './storage';

function getAuthor(): string {
  return process.env.USER ?? process.env.USERNAME ?? 'Reviewer';
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class ReviewCommentController {
  private readonly controller: vscode.CommentController;
  private readonly workspaceFolder: vscode.WorkspaceFolder;
  // Map from thread id → { vscodeThread, storedThread, cachedVscodeComments }
  private readonly threads = new Map<
    string,
    { vt: vscode.CommentThread; st: StoredThread; vc: vscode.Comment[] }
  >();

  constructor(context: vscode.ExtensionContext, folder: vscode.WorkspaceFolder) {
    this.workspaceFolder = folder;
    this.controller = vscode.comments.createCommentController(
      'liveshareReviewComments',
      'LiveShare Review Comments'
    );
    context.subscriptions.push(this.controller);
    void this.restore();
  }

  private async restore(): Promise<void> {
    const stored = await loadThreads(this.workspaceFolder);
    for (const st of stored) {
      this.createVscodeThread(st);
    }
  }

  private createVscodeThread(st: StoredThread): vscode.CommentThread {
    const uri = vscode.Uri.joinPath(this.workspaceFolder.uri, st.relativePath);
    // Convert 1-based stored lines to 0-based Range
    const range = new vscode.Range(st.startLine - 1, 0, st.endLine - 1, 0);
    const vc = st.comments.map((c) => this.toVscodeComment(c));
    const vt = this.controller.createCommentThread(uri, range, vc);
    vt.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    this.threads.set(st.id, { vt, st, vc });
    return vt;
  }

  private toVscodeComment(c: StoredComment): vscode.Comment {
    const body = new vscode.MarkdownString(c.body);
    body.isTrusted = false; // prevent command: URI execution
    return {
      body,
      mode: vscode.CommentMode.Preview,
      author: { name: c.author },
      // Attach the stored comment id so we can find it later
      contextValue: c.id,
      reactions: [],
    } as vscode.Comment;
  }

  private async save(): Promise<void> {
    // Read-modify-write: merge with disk to preserve peer's threads
    const diskThreads = await loadThreads(this.workspaceFolder);
    const diskById = new Map(diskThreads.map((t) => [t.id, t]));
    const memById = new Map([...this.threads.values()].map((e) => [e.st.id, e.st]));

    const merged: StoredThread[] = [];
    for (const [id, diskThread] of diskById) {
      merged.push(memById.get(id) ?? diskThread);
    }
    for (const [id, memThread] of memById) {
      if (!diskById.has(id)) {
        merged.push(memThread);
      }
    }

    await saveThreads(this.workspaceFolder, merged).catch((err: unknown) => {
      vscode.window.showErrorMessage(`LiveShare Review Comments: Failed to save — ${String(err)}`);
    });
  }

  // For deletions: write memory as-is so deleted threads are removed from disk.
  // Skips the read-modify-write merge to avoid resurrecting deleted threads from disk.
  private async saveAfterDelete(): Promise<void> {
    const all = [...this.threads.values()].map((e) => e.st);
    await saveThreads(this.workspaceFolder, all).catch((err: unknown) => {
      vscode.window.showErrorMessage(`LiveShare Review Comments: Failed to save — ${String(err)}`);
    });
  }

  /** Called from the reply box inside a thread */
  async replyToThread(thread: vscode.CommentThread, text: string): Promise<void> {
    const entry = this.findByVscodeThread(thread);
    const comment: StoredComment = {
      id: uuid(),
      author: getAuthor(),
      body: text,
      createdAt: new Date().toISOString(),
    };
    const vc = this.toVscodeComment(comment);

    if (!entry) {
      // Thread created by another controller (e.g. Live Share) — register it now
      const st: StoredThread = {
        id: uuid(),
        relativePath: vscode.workspace.asRelativePath(thread.uri, false),
        startLine: (thread.range?.start.line ?? 0) + 1,
        endLine: (thread.range?.end.line ?? 0) + 1,
        comments: [comment],
      };
      thread.comments = [vc];
      thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
      this.threads.set(st.id, { vt: thread, st, vc: [vc] });
      await this.save();
      return;
    }

    // Existing thread — append only the new comment object (preserves existing refs)
    entry.st.comments.push(comment);
    entry.vc.push(vc);
    thread.comments = [...entry.vc];
    await this.save();
  }

  async deleteCommentById(commentId: string | undefined): Promise<void> {
    if (!commentId) {
      return;
    }
    for (const [id, entry] of this.threads) {
      const idx = entry.st.comments.findIndex((c) => c.id === commentId);
      if (idx === -1) {
        continue;
      }
      entry.st.comments.splice(idx, 1);
      entry.vc.splice(idx, 1);
      if (entry.st.comments.length === 0) {
        entry.vt.dispose();
        this.threads.delete(id);
      } else {
        entry.vt.comments = [...entry.vc];
      }
      await this.saveAfterDelete();
      return;
    }
  }

  async deleteThread(thread: vscode.CommentThread): Promise<void> {
    const entry = this.findByVscodeThread(thread);
    if (!entry) {
      return;
    }
    thread.dispose();
    this.threads.delete(entry.st.id);
    await this.saveAfterDelete();
  }

  /** Diff-based sync from storage (called on file system change for LiveShare sync) */
  async syncFromStorage(): Promise<void> {
    const stored = await loadThreads(this.workspaceFolder);
    const storedById = new Map(stored.map((st) => [st.id, st]));

    // Remove threads that no longer exist in storage
    for (const [id, entry] of this.threads) {
      if (!storedById.has(id)) {
        entry.vt.dispose();
        this.threads.delete(id);
      }
    }

    for (const st of stored) {
      const existing = this.threads.get(st.id);
      if (!existing) {
        // New thread added by peer
        this.createVscodeThread(st);
      } else {
        const storedSig = st.comments.map((c) => c.id).join('\0');
        const memSig = existing.st.comments.map((c) => c.id).join('\0');
        if (storedSig !== memSig) {
          // Comments changed — update in place without dispose/recreate
          existing.st = st;
          existing.vc = st.comments.map((c) => this.toVscodeComment(c));
          existing.vt.comments = [...existing.vc];
        }
        // else: our own write — no-op, no flicker
      }
    }
  }

  getAllThreads(): StoredThread[] {
    return [...this.threads.values()].map((e) => e.st);
  }

  private findByVscodeThread(
    thread: vscode.CommentThread
  ): { vt: vscode.CommentThread; st: StoredThread; vc: vscode.Comment[] } | undefined {
    for (const entry of this.threads.values()) {
      if (entry.vt === thread) {
        return entry;
      }
    }
    return undefined;
  }
}
