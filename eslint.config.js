import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['.wxt/**', '.output/**', 'node_modules/**', 'identity/**'],
  },

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      /*
       * منع الشبكة على مستوى المصدر.
       * الحارس في tests/guards/network.test.ts يفحص المصدر والمخرجات أيضًا،
       * وهذه القاعدة تعطي التغذية الراجعة مبكرًا داخل المحرر.
       */
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'جُسور لا يتصل بأي خدمة خارجية.' },
        { name: 'XMLHttpRequest', message: 'جُسور لا يتصل بأي خدمة خارجية.' },
        { name: 'WebSocket', message: 'جُسور لا يتصل بأي خدمة خارجية.' },
        { name: 'EventSource', message: 'جُسور لا يتصل بأي خدمة خارجية.' },
      ],
    },
  },

  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  {
    files: ['**/*.js', 'wxt.config.ts', 'vitest.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
)
