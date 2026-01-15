import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Базовые правила ESLint
  eslint.configs.recommended,
  
  // Рекомендуемые правила для TypeScript
  ...tseslint.configs.recommended,
  
  // Отключение правил, конфликтующих с Prettier
  prettierConfig,
  
  // Глобальные настройки
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: true,
      },
    },
    rules: {
      // TypeScript правила
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': 'allow-with-description',
          'ts-check': false,
        },
      ],
      
      // Общие правила
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': ['warn', { object: true, array: false }],
      
      // Стиль кода
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'indent': 'off', // Отключено, так как Prettier управляет отступами
      
      // Лучшие практики
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-return-await': 'error',
      'require-await': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      
      // Безопасность
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Читаемость
      'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
      'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      
      // Импорты
      'no-duplicate-imports': 'error',
      'no-useless-rename': 'error',
    },
  },
  
  // Игнорирование файлов
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'vite.config.ts',
      'eslint.config.js',
      'public/**',
      '*.d.ts',
    ],
  },
  
  // Конфигурация для JS файлов (без project)
  {
    files: ['*.js', '*.mjs', '*.cjs'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: null,
      },
    },
  }
);
