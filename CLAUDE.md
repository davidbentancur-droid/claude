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
- Não adicionar botão de compra, countdown, escassez ou preço no quiz nem no dossiê. A única exceção é `/estoicismo-nos-mitos`, o downsell, que o David pediu em 18/09 e que é página de venda por desenho. Mesmo lá: sem contagem regressiva, sem preço na copy, sem promessa de resultado.
- Nenhuma menção a "IA", "inteligência artificial", "quiz", "teste" ou "resultado" em tela visível ao usuário.

## Stack

Next.js 15.5 (App Router, TS strict), Tailwind v4, GSAP, Supabase, Anthropic SDK, OpenAI SDK, Playwright.
Gerenciador: **pnpm** (instalado em `D:\npm-global`; `corepack enable` falha nesta máquina por falta de permissão em `C:\Program Files\nodejs`).

Comandos: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test:e2e`, `pnpm engine:fixture`.

## A leitura roda em duas chamadas

O planejamento Seção 3 descreve uma chamada só. São duas, e o corte é o centro da arquitetura:

1. **`/api/read`** faz a análise (Ato, Movimento, arquétipos, ecos, prática) e escreve o spoiler. É a única latência que o usuário sente, uns 30 s.
2. O cliente dispara **`/api/dossie`** sem esperar, no instante em que o spoiler aparece. Ela escreve o texto enquanto o cara preenche os quatro campos do formulário, então o tempo dela sai de graça.
3. **`/api/lead`** grava o lead e busca o dossiê: pronto no banco (o normal), em voo (espera até 40 s), ou nem começou (escreve na hora, plano B).

Motivo: a função serverless tem 60 s no Hobby. Numa chamada só o orçamento inteiro ia pra análise e sobrava uma tentativa mal aparada pro texto. Medido contra a fixture do Marcelo, o dossiê saía em 492 palavras contra um teto de 420. Separado, cada metade tem 3 tentativas dentro do orçamento dela.

A regra de honestidade do Prompt Mãe Seção 4.1 continua valendo: a chamada 2 recebe a análise fechada e o contrato dela proíbe reabrir decisão, então o dossiê não tem como contradizer o spoiler.

Concorrência: a função `claim_dossie` (migração 0002) é a trava. Dois caminhos podem disparar a escrita, e sem ela os dois gerariam o mesmo texto em paralelo.

## Desvios deliberados do planejamento

Registrados aqui porque o planejamento diz outra coisa e a divergência é intencional:

1. **Modelo.** O planejamento fixa `claude-sonnet-4-6`. O default real é `claude-sonnet-5` (família atual). `claude-opus-5` é a alternativa de uma env var se a Rodada 1 sair rasa.
2. **Timeout.** `/api/read` leva 12 a 25 s. Toda rota que chama o engine declara `export const maxDuration`, senão a função serverless corta antes de responder.
3. **Headers.** O planejamento manda abrir exceção de `X-Frame-Options` na rota do dossiê por causa da VSL. Está invertido: `X-Frame-Options` governa quem enquadra a nossa página; o iframe da VSL dentro dela é `frame-src` no CSP. `DENY` fica global, sem exceção.
4. **Telas de abertura.** O Prompt Mãe (versão de 16/09) traz as duas telas como copy fixa e manda colar inteiras. Elas substituem a abertura e o enquadramento do planejamento Seção 1, e a linha "Nenhum dado é pedido antes da leitura estar pronta" saiu junto, porque inventar linha contraria a régua das duas telas. Desde 18/09 a Tela 1 tem três níveis: o `heading` de venda é o h1, e o `titulo` mais a `linha` descem pra promessa curta logo abaixo.
5. **Repescagem.** Uma no fluxo inteiro, não uma por pergunta, e o portão é contável: `precisaRepescagem` em `lib/engine/repescagem.ts`, sem chamada de modelo. A checagem de cena com o modelo foi removida junto com o prompt dela. O terceiro critério ("nenhuma pessoa") é lido como pessoa nomeada, e o porquê está comentado na função: ao pé da letra ele salvaria o próprio exemplo de resposta ruim da P1.
6. **Negrito no dossiê.** Único markdown que o contrato deixa passar, e só em três lugares: os rótulos `A armadilha:` e `O convite:` e o nome do Movimento. `lib/citacoes.ts` parseia, `components/dossie/Texto.tsx` desenha, e toda quebra de linha abre bloco novo, que é o que põe o rótulo em linha própria.
7. **Frase do card.** A Seção 5 pede a frase oficial do card junto do nome do Movimento. O kit de arte não existe (pendência da Seção 12), os 20 Movimentos estão com `tem_card: false`, e o contrato proíbe o modelo de inventar a frase. Vale o desvio que a própria Seção 7 prevê: só o nome, sem imagem improvisada.
8. **O modelo tem piso de bloco, e isso está medido em nove rodadas.** Ele acerta o Ato e o Movimento na mosca e estoura a devolutiva, o arquétipo e o fechamento em 10 a 30 por cento, porque abaixo de umas 60 palavras ele não escreve um bloco de prosa. Na versão de 18/09 o dossiê sai em 596 contra o teto de 550, com Ato e Movimento em 66% do total, que é o que a Seção 5 pede. O `CONTRATO_DOSSIE` aperta esses três blocos em frases contadas e nomeia a aritmética do documento, o que já tirou 100 palavras do total; o que sobra é piso do modelo.
9. **Três telas, quatro respostas.** O Prompt Mãe de 18/09 fundiu as antigas P3 e P4 numa tela de três campos, mas continua chamando a dor de "Pergunta 4" nas Seções 4.3 e 6 e no item 11 do checklist. Então a tela é uma e o armazenamento é dois: busca e obstáculo viram a resposta 3, o preço de nada mudar vira a resposta 4. O mapeamento é declarado em `guardaEm` dentro de `PERGUNTAS` e aplicado por `agruparCampos`. Isso mantém a dor num campo próprio pra view `leads_para_contato`, e mantém a âncora do fechamento conferível no validador.
10. **A espiral lê em horário desde 18/09.** Partida no quarto superior direito, Retorno no superior esquerdo, Iniciação embaixo, e a seta saindo pela esquerda. Era o contrário. `FAIXA` em `components/dossie/espiral.ts` anda com o ângulo decrescendo por causa disso. O fundo da placa virou transparente e o traço virou dourado (`OURO`), porque a página é escura e a tinta #1E1B18 que a Seção 7 também aceita sumiria nela.
11. **Saídas do dossiê e downsell.** Abaixo da VSL vão dois caminhos: `NEXT_PUBLIC_WHATSAPP_URL` no botão preenchido em degradê, e `/estoicismo-nos-mitos` no vazado. O vazado não é um "fechar", é a bifurcação pro downsell, que usa `NEXT_PUBLIC_DOWNSELL_VSL_EMBED_URL` e `NEXT_PUBLIC_DOWNSELL_CHECKOUT_URL`. Vídeo e botões são independentes: eles chegam em momentos diferentes, e sem saída o dossiê fica num beco. O degradê do botão é o único da casa e existe pra separar hierarquia entre dois botões lado a lado, não pra decorar.
12. **Falta a camada de texto do card.** A Seção 7 de 18/09 pede, junto do card, uma descrição em itálico do Movimento e uma do Ato. Elas vêm de uma lista que o kit de arte tem que trazer e que ainda não existe, então não estão na placa. Inventar essas descrições seria inventar copy, o que a regra da casa proíbe.
