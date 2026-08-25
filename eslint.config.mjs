import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/.nuxt/**', '**/.output/**', '**/.serverless/**', '**/coverage/**']
  },
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }]
    }
  },
  {
    files: ['web/**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    },
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
)
