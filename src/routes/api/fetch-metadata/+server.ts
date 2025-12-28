/**
 * メタデータ取得APIエンドポイント（SvelteKit版）
 *
 * 開発環境とCloudflare Pages両方で動作するように、
 * SvelteKitのサーバールートとして実装します。
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface AmazonMetadata {
	title: string;
	image: string;
	description: string;
	price?: string;
	url: string;
}

/**
 * POSTリクエストハンドラ
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url, cookie } = await request.json();

		if (!url) {
			return json({ error: 'URL is required' }, { status: 400 });
		}

		// Amazonにリクエスト
		const headers: Record<string, string> = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			Accept: 'text/html,application/xhtml+xml',
			'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
		};

		if (cookie) {
			headers['Cookie'] = cookie;
		}

		const response = await fetch(url, {
			headers,
			// リダイレクトを自動追跡（短縮URL対応）
			redirect: 'follow'
		});

		// 503エラー（ボット検出）の場合
		if (response.status === 503) {
			return json(
				{
					error: 'COOKIE_REQUIRED',
					message: 'Amazonにブロックされました。Cookie設定が必要です。'
				},
				{ status: 503 }
			);
		}

		if (!response.ok) {
			return json({ error: 'Failed to fetch Amazon page' }, { status: response.status });
		}

		const html = await response.text();
		// リダイレクト後の最終URLを使用（短縮URLの場合に実際の商品URLになる）
		const finalUrl = response.url || url;
		const metadata = parseOGP(html, finalUrl);

		return json(metadata);
	} catch (error) {
		console.error('Metadata fetch error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * HTMLからOGPメタタグをパースする
 *
 * @param html - Amazon商品ページのHTML
 * @param originalUrl - 元のURL
 * @returns パースされたメタデータ
 */
function parseOGP(html: string, originalUrl: string): AmazonMetadata {
	/**
	 * メタタグのcontent属性を取得する
	 * AmazonはOGPタグではなく、通常のnameメタタグを使用
	 */
	const getMetaContent = (name: string): string => {
		// name="title" content="..." の形式
		const namePattern = new RegExp(
			`<meta[^>]*name\\s*=\\s*["']${name}["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
			'i'
		);
		const nameMatch = html.match(namePattern);
		if (nameMatch?.[1]) {
			return nameMatch[1];
		}

		// content="..." name="title" の形式
		const contentFirstPattern = new RegExp(
			`<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*name\\s*=\\s*["']${name}["']`,
			'i'
		);
		const contentMatch = html.match(contentFirstPattern);
		if (contentMatch?.[1]) {
			return contentMatch[1];
		}

		return '';
	};

	/**
	 * 画像URLを取得する
	 * Amazon商品画像は複数の場所に存在する可能性がある
	 */
	const getImageUrl = (): string => {
		// パターン1: imgタグのlandingImage
		const landingImageMatch = html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i);
		if (landingImageMatch?.[1]) {
			return landingImageMatch[1];
		}

		// パターン2: data-old-hires属性（高解像度画像）
		const oldHiresMatch = html.match(/data-old-hires=["']([^"']+)["']/i);
		if (oldHiresMatch?.[1]) {
			return oldHiresMatch[1];
		}

		// パターン3: data-a-dynamic-image属性（JSON形式）
		const dynamicImageMatch = html.match(/data-a-dynamic-image=["'](\{[^"']+\})["']/i);
		if (dynamicImageMatch?.[1]) {
			try {
				const imageData = JSON.parse(dynamicImageMatch[1].replace(/&quot;/g, '"'));
				const imageUrl = Object.keys(imageData)[0]; // 最初の画像URLを取得
				if (imageUrl) {
					return imageUrl;
				}
			} catch (e) {
				// JSONパースエラーは無視
			}
		}

		// パターン4: JSON-LDのimage
		const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i);
		if (jsonLdMatch?.[1]) {
			try {
				const jsonData = JSON.parse(jsonLdMatch[1]);
				if (jsonData.image) {
					const imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
					return imageUrl;
				}
			} catch (e) {
				// JSONパースエラーは無視
			}
		}

		// パターン5: 最初の大きな商品画像（srcのみ）
		const imgMatch = html.match(/<img[^>]*class=["'][^"']*a-dynamic-image[^"']*["'][^>]*src=["']([^"']+)["']/i);
		if (imgMatch?.[1]) {
			return imgMatch[1];
		}

		return '';
	};

	// 価格取得（Amazon特有のHTML構造）
	const priceMatch = html.match(/class="a-price-whole">([^<]+)</);
	const currencyMatch = html.match(/class="a-price-symbol">([^<]+)</);

	let price: string | undefined;
	if (priceMatch?.[1]) {
		const currency = currencyMatch?.[1] || '¥';
		price = `${currency}${priceMatch[1].trim()}`;
	}

	// タイトルと説明を取得（Amazon.co.jp: プレフィックスを削除）
	let title = getMetaContent('title');
	let description = getMetaContent('description');

	// "Amazon.co.jp: " プレフィックスを削除
	title = title.replace(/^Amazon\.co\.jp:\s*/i, '').replace(/^Amazon\.com:\s*/i, '');
	description = description.replace(/^Amazon\.co\.jp:\s*/i, '').replace(/^Amazon\.com:\s*/i, '');

	const image = getImageUrl();

	return {
		title,
		image,
		description,
		price,
		url: originalUrl
	};
}
