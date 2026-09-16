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

## A leitura roda em duas chamadas

O planejamento Seção 3 descreve uma chamada só. São duas, e o corte é o centro da arquitetura:

1. **`/api/read`** faz a análise (Ato, Movimento, arquétipos, ecos, prática) e escreve o spoiler. É a única latência que o usuário sente, uns 30 s.
2. O cliente dispara **`/api/dossie`** sem esperar, no instante em que o spoiler aparece. Ela escreve o texto enquanto o cara preenche os quatro campos, então o tempo dela sai de graça.
3. **`/api/lead`** grava o lead e busca o dossiê: pronto no banco (o normal), em voo (espera até 40 s), ou nem começou (escreve na hora, plano B).

Motivo: a função serverless tem 60 s no Hobby. Numa chamada só o orçamento inteiro ia pra análise e sobrava uma tentativa mal aparada pro texto. Medido contra a fixture do Marcelo, o dossiê saía em 492 palavras contra um teto de 420. Separado, cada metade tem 3 tentativas dentro do orçamento dela.

A regra de honestidade do Prompt Mãe Seção 4.1 continua valendo: a chamada 2 recebe a análise fechada e o contrato dela proíbe reabrir decisão, então o dossiê não tem como contradizer o spoiler.

Concorrência: a função `claim_dossie` (migração 0002) é a trava. Dois caminhos podem disparar a escrita, e sem ela os dois gerariam o mesmo texto em paralelo.

## Desvios deliberados do planejamento

Registrados aqui porque o planejamento diz outra coisa e a divergência é intencional:

1. **Modelo.** O planejamento fixa `claude-sonnet-4-6`. O default real é `claude-sonnet-5` (família atual). `claude-opus-5` é a alternativa de uma env var se a Rodada 1 sair rasa.
2. **Timeout.** `/api/read` leva 12 a 25 s. Toda rota que chama o engine declara `export const maxDuration`, senão a função serverless corta antes de responder.
3. **Headers.** O planejamento manda abrir exceção de `X-Frame-Options` na rota do dossiê por causa da VSL. Está invertido: `X-Frame-Options` governa quem enquadra a nossa página; o iframe da VSL dentro dela é `frame-src` no CSP. `DENY` fica global, sem exceção.
4. **Telas de abertura.** O Prompt Mãe (versão de 16/09) traz as duas telas como copy fixa e manda colar inteiras. Elas substituem a abertura e o enquadramento do planejamento Seção 1, e a linha "Nenhum dado é pedido antes da leitura estar pronta" saiu junto, porque inventar linha contraria a régua das duas telas. O título da Tela 1 vem partido em `titulo` e `linha` só por tipografia: dezessete palavras numa manchete só viram cinco linhas antes de qualquer outra coisa.
5. **Repescagem.** Uma no fluxo inteiro, não uma por pergunta, e o portão é contável: `precisaRepescagem` em `lib/engine/read.ts`, sem chamada de modelo. A checagem de cena com o modelo foi removida junto com o prompt dela. O terceiro critério ("nenhuma pessoa") é lido como pessoa nomeada, e o porquê está comentado na função: ao pé da letra ele salvaria o próprio exemplo de resposta ruim da P1.
6. **Negrito no dossiê.** Único markdown que o contrato deixa passar, e só em três lugares: os rótulos `A armadilha:` e `O convite:` e o nome do Movimento. `lib/citacoes.ts` parseia, `components/dossie/Texto.tsx` desenha, e toda quebra de linha abre bloco novo, que é o que põe o rótulo em linha própria.
7. **Frase do card.** A Seção 5 pede a frase oficial do card junto do nome do Movimento. O kit de arte não existe (pendência da Seção 12), os 20 Movimentos estão com `tem_card: false`, e o contrato proíbe o modelo de inventar a frase. Vale o desvio que a própria Seção 7 prevê: só o nome, sem imagem improvisada.
8. **A Seção 5 não fecha sozinha, e isso está medido.** Os alvos por bloco do Prompt Mãe somam 435 palavras e a faixa dele termina em 420, e a Seção 6 pede o fechamento em "quatro ou cinco frases", o que dá 80 palavras onde a Seção 5 pede 60. O modelo obedece o documento e não o contrato, então ele reproduz a contradição: em oito rodadas ele acerta o Ato e o Movimento na mosca e estoura a devolutiva e o fechamento. O `CONTRATO_DOSSIE` nomeia as duas contas e resolve mandando a faixa ganhar. Levou o dossiê de 496 pra 447 palavras, e as 27 que sobram só somem quando o Adriano ajustar a Seção 5 na fonte.
