// ==UserScript==
// @name         Amazon Link Card Generator
// @namespace    https://github.com/mtane0412/amazon-link-card
// @version      1.1.0
// @description  Amazon商品ページでリンクカードHTMLを生成してクリップボードにコピー（アソシエイトリンク対応）
// @author       mtane0412
// @match        https://www.amazon.co.jp/*/dp/*
// @match        https://www.amazon.co.jp/dp/*
// @match        https://www.amazon.co.jp/*/gp/product/*
// @match        https://www.amazon.co.jp/gp/product/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

/* eslint-env browser, greasemonkey */
/* global GM_setClipboard, GM_addStyle, GM_getValue, GM_setValue, window, document */

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
		// URLを正規化（トラッキングパラメータ除去）してアソシエイトリンクに変換
		const normalizedUrl = normalizeAmazonURL(window.location.href);
		const url = convertToAssociateLink(normalizedUrl);

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
	 * AmazonアソシエイトリンクURLを生成する
	 * URLをASIN形式に変換し、アソシエイトIDタグを付与します。
	 * @param {string} url - 変換対象のAmazon URL
	 * @returns {string} アソシエイトリンクURL
	 */
	function convertToAssociateLink(url) {
		const associateId = GM_getValue('amazonAssociateId', '');

		// ASINを抽出（/dp/ASIN または /gp/product/ASIN 形式）
		const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
		if (!asinMatch) {
			// ASIN抽出失敗時は元のURLを返す
			return url;
		}

		const asin = asinMatch[1];

		// アソシエイトIDが設定されている場合はアソシエイトリンクを生成
		if (associateId) {
			return `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${encodeURIComponent(associateId)}`;
		}

		// アソシエイトIDが未設定の場合はシンプルなASIN URLを返す
		return `https://www.amazon.co.jp/dp/${asin}`;
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
	 * アソシエイトID設定モーダルを表示する
	 */
	function showSettingsModal() {
		const currentId = GM_getValue('amazonAssociateId', '');

		// モーダル背景
		const overlay = document.createElement('div');
		overlay.id = 'amazon-link-card-modal-overlay';
		overlay.innerHTML = `
      <div id="amazon-link-card-modal">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">アソシエイトID設定</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
          Amazonアソシエイトプログラムのトラッキングタグを設定できます。<br>
          設定すると、生成されるリンクカードにアソシエイトIDが自動的に付与されます。
        </p>
        <input
          type="text"
          id="amazon-associate-id-input"
          placeholder="例: yourname-22"
          value="${escapeHTML(currentId)}"
          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;"
        />
        <div style="display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end;">
          <button id="amazon-link-card-cancel-btn" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">
            キャンセル
          </button>
          <button id="amazon-link-card-save-btn" style="padding: 10px 20px; border: none; background: #ff9900; color: #111; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">
            保存
          </button>
        </div>
      </div>
    `;

		document.body.appendChild(overlay);

		// キャンセルボタン
		document.getElementById('amazon-link-card-cancel-btn')?.addEventListener('click', () => {
			overlay.remove();
		});

		// 保存ボタン
		document.getElementById('amazon-link-card-save-btn')?.addEventListener('click', () => {
			const input = document.getElementById('amazon-associate-id-input');
			const newId = input?.value.trim() || '';
			GM_setValue('amazonAssociateId', newId);
			showToast(
				newId ? 'アソシエイトIDを保存しました' : 'アソシエイトIDをクリアしました',
				'success'
			);
			overlay.remove();
		});

		// 背景クリックで閉じる
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});
	}

	/**
	 * コピーボタンと設定ボタンを生成してページに追加する
	 */
	function addCopyButton() {
		// Amazonアソシエイトツールバーのリンク生成ボタンのコンテナを探す
		const getLinkContainer = document.querySelector('.amzn-ss-get-link-container');

		if (getLinkContainer) {
			// ツールバー内にボタンを配置
			const container = document.createElement('div');
			container.className = 'amzn-ss-link-container amazon-link-card-toolbar-container';
			container.innerHTML = `
        <button title="アソシエイトID設定" id="amazon-link-card-settings-btn" class="amzn-ss-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 8C11.2089 8 10.4355 8.2346 9.77772 8.67412C9.11993 9.11365 8.60723 9.73836 8.30448 10.4693C8.00173 11.2002 7.92252 12.0044 8.07686 12.7804C8.2312 13.5563 8.61216 14.269 9.17157 14.8284C9.73098 15.3878 10.4437 15.7688 11.2196 15.9231C11.9956 16.0775 12.7998 15.9983 13.5307 15.6955C14.2616 15.3928 14.8864 14.8801 15.3259 14.2223C15.7654 13.5645 16 12.7911 16 12C16 10.9391 15.5786 9.92172 14.8284 9.17157C14.0783 8.42143 13.0609 8 12 8ZM12 14C11.6044 14 11.2178 13.8827 10.8889 13.6629C10.56 13.4432 10.3036 13.1308 10.1522 12.7654C10.0009 12.3999 9.96126 11.9978 10.0384 11.6098C10.1156 11.2219 10.3061 10.8655 10.5858 10.5858C10.8655 10.3061 11.2219 10.1156 11.6098 10.0384C11.9978 9.96126 12.3999 10.0009 12.7654 10.1522C13.1308 10.3036 13.4432 10.56 13.6629 10.8889C13.8827 11.2178 14 11.6044 14 12C14 12.5304 13.7893 13.0391 13.4142 13.4142C13.0391 13.7893 12.5304 14 12 14Z" fill="#0F1111"></path>
            <path d="M21.21 13.77L20 12.32C20 12.22 20 12.11 20 12C20 11.89 20 11.68 20 11.53L21.05 10.53C21.407 10.2257 21.6457 9.80553 21.7243 9.34305C21.8029 8.88057 21.7165 8.40517 21.48 7.99999L20.36 5.99999C20.1838 5.69478 19.9301 5.44155 19.6245 5.26595C19.319 5.09034 18.9725 4.99859 18.62 4.99999C18.419 4.99817 18.2192 5.03203 18.03 5.09999L16.54 5.46999C16.1887 5.22587 15.8173 5.01178 15.43 4.82999L15.12 3.65999C15.0286 3.19959 14.7781 2.78603 14.4125 2.49169C14.0469 2.19735 13.5893 2.041 13.12 2.04999H10.82C10.3507 2.041 9.89322 2.19735 9.52758 2.49169C9.16194 2.78603 8.91148 3.19959 8.82004 3.65999L8.57004 4.77999C8.1672 4.96804 7.78229 5.19229 7.42004 5.44999L6.20004 5.09999C5.76055 4.92129 5.27185 4.90464 4.82122 5.05302C4.37059 5.2014 3.98738 5.50514 3.74004 5.90999L2.54004 7.90999C2.30363 8.2982 2.2065 8.75537 2.26467 9.20616C2.32284 9.65696 2.53282 10.0745 2.86004 10.39L4.00004 11.58C4.00004 11.72 4.00004 11.86 4.00004 12C3.99505 12.0766 3.99505 12.1534 4.00004 12.23L2.76004 13.84C2.43388 14.1828 2.23982 14.6301 2.21236 15.1025C2.18489 15.5749 2.3258 16.0417 2.61004 16.42L4.00004 18.26C4.18531 18.507 4.42528 18.7078 4.70114 18.8466C4.97699 18.9854 5.28124 19.0584 5.59004 19.06C5.89176 19.063 6.1899 18.9944 6.46004 18.86L7.35004 18.51C7.73432 18.7832 8.14267 19.0208 8.57004 19.22L8.88004 20.39C8.97148 20.8504 9.22194 21.2639 9.58758 21.5583C9.95322 21.8526 10.4107 22.009 10.88 22H13.18C13.6493 22.009 14.1069 21.8526 14.4725 21.5583C14.8381 21.2639 15.0886 20.8504 15.18 20.39L15.49 19.22C15.9074 19.0215 16.3086 18.7908 16.69 18.53L17.69 18.9C17.9429 19.0077 18.2152 19.0622 18.49 19.06C18.8125 19.0595 19.13 18.981 19.4156 18.8312C19.7011 18.6815 19.9462 18.4649 20.13 18.2L21.44 16.3C21.7007 15.9169 21.8203 15.4552 21.7783 14.9938C21.7364 14.5323 21.5355 14.0998 21.21 13.77ZM18.47 17.06H18.4H18.34L17.29 16.69L16.29 16.35L15.45 16.94C15.171 17.1418 14.8729 17.316 14.56 17.46L13.72 17.86L13.48 18.75L13.17 19.91V19.98V20.05H10.87V19.98V19.91L10.5 18.7L10.26 17.81L9.42004 17.41C9.10383 17.2564 8.79963 17.0793 8.51004 16.88L7.63004 16.25L6.63004 16.65L5.72004 17H5.66004H5.59004L4.21004 15.22L4.28004 15.14L4.34004 15.06L5.59004 13.45L6.00004 12.87V12.14V12C6.00004 11.9 6.00004 11.79 6.00004 11.69V10.83L5.41004 10.21L4.32004 8.99999L4.25004 8.92999L5.45004 6.92999H5.55004H5.64004L6.87004 7.27999L7.78004 7.53999L8.56004 6.99999C8.83844 6.81094 9.12908 6.64057 9.43004 6.48999L10.26 6.09999L10.5 5.20999L10.81 4.04999V3.97999V3.90999H13.11V3.97999V4.04999L13.5 5.29999L13.74 6.18999L14.57 6.58999C14.8649 6.72246 15.1462 6.88321 15.41 7.06999L16.15 7.57999L17 7.35999L18.52 6.99999H18.61L19.74 8.99999H19.68L19.63 9.04999L18.58 10.05L17.93 10.69L17.99 11.61C17.99 11.72 17.99 11.84 17.99 11.95C17.9953 12.0266 17.9953 12.1034 17.99 12.18L18 13L18.5 13.59L19.72 15.04H19.77L19.82 15.09L18.47 17.06Z" fill="#0F1111"></path>
          </svg>
        </button>
        <span class="a-declarative">
          <button title="リンクカード" id="amazon-link-card-copy-btn" class="a-button a-button-primary">
            <span class="a-button-inner">
              <span class="a-button-text">リンクカード</span>
            </span>
          </button>
        </span>
      `;

			// ツールバーの「リンク生成」ボタンの前に挿入
			getLinkContainer.insertAdjacentElement('beforebegin', container);
		} else {
			// ツールバーが見つからない場合は従来通り右下に配置
			const container = document.createElement('div');
			container.id = 'amazon-link-card-button-fallback';
			container.innerHTML = `
        <button id="amazon-link-card-settings-btn" title="アソシエイトID設定">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m5.2-13.2l-4.3 4.3m0 6l4.3 4.3M23 12h-6m-6 0H5m13.2 5.2l-4.3-4.3m0-6l4.3-4.3"></path>
          </svg>
        </button>
        <button id="amazon-link-card-copy-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>リンクカードをコピー</span>
        </button>
      `;

			document.body.appendChild(container);
		}

		// 設定ボタンクリックイベント
		const settingsButton = document.getElementById('amazon-link-card-settings-btn');
		settingsButton?.addEventListener('click', showSettingsModal);

		// コピーボタンクリックイベント
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
    /* ツールバー統合用のスタイル */
    .amazon-link-card-toolbar-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .amazon-link-card-toolbar-container .amzn-ss-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease;
    }

    .amazon-link-card-toolbar-container .amzn-ss-icon:hover {
      opacity: 0.7;
    }

    /* フォールバック用：ボタンコンテナのスタイル */
    #amazon-link-card-button-fallback {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      gap: 8px;
    }

    /* フォールバック用：設定ボタンのスタイル */
    #amazon-link-card-button-fallback #amazon-link-card-settings-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: #fff;
      color: #111;
      border: 1px solid #ddd;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    #amazon-link-card-button-fallback #amazon-link-card-settings-btn:hover {
      background: #f7f7f7;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    #amazon-link-card-button-fallback #amazon-link-card-settings-btn:active {
      transform: translateY(0);
    }

    /* フォールバック用：コピーボタンのスタイル */
    #amazon-link-card-button-fallback #amazon-link-card-copy-btn {
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

    #amazon-link-card-button-fallback #amazon-link-card-copy-btn:hover {
      background: #ffad33;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    #amazon-link-card-button-fallback #amazon-link-card-copy-btn:active {
      transform: translateY(0);
    }

    /* モーダルのスタイル */
    #amazon-link-card-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    }

    #amazon-link-card-modal {
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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
