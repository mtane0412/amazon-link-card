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

<form onsubmit={handleSubmit}>
	<div class="flex flex-col md:flex-row gap-3">
		<div class="relative flex-1">
			<input
				type="url"
				bind:value={url}
				placeholder="https://www.amazon.co.jp/dp/..."
				required
				disabled={isLoading}
				class="input-field {isLoading ? 'animate-pulse' : ''}"
			/>
			{#if isLoading}
				<div class="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
					<div class="animate-shimmer h-full"></div>
				</div>
			{/if}
		</div>
		<button type="submit" disabled={isLoading || !url} class="btn-primary min-w-[140px]">
			{#if isLoading}
				<span class="flex items-center justify-center gap-2">
					<svg
						class="animate-spin h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>生成中...</span>
				</span>
			{:else}
				<span>リンクカードを生成</span>
			{/if}
		</button>
	</div>
</form>
