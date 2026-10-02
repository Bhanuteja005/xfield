import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
export default [
 {ignores:['node_modules/**','dist/**','.wrangler/**','recon/**','.agent-logs/**','scripts/**']},
 {files:['apps/**/*.{js,jsx,mjs}','tests/**/*.mjs'],...js.configs.recommended,languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:{...globals.browser,...globals.node}},plugins:{react,'react-hooks':reactHooks},rules:{'react/jsx-uses-vars':'error','react/jsx-uses-react':'error','no-unused-vars':['error',{argsIgnorePattern:'^_'}],'react-hooks/rules-of-hooks':'error'}},
];
