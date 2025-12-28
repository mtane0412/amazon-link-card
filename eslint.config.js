/**
 * ESLint設定ファイル（Flat Config形式）
 *
 * Svelte 5、TypeScript、TailwindCSSに対応したlint設定です。
 * プロジェクトの品質基準を維持するためのルールを定義しています。
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
	// 基本的なJavaScriptルール
	js.configs.recommended,

	// TypeScript推奨ルール
	...tseslint.configs.recommended,

	// Svelte推奨ルール
	...sveltePlugin.configs['flat/recommended'],

	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.svelte']
			},
			globals: {
				// ブラウザ環境のグローバル変数
				navigator: 'readonly',
				setTimeout: 'readonly',
				Event: 'readonly',
				fetch: 'readonly'
			}
		}
	},

	{
		files: ['**/*.ts', '**/*.svelte'],
		rules: {
			// TypeScript固有のルール
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_'
			}],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',

			// 一般的なコード品質ルール
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'prefer-const': 'error',
			'no-var': 'error',

			// Svelte固有のルール
			// {@html}はエスケープ済みのHTMLを表示するため、警告をオフにする
			'svelte/no-at-html-tags': 'off'
		}
	},

	{
		ignores: [
			'.svelte-kit/**',
			'build/**',
			'dist/**',
			'node_modules/**',
			'functions/**',
			'**/*.config.js',
			'**/*.config.ts'
		]
	}
];
