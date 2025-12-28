# Amazon Link Card Generator

Ghost CMSでAmazonリンクカードが正常に表示されない問題を解決するマイクロサービスです。AmazonのURLを入力すると、GhostのHTML embedに埋め込み可能なHTMLコードを生成します。

## 機能

- **Amazon URL入力**: URLバリデーション（amazon.co.jp, amazon.com など）
- **メタデータ取得**: Amazon商品ページから商品情報を抽出（OGPタグ）
- **Cookie管理**: Bookloreと同様のAmazon Cookie設定機能（503エラー対策）
- **HTML生成**: Ghost embed用のレスポンシブHTMLコード生成
- **UI/UX**: プレビュー表示、コピー機能、Cookie設定モーダル

## 技術スタック

- **フレームワーク**: SvelteKit（静的サイト生成）
- **デプロイ先**: Cloudflare Pages
- **言語**: TypeScript
- **スタイリング**: TailwindCSS v4
- **API**: Cloudflare Workers（メタデータ取得プロキシ）

## 開発環境のセットアップ

### 依存パッケージのインストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:5173](http://localhost:5173) を開いてください。

### 型チェック

```bash
npm run check
```

### ビルド

```bash
npm run build
```

ビルド成果物は `.svelte-kit/cloudflare` ディレクトリに生成されます。

### プレビュー

```bash
npm run preview
```

## Cloudflare Pagesへのデプロイ

### 1. GitHubリポジトリと連携

Cloudflare Pagesダッシュボードで新しいプロジェクトを作成し、GitHubリポジトリを連携します。

### 2. ビルド設定

- **Build command**: `npm run build`
- **Build output directory**: `.svelte-kit/cloudflare`
- **Root directory**: `/`

### 3. デプロイ

GitHubにプッシュすると、Cloudflare Pagesが自動的にビルドとデプロイを行います。

## プロジェクト構造

```
amazon-link-card/
├── src/
│   ├── lib/
│   │   ├── components/        # Svelteコンポーネント
│   │   │   ├── URLInput.svelte
│   │   │   ├── CookieSettings.svelte
│   │   │   ├── LinkCardPreview.svelte
│   │   │   ├── CodeOutput.svelte
│   │   │   └── Toast.svelte
│   │   ├── services/          # ビジネスロジック
│   │   │   ├── urlValidator.ts
│   │   │   └── htmlGenerator.ts
│   │   ├── stores/            # Svelte Stores
│   │   │   ├── cookie.ts
│   │   │   └── linkCard.ts
│   │   ├── types/             # TypeScript型定義
│   │   │   ├── amazon.ts
│   │   │   └── linkCard.ts
│   │   └── utils/             # ユーティリティ
│   │       └── storage.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   └── +page.svelte
│   └── app.css                # TailwindCSSエントリーポイント
├── functions/
│   └── api/
│       └── fetch-metadata.ts  # Cloudflare Workers API
├── svelte.config.js
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Cookie設定について

Amazonからのメタデータ取得が503エラーでブロックされる場合、Cookie設定が必要です。

### Cookie設定手順

1. Amazonにセカンダリアカウントでログイン（推奨）
2. ブラウザの開発者ツールを開く（F12キー）
3. 「Network」タブを開き、任意のページをリロード
4. リクエストヘッダーから「Cookie:」の値全体をコピー
5. アプリの「Cookie設定」ボタンからCookieを保存

Cookie有効期限は365日に設定されていますが、Amazonの仕様変更により短くなる可能性があります。

## ライセンス

MIT

## 参考

- [Booklore - Amazon Cookie設定](https://booklore-app.github.io/booklore-docs/docs/metadata/amazon-cookie)
