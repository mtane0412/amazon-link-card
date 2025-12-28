<script lang="ts">
	/**
	 * メインページ
	 *
	 * Amazon Link Cardマイクロサービスのメインページです。
	 * 全てのコンポーネントを統合し、メタデータ取得からHTML生成までの
	 * フローを管理します。
	 */

	import { onMount } from 'svelte';
	import URLInput from '$lib/components/URLInput.svelte';
	import CookieSettings from '$lib/components/CookieSettings.svelte';
	import LinkCardPreview from '$lib/components/LinkCardPreview.svelte';
	import CodeOutput from '$lib/components/CodeOutput.svelte';
	import Toast from '$lib/components/Toast.svelte';

	import { validateAmazonURL, normalizeAmazonURL } from '$lib/services/urlValidator';
	import { generateLinkCardHTML } from '$lib/services/htmlGenerator';
	import { loadCookie } from '$lib/utils/storage';
	import { cookieStore } from '$lib/stores/cookie';
	import { linkCardStore } from '$lib/stores/linkCard';

	let showCookieModal = $state(false);
	let toastMessage = $state('');
	let toastType: 'success' | 'error' | 'warning' = $state('success');

	// ストアの購読
	let cookie = $state($cookieStore);
	let linkCard = $state($linkCardStore);

	$effect(() => {
		cookie = $cookieStore;
		linkCard = $linkCardStore;
	});

	onMount(() => {
		// Cookie読み込み
		const savedCookie = loadCookie();
		if (savedCookie) {
			cookieStore.set({
				value: savedCookie,
				expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
				isValid: true
			});
		}
	});

	/**
	 * URL送信ハンドラ
	 *
	 * Amazon URLを検証し、メタデータを取得してHTMLを生成します。
	 */
	async function handleSubmit(url: string) {
		// URLバリデーション
		const validation = validateAmazonURL(url);
		if (!validation.isValid) {
			linkCardStore.update((s) => ({ ...s, error: validation.error || null }));
			return;
		}

		// URL正規化
		const normalizedUrl = normalizeAmazonURL(url);
		linkCardStore.update((s) => ({ ...s, isLoading: true, error: null, url: normalizedUrl }));

		try {
			// メタデータ取得API呼び出し
			const response = await fetch('/api/fetch-metadata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: normalizedUrl, cookie: $cookieStore.value })
			});

			// 503エラー（Cookie必要）の場合
			if (response.status === 503) {
				linkCardStore.update((s) => ({
					...s,
					isLoading: false,
					error: 'Cookie設定が必要です'
				}));
				showToast('Cookie設定が必要です', 'warning');
				showCookieModal = true;
				return;
			}

			if (!response.ok) {
				throw new Error('メタデータ取得に失敗しました');
			}

			const metadata = await response.json();
			const htmlCode = generateLinkCardHTML(metadata);

			linkCardStore.update((s) => ({
				...s,
				isLoading: false,
				metadata,
				htmlCode
			}));

			showToast('リンクカードを生成しました', 'success');
		} catch (error) {
			linkCardStore.update((s) => ({
				...s,
				isLoading: false,
				error: 'メタデータ取得に失敗しました'
			}));
			showToast('メタデータ取得に失敗しました', 'error');
		}
	}

	/**
	 * Toastメッセージ表示ヘルパー
	 */
	function showToast(message: string, type: 'success' | 'error' | 'warning') {
		toastMessage = message;
		toastType = type;
		setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<header class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Amazon Link Card Generator</h1>
		<p class="text-gray-600">Ghost用のAmazonリンクカードHTMLを生成します</p>
	</header>

	<div class="mb-4">
		<button onclick={() => (showCookieModal = true)} class="text-sm text-blue-600 hover:underline">
			Cookie設定
		</button>
	</div>

	<URLInput onSubmit={handleSubmit} isLoading={linkCard.isLoading} />

	{#if linkCard.error}
		<div class="bg-red-50 border border-red-200 rounded p-4 mb-4">
			<p class="text-red-800">{linkCard.error}</p>
		</div>
	{/if}

	{#if linkCard.metadata}
		<LinkCardPreview metadata={linkCard.metadata} />
		<CodeOutput htmlCode={linkCard.htmlCode} />
	{/if}

	<CookieSettings isOpen={showCookieModal} onClose={() => (showCookieModal = false)} />

	{#if toastMessage}
		<Toast message={toastMessage} type={toastType} />
	{/if}
</div>
