# Mini Dossiê Mítico

Quiz de entrada do funil de Mitobiografia (Adriano Rahde). Leia primeiro:

- `docs/PLANEJAMENTO.md` (arquitetura, fluxo de telas, design system, infográfico, deploy)
- `docs/prompt-mae.md` (fonte de verdade da copy e das regras de leitura; **nunca reescrever**)
- `docs/banco-de-mitos.md` (a lista fechada de mitos que o engine pode citar; **nunca reescrever**)

Onde os dois primeiros divergirem em copy ou regra de leitura, o Prompt Mãe vence. O planejamento manda só na engenharia, no design e na entrega. O banco de mitos manda em qual história entra em cada eco, e o próprio Prompt Mãe declara ele anexo obrigatório de contexto.

Os dois documentos de `docs/` que dizem "nunca reescrever" são do Adriano. Eles mudam quando ele manda o texto novo, e aí a gente cola o que ele mandou. Nunca por iniciativa nossa, nem pra "consertar" contradição interna: contradição vira desvio registrado aqui embaixo.

## Regras que não se negociam

- Toda copy voltada ao usuário vem do Prompt Mãe ou da Seção 1 do planejamento. Não inventar texto de tela.
- Tratamento por "tu", português brasileiro.
- Zero travessão em qualquer texto de UI ou gerado.
- O dossiê nunca chega ao cliente antes do lead ser salvo. `/api/read` devolve `{ spoiler }` e nada mais.
- Nenhuma chave de API no cliente. Toda chamada a LLM e transcrição passa por route handler.
- Cantos retos, sem sombra difusa, sem gradiente decorativo, sem emoji na UI.
- Não adicionar botão de compra, countdown, escassez ou preço no quiz nem no dossiê. A única exceção é `/oferta`, o downsell, que o David pediu em 18/09 e que é página de venda por desenho. Mesmo lá: sem contagem regressiva, sem preço na copy, sem promessa de resultado.
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

## O painel

`/painel` é ferramenta interna, pedida pelo David em 20/09. Funil visual da página até a VSL, a bifurcação WhatsApp contra downsell, os leads com botão de WhatsApp e todas as respostas com busca. Filtro por janela de dias no topo.

Três coisas que valem saber antes de mexer nele:

1. **Ele tem senha, e falha fechado.** `middleware.ts` faz Basic Auth com `PAINEL_SENHA`. Sem a variável, ou com menos de 8 caracteres, a rota devolve 503 e não mostra nada. A página lista WhatsApp, profissão, orçamento e as respostas inteiras de gente que preencheu um formulário; isso não fica aberto por descuido de configuração.
2. **O funil de cima é retroativo, o de baixo não.** Da abertura da página até o lead salvo cada etapa já deixava linha própria em `quiz_sessions`, `quiz_answers`, `quiz_readings` e `quiz_leads`, então vale desde o primeiro dia. Abrir o dossiê, chegar na VSL, ir pro WhatsApp, descer pro downsell e ir pro checkout só passaram a ser gravados na migração 0004, porque antes disso o `lib/tracking.ts` mandava pro GTM e pro Pixel e nada voltava. O painel avisa a data de corte na tela em vez de mostrar zero sem explicação.
3. **O estilo não segue a régua da casa, de propósito.** Gradiente e trapézio são proibidos no quiz e usados aqui, porque a régua existe pra peça que o cliente vê e esta é interna, desenhada em cima da referência de dashboard que o David mandou.

A qualificação sai de `orcamento_faixa`, que o `classificarOrcamento` já gravava: centenas e milhares contam como qualificado, dezenas não, e `indefinido` vira "ler o texto" em vez de virar veredito. O Prompt Mãe Seção 4.2 avisa que "o verbo importa mais que a cifra", então o campo cru aparece inteiro no card.

## Desvios deliberados do planejamento

Registrados aqui porque o planejamento diz outra coisa e a divergência é intencional:

