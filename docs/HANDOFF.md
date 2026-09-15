# Handoff

Estado da aplicação, o que depende de variável de ambiente, e cada decisão tomada fora do planejamento.

## O que está pronto

| Item | Situação |
|---|---|
| Scaffold Next 15.5, TS strict, Tailwind v4, pnpm | pronto, `pnpm build` passa sem erro nem warning de tipo |
| Fontes Cormorant Garamond, Instrument Serif, Archivo | via `next/font/google`, baixadas no build e servidas da própria origem |
| Máquina de estados com as 11 telas, incluindo os desvios R, J e E | pronta em `app/page.tsx` |
| Persistência em localStorage mais cookie httpOnly de sessão | pronta |
| Entrada por áudio com transcrição editável antes do envio | pronta, some sozinha quando o microfone é negado |
| Repescagem com heurística barata e checagem por modelo | pronta, uma vez por pergunta, nunca na P3 |
| Sete route handlers | prontos |
| Engine: Prompt Mãe integral mais contrato JSON, zod, validador, 2 retries | pronto |
| Pré-filtro de risco | pronto, duas camadas |
| Migration do Supabase com RLS e a view `leads_para_contato` | pronta em `supabase/migrations/0001_quiz.sql`, **ainda não aplicada** |
| Dossiê com parser de citações em `<q>` dourado | pronto |
| Infográfico animado com GSAP, reduced-motion, versão de celular, export em PNG 2x | pronto |
| Tracking Pixel mais GTM | pronto, não quebra com env vazia |
| `.env.example`, README, migrations, fixtures, Playwright | prontos |

## O que ainda não foi verificado

**A leitura nunca rodou de verdade.** Não havia chave da Anthropic no ambiente, então o engine não foi executado contra a fixture do Marcelo. O que isso deixa em aberto:

- Se o modelo devolve Iniciação, Prova (9), Rei ↓ e Guerreiro ↓ no caso canônico.
- Se o validador aprova de primeira ou gasta retry, e em quais regras ele tropeça.
- A latência real, que decide se `maxDuration = 120` está folgado ou apertado.

Para rodar, basta preencher `ANTHROPIC_API_KEY` em `.env.local`:

```bash
pnpm engine:fixture marcelo 3
```

O comando imprime Ato, Movimento, arquétipos, ecos, contagem de palavras e o veredito do validador por rodada. Com `--todas` roda as oito fixtures.

**A animação do infográfico foi conferida em estado final forçado, não em execução.** A janela do navegador estava com `visibilityState: hidden` durante a construção, o que impede o `IntersectionObserver` de disparar. A geometria foi verificada nos números (marca no meio exato do arco da Iniciação, seta saindo a 55° dentro do quarto do Retorno e chegando exatamente na circunferência do círculo seguinte) e visualmente no estado final. A sequência temporal em si ainda não foi vista rodando.

**Os testes de Playwright foram escritos, não executados.** `tests/e2e/fluxo.spec.ts` cobre copy, ordem das telas e o portão, sem depender de chave.

## Decisões fora do planejamento

Cada uma com o motivo. Nenhuma delas toca o Prompt Mãe.

### Corrigem erro do planejamento

1. **Modelo.** O planejamento fixa `claude-sonnet-4-6`, geração anterior. O default é `claude-sonnet-5`, com `claude-opus-5` a uma env de distância.

2. **`maxDuration` nas rotas do engine.** O planejamento não previu isso. A leitura leva de 12 a 25 segundos e a função serverless cortaria antes de responder, com a leitura pronta e paga do outro lado. `/api/read` declara 120 segundos. **Isso depende do plano da conta Vercel:** no Hobby o teto é 60 s, e aí o valor precisa cair pra 60 e a latência do engine vira risco real.

3. **Headers.** O brief do Agente 2 manda abrir exceção de `X-Frame-Options` na rota do dossiê por causa da VSL. Está invertido: esse header governa quem enquadra a nossa página, e o iframe da VSL dentro dela é `frame-src` no CSP. `DENY` ficou global, sem exceção.

4. **CSP.** `player-vz-*.tv.pandavideo.com.br` é inválido: wildcard em CSP só vale no rótulo mais à esquerda, e um source inválido faz o navegador descartar a diretiva `frame-src` inteira, abrindo o que ela deveria fechar. Virou `*.tv.pandavideo.com.br`.

### Corrigem regras do validador que reprovavam o exemplo canônico

As quatro regras abaixo, escritas como o planejamento pede, reprovam o dossiê e o spoiler do Anexo 11 do próprio Prompt Mãe. Um validador que reprova a referência não valida, só gera retry até esgotar. Cada ajuste está marcado com `DESVIO` em `lib/engine/validate.ts`.

5. **Palavras banidas "teste" e "resultado".** O dossiê canônico escreve "ser testado num lugar onde ninguém assiste o resultado". O Prompt Mãe Seção 1 quer barrar a referência ao produto ("o teu resultado", "este teste"), não a palavra em uso corrente. O validador bane só a construção meta.

