/**
 * Cookie状態管理用のStore
 *
 * Amazon Cookieの状態をアプリケーション全体で共有するためのSvelte Storeです。
 */

import { writable } from 'svelte/store';

/**
 * Cookie状態の型定義
 */
interface CookieState {
	/** Cookie値 */
	value: string | null;

	/** 有効期限（Unix timestamp） */
	expiresAt: number | null;

	/** 有効かどうか */
	isValid: boolean;
}

/**
 * Cookie状態を管理するStore
 */
export const cookieStore = writable<CookieState>({
	value: null,
	expiresAt: null,
	isValid: false
});
