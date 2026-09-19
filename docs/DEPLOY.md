# Deploy

Estado: **código pronto, nada publicado ainda.** Faltam dois passos que dependem de acesso humano, listados em "O que falta de ti". O resto está preparado e é execução.

## Conta e plano

| Item | Valor |
|---|---|
| Time na Vercel | Camaleon's projects (`team_LOsb5T8hZ052SAIjHomOLDjI`) |
| Plano | **Hobby** |
| Região sugerida | `gru1`, São Paulo |
| Framework | Next.js, root `.` |

**O plano Hobby limita função serverless a 60 segundos.** Isso não é detalhe: a leitura leva de 12 a 25 segundos por chamada, e o validador pode pedir até dois retries. Três chamadas em sequência estouram 60 s.

Como está tratado:

- `/api/read` declara `maxDuration = 60`, que é o teto do plano.
- O engine carrega um orçamento de tempo (`ENGINE_BUDGET_MS`, 48 s por padrão). Antes de cada retry ele estima, pela média das chamadas anteriores, se a próxima cabe. Se não couber, entrega a leitura que já tem e loga `orçamento de tempo esgotado`.
- O efeito prático: sob pressão de tempo, um dossiê com um deslize de estilo em vez de uma tela de erro. Leitura pronta e paga que morre no timeout é o pior desfecho possível, e é isso que o orçamento evita.

**Se a conta virar Pro**, subir os dois juntos: `maxDuration` para 300 em `app/api/read/route.ts` e `ENGINE_BUDGET_MS` para algo como 240000. Aí os dois retries cabem folgados.

## O que falta de ti

### 1. Repositório no GitHub

Cria um repositório **vazio** (sem README, sem .gitignore, sem licença) e me passa a URL. Eu faço o resto:

```bash
git remote add origin <url>
git push -u origin main
```

O push pode abrir o Gerenciador de Credenciais do Windows pedindo teu login do GitHub. Isso é interativo e não passa por mim, então precisa da tua mão nessa janela.

Depois do push eu ligo a Vercel ao repositório, e cada push passa a gerar deploy.

### 2. Projeto Supabase novo — FEITO

Projeto `ysjyppytkrygkqoxgzzb` ("Adriano"). A migration foi aplicada pelo SQL Editor e verificada:

| objeto | tipo | RLS | policies |
|---|---|---|---|
| quiz_sessions | tabela | ligado | 0 |
| quiz_answers | tabela | ligado | 0 |
| quiz_readings | tabela | ligado | 0 |
| quiz_leads | tabela | ligado | 0 |
| leads_para_contato | view | n/a | `security_invoker=on` |

Sem policy e com RLS ligado, as chaves `anon` e `publishable` não leem nem escrevem nada. A única porta é a service role, usada só nos route handlers. A view herda a permissão de quem consulta, então não é porta lateral.

`SUPABASE_URL` é `https://ysjyppytkrygkqoxgzzb.supabase.co`. Falta só a `SUPABASE_SERVICE_ROLE_KEY` nas envs da Vercel.

### 3. Variáveis de ambiente na Vercel

Em Settings → Environment Variables do projeto, para Production **e** Preview. Coloca tu mesmo: chave de API não deve passar por uma conversa, porque fica registrada nela.

Obrigatórias pro fluxo completo:

