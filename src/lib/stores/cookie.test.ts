/**
 * cookie Storeのユニットテスト
 *
 * Amazon Cookie状態管理Storeのテストケースです。
 * Svelte Storeの購読、更新、Cookie有効性の状態変更が正しく動作することを検証します。
 */

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { cookieStore } from './cookie';

describe('cookieStore', () => {
	describe('初期状態', () => {
		it('初期値が正しく設定されている', () => {
			// 前提条件: Storeが初期化されている

			// 検証項目: 初期値がCookieなしの状態である
			const state = get(cookieStore);

			expect(state.value).toBeNull();
			expect(state.expiresAt).toBeNull();
			expect(state.isValid).toBe(false);
		});
	});

	describe('状態の更新', () => {
		it('Cookie値を設定できる', () => {
			// 前提条件: 初期状態のStore

			const cookieValue = 'session-id=test123; ubid-main=456-789';
			const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 365日後

			// 検証項目: Cookie値と有効期限を設定し、有効状態にできる
			cookieStore.update((state) => ({
				...state,
				value: cookieValue,
				expiresAt,
				isValid: true
			}));

			const state = get(cookieStore);
			expect(state.value).toBe(cookieValue);
			expect(state.expiresAt).toBe(expiresAt);
			expect(state.isValid).toBe(true);
		});

		it('Cookie値をクリアできる', () => {
			// 前提条件: Cookieが設定されている状態
			cookieStore.set({
				value: 'session-id=abc',
				expiresAt: Date.now() + 1000,
				isValid: true
			});

			// 検証項目: Cookie値をnullにクリアし、無効状態にできる
			cookieStore.update((state) => ({
				...state,
				value: null,
				expiresAt: null,
				isValid: false
			}));

			const state = get(cookieStore);
			expect(state.value).toBeNull();
			expect(state.expiresAt).toBeNull();
			expect(state.isValid).toBe(false);
		});

		it('Cookie有効性のみを更新できる', () => {
			// 前提条件: Cookieが設定されているが無効な状態
			const expiresAt = Date.now() + 1000;
			cookieStore.set({
				value: 'session-id=test',
				expiresAt,
				isValid: false
			});

			// 検証項目: 有効性フラグのみを変更できる
			cookieStore.update((state) => ({
				...state,
				isValid: true
			}));

			const state = get(cookieStore);
			expect(state.value).toBe('session-id=test');
			expect(state.expiresAt).toBe(expiresAt);
			expect(state.isValid).toBe(true);
		});

		it('有効期限が切れたCookieを無効にできる', () => {
			// 前提条件: 有効期限付きのCookieが設定されている
			const pastExpiry = Date.now() - 1000; // 過去の有効期限
			cookieStore.set({
				value: 'session-id=expired',
				expiresAt: pastExpiry,
				isValid: true
			});

			// 検証項目: 有効期限切れのため無効状態に更新できる
			const now = Date.now();
			const currentState = get(cookieStore);

			if (currentState.expiresAt && now > currentState.expiresAt) {
				cookieStore.update((state) => ({
					...state,
					isValid: false
				}));
			}

			const state = get(cookieStore);
			expect(state.isValid).toBe(false);
		});
	});

	describe('Store購読', () => {
		it('Storeの変更を購読できる', () => {
			// 前提条件: 初期状態のStore
			const states: Array<{ value: string | null; expiresAt: number | null; isValid: boolean }> = [];

			// Storeを購読
			const unsubscribe = cookieStore.subscribe((state) => {
				states.push(state);
			});

			// 検証項目: 購読時に現在の状態が通知される
			expect(states.length).toBeGreaterThan(0);

			// Storeを更新
			cookieStore.update((state) => ({
				...state,
				value: 'cookie-1',
				isValid: true
			}));

			cookieStore.update((state) => ({
				...state,
				value: 'cookie-2',
				isValid: false
			}));

			// 検証項目: 更新のたびに購読が通知される
			expect(states.length).toBeGreaterThanOrEqual(3); // 初期 + 2回の更新
			expect(states[states.length - 1].value).toBe('cookie-2');
			expect(states[states.length - 1].isValid).toBe(false);

			// 購読解除
			unsubscribe();
		});
	});

	describe('統合シナリオ', () => {
		it('Cookie設定から削除までの完全なフローをシミュレートする', () => {
			// 1. 初期状態（Cookieなし）
			cookieStore.set({
				value: null,
				expiresAt: null,
				isValid: false
			});

			const initialState = get(cookieStore);
			expect(initialState.value).toBeNull();
			expect(initialState.isValid).toBe(false);

			// 2. Cookie設定
			const cookieValue = 'session-id=xyz789; ubid-main=123-456';
			const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;

			cookieStore.update((state) => ({
				...state,
				value: cookieValue,
				expiresAt,
				isValid: true
			}));

			const setCookieState = get(cookieStore);
			expect(setCookieState.value).toBe(cookieValue);
			expect(setCookieState.expiresAt).toBe(expiresAt);
			expect(setCookieState.isValid).toBe(true);

			// 3. Cookie更新
			const newCookieValue = 'session-id=abc123; ubid-main=789-012';
			const newExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

			cookieStore.update((state) => ({
				...state,
				value: newCookieValue,
				expiresAt: newExpiresAt
			}));

			const updatedState = get(cookieStore);
			expect(updatedState.value).toBe(newCookieValue);
			expect(updatedState.expiresAt).toBe(newExpiresAt);
			expect(updatedState.isValid).toBe(true);

			// 4. Cookie無効化（503エラー発生時など）
			cookieStore.update((state) => ({
				...state,
				isValid: false
			}));

			const invalidatedState = get(cookieStore);
			expect(invalidatedState.value).toBe(newCookieValue); // 値は残る
			expect(invalidatedState.isValid).toBe(false); // 無効になる

			// 5. Cookie削除
			cookieStore.update((state) => ({
				...state,
				value: null,
				expiresAt: null,
				isValid: false
			}));

			const deletedState = get(cookieStore);
			expect(deletedState.value).toBeNull();
			expect(deletedState.expiresAt).toBeNull();
			expect(deletedState.isValid).toBe(false);
		});

		it('有効期限のチェックと更新のフローをシミュレートする', () => {
			// 1. 有効期限付きCookieを設定
			const futureExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7日後
			cookieStore.set({
				value: 'session-id=test',
				expiresAt: futureExpiry,
				isValid: true
			});

			// 2. 有効期限内であることを確認
			const currentState = get(cookieStore);
			const isExpired = currentState.expiresAt ? Date.now() > currentState.expiresAt : false;
			expect(isExpired).toBe(false);
			expect(currentState.isValid).toBe(true);

			// 3. 有効期限切れをシミュレート
			const pastExpiry = Date.now() - 1000; // 過去の日時
			cookieStore.update((state) => ({
				...state,
				expiresAt: pastExpiry
			}));

			// 4. 有効期限切れを検出して無効化
			const expiredState = get(cookieStore);
			const isNowExpired = expiredState.expiresAt ? Date.now() > expiredState.expiresAt : false;
			expect(isNowExpired).toBe(true);

			if (isNowExpired) {
				cookieStore.update((state) => ({
					...state,
					value: null,
					expiresAt: null,
					isValid: false
				}));
			}

			const finalState = get(cookieStore);
			expect(finalState.value).toBeNull();
			expect(finalState.isValid).toBe(false);
		});
	});

	describe('エッジケース', () => {
		it('空文字列のCookie値を設定できる', () => {
			// 前提条件: 初期状態のStore

			// 検証項目: 空文字列も有効なCookie値として設定できる
			cookieStore.update((state) => ({
				...state,
				value: '',
				expiresAt: Date.now() + 1000,
				isValid: true
			}));

			const state = get(cookieStore);
			expect(state.value).toBe('');
			expect(state.isValid).toBe(true);
		});

		it('有効期限なしでもCookieを設定できる', () => {
			// 前提条件: 初期状態のStore

			// 検証項目: expiresAtがnullでもCookieを設定できる
			cookieStore.update((state) => ({
				...state,
				value: 'session-id=test',
				expiresAt: null,
				isValid: true
			}));

			const state = get(cookieStore);
			expect(state.value).toBe('session-id=test');
			expect(state.expiresAt).toBeNull();
			expect(state.isValid).toBe(true);
		});

		it('複数回の状態変更が正しく反映される', () => {
			// 前提条件: 初期状態のStore
			cookieStore.set({
				value: null,
				expiresAt: null,
				isValid: false
			});

			// 検証項目: 連続した状態変更が正しく適用される
			for (let i = 1; i <= 5; i++) {
				cookieStore.update((state) => ({
					...state,
					value: `cookie-${i}`,
					isValid: i % 2 === 0 // 偶数回のみ有効
				}));
			}

			const finalState = get(cookieStore);
			expect(finalState.value).toBe('cookie-5');
			expect(finalState.isValid).toBe(false); // 5は奇数なので無効
		});
	});
});
