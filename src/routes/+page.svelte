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

<div class="min-h-screen">
	<!-- ヘッダーセクション -->
	<header class="border-b border-[var(--color-pearl)] bg-white/80 backdrop-blur-sm sticky top-0 z-40">
		<div class="container mx-auto px-6 py-6 max-w-5xl">
			<div class="flex items-center justify-between">
				<div class="animate-fade-in-up">
					<h1 class="text-4xl md:text-5xl font-bold mb-1.5 text-[var(--color-ink)]">
						Amazon Link Card
					</h1>
					<p class="text-[var(--color-charcoal)] text-sm md:text-base font-light">
						Ghost CMS向けの美しいリンクカードを生成
					</p>
				</div>
				<button
					onclick={() => (showCookieModal = true)}
					class="animate-fade-in-up delay-100 px-4 py-2 text-sm text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg hover:bg-[var(--color-accent)]/5 transition-all duration-200"
				>
					<span class="hidden md:inline">Cookie設定</span>
					<span class="md:hidden">設定</span>
				</button>
			</div>
		</div>
	</header>

	<!-- メインコンテンツ -->
	<main class="container mx-auto px-6 py-12 max-w-5xl">
		<!-- URL入力セクション -->
		<section class="mb-12 animate-fade-in-up delay-200">
			<div class="card p-8 md:p-10">
				<div class="mb-6">
					<h2 class="text-2xl md:text-3xl font-semibold mb-2 text-[var(--color-ink)]">
						商品URLを入力
					</h2>
					<p class="text-[var(--color-stone)] text-sm">
						Amazon.co.jpの商品URLを貼り付けてください
					</p>
				</div>
				<URLInput onSubmit={handleSubmit} isLoading={linkCard.isLoading} />

				{#if linkCard.error}
					<div
						class="mt-4 bg-[var(--color-error)]/5 border-l-4 border-[var(--color-error)] rounded-r-lg p-4 animate-fade-in"
					>
						<p class="text-[var(--color-error)] font-medium text-sm">{linkCard.error}</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- プレビュー & コード出力セクション -->
		{#if linkCard.metadata}
			<section class="space-y-8">
				<div class="animate-fade-in-up delay-300">
					<LinkCardPreview metadata={linkCard.metadata} />
				</div>
				<div class="animate-fade-in-up delay-400">
					<CodeOutput htmlCode={linkCard.htmlCode} />
				</div>
			</section>
		{/if}

		<!-- 使い方ガイド -->
		{#if !linkCard.metadata}
			<section class="mt-16 animate-fade-in-up delay-300">
				<div class="card p-8 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent">
					<h3 class="text-xl font-semibold mb-4 text-[var(--color-ink)]">使い方</h3>
					<ol class="space-y-3 text-[var(--color-charcoal)]">
						<li class="flex items-start gap-3">
							<span
								class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-sm flex items-center justify-center font-medium"
								>1</span
							>
							<span>Amazon.co.jpで商品ページを開き、URLをコピーします</span>
						</li>
						<li class="flex items-start gap-3">
							<span
								class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-sm flex items-center justify-center font-medium"
								>2</span
							>
							<span>上記の入力欄にURLを貼り付けて「生成」ボタンをクリック</span>
						</li>
						<li class="flex items-start gap-3">
							<span
								class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-sm flex items-center justify-center font-medium"
								>3</span
							>
							<span>生成されたHTMLコードをコピーしてGhost CMSに貼り付け</span>
						</li>
					</ol>
				</div>
			</section>
		{/if}
	</main>

	<!-- フッター -->
	<footer class="border-t border-[var(--color-pearl)] mt-20 py-8">
		<div class="container mx-auto px-6 max-w-5xl text-center">
			<p class="text-[var(--color-stone)] text-sm">
				SvelteKit × Cloudflare Pages で構築されています
			</p>
		</div>
	</footer>

	<CookieSettings isOpen={showCookieModal} onClose={() => (showCookieModal = false)} />

	{#if toastMessage}
		<Toast message={toastMessage} type={toastType} />
	{/if}
</div>
