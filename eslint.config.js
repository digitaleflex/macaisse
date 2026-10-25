import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

/**
 * Frontières de couches (ARCHITECTURE.md), outillées pour ne pas dépendre de la
 * discipline : chaque lane ne peut importer que ce qui est au-dessous d'elle.
 */
const restrict = (files, group, message) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
  },
});

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.kilo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      eqeqeq: ['error', 'always'],
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  restrict(
    ['src/ui/**/*.{ts,tsx}'],
    ['@/store', '@/store/*', '@/features', '@/features/*', '@/app', '@/app/*', '@/services', '@/services/*', '@/mocks', '@/mocks/*'],
    'ui/ est une couche de présentation sans métier : aucune dépendance vers store/, features/, app/, services/ ou mocks/.'
  ),
  restrict(
    ['src/domain/**/*.ts'],
    [
      'react',
      'react-dom',
      '@/store',
      '@/store/*',
      '@/services',
      '@/services/*',
      '@/features',
      '@/features/*',
      '@/app',
      '@/app/*',
      '@/ui',
      '@/ui/*',
      '@/mocks',
      '@/mocks/*',
    ],
    'domain/ doit rester du TypeScript pur : ni React, ni état, ni réseau, ni fixtures.'
  ),
  restrict(
    ['src/store/**/*.ts'],
    ['@/features', '@/features/*', '@/app', '@/app/*', '@/ui', '@/ui/*'],
    'store/ orchestre ; il ne connaît ni les écrans ni le design system. Seule exception, documentée dans useUiStore.ts : le bus @/ui/toastBus.'
  ),
  restrict(
    ['src/services/**/*.ts'],
    ['@/store', '@/store/*', '@/features', '@/features/*', '@/app', '@/app/*', '@/ui', '@/ui/*'],
    'services/ ne dépend ni de l’état, ni des écrans, ni de l’UI : publier via reportError().'
  ),
  restrict(
    ['src/lib/**/*.ts'],
    ['@/store', '@/store/*', '@/features', '@/features/*', '@/app', '@/app/*', '@/ui', '@/ui/*'],
    'lib/ est une couche d’intégration : elle ne connaît ni l’état, ni les écrans, ni l’UI.'
  ),
  restrict(
    ['src/mocks/**/*.ts'],
    ['@/store', '@/store/*', '@/features', '@/features/*', '@/app', '@/app/*', '@/ui', '@/ui/*'],
    'mocks/ fournit des données : aucun retour vers l’état ou l’UI.'
  ),
  restrict(
    ['src/features/**/*.{ts,tsx}'],
    ['@/app', '@/app/*'],
    'features/ ne doit pas importer le shell applicatif (app/).'
  ),
  prettier,
);
