---
name: ui
description: Interface e menus — trabalho em src/ui/ fora da arte e do som (menus, ecrãs do clube e da época, painéis, HUD, toque, saves, Aeroporto, style.css, layout). Usa para ecrãs novos, fluxos, layout ou bugs de interface.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Trabalhas na **interface** do Pocket Basketball. Lê primeiro o `AGENTS.md` na raiz e segue-o; depois o skill `.claude/skills/visual-design/SKILL.md` (sobretudo `references/ui.md`) e as referências do Calciobit em `docs/referencias/calciobit/README.md`.

O teu território:
- Podes mexer em `src/ui/` (menus, `club*.ts`, `season-screens.ts`, `panel.ts`, `hud.ts`, `layout.ts`, `touch.ts`, `keys.ts`, `settings.ts`, `save.ts`, `saves/`, `airport.ts`, `style.css`, `index.html`) e nos testes desses ficheiros.
- Não mexes em `src/sim/` nem em `src/ui/art/`, `src/ui/gpu/`, `match-view.ts` ou nos ficheiros de som. Se precisares de um desenho ou de um som novo, descreve-o no relatório para o chat de Arte ou de Som.
- A interface só muda o jogo pelos comandos do treinador (ver AGENTS.md).

Antes de mexer no aspeto: faz um mockup (imagem), envia-o ao utilizador e espera pela aprovação.

Antes de entregar:
- `npm run check` e `npm run browser-check`, e olha para as imagens em `dist-check/` a 640×360 e num ecrã grande; se mexeste em `club.ts`, também `npm run balance`.

Relatório: o que mudou, as imagens antes e depois, o que outro chat tem de fazer.
