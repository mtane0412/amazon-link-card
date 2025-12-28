/**
 * AmazonページからOGPメタデータを取得するCloudflare Workers APIエンドポイント
 *
 * CORS対策として、ブラウザからの直接リクエストの代わりにサーバーサイドで
 * AmazonにアクセスしてメタデータをパースしてJSON形式で返します。
 */

export interface Env {}

interface AmazonMetadata {
	title: string;
	image: string;
	description: string;
	price?: string;
	url: string;
}

/**
 * Cloudflare Workers関数エントリーポイント
 */
export async function onRequest(context: { request: Request; env: Env }) {
	const { request } = context;

	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type'
	};

	// プリフライトリクエスト対応
	if (request.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	try {
		const { url, cookie } = await request.json();

		if (!url) {
			return new Response(JSON.stringify({ error: 'URL is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
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
			return new Response(
				JSON.stringify({
					error: 'COOKIE_REQUIRED',
					message: 'Amazonにブロックされました。Cookie設定が必要です。'
				}),
				{
					status: 503,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				}
			);
		}

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Failed to fetch Amazon page' }), {
				status: response.status,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const html = await response.text();
		// リダイレクト後の最終URLを使用（短縮URLの場合に実際の商品URLになる）
		const finalUrl = response.url || url;
		const metadata = parseOGP(html, finalUrl);

		return new Response(JSON.stringify(metadata), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
}

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
	 */
	const getMetaContent = (property: string): string => {
		const regex = new RegExp(
			`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`,
			'i'
		);
		const altRegex = new RegExp(
			`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`,
			'i'
		);

		const match = html.match(regex) || html.match(altRegex);
		return match?.[1] || '';
	};

	// 価格取得（Amazon特有のHTML構造）
	const priceMatch = html.match(/class="a-price-whole">([^<]+)</);
	const currencyMatch = html.match(/class="a-price-symbol">([^<]+)</);

	let price: string | undefined;
	if (priceMatch?.[1]) {
		const currency = currencyMatch?.[1] || '¥';
		price = `${currency}${priceMatch[1].trim()}`;
	}

	return {
		title: getMetaContent('og:title'),
		image: getMetaContent('og:image'),
		description: getMetaContent('og:description'),
		price,
		url: originalUrl
	};
}
