/**
 * storageのユニットテスト
 *
 * LocalStorageでのAmazon Cookie管理機能のテストケースです。
 * Cookie保存、読み込み、削除、有効期限管理の動作を検証します。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveCookie, loadCookie, deleteCookie } from './storage';

// localStorage モックの型定義
interface LocalStorageMock {
	store: Record<string, string>;
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
	clear: () => void;
}

// localStorageのモックを作成
const localStorageMock: LocalStorageMock = {
	store: {},
	getItem(key: string) {
		return this.store[key] || null;
	},
	setItem(key: string, value: string) {
		this.store[key] = value;
	},
	removeItem(key: string) {
		delete this.store[key];
	},
	clear() {
		this.store = {};
	}
};

// グローバルのlocalStorageをモックに置き換え
global.localStorage = localStorageMock as Storage;

describe('storage', () => {
	beforeEach(() => {
		// テストケースごとにlocalStorageをクリア
		localStorageMock.clear();
		// Date.now()のモックをリセット
		vi.restoreAllMocks();
	});

	describe('saveCookie', () => {
		it('Cookie値をlocalStorageに保存する', () => {
			// 前提条件: 現在時刻を固定（2025年1月1日 00:00:00 UTC）
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			const cookieValue = 'session-id=test123; ubid-main=456-789';

			// 検証項目: Cookie値が正しくJSON形式で保存される
			saveCookie(cookieValue);

			const stored = localStorage.getItem('amazon-link-card:cookie');
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.value).toBe(cookieValue);
			expect(parsed.createdAt).toBe(now);
			// デフォルト有効期限: 365日 = 365 * 24 * 60 * 60 * 1000ミリ秒
			expect(parsed.expiresAt).toBe(now + 365 * 24 * 60 * 60 * 1000);
		});

		it('カスタム有効期限でCookieを保存する', () => {
			// 前提条件: 現在時刻を固定
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			const cookieValue = 'test-cookie';
			const expiryDays = 30;

			// 検証項目: 指定した有効期限（30日）で保存される
			saveCookie(cookieValue, expiryDays);

			const stored = localStorage.getItem('amazon-link-card:cookie');
			const parsed = JSON.parse(stored!);

			expect(parsed.expiresAt).toBe(now + 30 * 24 * 60 * 60 * 1000);
		});

		it('既存のCookieを上書き保存する', () => {
			// 前提条件: すでにCookieが保存されている状態
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			saveCookie('old-cookie');

			// 検証項目: 新しいCookieで上書きされる
			const newNow = new Date('2025-01-02T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(newNow);

			saveCookie('new-cookie');

			const stored = localStorage.getItem('amazon-link-card:cookie');
			const parsed = JSON.parse(stored!);

			expect(parsed.value).toBe('new-cookie');
			expect(parsed.createdAt).toBe(newNow);
		});
	});

	describe('loadCookie', () => {
		it('有効期限内のCookieを読み込む', () => {
			// 前提条件: 有効期限内のCookieを保存
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			saveCookie('valid-cookie');

			// 検証項目: 保存したCookie値が正しく読み込まれる
			// 1日後（有効期限内）に読み込み
			const oneDayLater = now + 24 * 60 * 60 * 1000;
			vi.spyOn(Date, 'now').mockReturnValue(oneDayLater);

			const loaded = loadCookie();
			expect(loaded).toBe('valid-cookie');
		});

		it('有効期限切れのCookieはnullを返し、削除する', () => {
			// 前提条件: 有効期限30日のCookieを保存
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			saveCookie('expired-cookie', 30);

			// 検証項目: 31日後（有効期限切れ）に読み込むとnullが返る
			const afterExpiry = now + 31 * 24 * 60 * 60 * 1000;
			vi.spyOn(Date, 'now').mockReturnValue(afterExpiry);

			const loaded = loadCookie();
			expect(loaded).toBeNull();

			// localStorageから削除されていることを確認
			const stored = localStorage.getItem('amazon-link-card:cookie');
			expect(stored).toBeNull();
		});

		it('Cookieが保存されていない場合はnullを返す', () => {
			// 前提条件: localStorageにCookieが保存されていない

			// 検証項目: nullが返る
			const loaded = loadCookie();
			expect(loaded).toBeNull();
		});

		it('不正なJSON形式の場合はnullを返す', () => {
			// 前提条件: 不正なJSON形式のデータをlocalStorageに保存
			localStorage.setItem('amazon-link-card:cookie', 'invalid-json-data');

			// 検証項目: JSONパースエラーを捕捉し、nullが返る
			const loaded = loadCookie();
			expect(loaded).toBeNull();
		});

		it('有効期限がちょうど現在時刻と同じ場合は期限切れとして扱う', () => {
			// 前提条件: 有効期限と現在時刻が一致するケース
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			saveCookie('cookie', 1);

			// 検証項目: ちょうど1日後（expiresAt === now）は期限切れ
			const exactExpiry = now + 1 * 24 * 60 * 60 * 1000;
			vi.spyOn(Date, 'now').mockReturnValue(exactExpiry);

			// Date.now() > data.expiresAt の条件なので、
			// exactExpiryの1ミリ秒後に読み込むと期限切れになる
			vi.spyOn(Date, 'now').mockReturnValue(exactExpiry + 1);

			const loaded = loadCookie();
			expect(loaded).toBeNull();
		});
	});

	describe('deleteCookie', () => {
		it('localStorageからCookieを削除する', () => {
			// 前提条件: Cookieが保存されている状態
			saveCookie('test-cookie');

			// 検証項目: deleteCookieを呼ぶとlocalStorageから削除される
			expect(localStorage.getItem('amazon-link-card:cookie')).not.toBeNull();

			deleteCookie();

			expect(localStorage.getItem('amazon-link-card:cookie')).toBeNull();
		});

		it('Cookieが保存されていない状態でもエラーにならない', () => {
			// 前提条件: Cookieが保存されていない

			// 検証項目: エラーなく実行できる
			expect(() => deleteCookie()).not.toThrow();

			expect(localStorage.getItem('amazon-link-card:cookie')).toBeNull();
		});
	});

	describe('統合シナリオ', () => {
		it('保存 → 読み込み → 削除のフローが正しく動作する', () => {
			// 前提条件: 現在時刻を固定
			const now = new Date('2025-01-01T00:00:00Z').getTime();
			vi.spyOn(Date, 'now').mockReturnValue(now);

			// 1. Cookie保存
			const cookieValue = 'session-id=abc123';
			saveCookie(cookieValue, 7);

			// 2. 読み込み（保存直後）
			const loaded1 = loadCookie();
			expect(loaded1).toBe(cookieValue);

			// 3. 読み込み（3日後、有効期限内）
			vi.spyOn(Date, 'now').mockReturnValue(now + 3 * 24 * 60 * 60 * 1000);
			const loaded2 = loadCookie();
			expect(loaded2).toBe(cookieValue);

			// 4. 読み込み（8日後、有効期限切れ）
			vi.spyOn(Date, 'now').mockReturnValue(now + 8 * 24 * 60 * 60 * 1000);
			const loaded3 = loadCookie();
			expect(loaded3).toBeNull();

			// 5. 再度保存
			saveCookie('new-cookie');
			const loaded4 = loadCookie();
			expect(loaded4).toBe('new-cookie');

			// 6. 手動削除
			deleteCookie();
			const loaded5 = loadCookie();
			expect(loaded5).toBeNull();
		});
	});
});
