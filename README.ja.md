# LiveShare Review Comments

VS Liveでのペアプログラミング中に、コードへのレビューコメントを永続化し、AIに渡しやすい形式でエクスポートするためのVS Code拡張機能です。

コメントはワークスペースルートの `.review-comments.json` に保存され、Live Share経由でセッション参加者間でリアルタイムに同期されます。セッション終了後もコメントは残り、MarkdownとしてクリップボードにコピーしてそのままAIに貼り付けることができます。

## 機能

- エディター上のコード行にインラインでレビューコメントを追加
- スレッド形式の複数コメント管理と返信
- Live Share参加者間でのリアルタイム同期
- コメントをMarkdown形式でエクスポート（AIへの共有に便利）
- コメント・スレッドの個別削除

## インストール

### 1. VS Code Marketplaceからインストール

Extensions パネル（`Cmd+Shift+X`）を開き、**LiveShare Review Comments** を検索して **Install** をクリックします。

> **Note**: Live Share参加者全員がコメントをUIで確認するには、ゲスト側もMarketplaceから同様にインストールする必要があります。

### 2. Live Share向け設定

拡張機能のインストール後、Live Shareを開始する前に、**レビュー対象のプロジェクト**のワークスペースルートで以下を実行してください。

```bash
cat > .vsls.json << 'EOF'
{
  "$schema": "http://json.schemastore.org/vsls",
  "gitignore": "none"
}
EOF
```

この設定により、Live Shareが `.review-comments.json` を除外せず、参加者間で共有されるようになります。

### 3. Live Shareを開始する

VS CodeのLive Share拡張機能からセッションを開始し、参加者を招待してください。

以上でセットアップ完了です。コメントを追加すると参加者全員の画面にリアルタイムで反映され、`.review-comments.json` にも自動保存されます。

## 使い方

### コメントを追加する

1. エディター上でコメントしたい行の行番号左にある **コメントアイコン**（ふきだしマーク）をクリック
2. テキストを入力して **Save to JSON** ボタンをクリック

コメントがインラインに表示され、`.review-comments.json` に自動保存されます。

### 返信する

コメントスレッドの下部にある返信欄にテキストを入力して **Save to JSON** をクリックします。

### コメント・スレッドを削除する

- **コメントを削除**: コメントにカーソルを合わせて **Delete Comment** をクリック
- **スレッドごと削除**: スレッドのタイトル部分にカーソルを合わせて **Delete Thread** をクリック

### AIへエクスポートする

コマンドパレット（`Cmd+Shift+P`）から以下のコマンドを実行します：

| 操作 | コマンド |
|------|---------|
| Markdownファイルに出力 | `LiveShare Review Comments: Export for AI` |
| クリップボードにコピー | `LiveShare Review Comments: Copy to Clipboard` |

エクスポートされるMarkdownの形式例：

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

このMarkdownまたはクリップボードの内容をそのままAIチャットに貼り付けることで、レビュー内容を伝えられます。

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `LiveShare Review Comments: Export for AI` | 全コメントを `liveshare-review-comments.md` に出力 |
| `LiveShare Review Comments: Copy to Clipboard` | 全コメントをMarkdownとしてクリップボードにコピー |
| `LiveShare Review Comments: Clear All Review Comments` | 全コメントを一括削除 |

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

1. `npm run watch` でファイル変更を監視しながらビルドを自動実行
2. VS Codeで `F5` を押すと、拡張機能がロードされた新しいウィンドウ（Extension Development Host）が起動
3. コードを変更すると自動でリビルドされるので、Extension Development Hostのウィンドウで `Cmd+R` を押して再読み込み

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
