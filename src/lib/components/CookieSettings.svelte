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

	let { isOpen = false, onClose }: Props = $props();

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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={onClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onclick={(e) => e.stopPropagation()}>
			<h2 class="text-2xl font-bold mb-4">Amazon Cookie設定</h2>

			<div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
				<strong>注意:</strong> セカンダリアカウントの使用を推奨します
			</div>

			<ol class="list-decimal list-inside space-y-2 mb-4 text-sm">
				<li>Amazonにログインします（セカンダリアカウント推奨）</li>
				<li>ブラウザの開発者ツールを開きます（F12キー）</li>
				<li>「Network」タブを開き、任意のページをリロード</li>
				<li>リクエストヘッダーから「Cookie:」の値全体をコピー</li>
			</ol>

			<textarea
				bind:value={cookieInput}
				placeholder="Cookie: session-id=...; ubid-acbjp=..."
				rows="4"
				class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
			></textarea>

			<div class="flex gap-2 justify-end">
				<button onclick={onClose} class="px-4 py-2 border rounded hover:bg-gray-50"> キャンセル </button>
				<button
					onclick={handleSave}
					disabled={!cookieInput.trim()}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
				>
					保存
				</button>
			</div>

			{#if showSuccess}
				<div class="mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800">
					Cookie を保存しました
				</div>
			{/if}
		</div>
	</div>
{/if}
