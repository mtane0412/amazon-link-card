/**
 * Amazon URLのバリデーション処理
 *
 * Amazon商品URLの妥当性を検証し、トラッキングパラメータを除去して正規化します。
 */

/**
 * Amazon URLの妥当性を検証する
 *
 * @param url - 検証対象のURL
 * @returns 検証結果（isValid: 有効かどうか、error: エラーメッセージ）
 */
export function validateAmazonURL(url: string): {
	isValid: boolean;
	error?: string;
} {
	try {
		const parsed = new URL(url);

		// Amazon標準ドメイン
		const validDomains = [
			'amazon.co.jp',
			'amazon.com',
			'amazon.co.uk',
			'amazon.de',
			'amazon.fr',
			'amazon.it',
			'amazon.es',
			'amazon.ca',
			'www.amazon.co.jp',
			'www.amazon.com',
			'www.amazon.co.uk',
			'www.amazon.de',
			'www.amazon.fr',
			'www.amazon.it',
			'www.amazon.es',
			'www.amazon.ca'
		];

		// Amazon短縮URLドメイン（amzn.to, a.co）
		const shortUrlDomains = ['amzn.to', 'a.co'];

		const isStandardDomain = validDomains.some((d) => parsed.hostname === d);
		const isShortUrl = shortUrlDomains.some((d) => parsed.hostname === d);

		if (!isStandardDomain && !isShortUrl) {
			return {
				isValid: false,
				error: 'AmazonのURLを入力してください'
			};
		}

		// 短縮URLの場合は商品ページパターンチェックをスキップ
		// （リダイレクト後に商品ページになるため）
		if (isShortUrl) {
			return { isValid: true };
		}

		// 標準ドメインの場合は商品ページのパターンチェック（/dp/ または /gp/product/）
		if (!parsed.pathname.includes('/dp/') && !parsed.pathname.includes('/gp/product/')) {
			return {
				isValid: false,
				error: '商品ページのURLを入力してください'
			};
		}

		return { isValid: true };
	} catch {
		return {
			isValid: false,
			error: '有効なURLを入力してください'
		};
	}
}

/**
 * URLを正規化する（トラッキングパラメータ除去）
 *
 * @param url - 正規化対象のURL
 * @returns 正規化されたURL
 */
export function normalizeAmazonURL(url: string): string {
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
