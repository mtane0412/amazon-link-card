<script lang="ts">
	/**
	 * コードコピーコンポーネント
	 *
	 * 生成されたHTMLコードを表示し、クリップボードにコピーする機能を提供します。
	 */

	interface Props {
		/** 表示するHTMLコード */
		htmlCode: string;
	}

	let { htmlCode }: Props = $props();

	let copied = $state(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(htmlCode);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

{#if htmlCode}
	<div class="mb-6">
		<div class="flex justify-between items-center mb-2">
			<h2 class="text-xl font-bold">HTMLコード</h2>
			<button
				onclick={handleCopy}
				class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
			>
				{copied ? 'コピーしました!' : 'コピー'}
			</button>
		</div>

		<textarea
			readonly
			value={htmlCode}
			rows="15"
			class="w-full px-3 py-2 border rounded bg-gray-50 font-mono text-sm"
		></textarea>
	</div>
{/if}
