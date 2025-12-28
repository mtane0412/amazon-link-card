/**
 * LocalStorageでのCookie管理
 *
 * Amazon CookieをLocalStorageに保存・読み込み・削除する機能を提供します。
 * Cookie有効期限管理も行います。
 */

import type { StoredCookie } from '$lib/types/linkCard';

const STORAGE_KEY = 'amazon-link-card:cookie';
const DEFAULT_EXPIRY_DAYS = 365;

/**
 * CookieをLocalStorageに保存する
 *
 * @param cookieValue - 保存するCookie値
 * @param expiryDays - 有効期限（日数、デフォルト365日）
 */
export function saveCookie(cookieValue: string, expiryDays = DEFAULT_EXPIRY_DAYS): void {
	const now = Date.now();
	const data: StoredCookie = {
		value: cookieValue,
		expiresAt: now + expiryDays * 24 * 60 * 60 * 1000,
		createdAt: now
	};

	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * LocalStorageからCookieを読み込む
 *
 * 有効期限が切れている場合はnullを返し、LocalStorageから削除します。
 *
 * @returns Cookie値（有効期限切れまたは未設定の場合はnull）
 */
export function loadCookie(): string | null {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;

	try {
		const data: StoredCookie = JSON.parse(raw);

		// 有効期限チェック
		if (Date.now() > data.expiresAt) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}

		return data.value;
	} catch {
		return null;
	}
}

/**
 * LocalStorageからCookieを削除する
 */
export function deleteCookie(): void {
	localStorage.removeItem(STORAGE_KEY);
}
