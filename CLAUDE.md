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
4. **Telas de abertura.** O Prompt Mãe (versão de 16/09) traz as duas telas como copy fixa e manda colar inteiras. Elas substituem a abertura e o enquadramento do planejamento Seção 1, e a linha "Nenhum dado é pedido antes da leitura estar pronta" saiu junto, porque inventar linha contraria a régua das duas telas. O título da Tela 1 vem partido em `titulo` e `linha` só por tipografia: dezessete palavras numa manchete só viram cinco linhas antes de qualquer outra coisa.
5. **Repescagem.** Uma no fluxo inteiro, não uma por pergunta, e o portão é contável: `precisaRepescagem` em `lib/engine/read.ts`, sem chamada de modelo. A checagem de cena com o modelo foi removida junto com o prompt dela. O terceiro critério ("nenhuma pessoa") é lido como pessoa nomeada, e o porquê está comentado na função: ao pé da letra ele salvaria o próprio exemplo de resposta ruim da P1.
6. **Negrito no dossiê.** Único markdown que o contrato deixa passar, e só em três lugares: os rótulos `A armadilha:` e `O convite:` e o nome do Movimento. `lib/citacoes.ts` parseia, `components/dossie/Texto.tsx` desenha, e toda quebra de linha abre bloco novo, que é o que põe o rótulo em linha própria.
7. **Frase do card.** A Seção 5 pede a frase oficial do card junto do nome do Movimento. O kit de arte não existe (pendência da Seção 12), os 20 Movimentos estão com `tem_card: false`, e o contrato proíbe o modelo de inventar a frase. Vale o desvio que a própria Seção 7 prevê: só o nome, sem imagem improvisada.
