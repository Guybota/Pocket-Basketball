import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os critérios de equilíbrio simulam milhares de jogos.
    // Alguns testes simulam milhares de jogos, agora com colisões.
    testTimeout: 600_000,
    hookTimeout: 120_000,
    // As cópias de trabalho dos agentes vivem em .claude/ e não são testes deste projeto.
    exclude: [...configDefaults.exclude, '.claude/**'],
    // Os testes que simulam centenas ou milhares de jogos: `npm run balance`. O `npm run check` salta-os.
    tags: [{ name: 'slow', description: 'Simula muitos jogos; corre com npm run balance' }],
  },
});
