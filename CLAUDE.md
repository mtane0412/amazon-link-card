# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Ghost CMSでAmazonリンクカードを生成するためのSvelteKitアプリケーションです。Amazon商品URLからメタデータを取得し、Ghost HTML embedに埋め込み可能な自己完結型HTMLコードを生成します。

## 開発コマンド

### 基本コマンド
```bash
npm install              # 依存パッケージのインストール
npm run dev             # 開発サーバー起動 (http://localhost:5173)
npm run build           # プロダクションビルド（Cloudflare Pages用）
npm run preview         # ビルド成果物のプレビュー
```

### テスト・型チェック
```bash
npm test                # Vitestによるユニットテスト実行
npm run check           # SvelteとTypeScriptの型チェック
npm run check:watch     # 型チェックをwatch モードで実行
npm run test:e2e        # Playwrightによるe2eテスト実行
```

## アーキテクチャ

### デプロイ環境の二重構造

このプロジェクトは**開発環境とCloudflare Pages環境で異なるメタデータ取得パスを使用します**。

- **開発環境**: SvelteKitサーバールート (`src/routes/api/fetch-metadata/+server.ts`)
- **Cloudflare Pages**: Cloudflare Workers Functions (`functions/api/fetch-metadata.ts`)

両ファイルは**同一のパース処理を実装していますが、微妙な差異があります**：

- `src/routes/api/fetch-metadata/+server.ts`: AmazonのメタタグはOGPタグではなく通常の`name`属性を使用するため、`name="title"`形式をパースします。
- `functions/api/fetch-metadata.ts`: `property="og:title"`形式をパースします。

**重要**: メタデータ取得ロジックを変更する際は、両方のファイルを更新する必要があります。

### Svelte 5のRunes API

このプロジェクトは**Svelte 5**を使用しています。Svelte 5では新しいReactivity API（Runes）が導入されていますが、このプロジェクトではStores API（`writable`）を引き続き使用しています。

### Store設計

アプリケーション状態は2つのSvelte Storeで管理されています：

- `src/lib/stores/linkCard.ts`: リンクカード生成の状態（URL、メタデータ、HTML、ローディング、エラー）
- `src/lib/stores/cookie.ts`: Amazon Cookie設定の状態（Cookie値、有効期限、有効性）

### サービス層

ビジネスロジックは`src/lib/services/`に配置されています：

- `urlValidator.ts`: Amazon URLの妥当性検証とトラッキングパラメータの正規化
- `htmlGenerator.ts`: Ghost embed用の自己完結型インラインCSSリンクカードHTML生成

HTMLは完全に自己完結しており、外部CSSに依存しません。レスポンシブ対応のため`<style>`タグでメディアクエリのみを使用します。

### 型定義

TypeScript型定義は`src/lib/types/`に集約されています：

- `amazon.ts`: Amazonメタデータの型定義（`AmazonMetadata`, `MetadataError`）
- `linkCard.ts`: リンクカード状態の型定義（`LinkCardState`, `StoredCookie`）

### コンポーネント構成

Svelteコンポーネントは`src/lib/components/`に配置されています：

- `URLInput.svelte`: Amazon URL入力フォーム
- `CookieSettings.svelte`: Cookie設定モーダル
- `LinkCardPreview.svelte`: 生成されたリンクカードのプレビュー
- `CodeOutput.svelte`: HTMLコード出力とコピー機能
- `Toast.svelte`: トースト通知

### Amazon Cookie設定

Amazonは503エラー（ボット検出）でリクエストをブロックする場合があります。この対策として、ブラウザから取得したAmazon Cookieを保存し、メタデータ取得リクエストに含める機能を実装しています。

Cookieは`localStorage`に保存され、有効期限は365日に設定されています（`src/lib/utils/storage.ts`）。

### HTMLエスケープ処理

XSS対策として、HTMLGenerator（`src/lib/services/htmlGenerator.ts`）では`escapeHTML`関数で全ての出力をエスケープしています。

## ビルド出力

ビルド成果物は`.svelte-kit/cloudflare`ディレクトリに生成され、Cloudflare Pagesにデプロイされます。

## TailwindCSS v4

このプロジェクトはTailwindCSS v4を使用しています。設定は`tailwind.config.js`と`postcss.config.js`で管理されています。
