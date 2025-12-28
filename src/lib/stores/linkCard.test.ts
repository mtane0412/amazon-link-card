/**
 * linkCard Storeのユニットテスト
 *
 * リンクカード状態管理Storeのテストケースです。
 * Svelte Storeの購読、更新、状態変更が正しく動作することを検証します。
 */

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { linkCardStore } from './linkCard';
import type { LinkCardState } from '$lib/types/linkCard';
import type { AmazonMetadata } from '$lib/types/amazon';

describe('linkCardStore', () => {
	describe('初期状態', () => {
		it('初期値が正しく設定されている', () => {
			// 前提条件: Storeが初期化されている

			// 検証項目: 初期値が空の状態である
			const state = get(linkCardStore);

			expect(state.url).toBe('');
			expect(state.metadata).toBeNull();
			expect(state.htmlCode).toBe('');
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('状態の更新', () => {
		it('URL入力時に状態を更新できる', () => {
			// 前提条件: 初期状態のStore

			// 検証項目: URLのみを更新できる
			linkCardStore.update((state) => ({
				...state,
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Y'
			}));

			const state = get(linkCardStore);
			expect(state.url).toBe('https://www.amazon.co.jp/dp/B0DP6MYX5Y');
			expect(state.metadata).toBeNull();
			expect(state.isLoading).toBe(false);
		});

		it('ローディング状態を設定できる', () => {
			// 前提条件: URLが入力された状態
			linkCardStore.set({
				url: 'https://www.amazon.co.jp/dp/TEST',
				metadata: null,
				htmlCode: '',
				isLoading: false,
				error: null
			});

			// 検証項目: ローディング状態をtrueに設定できる
			linkCardStore.update((state) => ({
				...state,
				isLoading: true
			}));

			const state = get(linkCardStore);
			expect(state.isLoading).toBe(true);
		});

		it('メタデータとHTMLコードを設定できる', () => {
			// 前提条件: ローディング中の状態
			linkCardStore.set({
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Y',
				metadata: null,
				htmlCode: '',
				isLoading: true,
				error: null
			});

			const metadata: AmazonMetadata = {
				title: 'テスト商品',
				description: 'これはテスト商品の説明です。',
				image: 'https://example.com/image.jpg',
				price: '¥2,980',
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Y'
			};

			const htmlCode = '<div>Generated HTML</div>';

			// 検証項目: メタデータとHTMLコードを設定し、ローディングを解除できる
			linkCardStore.update((state) => ({
				...state,
				metadata,
				htmlCode,
				isLoading: false
			}));

			const state = get(linkCardStore);
			expect(state.metadata).toEqual(metadata);
			expect(state.htmlCode).toBe(htmlCode);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
		});

		it('エラー状態を設定できる', () => {
			// 前提条件: ローディング中の状態
			linkCardStore.set({
				url: 'https://www.amazon.co.jp/dp/INVALID',
				metadata: null,
				htmlCode: '',
				isLoading: true,
				error: null
			});

			const errorMessage = 'メタデータ取得に失敗しました';

			// 検証項目: エラーメッセージを設定し、ローディングを解除できる
			linkCardStore.update((state) => ({
				...state,
				isLoading: false,
				error: errorMessage
			}));

			const state = get(linkCardStore);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(errorMessage);
		});

		it('エラーをクリアできる', () => {
			// 前提条件: エラーが発生している状態
			linkCardStore.set({
				url: 'https://www.amazon.co.jp/dp/TEST',
				metadata: null,
				htmlCode: '',
				isLoading: false,
				error: 'エラーメッセージ'
			});

			// 検証項目: エラーをnullにクリアできる
			linkCardStore.update((state) => ({
				...state,
				error: null
			}));

			const state = get(linkCardStore);
			expect(state.error).toBeNull();
		});
	});

	describe('Store購読', () => {
		it('Storeの変更を購読できる', () => {
			// 前提条件: 初期状態のStore
			const states: LinkCardState[] = [];

			// Storeを購読
			const unsubscribe = linkCardStore.subscribe((state) => {
				states.push(state);
			});

			// 検証項目: 購読時に現在の状態が通知される
			expect(states.length).toBeGreaterThan(0);

			// Storeを更新
			linkCardStore.update((state) => ({
				...state,
				url: 'https://www.amazon.co.jp/dp/TEST1'
			}));

			linkCardStore.update((state) => ({
				...state,
				url: 'https://www.amazon.co.jp/dp/TEST2'
			}));

			// 検証項目: 更新のたびに購読が通知される
			expect(states.length).toBeGreaterThanOrEqual(3); // 初期 + 2回の更新
			expect(states[states.length - 1].url).toBe('https://www.amazon.co.jp/dp/TEST2');

			// 購読解除
			unsubscribe();
		});
	});

	describe('統合シナリオ', () => {
		it('リンクカード生成の完全なフローをシミュレートする', () => {
			// 1. 初期状態
			linkCardStore.set({
				url: '',
				metadata: null,
				htmlCode: '',
				isLoading: false,
				error: null
			});

			const initialState = get(linkCardStore);
			expect(initialState.isLoading).toBe(false);
			expect(initialState.error).toBeNull();

			// 2. URL入力
			linkCardStore.update((state) => ({
				...state,
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Y'
			}));

			const urlInputState = get(linkCardStore);
			expect(urlInputState.url).toBe('https://www.amazon.co.jp/dp/B0DP6MYX5Y');

			// 3. メタデータ取得開始（ローディング開始）
			linkCardStore.update((state) => ({
				...state,
				isLoading: true,
				error: null
			}));

			const loadingState = get(linkCardStore);
			expect(loadingState.isLoading).toBe(true);
			expect(loadingState.error).toBeNull();

			// 4. メタデータ取得成功
			const metadata: AmazonMetadata = {
				title: 'テスト商品名',
				description: 'テスト商品の説明文です。',
				image: 'https://example.com/product.jpg',
				price: '¥3,980',
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Y'
			};

			const htmlCode = '<div class="amazon-link-card">...</div>';

			linkCardStore.update((state) => ({
				...state,
				metadata,
				htmlCode,
				isLoading: false
			}));

			const successState = get(linkCardStore);
			expect(successState.isLoading).toBe(false);
			expect(successState.metadata).toEqual(metadata);
			expect(successState.htmlCode).toBe(htmlCode);
			expect(successState.error).toBeNull();

			// 5. 新しいURL入力（状態リセット）
			linkCardStore.update((state) => ({
				...state,
				url: 'https://www.amazon.co.jp/dp/B0NEWTEST',
				metadata: null,
				htmlCode: '',
				error: null
			}));

			const resetState = get(linkCardStore);
			expect(resetState.url).toBe('https://www.amazon.co.jp/dp/B0NEWTEST');
			expect(resetState.metadata).toBeNull();
			expect(resetState.htmlCode).toBe('');

			// 6. メタデータ取得失敗
			linkCardStore.update((state) => ({
				...state,
				isLoading: true
			}));

			linkCardStore.update((state) => ({
				...state,
				isLoading: false,
				error: 'メタデータ取得に失敗しました'
			}));

			const errorState = get(linkCardStore);
			expect(errorState.isLoading).toBe(false);
			expect(errorState.error).toBe('メタデータ取得に失敗しました');
			expect(errorState.metadata).toBeNull();
		});
	});
});