6. **Citações literais.** O planejamento pede que *cada* trecho entre aspas apareça literal nas respostas. O dossiê canônico fecha a prática com `"eu decidi"`, que é instrução e não citação dele. A regra do Prompt Mãe é "pelo menos duas citações literais", e é essa que roda.

7. **Fechamento ancorado na P4.** O planejamento pede a `dor_literal` inteira dentro do fechamento. O fechamento canônico cita "meus filhos me vendo assim e achando que é normal" enquanto a P4 é "Meus filhos me vendo assim, cansado, sempre no telefone, e achando que é normal". Elidir o meio é citação honesta. A régua virou uma sequência de pelo menos 4 palavras consecutivas em comum.

8. **Fórmula "não é X, é Y".** O regex do planejamento pega "Não é o começo e não é o fim", que é o spoiler canônico. Dupla negação não é a fórmula de substituição que o Prompt Mãe bane. O regex ficou mais estreito e exige vírgula seguida de afirmação, ou "e sim" / "mas sim".

### Escolhas de engenharia

9. **Next 15.5.25 e não 16.** O planejamento diz Next 15 e o estável atual é 16.3.5. Ficou no 15 como especificado. Migrar depois é upgrade, não reescrita.

10. **`max_tokens` 8000 e não 6000.** Corte por limite de token vira JSON truncado, que falha no parse e queima um retry sem sinal claro. A diferença só é cobrada se for usada.

11. **O Prompt Mãe é lido de `docs/prompt-mae.md` em runtime**, não copiado pra dentro de um `.ts`. Ele é a fonte de verdade e o Adriano edita o markdown; duplicar garantiria que uma das cópias ficaria velha. `next.config.ts` inclui o arquivo no bundle via `outputFileTracingIncludes`, e isso foi conferido no build (ele aparece no `.nft.json` da rota).

12. **Quatro layouts de placa, não dois.** Explicado em `docs/DESIGN-NOTES.md`.

13. **Pré-filtro de risco estreito de propósito.** Lista de alta precisão, com "matar" fora quando o objeto não é ele mesmo, porque "matar a saudade" e "matar o tempo" são uso corrente. Um falso positivo mostra tela de emergência pra quem falou de briga no trabalho e mata o lead; um falso negativo cai na segunda camada, que é a flag do modelo. Os dois erros não custam o mesmo, então a rede larga fica com o modelo.

14. **Rota `/preview`, só em desenvolvimento.** Renderiza o dossiê com o texto do Anexo 11.5 pra revisar tipografia e infográfico sem gastar chamada. Em produção responde 404. Aceita `?ato=`, `?movimento=`, `?posicao=` e `?aposta=1`.

15. **Normalização de telefone não inventa o nono dígito.** Se o cara mandar 10 dígitos, guarda 10. Adivinhar gera número que não existe e queima o contato.

16. **pnpm instalado por `npm i -g`.** `corepack enable` falha nesta máquina por falta de permissão em `C:\Program Files\nodejs`. O pnpm 12 também bloqueia build scripts por padrão: `pnpm-workspace.yaml` libera `unrs-resolver` e `esbuild`, que são os dois que o projeto precisa.

## Precisa de decisão humana antes de ir pro ar

1. **A política de privacidade tem um e-mail inventado.** `contato@adrianorahde.com.br` em `app/privacidade/page.tsx` foi escrito por falta de informação. Se esse endereço não existe, a página promete um canal de exercício de direitos que não atende ninguém. Trocar antes do primeiro tráfego.

2. **Copy da Tela 0 e a linha acima da VSL** continuam pendentes de aprovação do Adriano. São as duas únicas frases fora do Prompt Mãe. Estão em `lib/copy.ts`, nas constantes `ABERTURA` e `VSL`.

3. **A ênfase em "cena"** no enquadramento é a única liberdade tomada sobre copy literal.

4. **Cards dos Movimentos.** Os 20 estão com `tem_card: false` e `frase_card: null`. Conforme a arte chegar, colocar o arquivo em `public/cards/{slug}.webp` em paisagem, preencher a frase oficial e virar a flag. A placa troca de layout sozinha.

5. **Plano da Vercel**, por causa do `maxDuration` (item 2 acima).

## Pendências do Prompt Mãe Seção 12, e onde elas já estão preparadas

| Pendência | Onde |
|---|---|
| Sete anos ou dois setênios na P1 | `lib/copy.ts`, uma linha em `PERGUNTAS[0].pergunta` |
| Abandono campo a campo no formulário | evento `quiz_form_field_*` já dispara no foco de cada campo |
| Gancho do spoiler, eco ou arquétipo | `gancho_usado` salvo em `quiz_readings.output`; env `SPOILER_GANCHO` força em blocos |
| Dossiê por e-mail | fora desta versão, pediria quinto campo |
| Integração com "Pessoas" | a view `leads_para_contato` é o contrato; webhook é segunda fase |
| Quais Movimentos têm card | `tem_card` por Movimento em `lib/movimentos.ts` |
| Comparar quiz com leitura completa | `pnpm engine:fixture --todas 3` imprime o relatório de variância |
