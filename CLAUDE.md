# Mini Dossiê Mítico

Quiz de entrada do funil de Mitobiografia (Adriano Rahde). Leia primeiro:

- `docs/PLANEJAMENTO.md` (arquitetura, fluxo de telas, design system, infográfico, deploy)
- `docs/prompt-mae.md` (fonte de verdade da copy e das regras de leitura; **nunca reescrever**)

Onde os dois divergirem em copy ou regra de leitura, o Prompt Mãe vence. O planejamento manda só na engenharia, no design e na entrega.

## Regras que não se negociam

- Toda copy voltada ao usuário vem do Prompt Mãe ou da Seção 1 do planejamento. Não inventar texto de tela.
- Tratamento por "tu", português brasileiro.
- Zero travessão em qualquer texto de UI ou gerado.
- O dossiê nunca chega ao cliente antes do lead ser salvo. `/api/read` devolve `{ spoiler }` e nada mais.
- Nenhuma chave de API no cliente. Toda chamada a LLM e transcrição passa por route handler.
- Cantos retos, sem sombra difusa, sem gradiente decorativo, sem emoji na UI.
- Não adicionar botão de compra, countdown, escassez ou preço em lugar nenhum.
- Nenhuma menção a "IA", "inteligência artificial", "quiz", "teste" ou "resultado" em tela visível ao usuário.

## Stack

Next.js 15.5 (App Router, TS strict), Tailwind v4, GSAP, Supabase, Anthropic SDK, OpenAI SDK, Playwright.
Gerenciador: **pnpm** (instalado em `D:\npm-global`; `corepack enable` falha nesta máquina por falta de permissão em `C:\Program Files\nodejs`).

Comandos: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test:e2e`, `pnpm engine:fixture`.

## Desvios deliberados do planejamento

Registrados aqui porque o planejamento diz outra coisa e a divergência é intencional:

1. **Modelo.** O planejamento fixa `claude-sonnet-4-6`. O default real é `claude-sonnet-5` (família atual). `claude-opus-5` é a alternativa de uma env var se a Rodada 1 sair rasa.
2. **Timeout.** `/api/read` leva 12 a 25 s. Toda rota que chama o engine declara `export const maxDuration`, senão a função serverless corta antes de responder.
3. **Headers.** O planejamento manda abrir exceção de `X-Frame-Options` na rota do dossiê por causa da VSL. Está invertido: `X-Frame-Options` governa quem enquadra a nossa página; o iframe da VSL dentro dela é `frame-src` no CSP. `DENY` fica global, sem exceção.
