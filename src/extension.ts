import * as vscode from 'vscode';
import { ReviewCommentController } from './commentController';
import { watchStorage } from './storage';
import { exportToFile, copyToClipboard } from './exporter';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage('Review Comments: No workspace folder found.');
    return;
  }
  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  const controller = new ReviewCommentController(context, workspaceRoot);

  // Watch .review-comments.json for external changes (LiveShare sync)
  const watcher = watchStorage(workspaceRoot, () => {
    controller.syncFromStorage();
  });
  context.subscriptions.push(watcher);

  // Command: Add Review Comment
  context.subscriptions.push(
    vscode.commands.registerCommand('liveshareReviewComments.addComment', async () => {
      const text = await vscode.window.showInputBox({
        prompt: 'Enter review comment',
        placeHolder: 'Your comment...',
      });
      if (text === undefined || text.trim() === '') {
        return;
      }
      controller.addReviewCommentFromSelection(text.trim());
    })
  );

  // Reply handler (called from the thread reply widget)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'liveshareReviewComments.replyToThread',
      (reply: vscode.CommentReply) => {
        controller.replyToThread(reply.thread, reply.text);
      }
    )
  );

  // Delete comment handler
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'liveshareReviewComments.deleteComment',
      (comment: vscode.Comment) => {
        controller.deleteCommentById(comment.contextValue);
      }
    )
  );

  // Delete thread handler
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'liveshareReviewComments.deleteThread',
      (thread: vscode.CommentThread) => {
        controller.deleteThread(thread);
      }
    )
  );

  // Command: Export for AI
  context.subscriptions.push(
    vscode.commands.registerCommand('liveshareReviewComments.exportForAI', async () => {
      const threads = controller.getAllThreads();
      await exportToFile(workspaceRoot, threads);
    })
  );

  // Command: Copy to Clipboard
  context.subscriptions.push(
    vscode.commands.registerCommand('liveshareReviewComments.copyToClipboard', async () => {
      const threads = controller.getAllThreads();
      await copyToClipboard(threads, workspaceRoot);
    })
  );
}

export function deactivate(): void {
  // Disposables are cleaned up automatically via context.subscriptions
}
