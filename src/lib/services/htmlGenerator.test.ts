/**
 * htmlGeneratorのユニットテスト
 *
 * Ghost embed用のリンクカードHTML生成機能のテストケースです。
 * 特にXSS対策のHTMLエスケープ処理が正しく機能することを検証します。
 */

import { describe, it, expect } from 'vitest';
import { generateLinkCardHTML } from './htmlGenerator';
import type { AmazonMetadata } from '$lib/types/amazon';

describe('generateLinkCardHTML', () => {
	describe('正常な入力での動作', () => {
		it('価格ありのメタデータから正しいHTMLを生成する', () => {
			// 前提条件: 価格情報を含む完全なAmazonメタデータ
			const metadata: AmazonMetadata = {
				title: 'テスト商品名',
				description: 'これはテスト用の商品説明です。',
				image: 'https://example.com/image.jpg',
				price: '¥1,980',
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Y'
			};

			// 検証項目: 生成されたHTMLに必須要素が含まれているか
			const html = generateLinkCardHTML(metadata);

			expect(html).toContain('amazon-link-card');
			expect(html).toContain('テスト商品名');
			expect(html).toContain('これはテスト用の商品説明です。');
			expect(html).toContain('https://example.com/image.jpg');
			expect(html).toContain('¥1,980');
			expect(html).toContain('https://www.amazon.co.jp/dp/B0DP6MYX5Y');
			expect(html).toContain('Amazonで見る');
			expect(html).toContain('@media (max-width: 600px)');
		});

		it('価格なしのメタデータから正しいHTMLを生成する', () => {
			// 前提条件: 価格情報を含まないメタデータ
			const metadata: AmazonMetadata = {
				title: 'テスト商品名（価格なし）',
				description: '価格情報がない商品です。',
				image: 'https://example.com/no-price.jpg',
				price: undefined,
				url: 'https://www.amazon.co.jp/dp/B0DP6MYX5Z'
			};

			// 検証項目: 価格表示部分が存在せず、他の要素は正しく表示される
			const html = generateLinkCardHTML(metadata);

			expect(html).toContain('amazon-link-card');
			expect(html).toContain('テスト商品名（価格なし）');
			expect(html).toContain('価格情報がない商品です。');
			expect(html).toContain('https://example.com/no-price.jpg');
			// 価格部分は存在しないはず
			expect(html).not.toContain('¥');
			expect(html).toContain('Amazonで見る');
		});
	});

	describe('XSS対策のエスケープ処理', () => {
		it('タイトルに含まれるHTMLタグをエスケープする', () => {
			// 前提条件: タイトルにスクリプトタグが含まれる悪意のある入力
			const metadata: AmazonMetadata = {
				title: '<script>alert("XSS")</script>商品名',
				description: '説明',
				image: 'https://example.com/image.jpg',
				price: '¥1,000',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: スクリプトタグがエスケープされ、実行されない形式になっている
			const html = generateLinkCardHTML(metadata);

			// <script>がエスケープされていることを確認
			expect(html).toContain('&lt;script&gt;');
			expect(html).toContain('&lt;/script&gt;');
			// 生のscriptタグが含まれていないことを確認（styleタグ内のCSSは除く）
			expect(html.replace(/<style>[\s\S]*?<\/style>/g, '')).not.toContain('<script>');
		});

		it('説明に含まれるHTMLタグをエスケープする', () => {
			// 前提条件: 説明にimgタグが含まれる入力
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '<img src=x onerror=alert("XSS")>説明文',
				image: 'https://example.com/image.jpg',
				price: '¥2,000',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: imgタグがエスケープされている
			const html = generateLinkCardHTML(metadata);

			expect(html).toContain('&lt;img');
			expect(html).toContain('&gt;');
			// 商品画像のimgタグは存在するが、説明文内のimgタグはエスケープされている
			const descriptionSection = html.match(/<p style="margin: 0 0 12px 0[^>]*>(.*?)<\/p>/s);
			expect(descriptionSection?.[1]).toContain('&lt;img');
		});

		it('URLに含まれる特殊文字をエスケープする', () => {
			// 前提条件: URLにjavascriptスキームが含まれる悪意のある入力
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '説明',
				image: 'https://example.com/image.jpg',
				price: '¥3,000',
				url: 'javascript:alert("XSS")'
			};

			// 検証項目: 引用符がエスケープされ、XSS攻撃が無効化される
			const html = generateLinkCardHTML(metadata);

			// href属性内で引用符がエスケープされていることを確認
			// javascript:alert("XSS") -> javascript:alert(&quot;XSS&quot;)
			expect(html).toContain('href="javascript:alert(&quot;XSS&quot;)');
			// 生の引用符が含まれていないことを確認（XSS攻撃を防止）
			expect(html).not.toContain('javascript:alert("XSS")');
		});

		it('画像URLに含まれる引用符をエスケープする', () => {
			// 前提条件: 画像URLに引用符が含まれる入力
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '説明',
				image: 'https://example.com/image.jpg" onerror="alert(\'XSS\')',
				price: '¥4,000',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: 引用符がエスケープされ、属性が閉じられない
			const html = generateLinkCardHTML(metadata);

			expect(html).toContain('&quot;');
			// src属性が正しく閉じられている（onerrorが別の属性として解釈されない）
			expect(html).not.toContain('onerror="alert');
		});

		it('価格に含まれる特殊文字をエスケープする', () => {
			// 前提条件: 価格に特殊文字が含まれる入力
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '説明',
				image: 'https://example.com/image.jpg',
				price: '¥5,000<span style="display:none">追加料金</span>',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: spanタグがエスケープされている
			const html = generateLinkCardHTML(metadata);

			expect(html).toContain('&lt;span');
			expect(html).toContain('&lt;/span&gt;');
		});

		it('全ての特殊文字を同時にエスケープする', () => {
			// 前提条件: 複数の特殊文字が含まれる入力
			const metadata: AmazonMetadata = {
				title: '商品名 & <>"\'',
				description: '説明 & <>"\'',
				image: 'https://example.com/image.jpg?param=<>"\'',
				price: '¥6,000 & <>"\'',
				url: 'https://www.amazon.co.jp/dp/TEST?ref=<>"&param=\''
			};

			// 検証項目: 全ての特殊文字がエスケープされている
			const html = generateLinkCardHTML(metadata);

			// &, <, >, ", 'が全てエスケープされていることを確認
			// ただし、HTMLの構造タグ（<div>, <a>など）は存在する
			const textContent = html.replace(/<style>[\s\S]*?<\/style>/g, ''); // styleタグを除外

			// タイトル部分の検証
			expect(textContent).toContain('&amp;');
			expect(textContent).toContain('&lt;');
			expect(textContent).toContain('&gt;');
			expect(textContent).toContain('&quot;');
			expect(textContent).toContain('&#039;');
		});
	});

	describe('レスポンシブデザイン', () => {
		it('メディアクエリが含まれている', () => {
			// 前提条件: 通常のメタデータ
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '説明',
				image: 'https://example.com/image.jpg',
				price: '¥1,000',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: モバイル対応のメディアクエリが含まれている
			const html = generateLinkCardHTML(metadata);

			expect(html).toContain('<style>');
			expect(html).toContain('@media (max-width: 600px)');
			expect(html).toContain('flex-direction: column');
			expect(html).toContain('</style>');
		});
	});

	describe('生成されたHTMLの構造', () => {
		it('自己完結したHTMLコードである', () => {
			// 前提条件: 通常のメタデータ
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '説明',
				image: 'https://example.com/image.jpg',
				price: '¥1,000',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: 外部CSSやJavaScriptに依存しない自己完結したHTML
			const html = generateLinkCardHTML(metadata);

			// 外部CSSへのリンクが存在しない
			expect(html).not.toContain('<link');
			// 外部JavaScriptへのリンクが存在しない（XSS対策でエスケープされたscriptタグを除く）
			expect(html.replace(/&lt;script&gt;[\s\S]*?&lt;\/script&gt;/g, '')).not.toContain('<script src');
			// インラインスタイルが存在する
			expect(html).toContain('style=');
		});

		it('適切なリンク属性が設定されている', () => {
			// 前提条件: 通常のメタデータ
			const metadata: AmazonMetadata = {
				title: '商品名',
				description: '説明',
				image: 'https://example.com/image.jpg',
				price: '¥1,000',
				url: 'https://www.amazon.co.jp/dp/TEST'
			};

			// 検証項目: セキュリティとユーザビリティのためのリンク属性
			const html = generateLinkCardHTML(metadata);

			// target="_blank"でリンクが新しいタブで開く
			expect(html).toContain('target="_blank"');
			// rel="noopener noreferrer"でセキュリティとプライバシーを保護
			expect(html).toContain('rel="noopener noreferrer"');
		});
	});
});
