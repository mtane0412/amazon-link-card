<script lang="ts">
	/**
	 * Cookie設定モーダルコンポーネント
	 *
	 * Amazon Cookieの設定UI（モーダル）を提供します。
	 * Bookloreと同様の4ステップガイドを表示します。
	 */

	import { cookieStore } from '$lib/stores/cookie';
	import { saveCookie } from '$lib/utils/storage';

	interface Props {
		/** モーダルが開いているかどうか */
		isOpen: boolean;
		/** モーダルを閉じるコールバック */
		onClose: () => void;
	}

	const { isOpen = false, onClose }: Props = $props();

	let cookieInput = $state('');
	let showSuccess = $state(false);

	function handleSave() {
		if (!cookieInput.trim()) return;

		saveCookie(cookieInput);
		cookieStore.set({
			value: cookieInput,
			expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
			isValid: true
		});

		showSuccess = true;
		setTimeout(() => {
			showSuccess = false;
			onClose();
		}, 2000);
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-[var(--color-ink)]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
		onclick={onClose}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-fade-in-up"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="mb-6">
				<h2 class="text-3xl font-bold mb-2 text-[var(--color-ink)]">Cookie設定</h2>
				<p class="text-[var(--color-stone)] text-sm">
					Amazon APIの503エラーを回避するためのCookie設定
				</p>
			</div>

			<div
				class="bg-[var(--color-warning)]/10 border-l-4 border-[var(--color-warning)] rounded-r-lg p-4 mb-6"
			>
				<p class="text-[var(--color-warning)] font-medium text-sm">
					<strong>注意:</strong> セカンダリアカウントの使用を推奨します
				</p>
			</div>

			<div class="mb-6">
				<h3 class="font-semibold mb-3 text-[var(--color-ink)]">設定手順</h3>
				<ol class="space-y-3 text-sm text-[var(--color-charcoal)]">
					<li class="flex items-start gap-3">
						<span
							class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center font-medium"
							>1</span
						>
						<span>Amazonにログインします（セカンダリアカウント推奨）</span>
					</li>
					<li class="flex items-start gap-3">
						<span
							class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center font-medium"
							>2</span
						>
						<span>ブラウザの開発者ツールを開きます（F12キー）</span>
					</li>
					<li class="flex items-start gap-3">
						<span
							class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center font-medium"
							>3</span
						>
						<span>「Network」タブを開き、任意のページをリロード</span>
					</li>
					<li class="flex items-start gap-3">
						<span
							class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)] text-white text-xs flex items-center justify-center font-medium"
							>4</span
						>
						<span>リクエストヘッダーから「Cookie:」の値全体をコピー</span>
					</li>
				</ol>
			</div>

			<textarea
				bind:value={cookieInput}
				placeholder="Cookie: session-id=...; ubid-acbjp=..."
				rows="4"
				class="input-field mb-6 font-mono text-xs"
			></textarea>

			<div class="flex gap-3 justify-end">
				<button onclick={onClose} class="px-6 py-3 border-2 border-[var(--color-pearl)] text-[var(--color-charcoal)] rounded-lg font-medium hover:bg-[var(--color-pearl)]/30 transition-all duration-200">
					キャンセル
				</button>
				<button onclick={handleSave} disabled={!cookieInput.trim()} class="btn-primary">
					保存する
				</button>
			</div>

			{#if showSuccess}
				<div
					class="mt-6 bg-[var(--color-success)]/10 border-l-4 border-[var(--color-success)] rounded-r-lg p-4 animate-fade-in"
				>
					<p class="text-[var(--color-success)] font-medium text-sm flex items-center gap-2">
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
						Cookieを保存しました
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
