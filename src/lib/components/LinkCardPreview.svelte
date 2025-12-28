<script lang="ts">
	/**
	 * リンクカードプレビューコンポーネント
	 *
	 * 生成されるリンクカードのプレビューを表示します。
	 */

	import type { AmazonMetadata } from '$lib/types/amazon';

	interface Props {
		/** Amazonメタデータ */
		metadata: AmazonMetadata | null;
	}

	let { metadata }: Props = $props();
</script>

{#if metadata}
	<div class="mb-6">
		<h2 class="text-xl font-bold mb-3">プレビュー</h2>
		<div class="border rounded p-4 bg-gray-50">
			{@html `
      <div class="amazon-link-card" style="max-width: 600px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; display: flex; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 20px auto;">
        <a href="${metadata.url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: flex; flex-direction: row;">
          <div style="flex: 0 0 180px; background: #f7f7f7; display: flex; align-items: center; justify-content: center; padding: 16px;">
            <img src="${metadata.image}" alt="${metadata.title}" style="max-width: 100%; max-height: 200px; object-fit: contain;">
          </div>
          <div style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; color: #111;">${metadata.title}</h3>
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.5;">${metadata.description}</p>
            </div>
            ${
							metadata.price
								? `
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 18px; font-weight: 700; color: #B12704;">${metadata.price}</span>
              <span style="font-size: 12px; color: #0066c0; font-weight: 500;">Amazonで見る →</span>
            </div>
            `
								: `
            <div style="text-align: right;">
              <span style="font-size: 12px; color: #0066c0; font-weight: 500;">Amazonで見る →</span>
            </div>
            `
						}
          </div>
        </a>
      </div>
    `}
		</div>
	</div>
{/if}
