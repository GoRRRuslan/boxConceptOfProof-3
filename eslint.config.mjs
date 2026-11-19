// @ts-check

import url from 'node:url'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintReact from 'eslint-plugin-react'
import eslintImport from 'eslint-plugin-import'
import { fixupPluginRules } from '@eslint/compat'
import eslintReactNative from 'eslint-plugin-react-native'
import eslintReactHooks from 'eslint-plugin-react-hooks'
import reactQuery from '@tanstack/eslint-plugin-query'
import prettier from 'eslint-plugin-prettier'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import stylistic from '@stylistic/eslint-plugin'
import fileName from 'eslint-plugin-filename-rules'
import * as folders from 'eslint-plugin-folders'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default tseslint.config(
  // register to all the plugins up-front
  {
    // note - intentionally uses computed syntax to make it easy to sort the keys
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
      'filename-rules': fixupPluginRules(fileName),
      folders: fixupPluginRules(folders),
      prettier: prettier,
      react: fixupPluginRules(eslintReact),
      import: fixupPluginRules(eslintImport),
      'react-native': fixupPluginRules(eslintReactNative),
      'react-hooks': fixupPluginRules(eslintReactHooks),
      '@tanstack/query': reactQuery,
    },
  },

  // config with ignores is the replacement for `.eslintignore`
  {
    ignores: [
      'node_modules/*',
      'vendor/*',
      'scripts/*',
      'android/*',
      'ios/*',
      '__tests__/*',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.md',
      'expo',
      'build',
      'app.config.ts',
      'README.md',
    ],
  },

  // base config
  {
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.json'],
        tsconfigRootDir: __dirname,
        allowAutomaticSingleRunInference: true,
        warnOnUnsupportedTypeScriptVersion: false,
        cacheLifetime: {
          glob: 'Infinity',
        },
      },
    },
  },

  {
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.js', '.json', '.ts', '.tsx'],
      },
      'import/resolver': {
        'eslint-import-resolver-typescript': ['.js', '.json', '.ts', '.tsx'],
      },
      react: {
        version: 'detect',
      },
    },
  },

  // it is the replacement for extends in `.eslintrc` files
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  stylistic.configs.recommended,
  prettierRecommended,

  // rules
  {
    rules: {
      'prettier/prettier': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      ...eslintReactHooks.configs.recommended.rules,
      ...reactQuery.configs.recommended.rules,
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      // think about next
      // '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/jsx-props-no-spreading': [
        'off',
        {
          html: 'ignore',
          custom: 'ignore',
          explicitSpread: 'ignore',
        },
      ],
      'react/no-unescaped-entities': [
        'error',
        {
          forbid: [
            { char: '>', alternatives: ['&gt;'] },
            { char: '}', alternatives: ['&#125;'] },
          ],
        },
      ],
      'react/state-in-constructor': ['off', 'never'],
      'react-native/no-inline-styles': 'error',
      'react-native/no-color-literals': 'error',
      'react-native/no-raw-text': [
        'error',
        {
          skip: ['AppText'],
        },
      ],
      'react-native/no-unused-styles': 'error',
      'react-hooks/exhaustive-deps': 'off',
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/indent': 'off',
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-unary-ops': ['error', { words: true, nonwords: false }],
      '@stylistic/template-curly-spacing': ['error', 'never'],
      '@stylistic/function-call-spacing': ['off', 'always', { allowNewlines: true }],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: 'expression', next: 'expression' },
      ],
      '@stylistic/comma-dangle': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/max-len': 'off',
      '@stylistic/quote-props': ['error', 'as-needed', { keywords: false, unnecessary: false }],
      '@stylistic/member-delimiter-style': [
        'off',
        {
          multiline: { delimiter: 'semi', requireLast: true },
          singleline: { delimiter: 'semi', requireLast: false },
          multilineDetection: 'brackets',
        },
      ],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/jsx-wrap-multilines': [
        'error',
        {
          // оставляем поведение по умолчанию
          declaration: 'parens-new-line',
          assignment: 'parens-new-line',
          return: 'parens-new-line',
          arrow: 'parens-new-line',
          condition: 'parens-new-line',
          logical: 'parens-new-line',
          // а вот для пропсов не требуем скобки
          prop: 'ignore',
        },
      ],
      'prefer-destructuring': 'error',
      // 'no-nested-ternary': 'error',
      'no-unneeded-ternary': ['error'],
      'require-await': 'error',
      camelcase: 'error',
      radix: 'off',
      'implicit-arrow-linebreak': 'off',
      'no-lonely-if': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'newline-after-var': ['error', 'always'],
      'function-paren-newline': 'off',
      'keyword-spacing': ['error', { before: true }],
      'key-spacing': ['error', { mode: 'strict' }],
      'eol-last': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'newline-before-return': 'error',
      'no-use-before-define': ['error', { functions: true, classes: true, variables: false }],
      'no-case-declarations': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 1 }],
    },
  },
)
