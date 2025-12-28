/**
 * Amazonメタデータの型定義
 *
 * Amazon商品ページから取得するOGPメタデータの構造を定義します。
 */

/**
 * Amazonメタデータ
 */
export interface AmazonMetadata {
	/** 商品タイトル */
	title: string;

	/** 商品画像URL */
	image: string;

	/** 商品説明 */
	description: string;

	/** 価格（取得できない場合はundefined） */
	price?: string;

	/** 元のAmazon URL */
	url: string;
}

/**
 * メタデータ取得エラー種別
 */
export type MetadataError =
	| 'INVALID_URL'
	| 'COOKIE_REQUIRED'
	| 'FETCH_FAILED'
	| 'PARSE_FAILED'
	| 'UNKNOWN';
