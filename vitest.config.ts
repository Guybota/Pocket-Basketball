import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os critérios de equilíbrio simulam milhares de jogos.
    testTimeout: 120_000,
  },
});
