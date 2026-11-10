// Esempio di configurazione ESLint (flat config) per un progetto Angular, da copiare come `eslint.config.js`
// nella cartella del frontend. Applica le regole di frontend.md che un linter sa controllare.
//
// Prerequisiti (devDependencies, versioni da verificare al primo uso, core.md §3): eslint, typescript-eslint,
// angular-eslint (MIT), eslint-config-prettier. Il file usa la sintassi ESM: se `package.json` non ha
// "type": "module", rinominarlo `eslint.config.mjs`.
// I nomi delle regole non sono stati verificati sulla versione installata: al primo uso si lancia `npm run lint`
// e si correggono i nomi che il linter segnala come inesistenti. Il prefisso dei selettori è `app`: adattarlo
// al valore del CLAUDE.md.
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "**/api/generated/**"] },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      prettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // frontend.md §2 e §16: niente `any`.
      "@typescript-eslint/no-explicit-any": "error",
      // frontend.md §14: OnPush su ogni componente; §13: inject() al posto del costruttore.
      "@angular-eslint/prefer-on-push-component-change-detection": "error",
      "@angular-eslint/prefer-inject": "error",
      // frontend.md §14: input()/output() funzionali (la regola esiste dalle versioni recenti di angular-eslint).
      "@angular-eslint/prefer-signals": "error",
      "@angular-eslint/no-input-rename": "error",
      "@angular-eslint/no-output-native": "error",
      // frontend.md §2: selettori con prefisso del progetto.
      "@angular-eslint/component-selector": ["error", { type: "element", prefix: "app", style: "kebab-case" }],
      "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "app", style: "camelCase" }],
    },
  },
  {
    // frontend.md §2 (struttura cartelle): core/ e shared/ non importano da features/.
    files: ["**/core/**/*.ts", "**/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/features/**"], message: "core/ e shared/ non importano da features/." }] },
      ],
    },
  },
  {
    // Una feature non importa da un'altra: per ogni feature si aggiunge un blocco come questo (esempio con le
    // feature "ordini" e "clienti", da adattare). In alternativa eslint-plugin-boundaries o un test di architettura.
    files: ["**/features/ordini/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/features/clienti/**"], message: "Una feature non importa da un'altra feature: sposta il codice in shared/." }] },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility, prettier],
    rules: {
      // frontend.md §13: control flow nativo, NgOptimizedImage, uguaglianza stretta.
      "@angular-eslint/template/prefer-control-flow": "error",
      "@angular-eslint/template/prefer-ngsrc": "error",
      "@angular-eslint/template/eqeqeq": "error",
    },
  },
);
