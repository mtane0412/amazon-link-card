/**
 * リンクカード関連の型定義
 *
 * リンクカードの状態管理とCookie保存データの構造を定義します。
 */

import type { AmazonMetadata } from './amazon';

/**
 * リンクカード状態
 */
export interface LinkCardState {
	/** 入力されたURL */
	url: string;

	/** 取得したメタデータ */
	metadata: AmazonMetadata | null;

	/** 生成されたHTMLコード */
	htmlCode: string;

	/** ローディング状態 */
	isLoading: boolean;

	/** エラーメッセージ */
	error: string | null;
}

/**
 * Cookie保存データ
 */
export interface StoredCookie {
	/** Cookie値 */
	value: string;

	/** 有効期限（Unix timestamp） */
	expiresAt: number;

	/** 作成日時（Unix timestamp） */
	createdAt: number;
}
