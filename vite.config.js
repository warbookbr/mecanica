/* vite.config.js — build estático da Mecanifica para warbookbr/mecanica no GitHub Pages.

   Só o PRODUTO entra aqui. A bancada de autoria ficou na oficina
   (warbookbr/nos-mecanifica), junto com o núcleo procedural que gera as peças. */
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mecanica/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
