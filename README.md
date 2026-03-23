# LiveShare Review Comments

> 日本語版は [README.ja.md](README.ja.md) をご覧ください。

A VS Code extension to persist inline review comments during pair programming with VS Live Share, and export them in a format ready to paste into AI chat.

Comments are saved to `.review-comments.json` at the workspace root and synced in real time between Live Share participants. Comments persist after the session ends and can be copied to the clipboard as Markdown to paste directly into an AI.

## Features

- Add inline review comments on any line in the editor
- Threaded comments with replies
- Real-time sync between Live Share participants
- Export comments as Markdown (great for sharing with AI)
- Delete individual comments or entire threads

## Installation

### 1. Install from VS Code Marketplace

Open the Extensions panel (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` on Windows/Linux), search for **LiveShare Review Comments**, and click **Install**.

> **Note**: For all Live Share participants to see comments in the UI, every guest must also install this extension from the Marketplace.

### 2. Configure for Live Share

After installing the extension, before starting a Live Share session, run the following command at the workspace root of the **project being reviewed**:

```bash
cat > .vsls.json << 'EOF'
{
  "$schema": "http://json.schemastore.org/vsls",
  "gitignore": "none"
}
EOF
```

This prevents Live Share from excluding `.review-comments.json`, allowing it to be shared between participants.

### 3. Start Live Share

Start a session from the Live Share extension in VS Code and invite participants.

Setup is complete. Comments added by any participant will appear on everyone's screen in real time and are automatically saved to `.review-comments.json`.

## Usage

### Adding a comment

1. Click the **comment icon** (speech bubble) to the left of the line number in the editor
2. Type your text and click **Save to JSON**

The comment appears inline and is automatically saved to `.review-comments.json`.

### Replying to a comment

Type in the reply box at the bottom of a comment thread and click **Save to JSON**.

### Deleting comments and threads

- **Delete a comment**: Hover over the comment and click **Delete Comment**
- **Delete an entire thread**: Hover over the thread title and click **Delete Thread**

### Exporting for AI

Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux) and run one of the following commands:

| Action | Command |
|--------|---------|
| Export to Markdown file | `LiveShare Review Comments: Export for AI` |
| Copy to clipboard | `LiveShare Review Comments: Copy to Clipboard` |

Example of the exported Markdown format:

```markdown
# Review Comments

> 2 thread(s) / Generated at 2026-03-20T10:00:00.000Z

## src/commentController.ts

### L62-L81

**alice**: The return value of this function can be null but that case isn't handled — error handling should be added.

## src/storage.ts

### L15

**bob**: Path validation is missing here.
```

Paste this Markdown (or the clipboard content) directly into an AI chat to share your review.

## Commands

| Command | Description |
|---------|-------------|
| `LiveShare Review Comments: Export for AI` | Export all comments to `liveshare-review-comments.md` |
| `LiveShare Review Comments: Copy to Clipboard` | Copy all comments as Markdown to the clipboard |
| `LiveShare Review Comments: Clear All Review Comments` | Delete all comments at once |

## Development

Information for contributors or anyone who wants to modify the extension. Forks and improvements are welcome.

### Prerequisites

- VS Code 1.85.0 or later
- Node.js (with npm available)

### Setup

```bash
git clone https://github.com/Yuto-M/liveshare-review-comments.git
cd liveshare-review-comments
npm install
```

### Development workflow

1. Run `npm run watch` to watch for file changes and rebuild automatically
2. Press `F5` in VS Code to open a new Extension Development Host window with the extension loaded
3. After making code changes, press `Cmd+R` in the Extension Development Host window to reload

### Build commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Build TypeScript |
| `npm run watch` | Watch for changes and rebuild automatically |

### Project structure

```
src/
├── extension.ts          # Entry point, command registration
├── commentController.ts  # Comment thread management and sync
├── storage.ts            # Read/write .review-comments.json
└── exporter.ts           # Markdown export
```