1. **Modelo.** O planejamento fixa `claude-sonnet-4-6`. O default real é `claude-sonnet-5` (família atual). `claude-opus-5` é a alternativa de uma env var se a Rodada 1 sair rasa.
2. **Timeout.** `/api/read` leva 12 a 25 s. Toda rota que chama o engine declara `export const maxDuration`, senão a função serverless corta antes de responder.
3. **Headers.** O planejamento manda abrir exceção de `X-Frame-Options` na rota do dossiê por causa da VSL. Está invertido: `X-Frame-Options` governa quem enquadra a nossa página; o iframe da VSL dentro dela é `frame-src` no CSP. `DENY` fica global, sem exceção.
4. **Telas de abertura.** O Prompt Mãe (versão de 16/09) traz as duas telas como copy fixa e manda colar inteiras. Elas substituem a abertura e o enquadramento do planejamento Seção 1, e a linha "Nenhum dado é pedido antes da leitura estar pronta" saiu junto, porque inventar linha contraria a régua das duas telas. Desde 18/09 a Tela 1 tem três níveis: o `heading` de venda é o h1, e o `titulo` mais a `linha` descem pra promessa curta logo abaixo.
5. **Repescagem.** Uma no fluxo inteiro, não uma por pergunta, e o portão é contável: `precisaRepescagem` em `lib/engine/repescagem.ts`, sem chamada de modelo. A checagem de cena com o modelo foi removida junto com o prompt dela. O terceiro critério ("nenhuma pessoa") é lido como pessoa nomeada, e o porquê está comentado na função: ao pé da letra ele salvaria o próprio exemplo de resposta ruim da P1.
6. **Negrito no dossiê.** Único markdown que o contrato deixa passar, e só em três lugares: os rótulos `A armadilha:` e `O convite:` e o nome do Movimento. `lib/citacoes.ts` parseia, `components/dossie/Texto.tsx` desenha, e toda quebra de linha abre bloco novo, que é o que põe o rótulo em linha própria.
7. **Frase do card.** A Seção 5 pede a frase oficial do card junto do nome do Movimento. O kit de arte não existe (pendência da Seção 12), os 20 Movimentos estão com `tem_card: false`, e o contrato proíbe o modelo de inventar a frase. Vale o desvio que a própria Seção 7 prevê: só o nome, sem imagem improvisada.
8. **O dossiê fica na beirada do teto de 550, e o diagnóstico mudou em 19/09.** O que se acreditava até aqui era que o modelo escrevia frases demais, e o contrato inteiro estava construído em cima disso ("a coluna que manda é a das frases"). Está errado. Medido: ele **respeita** o teto de frases e estoura pelo comprimento delas, com devolutiva de 2 frases de 38 palavras dentro de um teto de 3 frases. A correção foi trocar a instrução de "escreve N frases" pra "escreve N frases de M palavras", com M na tabela do `CONTRATO_DOSSIE` e no `TETOS` do validador, e fazer o retry apontar a frase gorda em vez do bloco. Sete rodadas contra a fixture do Marcelo: 627 antes, depois 541, 548, 559, 566, 573, 582, 590, com duas passando. Ato e Movimento ficam em 64 a 66% do total, que é o que a Seção 5 pede. O que sobra de estouro é piso do modelo e sai em quatro tentativas de retry, não em três.
9. **Três telas, quatro respostas.** O Prompt Mãe de 18/09 fundiu as antigas P3 e P4 numa tela de três campos, mas continua chamando a dor de "Pergunta 4" nas Seções 4.3 e 6 e no item 11 do checklist. Então a tela é uma e o armazenamento é dois: busca e obstáculo viram a resposta 3, o preço de nada mudar vira a resposta 4. O mapeamento é declarado em `guardaEm` dentro de `PERGUNTAS` e aplicado por `agruparCampos`. Isso mantém a dor num campo próprio pra view `leads_para_contato`, e mantém a âncora do fechamento conferível no validador.
10. **A espiral lê em horário desde 18/09.** Partida no quarto superior direito, Retorno no superior esquerdo, Iniciação embaixo, e a seta saindo pela esquerda. Era o contrário. `FAIXA` em `components/dossie/espiral.ts` anda com o ângulo decrescendo por causa disso. O fundo da placa virou transparente e o traço virou dourado (`OURO`), porque a página é escura e a tinta #1E1B18 que a Seção 7 também aceita sumiria nela.
11. **Saídas do dossiê e downsell.** Abaixo da VSL vão dois caminhos: `NEXT_PUBLIC_WHATSAPP_URL` no botão preenchido em degradê, e `/oferta` no vazado. O vazado não é um "fechar", é a bifurcação pro downsell, que usa `NEXT_PUBLIC_DOWNSELL_VSL_EMBED_URL` e `NEXT_PUBLIC_DOWNSELL_CHECKOUT_URL`. Vídeo e botões são independentes: eles chegam em momentos diferentes, e sem saída o dossiê fica num beco. O degradê do botão é o único da casa e existe pra separar hierarquia entre dois botões lado a lado, não pra decorar.
12. **Falta a camada de texto do card.** A Seção 7 de 18/09 pede, junto do card, uma descrição em itálico do Movimento e uma do Ato. Elas vêm de uma lista que o kit de arte tem que trazer e que ainda não existe, então não estão na placa. Inventar essas descrições seria inventar copy, o que a regra da casa proíbe.
13. **O banco de mitos é lista fechada, conferida em código.** O Passo 5 de 19/09 manda os dois ecos virem só do `docs/banco-de-mitos.md`, e régua em prosa não impede citação errada: o exemplo de saída ruim do próprio Anexo 11.6 cita Simba. Então `lib/mitos.ts` parseia as tabelas do markdown e o validador reprova mito que não achar lá. O parse mora no mesmo arquivo que vai pro prompt de propósito, porque duas cópias da lista divergiriam na primeira edição do Adriano. A busca por nome é tolerante com grafia ("Jacó no Jaboque" acha a linha inteira) e intolerante com escolha: sem sobreposição forte ela devolve nada e o validador manda a lista de volta.
14. **O Anexo 11.5 agora cita um mito fora do banco.** O dossiê canônico do caso Marcelo usa "Odisseu na jangada", que não está no `docs/banco-de-mitos.md`. Não é bug nosso e não foi contornado: a Seção 12 do próprio Prompt Mãe registra que o Anexo foi escrito antes das regras de 19/09 e precisa ser reescrito. O validador reprova esse par, e está certo em reprovar.
15. **Três Movimentos não fecham o pareamento dentro da própria linha.** Ambição, Tentação e Cegueira só têm opção de popularidade Alto no banco. O Passo 5 já prevê isso e manda a busca rodar no banco inteiro, então o segundo eco vem de outra linha. O `CONTRATO_ANALISE` avisa o modelo disso pelo nome, e a mensagem de erro do validador oferece opções de fora da linha.
16. **A chamada 2 tem uma tentativa a mais que a chamada 1.** Três e quatro. A 1 é a latência que o cara sente na tela; a 2 roda enquanto ele preenche o formulário, num tempo que ele ia gastar de qualquer jeito. E o conserto de tamanho precisa de mais de uma passada: medido, as duas primeiras tentativas cortam pouco. Quatro tentativas da 2 dão uns 24 s, dentro dos 40 s que `/api/lead` espera.
