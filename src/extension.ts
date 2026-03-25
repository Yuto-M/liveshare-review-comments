import * as vscode from 'vscode';
import { ReviewCommentController } from './commentController';
import { watchStorage, storageUri } from './storage';
import { exportToFile, copyToClipboard } from './exporter';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('Review Comments: No workspace folder found.');
    return;
  }
  const folder = workspaceFolders[0];

  const controller = new ReviewCommentController(context, folder);

  // viewsWelcome のコンテンツを表示するために空のツリーを登録
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('liveshareReviewComments.sidebar', {
      getTreeItem: (e: vscode.TreeItem) => e,
      getChildren: () => [],
    })
  );

  async function autoSaveDirtyStorageDoc(): Promise<void> {
    const uri = storageUri(folder);
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
    if (doc?.isDirty) {
      await doc.save();
    }
  }

  // Watch .review-comments.json for external changes (LiveShare sync)
  const watcher = watchStorage(folder, () => {
    void autoSaveDirtyStorageDoc();
    void controller.syncFromStorage();
  });
  context.subscriptions.push(watcher);

  // Polling fallback: file watcher does not fire for remote changes in Live Share
  const syncTimer = setInterval(() => {
    void autoSaveDirtyStorageDoc();
    void controller.syncFromStorage();
  }, 2000);
  context.subscriptions.push({ dispose: () => clearInterval(syncTimer) });

  // Reply handler (called from the thread reply widget)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'liveshareReviewComments.replyToThread',
      (reply: vscode.CommentReply) => {
        void controller.replyToThread(reply.thread, reply.text);
      }
    )
  );

  // Delete comment handler
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'liveshareReviewComments.deleteComment',
      (comment: vscode.Comment) => {
        void controller.deleteCommentById(comment.contextValue);
      }
    )
  );

  // Delete thread handler
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'liveshareReviewComments.deleteThread',
      (thread: vscode.CommentThread) => {
        void controller.deleteThread(thread);
      }
    )
  );

  // Command: Export for AI
  context.subscriptions.push(
    vscode.commands.registerCommand('liveshareReviewComments.exportForAI', async () => {
      const threads = controller.getAllThreads();
      await exportToFile(folder, threads);
    })
  );

  // Command: Copy to Clipboard
  context.subscriptions.push(
    vscode.commands.registerCommand('liveshareReviewComments.copyToClipboard', async () => {
      const threads = controller.getAllThreads();
      await copyToClipboard(threads);
    })
  );

  // Command: Clear All Comments
  context.subscriptions.push(
    vscode.commands.registerCommand('liveshareReviewComments.clearAllComments', async () => {
      const answer = await vscode.window.showWarningMessage(
        'Delete all review comments?',
        { modal: true },
        'Yes'
      );
      if (answer === 'Yes') {
        await controller.clearAllThreads();
      }
    })
  );
}

export function deactivate(): void {
  // Disposables are cleaned up automatically via context.subscriptions
}
