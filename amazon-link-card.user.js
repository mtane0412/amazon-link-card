// ==UserScript==
// @name         Amazon Link Card Generator
// @namespace    https://github.com/mtane0412/amazon-link-card
// @version      1.0.0
// @description  Amazon商品ページでリンクカードHTMLを生成してクリップボードにコピー
// @author       mtane0412
// @match        https://www.amazon.co.jp/*/dp/*
// @match        https://www.amazon.co.jp/dp/*
// @match        https://www.amazon.co.jp/*/gp/product/*
// @match        https://www.amazon.co.jp/gp/product/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

/* eslint-env browser, greasemonkey */
/* global GM_setClipboard, GM_addStyle */

(function () {
	'use strict';

	/**
	 * Amazonメタデータ型定義
	 * @typedef {Object} AmazonMetadata
	 * @property {string} title - 商品タイトル
	 * @property {string} image - 商品画像URL
	 * @property {string} description - 商品説明
	 * @property {string} [price] - 価格（取得できない場合はundefined）
	 * @property {string} url - 元のAmazon URL
	 */

	/**
	 * DOM要素からAmazonメタデータを抽出する
	 * @returns {AmazonMetadata | null} 取得したメタデータ、失敗時はnull
	 */
	function extractMetadata() {
		// URLを正規化（トラッキングパラメータ除去）
		const url = normalizeAmazonURL(window.location.href);

		// タイトル取得（優先順位: meta[name="title"] > og:title > #productTitle）
		const title =
			document.querySelector('meta[name="title"]')?.getAttribute('content') ||
			document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
			document.querySelector('#productTitle')?.textContent?.trim();

		if (!title) {
			console.error('[Amazon Link Card] タイトルを取得できませんでした');
			return null;
		}

		// 画像URL取得（優先順位: #landingImage > og:image）
		const image =
			document.querySelector('#landingImage')?.getAttribute('src') ||
			document.querySelector('meta[property="og:image"]')?.getAttribute('content');

		if (!image) {
			console.error('[Amazon Link Card] 画像URLを取得できませんでした');
			return null;
		}

		// 説明取得（優先順位: meta[name="description"] > og:description > feature-bullets）
		const description =
			document.querySelector('meta[name="description"]')?.getAttribute('content') ||
			document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
			document.querySelector('#feature-bullets')?.textContent?.trim().substring(0, 150);

		if (!description) {
			console.error('[Amazon Link Card] 説明を取得できませんでした');
			return null;
		}

		// 価格取得（複数パターンに対応、優先順位付き）
		let price = undefined;

		// パターン1: デスクトップ版のメイン価格表示（最優先）
		// .a-offscreenはスクリーンリーダー用の隠し要素で、完全な価格文字列が含まれる
		const corePriceDisplay = document.querySelector(
			'#corePriceDisplay_desktop_feature_div .a-price[data-a-color="price"] .a-offscreen'
		);
		if (corePriceDisplay) {
			price = corePriceDisplay.textContent?.trim();
		}

		// パターン2: モバイル版のメイン価格表示
		if (!price) {
			const mobileCorePrice = document.querySelector(
				'#corePrice_desktop .a-price .a-offscreen'
			);
			if (mobileCorePrice) {
				price = mobileCorePrice.textContent?.trim();
			}
		}

		// パターン3: apex_desktop配下の価格
		if (!price) {
			const apexPrice = document.querySelector('#apex_desktop .a-price .a-offscreen');
			if (apexPrice) {
				price = apexPrice.textContent?.trim();
			}
		}

		// パターン4: priceblock系のID（従来型）
		if (!price) {
			const priceblock =
				document.querySelector('#priceblock_ourprice')?.textContent?.trim() ||
				document.querySelector('#priceblock_dealprice')?.textContent?.trim() ||
				document.querySelector('#price_inside_buybox')?.textContent?.trim();
			if (priceblock) {
				price = priceblock;
			}
		}

		// パターン5: a-price-wholeとa-price-fractionの組み合わせ（最終手段）
		// corePriceDisplay配下に限定して誤検出を防ぐ
		if (!price) {
			const corePriceWhole = document.querySelector(
				'#corePriceDisplay_desktop_feature_div .a-price-whole'
			);
			const corePriceFraction = document.querySelector(
				'#corePriceDisplay_desktop_feature_div .a-price-fraction'
			);
			if (corePriceWhole) {
				const whole = corePriceWhole.textContent?.trim();
				const fraction = corePriceFraction?.textContent?.trim();
				price = fraction ? `¥${whole}${fraction}` : `¥${whole}`;
			}
		}

		return { title, image, description, price, url };
	}

	/**
	 * URLを正規化する（トラッキングパラメータ除去）
	 * @param {string} url - 正規化対象のURL
	 * @returns {string} 正規化されたURL
	 */
	function normalizeAmazonURL(url) {
		const parsed = new URL(url);
		const cleanParams = new URLSearchParams();

		// トラッキングパラメータを除去
		// ref, _, th で始まるパラメータは削除
		for (const [key, value] of parsed.searchParams) {
			if (!key.startsWith('ref') && !key.startsWith('_') && key !== 'th') {
				cleanParams.set(key, value);
			}
		}

		parsed.search = cleanParams.toString();
		return parsed.toString();
	}

	/**
	 * HTMLエスケープ処理
	 * XSS対策のため、HTMLの特殊文字をエスケープします。
	 * @param {string} str - エスケープ対象の文字列
	 * @returns {string} エスケープされた文字列
	 */
	function escapeHTML(str) {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Ghost embed用のリンクカードHTMLを生成する
	 * 完全に自己完結したインラインCSSを使用し、外部CSSに依存しません。
	 * @param {AmazonMetadata} metadata - Amazonメタデータ
	 * @returns {string} 生成されたHTMLコード
	 */
	function generateLinkCardHTML(metadata) {
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
        <div style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; color: #111;">
          ${escapeHTML(metadata.title)}
        </div>
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
	 * トースト通知を表示する
	 * @param {string} message - 表示するメッセージ
	 * @param {'success' | 'error'} type - 通知タイプ
	 */
	function showToast(message, type = 'success') {
		const toast = document.createElement('div');
		toast.className = `amazon-link-card-toast amazon-link-card-toast-${type}`;
		toast.textContent = message;
		document.body.appendChild(toast);

		// アニメーション用のタイムアウト
		setTimeout(() => toast.classList.add('show'), 10);

		// 3秒後に非表示
		setTimeout(() => {
			toast.classList.remove('show');
			setTimeout(() => toast.remove(), 300);
		}, 3000);
	}

	/**
	 * コピーボタンを生成してページに追加する
	 */
	function addCopyButton() {
		// ボタンコンテナを作成
		const container = document.createElement('div');
		container.id = 'amazon-link-card-button';
		container.innerHTML = `
      <button id="amazon-link-card-copy-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>リンクカードをコピー</span>
      </button>
    `;

		document.body.appendChild(container);

		// ボタンクリックイベント
		const button = document.getElementById('amazon-link-card-copy-btn');
		button?.addEventListener('click', () => {
			const metadata = extractMetadata();

			if (!metadata) {
				showToast('メタデータの取得に失敗しました', 'error');
				return;
			}

			const html = generateLinkCardHTML(metadata);

			try {
				GM_setClipboard(html);
				showToast('リンクカードをクリップボードにコピーしました！', 'success');
			} catch (error) {
				console.error('[Amazon Link Card] コピーに失敗しました:', error);
				showToast('コピーに失敗しました', 'error');
			}
		});
	}

	// スタイルを追加
	GM_addStyle(`
    /* コピーボタンのスタイル */
    #amazon-link-card-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
    }

    #amazon-link-card-copy-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ff9900;
      color: #111;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }

    #amazon-link-card-copy-btn:hover {
      background: #ffad33;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    #amazon-link-card-copy-btn:active {
      transform: translateY(0);
    }

    /* トースト通知のスタイル */
    .amazon-link-card-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    }

    .amazon-link-card-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .amazon-link-card-toast-success {
      background: #4caf50;
      color: white;
    }

    .amazon-link-card-toast-error {
      background: #f44336;
      color: white;
    }
  `);

	// ページ読み込み完了後にボタンを追加
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', addCopyButton);
	} else {
		addCopyButton();
	}
})();
