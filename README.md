# LiveShare Review Comments

VS Live Share has no built-in way to leave review comments on code. This extension fills that gap — add inline comments during pair programming, sync them in real time, and export them as Markdown to hand off to an AI.

![Adding a comment](https://github.com/user-attachments/assets/bc40a62e-7b2b-4ea3-a0fd-74c88a65947d)

## Features

- Inline review comments on any line, just like GitHub PR reviews
- Threaded replies for discussion
- Real-time sync between all Live Share participants
- One-click Markdown export — paste directly into an AI chat for instant feedback

## Usage

### Adding a comment

Click the **comment icon** next to a line number, type your comment, and click **Save to JSON**.

### Replying to a comment

Type in the reply box at the bottom of a comment thread and click **Save to JSON**.

### Copying & Deleting

- **Copy to clipboard**: Open the Command Palette and run `LiveShare Review Comments: Copy to Clipboard`
- **Delete a comment**: Hover over the comment and click **Delete Comment**
- **Delete an entire thread**: Hover over the thread title and click **Delete Thread**

![Copying and deleting comments](https://github.com/user-attachments/assets/319f488c-9f77-420c-9bca-771e72585d8f)

## Exporting for AI

Export all comments as Markdown and paste them directly into an AI chat.

| Action | Command |
|--------|---------|
| Export to file | `LiveShare Review Comments: Export for AI` |
| Copy to clipboard | `LiveShare Review Comments: Copy to Clipboard` |

Example output:

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

## Commands

| Command | Description |
|---------|-------------|
| `LiveShare Review Comments: Export for AI` | Export all comments to `liveshare-review-comments.md` |
| `LiveShare Review Comments: Copy to Clipboard` | Copy all comments as Markdown to the clipboard |
| `LiveShare Review Comments: Clear All Review Comments` | Delete all comments at once |

## Installation

### 1. Install from VS Code Marketplace

Open the Extensions panel (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` on Windows/Linux), search for **LiveShare Review Comments**, and click **Install**.

> **Note**: Every Live Share participant needs to install this extension to see comments in the UI.

### 2. Configure for Live Share

Before starting a Live Share session, run the following at the workspace root of the project being reviewed:

```bash
cat > .vsls.json << 'EOF'
{
  "$schema": "http://json.schemastore.org/vsls",
  "gitignore": "none"
}
EOF
```

This allows `.review-comments.json` to be shared between participants.

### 3. Start Live Share

Start a session and invite participants. Comments will sync in real time and persist in `.review-comments.json`.

## Development

For contributors or anyone who wants to modify the extension. Forks and improvements are welcome.

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
