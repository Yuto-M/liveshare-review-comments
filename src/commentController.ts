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
  private readonly workspaceRoot: string;
  // Map from thread id → { vscodeThread, storedThread, cachedVscodeComments }
  private readonly threads = new Map<
    string,
    { vt: vscode.CommentThread; st: StoredThread; vc: vscode.Comment[] }
  >();

  constructor(context: vscode.ExtensionContext, workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.controller = vscode.comments.createCommentController(
      'liveshareReviewComments',
      'LiveShare Review Comments'
    );
    context.subscriptions.push(this.controller);
    this.restore();
  }

  private restore(): void {
    const stored = loadThreads(this.workspaceRoot);
    for (const st of stored) {
      this.createVscodeThread(st);
    }
  }

  private createVscodeThread(st: StoredThread): vscode.CommentThread {
    const uri = vscode.Uri.parse(st.uri);
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

  private save(): void {
    const all: StoredThread[] = [...this.threads.values()].map((e) => e.st);
    saveThreads(this.workspaceRoot, all);
  }

  /** Called from command: Add Review Comment */
  addReviewCommentFromSelection(text: string): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const sel = editor.selection;
    // 1-based
    const startLine = sel.start.line + 1;
    const endLine = sel.end.line + 1;
    const author = getAuthor();
    const comment: StoredComment = {
      id: uuid(),
      author,
      body: text,
      createdAt: new Date().toISOString(),
    };
    const st: StoredThread = {
      id: uuid(),
      uri: editor.document.uri.toString(),
      startLine,
      endLine,
      comments: [comment],
    };
    this.createVscodeThread(st);
    this.save();
  }

  /** Called from the reply box inside a thread */
  replyToThread(thread: vscode.CommentThread, text: string): void {
    const entry = this.findByVscodeThread(thread);
    const comment: StoredComment = {
      id: uuid(),
      author: getAuthor(),
      body: text,
      createdAt: new Date().toISOString(),
    };
    const vc = this.toVscodeComment(comment);

    if (!entry) {
      // VS Code created this thread via gutter icon — register it now
      const st: StoredThread = {
        id: uuid(),
        uri: thread.uri.toString(),
        startLine: (thread.range?.start.line ?? 0) + 1,
        endLine: (thread.range?.end.line ?? 0) + 1,
        comments: [comment],
      };
      thread.comments = [vc];
      thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
      this.threads.set(st.id, { vt: thread, st, vc: [vc] });
      this.save();
      return;
    }

    // Existing thread — append only the new comment object (preserves existing refs)
    entry.st.comments.push(comment);
    entry.vc.push(vc);
    thread.comments = [...entry.vc];
    this.save();
  }

  deleteCommentById(commentId: string | undefined): void {
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
      this.save();
      return;
    }
  }

  deleteThread(thread: vscode.CommentThread): void {
    const entry = this.findByVscodeThread(thread);
    if (!entry) {
      return;
    }
    thread.dispose();
    this.threads.delete(entry.st.id);
    this.save();
  }

  /** Diff-based sync from storage (called on file system change for LiveShare sync) */
  syncFromStorage(): void {
    const stored = loadThreads(this.workspaceRoot);
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
