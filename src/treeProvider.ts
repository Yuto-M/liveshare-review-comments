import * as vscode from 'vscode';
import { StoredThread } from './storage';
import { ReviewCommentController } from './commentController';

type ReviewTreeItem = FileItem | ThreadItem;

class FileItem extends vscode.TreeItem {
  readonly kind = 'file' as const;

  constructor(
    public readonly relativePath: string,
    folder: vscode.WorkspaceFolder
  ) {
    super(relativePath, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'reviewFile';
    this.iconPath = vscode.ThemeIcon.File;
    this.resourceUri = vscode.Uri.joinPath(folder.uri, relativePath);
  }
}

class ThreadItem extends vscode.TreeItem {
  readonly kind = 'thread' as const;

  constructor(
    public readonly thread: StoredThread,
    public readonly folder: vscode.WorkspaceFolder
  ) {
    const rangeLabel =
      thread.startLine === thread.endLine
        ? `L${thread.startLine}`
        : `L${thread.startLine}-L${thread.endLine}`;

    const firstComment = thread.comments[0];
    const preview = firstComment
      ? firstComment.body.length > 50
        ? firstComment.body.slice(0, 50) + '…'
        : firstComment.body
      : '';
    const replyCount = thread.comments.length - 1;
    const badge = replyCount > 0 ? ` (+${replyCount})` : '';

    super(`${rangeLabel}: "${preview}"${badge}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'reviewThread';
    this.tooltip = thread.comments.map((c) => `${c.author}: ${c.body}`).join('\n\n');
    this.command = {
      command: 'liveshareReviewComments.jumpToThread',
      title: 'Jump to thread',
      arguments: [thread, folder],
    };
  }
}

export class ReviewCommentTreeProvider implements vscode.TreeDataProvider<ReviewTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    ReviewTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly controller: ReviewCommentController,
    private readonly folder: vscode.WorkspaceFolder
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ReviewTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ReviewTreeItem): ReviewTreeItem[] {
    if (!element) {
      return this.buildFileItems();
    }
    if (element.kind === 'file') {
      return this.buildThreadItems(element.relativePath);
    }
    return [];
  }

  private buildFileItems(): FileItem[] {
    const threads = this.controller.getAllThreads();
    const paths = [...new Set(threads.map((t) => t.relativePath))].sort();
    return paths.map((p) => new FileItem(p, this.folder));
  }

  private buildThreadItems(relativePath: string): ThreadItem[] {
    const threads = this.controller
      .getAllThreads()
      .filter((t) => t.relativePath === relativePath)
      .sort((a, b) => a.startLine - b.startLine);
    return threads.map((t) => new ThreadItem(t, this.folder));
  }
}
