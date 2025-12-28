/**
 * urlValidatorのユニットテスト
 *
 * Amazon URL検証機能と正規化機能のテストケースです。
 * 短縮URL（amzn.to, a.co）のサポートを含みます。
 */

import { describe, it, expect } from 'vitest';
import { validateAmazonURL, normalizeAmazonURL } from './urlValidator';

describe('validateAmazonURL', () => {
	describe('標準的なAmazon URL', () => {
		it('amazon.co.jpの商品ページURLは有効', () => {
			const result = validateAmazonURL('https://www.amazon.co.jp/dp/B0DP6MYX5Y');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('amazon.comの商品ページURLは有効', () => {
			const result = validateAmazonURL('https://www.amazon.com/dp/B0DP6MYX5Y');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('/gp/product/形式の商品ページURLは有効', () => {
			const result = validateAmazonURL('https://www.amazon.co.jp/gp/product/B0DP6MYX5Y');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('トラッキングパラメータ付きのURLは有効', () => {
			const result = validateAmazonURL(
				'https://www.amazon.co.jp/dp/B0DP6MYX5Y?&linkCode=ll1&tag=mtane0412-22&linkId=0ad3c8aa79b2431946edcbd4817c9a80&language=ja_JP&ref_=as_li_ss_tl'
			);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});
	});

	describe('短縮URL', () => {
		it('amzn.to短縮URLは有効', () => {
			const result = validateAmazonURL('https://amzn.to/3L2dZGf');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('a.co短縮URLは有効', () => {
			const result = validateAmazonURL('https://a.co/d/abc123');
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});
	});

	describe('無効なURL', () => {
		it('Amazon以外のドメインは無効', () => {
			const result = validateAmazonURL('https://example.com/product');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('AmazonのURLを入力してください');
		});

		it('商品ページ以外のAmazon URLは無効', () => {
			const result = validateAmazonURL('https://www.amazon.co.jp/');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('商品ページのURLを入力してください');
		});

		it('不正な形式のURLは無効', () => {
			const result = validateAmazonURL('invalid-url');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('有効なURLを入力してください');
		});

		it('空文字列は無効', () => {
			const result = validateAmazonURL('');
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('有効なURLを入力してください');
		});
	});
});

describe('normalizeAmazonURL', () => {
	it('トラッキングパラメータ（ref, _, th）を除去する', () => {
		const input =
			'https://www.amazon.co.jp/dp/B0DP6MYX5Y?ref=nav_logo&_encoding=UTF8&th=1&psc=1';
		const result = normalizeAmazonURL(input);

		// ref, _, thで始まるパラメータは削除される
		expect(result).toBe('https://www.amazon.co.jp/dp/B0DP6MYX5Y?psc=1');
	});

	it('linkCode, tag, linkId などのアソシエイトパラメータは保持する', () => {
		const input =
			'https://www.amazon.co.jp/dp/B0DP6MYX5Y?linkCode=ll1&tag=mtane0412-22&linkId=0ad3c8aa79b2431946edcbd4817c9a80';
		const result = normalizeAmazonURL(input);

		// これらのパラメータは保持される
		expect(result).toContain('linkCode=ll1');
		expect(result).toContain('tag=mtane0412-22');
		expect(result).toContain('linkId=0ad3c8aa79b2431946edcbd4817c9a80');
	});

	it('パラメータがない場合はそのまま返す', () => {
		const input = 'https://www.amazon.co.jp/dp/B0DP6MYX5Y';
		const result = normalizeAmazonURL(input);

		expect(result).toBe(input);
	});
});
