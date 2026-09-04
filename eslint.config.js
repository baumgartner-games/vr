// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Der Regelsatz ist bewusst klein.
 *
 * Ein Linter, der über Stil schimpft, wird nach zwei Wochen mit `--no-verify`
 * übergangen; einer, der **Fehler** findet, wird gelesen. Hier steht deshalb nur,
 * was in diesem Projekt schon einmal wehgetan hat oder unbemerkt wehtun würde:
 * vergessene `await`s auf einer Promise (die Welten laden asynchron), ein `catch`,
 * das eine Ursache verschluckt, ein Steuerzeichen mitten in einem regulären
 * Ausdruck, und Variablen, die niemand mehr benutzt.
 *
 * Über die Form entscheidet Prettier, nicht ESLint — `eslint-config-prettier`
 * schaltet am Ende alles ab, worüber sich die beiden sonst streiten würden.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Eine nicht abgewartete Promise ist in einer Render-Schleife ein Fehler,
      // den man erst drei Bilder später sieht. `void` davor sagt „mit Absicht".
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Ungenutztes darf stehen bleiben, wenn es mit `_` anfängt: die
      // Signaturen der Welten und Werkzeuge haben Parameter, die nicht jede
      // Fassung braucht, und die will man trotzdem benannt sehen.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // Drei Regeln, die bei three.js nur Rauschen wären: Vektoren und
      // Materialien sind voller `any`-naher Typen, und ein `!` auf einem
      // Array-Zugriff ist hier die Regel, nicht die Ausnahme.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Wir schreiben oft `${zahl}` in eine Beschriftung. Das ist gewollt.
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // `arr[0]!` ist in diesem Projekt Absicht und keine überflüssige
      // Behauptung: Es sagt der nächsten Leserin, dass hier wirklich etwas steht.
      // Solange `noUncheckedIndexedAccess` aus ist, hält der Linter genau das
      // 268-mal für unnötig — und hätte damit die Dokumentation wegoptimiert.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      // Eine Methode, die eine Schnittstelle vorschreibt, darf `async` sein,
      // auch wenn diese eine Fassung nichts abzuwarten hat.
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      // Tests dürfen kaputte Werte hineinreichen — das ist ihr Beruf.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  prettier,
);
