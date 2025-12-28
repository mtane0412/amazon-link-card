<script lang="ts">
	/**
	 * URL入力コンポーネント
	 *
	 * Amazon商品URLの入力フォームを提供します。
	 */

	interface Props {
		/** URLが送信されたときのコールバック */
		onSubmit: (url: string) => void;
		/** ローディング状態 */
		isLoading: boolean;
	}

	let { onSubmit, isLoading }: Props = $props();

	let url = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSubmit(url);
	}
</script>

<form onsubmit={handleSubmit} class="mb-6">
	<div class="flex gap-2">
		<input
			type="url"
			bind:value={url}
			placeholder="https://www.amazon.co.jp/dp/..."
			required
			disabled={isLoading}
			class="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
		/>
		<button
			type="submit"
			disabled={isLoading || !url}
			class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
		>
			{isLoading ? '生成中...' : '生成'}
		</button>
	</div>
</form>
