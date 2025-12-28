<script lang="ts">
	/**
	 * ルートレイアウト
	 *
	 * アプリケーション全体のレイアウトを定義し、TailwindCSSを読み込みます。
	 */

	import '../app.css';

	const { children } = $props();
</script>

{@render children()}
