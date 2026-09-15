# Mini Dossiê Mítico

Quiz de entrada do funil de Mitobiografia. Quatro perguntas abertas, um spoiler curto, um formulário de quatro campos e, só então, o dossiê com o infográfico e o vídeo.

Documentos que mandam, nesta ordem:

- `docs/prompt-mae.md` é a fonte de verdade da copy e das regras de leitura. Nunca reescrever.
- `docs/PLANEJAMENTO.md` manda na engenharia, no design e na entrega.
- `docs/HANDOFF.md` lista o que está pronto, o que falta verificar e cada desvio tomado, com o motivo.
- `docs/DESIGN-NOTES.md` explica as decisões de tela.

## Rodar

```bash
pnpm install
cp .env.example .env.local   # preenche ao menos ANTHROPIC_API_KEY
pnpm dev
```

Sem Supabase configurado a aplicação roda inteira, só não persiste, e o portão do dossiê não tem como conferir a sessão. Sem chave da Anthropic, o fluxo vai até a tela de espera e cai na tela de erro, com as respostas preservadas.

Em desenvolvimento existe `/preview`, que renderiza o dossiê com texto de referência pra revisar tipografia e o infográfico sem gastar chamada de engine. Aceita `?ato=Partida|Iniciação|Retorno`, `?movimento=1..20`, `?posicao=começo|meio|fim` e `?aposta=1`. Em produção a rota responde 404.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` | build de produção |
| `pnpm typecheck` | TypeScript, sem emitir |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright contra localhost, ou contra `E2E_BASE_URL` se definida |
| `pnpm engine:fixture marcelo 3` | roda o engine contra uma fixture, três vezes, e imprime Ato, Movimento, arquétipos, contagem e o veredito do validador |
| `pnpm engine:fixture --todas` | o mesmo contra as oito fixtures |

## Banco

A migration está em `supabase/migrations/0001_quiz.sql`. RLS ligado nas quatro tabelas, sem policy pública: a única porta de escrita é o service role, usado só nos route handlers.

A view `leads_para_contato` junta o lead, as quatro respostas na íntegra, o Ato, o Movimento, o arquétipo com direção e a dor literal da Pergunta 4, que é o que abre a primeira mensagem no WhatsApp. É exportável em CSV pelo painel do Supabase.

## Quando a VSL chegar

Setar `NEXT_PUBLIC_VSL_EMBED_URL` no ambiente de produção e fazer redeploy. Nada no código muda. Com a env vazia, em produção o bloco do vídeo some; em desenvolvimento aparece um retângulo marcado.

## Estrutura

```
app/            telas e route handlers
components/
  quiz/         as 11 telas do fluxo
  dossie/       infográfico, geometria da espiral, texto com citações, VSL
  ui/           botão, campo, microfone
lib/
  copy.ts       toda a copy voltada ao usuário, num arquivo só
  engine/       system prompt, schema, validador, pré-filtro de risco, orquestração
  movimentos.ts banco dos 20 Movimentos
docs/           prompt mãe, planejamento, handoff, notas de design
supabase/       migrations
tests/          fixtures do engine e Playwright
```
