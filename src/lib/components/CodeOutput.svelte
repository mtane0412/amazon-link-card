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
	<div class="card p-6 md:p-8">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
			<div>
				<h2 class="text-2xl md:text-3xl font-semibold mb-2 text-[var(--color-ink)]">
					HTMLコード
				</h2>
				<p class="text-[var(--color-stone)] text-sm">
					以下のコードをGhost CMSの「HTML embed」に貼り付けてください
				</p>
			</div>
			<button
				onclick={handleCopy}
				class="btn-secondary min-w-[160px] {copied ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]' : ''}"
			>
				{#if copied}
					<span class="flex items-center justify-center gap-2">
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
						<span>コピーしました!</span>
					</span>
				{:else}
					<span class="flex items-center justify-center gap-2">
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
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							></path>
						</svg>
						<span>コードをコピー</span>
					</span>
				{/if}
			</button>
		</div>

		<div class="relative">
			<textarea
				readonly
				value={htmlCode}
				rows="15"
				class="w-full px-4 py-4 border-2 border-[var(--color-pearl)] rounded-lg bg-[var(--color-ink)]/5 font-mono text-xs md:text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] resize-y"
			></textarea>
			<div
				class="absolute top-3 right-3 px-2 py-1 bg-[var(--color-ink)] text-white text-xs rounded font-mono"
			>
				HTML
			</div>
		</div>
	</div>
{/if}
