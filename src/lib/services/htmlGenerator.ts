/**
 * Ghost embed用のHTML生成
 *
 * AmazonメタデータからGhost CMSのHTML embedに埋め込み可能な
 * 自己完結型のリンクカードHTMLを生成します。
 */

import type { AmazonMetadata } from '$lib/types/amazon';

/**
 * Ghost embed用のリンクカードHTMLを生成する
 *
 * 完全に自己完結したインラインCSSを使用し、外部CSSに依存しません。
 * レスポンシブ対応のため、メディアクエリのみ<style>タグを使用します。
 *
 * @param metadata - Amazonメタデータ
 * @returns 生成されたHTMLコード
 */
export function generateLinkCardHTML(metadata: AmazonMetadata): string {
	return `
<div class="amazon-link-card" style="
  max-width: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin: 20px auto;
">
  <a href="${escapeHTML(metadata.url)}"
     target="_blank"
     rel="noopener noreferrer"
     style="text-decoration: none; color: inherit; display: flex; flex-direction: row;">

    <div style="flex: 0 0 180px; background: #f7f7f7; display: flex; align-items: center; justify-content: center; padding: 16px;">
      <img src="${escapeHTML(metadata.image)}"
           alt="${escapeHTML(metadata.title)}"
           style="max-width: 100%; max-height: 200px; object-fit: contain;">
    </div>

    <div style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; color: #111;">
          ${escapeHTML(metadata.title)}
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.5;">
          ${escapeHTML(metadata.description)}
        </p>
      </div>

      ${
				metadata.price
					? `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 18px; font-weight: 700; color: #B12704;">
          ${escapeHTML(metadata.price)}
        </span>
        <span style="font-size: 12px; color: #0066c0; font-weight: 500;">
          Amazonで見る →
        </span>
      </div>
      `
					: `
      <div style="text-align: right;">
        <span style="font-size: 12px; color: #0066c0; font-weight: 500;">
          Amazonで見る →
        </span>
      </div>
      `
			}
    </div>
  </a>
</div>

<style>
@media (max-width: 600px) {
  .amazon-link-card a {
    flex-direction: column !important;
  }
  .amazon-link-card a > div:first-child {
    flex: 0 0 auto !important;
    padding: 20px !important;
  }
}
</style>
`.trim();
}

/**
 * HTMLエスケープ処理
 *
 * XSS対策のため、HTMLの特殊文字をエスケープします。
 *
 * @param str - エスケープ対象の文字列
 * @returns エスケープされた文字列
 */
function escapeHTML(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
