<script lang="ts">
	/**
	 * Toastコンポーネント
	 *
	 * 成功、エラー、警告メッセージを画面右下に表示します。
	 */

	interface Props {
		/** 表示するメッセージ */
		message: string;
		/** メッセージのタイプ */
		type: 'success' | 'error' | 'warning';
	}

	const { message, type = 'success' }: Props = $props();

	const colors = {
		success: 'bg-[var(--color-success)] border-[var(--color-success)]',
		error: 'bg-[var(--color-error)] border-[var(--color-error)]',
		warning: 'bg-[var(--color-warning)] border-[var(--color-warning)]'
	};

	const icons = {
		success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
		error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
		warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
	};
</script>

{#if message}
	<div class="fixed bottom-6 right-6 z-50 animate-slide-in-right">
		<div
			class="{colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 flex items-center gap-3 min-w-[280px]"
		>
			<div class="flex-shrink-0">
				{@html icons[type]}
			</div>
			<p class="font-medium text-sm">{message}</p>
		</div>
	</div>
{/if}
