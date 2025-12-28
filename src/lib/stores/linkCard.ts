/**
 * リンクカード状態管理用のStore
 *
 * リンクカード生成の状態（URL、メタデータ、生成されたHTML、ローディング、エラー）を
 * アプリケーション全体で共有するためのSvelte Storeです。
 */

import { writable } from 'svelte/store';
import type { LinkCardState } from '$lib/types/linkCard';

/**
 * リンクカード状態を管理するStore
 */
export const linkCardStore = writable<LinkCardState>({
	url: '',
	metadata: null,
	htmlCode: '',
	isLoading: false,
	error: null
});