| Nome | Origem |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` |
| `OPENAI_API_KEY` | platform.openai.com, só pra transcrição de áudio |
| `SUPABASE_URL` | projeto novo, Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | o mesmo lugar. **Nunca** expor no cliente |

Opcionais, e nada quebra sem elas:

| Nome | Efeito quando vazia |
|---|---|
| `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` | sem rate limit |
| `IP_HASH_SALT` | nenhum IP é guardado, nem em hash |
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel não carrega |
| `NEXT_PUBLIC_GTM_ID` | GTM não carrega |
| `NEXT_PUBLIC_VSL_EMBED_URL` | o bloco do vídeo some em produção |
| `ENGINE_BUDGET_MS` | 48000 |
| `SPOILER_GANCHO` | `auto`, o modelo escolhe o gancho |

## Ordem de execução, depois que o acima estiver pronto

1. `pnpm build` local, que já passa hoje, sem erro nem warning de tipo.
2. Push pro GitHub.
3. Criar o projeto na Vercel a partir do repositório, região `gru1`.
4. Preencher as envs de Preview e Production.
5. Deploy de Preview. Abrir `/api/health` e conferir que devolve `prompt_mae: "ok"`, `anthropic: true`, `supabase: true`.
6. Fazer o fluxo inteiro uma vez com a fixture do Marcelo. No Supabase, conferir que a sessão, as quatro respostas, a leitura e o lead foram gravados, e que a view `leads_para_contato` devolve a linha com a dor literal da P4.
7. Só então promover pra Production.
8. Domínio. Feito em 18/09: `mitobiografia.adrianorahde.com.br`.

## O domínio

Produção atende em dois endereços, os dois válidos:

- `mitobiografia.adrianorahde.com.br`, o de verdade
- `mini-dossie-mitico.vercel.app`, que a Vercel mantém e serve de rota de fuga se o DNS quebrar

O domínio `adrianorahde.com.br` é registrado no Hostinger e a zona DNS mora lá
(`ns1.dns-parking.com`, `ns2.dns-parking.com`). Dois registros sustentam isso:

| tipo | nome | valor | TTL |
| --- | --- | --- | --- |
| TXT | `_vercel` | `vc-domain-verify=mitobiografia.adrianorahde.com.br,bedaff84e56720fed982` | 14400 |
| CNAME | `mitobiografia` | `6a3609bf965e1282.vercel-dns-017.com` | 300 |

O TXT é a prova de posse e fica: apagar ele derruba a verificação na próxima
renovação. O CNAME é o apontamento.

O subdomínio já existia e tinha um `ALIAS mitobiografia → mitobiografia.adrianorahde.com.br.cdn.hstgr.net`,
que servia a "Default page" do Hostinger. Ele foi apagado, e tinha que ser:
o Hostinger recusa CNAME e ALIAS no mesmo nome, com
`RRset ... IN ALIAS must not be used with CNAME on the same name`. Se um dia
o subdomínio precisar voltar pro Hostinger, é esse valor que se recria.

## Headers

Configurados em `next.config.ts`, não no painel:

- `Strict-Transport-Security`, dois anos, com preload.
- `X-Frame-Options: DENY`, global e sem exceção de rota. O brief do planejamento pede exceção na rota do dossiê por causa da VSL, e isso está invertido: esse header governa quem enquadra a nossa página, e o iframe da VSL dentro dela é `frame-src` no CSP.
- `Content-Security-Policy` liberando GTM e Pixel em `script-src`, e YouTube, Vimeo e Panda em `frame-src`. O host de `NEXT_PUBLIC_VSL_EMBED_URL` entra automaticamente no `frame-src` quando a env está preenchida, então **trocar a VSL exige redeploy**, não só salvar a env.
- `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` com microfone liberado só pra própria origem.

## Trocar a VSL depois

1. Setar `NEXT_PUBLIC_VSL_EMBED_URL` em Production.
2. Redeploy. São duas as razões: `NEXT_PUBLIC_*` é inlinada em tempo de build, e o host precisa entrar no `frame-src` do CSP, que também é montado no build.

Nada no código muda.

## Checagem rápida depois de qualquer deploy

```bash
curl -s https://<url>/api/health
```

Devolve, sem jamais expor valor de chave nenhuma:

```json
{"ok":true,"prompt_mae":"ok","anthropic":true,"openai":true,
 "supabase":true,"rate_limit":false,"vsl":false}
```

`prompt_mae: "ausente"` significa que `docs/prompt-mae.md` não subiu junto com a função, e o engine não roda. O arquivo entra pelo `outputFileTracingIncludes` em `next.config.ts`, e a presença dele foi conferida no build local.
