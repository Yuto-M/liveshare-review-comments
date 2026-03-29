# LiveShare Review Comments

VS Live Shareにはコードにレビューコメントを残す機能がありません。この拡張機能がそのギャップを埋めます。ペアプログラミング中にインラインでコメントを追加し、リアルタイムで同期し、MarkdownとしてエクスポートしてそのままAIに渡せます。

![コメントを追加する](https://github.com/user-attachments/assets/bc40a62e-7b2b-4ea3-a0fd-74c88a65947d)

## 機能

- GitHub PRレビューのように、コード行にインラインでレビューコメントを追加
- スレッド形式で返信・議論
- Live Share参加者間でリアルタイム同期
- ワンクリックでMarkdownエクスポート — AIチャットに貼り付けてすぐにフィードバックを取得

## 使い方

### コメントを追加する

行番号の横にある**コメントアイコン**をクリックし、テキストを入力して**Save to JSON**をクリックします。

### 返信する

コメントスレッドの下部にある返信欄にテキストを入力して**Save to JSON**をクリックします。

### コピーと削除

- **クリップボードにコピー**: コマンドパレットから`LiveShare Review Comments: Copy to Clipboard`を実行
- **コメントを削除**: コメントにカーソルを合わせて**Delete Comment**をクリック
- **スレッドごと削除**: スレッドのタイトル部分にカーソルを合わせて**Delete Thread**をクリック

![コピーと削除](https://github.com/user-attachments/assets/319f488c-9f77-420c-9bca-771e72585d8f)

## AIへエクスポート

すべてのコメントをMarkdownとしてエクスポートし、AIチャットにそのまま貼り付けられます。

| 操作 | コマンド |
|------|---------|
| ファイルに出力 | `LiveShare Review Comments: Export for AI` |
| クリップボードにコピー | `LiveShare Review Comments: Copy to Clipboard` |

出力例：

```markdown
# Review Comments

> 2 thread(s) / Generated at 2026-03-20T10:00:00.000Z

## src/commentController.ts

### L62-L81

**alice**: この関数の戻り値がnullになるケースが考慮されていないので、エラーハンドリングを追加した方がよさそうです。

## src/storage.ts

### L15

**bob**: パスのバリデーションが抜けています。
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `LiveShare Review Comments: Export for AI` | すべてのコメントを`liveshare-review-comments.md`に出力 |
| `LiveShare Review Comments: Copy to Clipboard` | すべてのコメントをMarkdownとしてクリップボードにコピー |
| `LiveShare Review Comments: Clear All Review Comments` | すべてのコメントを一括削除 |

## インストール

### 1. VS Code Marketplaceからインストール

Extensionsパネル（macOSは`Cmd+Shift+X`、Windows・Linuxは`Ctrl+Shift+X`）を開き、**LiveShare Review Comments**を検索して**Install**をクリックします。

> **Note**: Live Share参加者全員がコメントをUIで確認するには、ゲスト側もこの拡張機能をインストールする必要があります。

### 2. Live Share向け設定

Live Shareを開始する前に、レビュー対象プロジェクトのワークスペースルートで以下を実行してください。

```bash
cat > .vsls.json << 'EOF'
{
  "$schema": "http://json.schemastore.org/vsls",
  "gitignore": "none"
}
EOF
```

これにより`.review-comments.json`が参加者間で共有されるようになります。

### 3. Live Shareを開始する

セッションを開始し、参加者を招待してください。コメントはリアルタイムで同期され、`.review-comments.json`に保持されます。

## 開発方法

コントリビューターや拡張機能を修正したい方向けの情報です。フォークして改良していただける場合も歓迎です。

### 前提条件

- VS Code 1.85.0以上
- Node.js（npmが使える状態）

### セットアップ

```bash
git clone https://github.com/Yuto-M/liveshare-review-comments.git
cd liveshare-review-comments
npm install
```

### 開発の流れ

1. `npm run watch`でファイル変更を監視しながらビルドを自動実行
2. VS Codeで`F5`を押すと、拡張機能がロードされた新しいウィンドウ（Extension Development Host）が起動
3. コードを変更すると自動でリビルドされるので、Extension Development Hostのウィンドウで`Cmd+R`を押して再読み込み

### ビルドコマンド

| コマンド | 説明 |
|---------|------|
| `npm run compile` | TypeScriptをビルド |
| `npm run watch` | ファイル変更を監視して自動ビルド |

### プロジェクト構成

```
src/
├── extension.ts          # エントリーポイント、コマンド登録
├── commentController.ts  # コメントスレッドの管理・同期
├── storage.ts            # .review-comments.json の読み書き
└── exporter.ts           # Markdownエクスポート
```
