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

	let { message, type = 'success' }: Props = $props();

	const colors = {
		success: 'bg-green-600',
		error: 'bg-red-600',
		warning: 'bg-yellow-600'
	};
</script>

{#if message}
	<div class="fixed bottom-4 right-4 z-50">
		<div class="{colors[type]} text-white px-6 py-3 rounded shadow-lg">{message}</div>
	</div>
{/if}
