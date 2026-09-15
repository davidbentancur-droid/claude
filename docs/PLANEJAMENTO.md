# Mini Dossiê Mítico · Planejamento completo do engine

Documento de execução pra Claude Code. Cobre arquitetura, fluxo de telas, engine de leitura (IA), banco, design system, animação do infográfico, VSL placeholder, deploy e testes. Termina com os três briefs de agente (design, deploy, QA).

Fonte de verdade da copy e das regras: **Prompt Mãe · Mini Dossiê Mítico (Quiz de Funil, v0)**, de 14/09/2026. Onde este documento e o Prompt Mãe divergirem em copy ou regra de leitura, o Prompt Mãe vence. Este documento manda só na engenharia, no design e na entrega.

---

## 0. Resumo em uma tela

| Item | Decisão |
|---|---|
| Produto | Quiz de entrada do funil de Mitobiografia (Adriano Rahde). 4 perguntas abertas → spoiler → formulário (4 campos) → dossiê 300–400 palavras + infográfico animado → VSL das 8 sessões |
| Referência de forma | https://mapa.offtheloop.com.br/teste (dark, uma tela por vez, resultado na hora, sem cadastro no início) |
| Stack | Next.js 15 (App Router, TS), Tailwind v4, GSAP, Anthropic API (leitura), OpenAI Audio API (transcrição), Supabase (leads + sessões), Vercel |
| Identidade visual | Dark + dourado, sistema Mitobiografia (Cormorant Garamond / Instrument Serif / Archivo). Infográfico em "placa" creme com o dualtone oficial do método por Ato |
| Domínio sugerido | `leitura.adrianorahde.com.br` (subdomínio no Vercel). Placeholder até definir: `mini-dossie.vercel.app` |
| VSL | Componente `<VslEmbed />` lendo `NEXT_PUBLIC_VSL_EMBED_URL`. Sem URL, renderiza placeholder com poster e texto. Trocar a env var e fazer redeploy quando o vídeo chegar |
| Agentes no Claude Code | 1 design/build, 1 deploy Vercel, 1 QA end-to-end |

---

## 1. Fluxo do usuário, tela por tela

O quiz é uma única rota (`/`) com máquina de estados no cliente. Cada estado ocupa a tela inteira, uma coisa por vez, igual à referência. Nada de barra lateral, nada de menu.

```
[0 Abertura] → [1 Enquadramento] → [2 P1] → [3 P2] → [4 P3] → [5 P4]
      ↑ repescagem (no máximo 1 por pergunta, entre a resposta e a próxima)
→ [6 Lendo…] → [7 Spoiler] → [8 Formulário] → [9 Dossiê + Infográfico + VSL]
Desvios: [R Risco]  [J Piada/teste]  [E Erro]
```

### Tela 0 · Abertura

Uma frase que nomeia o incômodo e um botão. Sem explicar o método, sem citar Jung, sem "descubra seu arquétipo".

Copy (rascunho, Adriano valida):

> **Quatro perguntas. Uma leitura da tua vida com as tuas palavras.**
> Leva uns oito minutos, escrevendo ou falando. A leitura sai na hora.
>
> [Começar]

Abaixo do botão, uma linha pequena: "Nenhum dado é pedido antes da leitura estar pronta."

### Tela 1 · Enquadramento

Texto do Prompt Mãe, colado como está (é "a linha de maior alcance do quiz inteiro"):

> Quatro perguntas, escrevendo ou falando, do jeito que sair. Uma coisa só antes de começar: o que eu preciso aqui é cena, não resumo. Cena é uma coisa que aconteceu num dia, com lugar e gente dentro. "Mudei muito de cidade" é assunto. "Em 2019 eu saí da empresa depois de uma briga com meu sócio e a gente não se falou mais" é cena. Duas cenas bem contadas valem mais que dez tópicos.

Botão: [Entendi, vamos]

### Telas 2 a 5 · As quatro perguntas

Layout idêntico nas quatro: contador discreto ("1 de 4"), a pergunta em display serif grande, o microtexto de apoio em corpo menor, os exemplos "Assim não / Assim sim" (P1 e P2 apenas) num bloco recolhível já aberto, campo de resposta, alternância texto/áudio, botão [Enviar].

Copy literal do Prompt Mãe, sem edição:

**P1 · Os sete anos**
Pergunta: Volta uns sete anos pra trás. Quais foram as duas ou três coisas que mais mudaram a tua vida nesse período?
Apoio: Escolhe duas ou três, e não precisa ser a mais importante, precisa ser uma que tu ainda consegue ver. Pra cada uma me diz quatro coisas: que ano ou idade era, onde tu estava, quem estava junto, e o que tu fez ou falou. Vale coisa boa e vale coisa ruim.
Assim não: mudança de cidade, falecimento do meu pai, destravamento do autoconhecimento.
Assim sim: em 2022 meu pai teve um AVC e eu fui morar dois meses na casa dele, em Pelotas, pra cuidar. Dormia no sofá da sala e não contei pra ninguém do trabalho que eu estava lá.

**P2 · O agora**
Pergunta: E nos últimos meses, o que está acontecendo na tua vida agora?
Apoio: Um dia, uma conversa, uma decisão que tu tomou ou que tu tá adiando. Onde tu estava, quem estava junto, o que foi dito.
Assim não: tenho buscado mais equilíbrio e presença, mas o trabalho consome.
Assim sim: em junho recusei uma proposta de emprego boa e não contei pra minha mulher por três semanas. Ela descobriu quando o cara ligou em casa.

**P3 · A busca e o obstáculo**
Pergunta: O que tu mais tem buscado ultimamente, mesmo sem saber nomear direito? E o que tu sente que está no caminho?
Apoio: Uma frase pra cada. Sem filtrar.
(UI: dois campos empilhados, rótulos "O que tu busca" e "O que está no caminho". Salvos como uma resposta só, concatenada com quebra de linha.)

**P4 · O preço de nada mudar**
Pergunta: Se daqui a dois anos nada disso tiver mudado, o que mais te incomoda de imaginar?
Apoio: Responde com a primeira coisa que vier.

**Entrada por áudio.** Botão de microfone ao lado do campo. Grava com `MediaRecorder` (webm/opus, limite 3 minutos), envia pra `/api/transcribe`, devolve o texto **dentro do campo, editável**, e só então o usuário clica em [Enviar]. O usuário sempre vê e pode corrigir o que foi transcrito antes de mandar. Estado de gravação com timer e onda simples. Se o navegador negar o microfone, o botão some e fica só texto.

**Repescagem (Seção 2 do Prompt Mãe, "Regra de resposta pobre").** Ao enviar P1, P2 ou P4, roda `POST /api/check-answer`. Se voltar `needs_followup: true`, aparece uma tela intermediária, uma vez só por pergunta:

> Só uma coisa antes de seguir. Me dá um dia, um lugar e uma pessoa dentro do que tu contou. [campo] [Enviar]

O texto da repescagem é concatenado à resposta original. Depois disso o fluxo segue, com ou sem cena. P3 nunca tem repescagem (a pergunta é curta por desenho).

### Tela 6 · Lendo

Estado de espera de 10 a 30 segundos enquanto `/api/read` roda. Aqui entra a primeira aparição da espiral: o círculo do método se desenha devagar em dourado sobre o fundo escuro, em loop, sem nomear nada. Uma frase abaixo, trocando a cada 6 segundos, sem "IA", sem "processando":

- "Separando cena de resumo."
- "Procurando o gesto que se repete."
- "Achando as histórias com o mesmo desenho."

### Tela 7 · Spoiler

Texto de 90 a 130 palavras vindo do engine, renderizado como texto corrido em serif, sem título. Abaixo, o CTA com o texto que o próprio spoiler termina ("Quatro campos e ele abre." vira o botão: [Liberar a leitura]).

### Tela 8 · Formulário

Título: **Pra liberar a tua leitura**
Quatro campos, uma tela, todos obrigatórios, todos texto aberto:

| Campo | Input | Microtexto (literal) |
|---|---|---|
| Nome | text | Como tu quer ser chamado no dossiê. |
| WhatsApp | tel, máscara BR `(DD) 9XXXX-XXXX` | É por aqui que eu te procuro, se fizer sentido. Nada de lista de disparo. |
| Profissão | text | O que tu faz hoje pra viver. |
| Orçamento mensal | textarea 2 linhas | Quanto tu consegue destinar por mês pro teu próprio caminho hoje? De R$ 50 a R$ 250, ou tu já tá acostumado (e aberto) com cursos mais avançados e terapias especializadas, na faixa de R$ 500 a R$ 3 mil? Escreve do teu jeito. |

Botão: [Abrir o dossiê]. Nada de "cadastre-se", "enviar", "preencha". Nenhuma menção a preço de produto. Campo honeypot escondido pra bot.

### Tela 9 · Dossiê

Ordem vertical, rolagem normal, largura de leitura (max 640px):

1. Título do dossiê (display serif, dourado)
2. Bloco Devolutiva
3. Bloco O Ato (com subtítulo)
4. **Infográfico animado** (espiral + card do Movimento), ver Seção 6
5. Bloco O Movimento (com subtítulo)
6. Bloco O Arquétipo (com subtítulo)
7. Bloco Fechamento (sem subtítulo, é o parágrafo que emenda no vídeo)
8. **VSL** (`<VslEmbed />`), com uma linha acima, no tom do fechamento, sem título de seção
9. Rodapé mínimo: logo Adriano Rahde, link pra política de privacidade

Sem botão de compra na página. O vídeo faz a oferta. Sem "compartilhar resultado". Sem "refazer o teste".

### Desvios

- **R · Risco.** Se qualquer resposta acionar o filtro de risco (ideação suicida, violência sofrida ou praticada, substância em nível de emergência): interrompe o fluxo. Tela com duas ou três frases humanas geradas reconhecendo o que ele escreveu, o CVV 188 (24 horas, gratuito) com link `tel:188`, e a frase de que este espaço não é o lugar pra isso. Sem dossiê, sem formulário, sem VSL. Sessão marcada `status = 'risk'`.
- **J · Piada / teste do sistema.** Resposta curta com bom humor gerada pelo engine e botão [Refazer com respostas de verdade] que volta pra P1 zerando as respostas.
- **E · Erro técnico.** "A leitura não fechou. Tuas respostas estão guardadas, tenta de novo." Botão [Tentar de novo] que reenvia `/api/read` com a mesma `session_id`. Respostas ficam em `localStorage` e no banco, ele nunca perde o que escreveu.

---

## 2. Arquitetura técnica

```
apps/web (Next.js 15, App Router, TypeScript)
├── app/
│   ├── page.tsx                  ← quiz (máquina de estados, client component)
│   ├── layout.tsx                ← fontes, pixel, GTM, metadata/OG
│   ├── privacidade/page.tsx
│   └── api/
│       ├── session/route.ts      ← POST cria sessão, devolve session_id
│       ├── answer/route.ts       ← POST salva resposta n da sessão
│       ├── check-answer/route.ts ← POST regra de resposta pobre (repescagem)
│       ├── transcribe/route.ts   ← POST áudio → texto
│       ├── read/route.ts         ← POST roda o engine, salva leitura, devolve só o spoiler
│       ├── lead/route.ts         ← POST salva os 4 campos, devolve o dossiê completo
│       └── health/route.ts       ← GET pro QA
├── components/
│   ├── quiz/ (Abertura, Enquadramento, Pergunta, Repescagem, Lendo, Spoiler, Formulario, Dossie, Risco, Piada, Erro)
│   ├── dossie/ (Titulo, Bloco, Infografico, Espiral, CardMovimento, VslEmbed)
│   └── ui/ (Botao, Campo, Textarea, Microfone, Contador)
├── lib/
│   ├── engine/
│   │   ├── system-prompt.ts      ← Prompt Mãe inteiro + contrato JSON
│   │   ├── schema.ts             ← zod do output
│   │   ├── validate.ts           ← regras de estilo, contagem, palavrões banidos
│   │   ├── risk.ts               ← pré-filtro por palavra + flag do LLM
│   │   └── read.ts               ← orquestra chamada, validação, retry
│   ├── movimentos.ts             ← banco dos 20 (slug, nome, ato, frase do card, tem_card)
│   ├── supabase.ts
│   ├── tracking.ts               ← eventos Pixel/GTM
│   └── phone.ts                  ← normalização DDD + 8 dígitos (padrão da casa)
├── public/
│   ├── cards/                    ← arte oficial dos Movimentos, {slug}.webp paisagem
│   ├── fonts/
│   └── og.jpg
└── tests/ (Playwright)
```

### Serviços externos

| Serviço | Uso | Env var |
|---|---|---|
| Anthropic API | Leitura (Prompt Mãe), check de resposta pobre, resposta a piada | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`; testar Opus na Rodada 1 se a leitura sair rasa) |
| OpenAI Audio | Transcrição de áudio (`gpt-4o-transcribe` ou `whisper-1`, `language: pt`) | `OPENAI_API_KEY` |
| Supabase | Sessões, respostas, leituras, leads | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (só no servidor) |
| Vercel | Hosting, edge, envs | — |
| Meta Pixel + GTM | Tracking | `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID` (usar o container da casa, GTM-KCVSJH2W, se Adriano aprovar juntar no mesmo) |
| VSL | Embed | `NEXT_PUBLIC_VSL_EMBED_URL` (vazio = placeholder) |

Nada de chave no cliente. Todas as chamadas a LLM e transcrição passam por route handlers. `runtime = 'nodejs'` nas rotas que usam SDK.

### Segurança e abuso

- Rate limit por IP nas rotas `/api/read` e `/api/transcribe` (Vercel KV ou Upstash Ratelimit: 5 leituras/hora/IP, 20 transcrições/hora/IP).
- Honeypot no formulário. Se preenchido, responde 200 e descarta.
- `session_id` é UUID gerado no servidor e guardado em cookie httpOnly + `localStorage`. `/api/lead` só libera o dossiê se a sessão existir, tiver `reading` salva e `status = 'spoiler_shown'`.
- O dossiê **nunca** vai pro cliente antes do lead. `/api/read` devolve `{ spoiler }` e nada mais.
- Áudio: limite 3 min / 10 MB, aceita só `audio/webm`, `audio/mp4`, `audio/ogg`. Áudio não é persistido, só o texto.

---

## 3. Engine de leitura

### 3.1 Uma chamada, saída estruturada

Uma única chamada gera tudo (análise interna, spoiler, dossiê). Motivo: a regra de honestidade do Prompt Mãe diz que o spoiler só pode afirmar o que o dossiê confirma. Gerar os dois na mesma chamada garante isso por construção. Latência estimada 12 a 25 s, coberta pela Tela 6.

System prompt = o Prompt Mãe inteiro (Seções 1 a 11) + este contrato de saída, apensado ao final:

```
Devolve SOMENTE um JSON válido, sem markdown, sem texto antes ou depois, neste formato:

{
  "triagem": [ { "pergunta": 1, "densidade": 0-3, "recorrencia": 0-3, "carga": 0-3, "agencia": 0-3, "temporalidade": 0-3, "nome": 0-3, "veredito": "string curta" } ×4 ],
  "inventario": { "fatos": ["..."], "expressoes_literais": ["..."] },
  "material_fino": boolean,
  "ato": { "nome": "Partida|Iniciação|Retorno", "posicao": "começo|meio|fim", "fato_sustenta": "..." },
  "movimento": { "numero": 1-20, "nome": "...", "aposta": boolean, "recorrencia_detectada": boolean, "descartados": ["..."] },
  "arquetipos": [ { "nome": "Rei|Guerreiro|Mago|Amante", "direcao": "↑|↓|maduro", "estado": "...", "fala_dele": "..." } ],  // 1 ou 2
  "fortalecer_primeiro": "Rei|Guerreiro|Mago|Amante",
  "ecos": [ { "historia": "...", "fonte": "...", "tradicao": "bíblica|grega|nórdica|egípcia|védica|mesopotâmica|conto popular|matéria da Bretanha" } ],  // exatamente 2
  "pratica": "...",
  "dor_literal": "...",   // resposta da P4, literal
  "spoiler": "...",       // 90 a 130 palavras, gancho: eco OU arquétipo
  "gancho_usado": "eco|arquetipo",
  "dossie": {
    "titulo": "...",
    "devolutiva": "...",
    "ato_subtitulo": "...",
    "ato_texto": "...",
    "movimento_subtitulo": "...",
    "movimento_texto": "...",
    "arquetipo_subtitulo": "...",
    "arquetipo_texto": "...",
    "fechamento": "..."
  },
  "sinalizacao": { "risco": boolean, "risco_motivo": "...", "piada": boolean }
}

O nome que aparece em "dossie" é o placeholder {{NOME}}. O sistema substitui pelo nome que ele der no formulário. Se a profissão conversar com o material, usar o placeholder {{PROFISSAO}} no máximo uma vez, senão não usar.
```

Sobre `{{NOME}}`: a leitura roda antes do formulário, então o nome ainda não existe. O engine escreve com placeholder e `/api/lead` faz a substituição. Se o nome vier vazio (não vem, é obrigatório), cai pra "tu". A concordância é simples porque o nome só entra em vocativo ("Marcelo, em sete anos tu deu...").

`{{PROFISSAO}}` idem, com regra do Prompt Mãe: só entra se conversar com o material, nunca forçado.

Mensagem do usuário na chamada:

```
P1 (os sete anos): <texto + repescagem se houver>
P2 (o agora): <texto>
P3 (busca e obstáculo): <texto>
P4 (o preço de nada mudar): <texto>
```

Parâmetros: `temperature: 0.7`, `max_tokens: 6000`.

### 3.2 Validação pós-geração (`lib/engine/validate.ts`)

O modelo erra estilo mesmo com o Prompt Mãe. Validar em código e mandar de volta com o erro nomeado, até 2 retries. Se falhar 3 vezes, entrega a última versão e loga `validation_failed` com a lista.

Regras duras (bloqueiam):

| Regra | Implementação |
|---|---|
| Dossiê entre 300 e 400 palavras (250 a 320 se `material_fino`) | contagem dos 5 blocos + título |
| Spoiler entre 90 e 130 palavras | contagem |
| Zero travessão | regex `/[—–]/` em todos os campos de texto |
| Zero "não é X, é Y" | regex `/não (é|como|apenas|só|se trata)\b[^.]{0,80},?\s*(é|mas|e sim|e não)\b/i` (calibrar na Rodada 1, falso positivo é aceitável, o retry corrige) |
| Zero jargão | lista: individuação, self, sombra (como termo), coniunctio, katábasis, anagnórise, anagnorisis, inconsciente coletivo, arquétipo junguiano |
| Zero palavras banidas no dossiê | quiz, teste, resultado, clica aqui, garanta sua vaga, não perca, destino, universo |
| Pelo menos 2 citações literais entre aspas no dossiê | conta `"..."` e confere que cada trecho aparece literal em alguma resposta (normalizando espaços e caixa) |
| Ecos são exatamente 2 e de tradições diferentes | `ecos.length === 2 && ecos[0].tradicao !== ecos[1].tradicao` |
| Arquétipos entre 1 e 2, com direção | schema |
| Fechamento contém trecho literal de P4 | `dor_literal` normalizada aparece no `fechamento` |
| Spoiler não vaza | `spoiler` não contém nome do Movimento, nome de nenhum arquétipo (Rei, Guerreiro, Mago, Amante), a palavra "vídeo", nem o texto da prática |
| `movimento.numero` bate com `movimento.nome` | tabela `lib/movimentos.ts` |
| Sem diagnóstico | lista: depressão, ansiedade, TDAH, burnout, trauma, transtorno, terapia como prescrição ("procura um terapeuta") |

Regras suaves (só logam): no máximo 3 subtítulos, título sem dois pontos, prática cabe em uma frase.

### 3.3 Repescagem (`/api/check-answer`)

Primeiro heurística barata, sem LLM:
- menos de 15 palavras → `needs_followup`
- sem nenhum verbo conjugado detectável e com 2+ vírgulas (lista de tópicos) → `needs_followup`

Se a heurística não decidir, chamada curta ao modelo (`max_tokens: 20`): "Esta resposta tem pelo menos uma cena com dia ou ano, lugar e pessoa? Responde só SIM ou NAO." Também roda o pré-filtro de risco aqui (Seção 3.4) pra interromper cedo, sem esperar as quatro.

### 3.4 Risco e piada

- Pré-filtro por lista de termos em `lib/engine/risk.ts` (ideação, método, "me matar", "acabar com tudo", violência doméstica, overdose etc.), roda a cada resposta. Se bater, interrompe na hora e vai pra Tela R, sem chamar o engine completo.
- Flag `sinalizacao.risco` no output do engine como segunda camada.
- `sinalizacao.piada` → Tela J com uma resposta curta gerada (`max_tokens: 120`, tom do Prompt Mãe Seção 8).

### 3.5 Material fino

Se `material_fino`, o dossiê é mais curto e o Movimento vem como aposta declarada. O validador troca a faixa de palavras. O infográfico continua igual, mas o card do Movimento ganha uma linha em corpo menor: "Aposta, pelo pouco que tu contou."

---

## 4. Banco (Supabase)

```sql
create table quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status text not null default 'started',  -- started | answering | reading | spoiler_shown | released | risk | joke | error
  utm jsonb,
  user_agent text,
  ip_hash text
);

create table quiz_answers (
  id bigserial primary key,
  session_id uuid references quiz_sessions(id) on delete cascade,
  pergunta smallint not null check (pergunta between 1 and 4),
  texto text not null,
  repescagem text,
  via text not null default 'texto',  -- texto | audio
  created_at timestamptz default now(),
  unique (session_id, pergunta)
);

create table quiz_readings (
  session_id uuid primary key references quiz_sessions(id) on delete cascade,
  model text,
  output jsonb not null,        -- JSON completo do engine (com placeholders)
  validation jsonb,             -- erros suaves, retries
  latency_ms int,
  created_at timestamptz default now()
);

create table quiz_leads (
  id bigserial primary key,
  session_id uuid unique references quiz_sessions(id),
  nome text not null,
  whatsapp text not null,       -- normalizado: só dígitos, com DDI 55
  whatsapp_raw text not null,
  profissao text not null,
  orcamento_raw text not null,
  orcamento_faixa text,         -- dezenas | centenas | milhares | indefinido (classificação por regex, revisável)
  ato text, movimento text, arquetipo text,   -- desnormalizado pro contato
  dor_literal text,
  created_at timestamptz default now()
);
```

RLS ligado, sem policy pública. Só o service role escreve. Uma view `leads_para_contato` juntando lead + 4 respostas + Ato/Movimento/arquétipo + dor literal, que é exatamente o que o Prompt Mãe diz que fica registrado pro WhatsApp. Exportável em CSV pelo painel do Supabase enquanto a integração com "Pessoas" (pendência 7 do Prompt Mãe) não fecha.

Classificação de `orcamento_faixa` por regex simples (números até 99 → dezenas, 100 a 999 → centenas, 1000+ → milhares, "nada"/"zero" → dezenas com flag). É pra triagem, o humano lê o texto na hora do contato.

---

## 5. Design system

Direção: **dark, dourado, papel**. A página é escura como o resto da marca Adriano Rahde. O dossiê, quando chega, tem que parecer um documento entregue, e o infográfico é a peça onde o método aparece com a paleta própria dele (o dualtone pastel do Prompt Mãe). A solução: a página é escura, o infográfico é uma placa creme com a paleta oficial. O contraste é proposital, é o único ponto de cor da página inteira.

### Tokens

```css
:root {
  /* base */
  --bg:        #0E0C0A;   /* preto quente, não #000 */
  --bg-2:      #161311;   /* superfícies elevadas */
  --ink:       #EDE6D8;   /* texto principal, creme */
  --ink-2:     #A69C8C;   /* texto secundário */
  --gold:      #C9A85C;   /* dourado principal, títulos e traço da espiral */
  --gold-2:    #8C7440;   /* dourado apagado, bordas, estados idle */
  --line:      rgba(201,168,92,0.18);

  /* placa do infográfico (paleta do método, literal do Prompt Mãe) */
  --paper:     #F2E8D5;
  --paper-ink: #1E1B18;
  --partida-a: #A8836B; --partida-b: #7E9BB8;
  --iniciacao-a: #A899C4; --iniciacao-b: #BFC08C;
  --retorno-a: #D8C27A; --retorno-b: #97B392;

  /* tipo */
  --font-display: 'Cormorant Garamond';   /* títulos, perguntas, título do dossiê */
  --font-voice:   'Instrument Serif';     /* citações literais dele, subtítulos do dossiê */
  --font-body:    'Archivo';              /* corpo, microtextos, formulário, botões */
}
```

Cantos retos em tudo (padrão da marca). Sem sombra difusa cinza. Sem gradiente decorativo. Bordas de 1px em `--line`.

### Escala tipográfica

| Papel | Fonte | Tamanho (desktop / mobile) | Peso |
|---|---|---|---|
| Pergunta | Cormorant | 40 / 30px, line-height 1.15 | 500 |
| Título do dossiê | Cormorant | 44 / 32px | 500, cor `--gold` |
| Subtítulo do dossiê | Instrument Serif itálico | 24 / 21px | 400 |
| Corpo do dossiê | Archivo | 18 / 17px, line-height 1.65, max 640px | 400 |
| Citação literal dele (entre aspas) | Instrument Serif itálico, cor `--gold` | herda | 400 |
| Microtexto / apoio | Archivo | 15px, cor `--ink-2` | 400 |
| Botão | Archivo | 16px | 500 |

As citações literais do usuário renderizam em itálico dourado. É o único destaque tipográfico do dossiê, e ele carrega significado (são as palavras dele). Implementar com um parser simples que envolve trechos entre aspas duplas em `<q>`.

### Componentes

- **Botão primário**: fundo `--gold`, texto `--bg`, sem borda, sem ícone, sem seta. Hover escurece 8%. Desabilitado: `--gold-2` com opacidade.
- **Campo de texto**: fundo `--bg-2`, borda 1px `--line`, foco em `--gold`. Textarea autoexpansível, mínimo 4 linhas.
- **Botão de microfone**: círculo de 44px com borda `--gold-2`. Gravando: preenche em `--gold` e pulsa devagar (2 s). Tempo ao lado.
- **Contador "1 de 4"**: Archivo 13px, `--ink-2`, canto superior esquerdo. Sem barra de progresso.
- **Transição entre telas**: uma só, fade de 300 ms com deslocamento vertical de 12px. Sem animações de entrada em cada parágrafo do dossiê.

### O que não fazer (checagem do agente de design)

- Eyebrow em caixa alta acima de cada título.
- Uma palavra destacada em cor dentro do título.
- Cards com border-radius e sombra.
- Barra de progresso.
- Emoji nos títulos ou nos arquétipos dentro do texto (👑⚔️🔮🌹 ficam de fora da UI, o Prompt Mãe usa só na tabela interna).
- Botão de compra ou countdown.
- Ícone de "IA" ou menção a inteligência artificial em qualquer tela.

---

## 6. Infográfico animado

Um SVG inline, animado com GSAP (`DrawSVGPlugin` é pago, então usar `stroke-dasharray`/`stroke-dashoffset` manual). Dispara **uma vez**, quando a placa entra 60% no viewport (`IntersectionObserver`). Se `prefers-reduced-motion`, renderiza o estado final direto.

### Geometria (viewBox 0 0 720 420)

```
   Placa creme 720x420, dualtone do Ato como tinta.

   ┌──────────────────────────────────┬───────────────────────────┐
   │        ESPIRAL (esq, 360px)      │   CARD DO MOVIMENTO       │
   │                                  │   (dir, 320px, paisagem)  │
   │        ○ círculo seguinte        │                           │
   │        ↑ seta rompendo a borda   │   [arte oficial webp]     │
   │   ┌────┼────┐                    │   Nome do Movimento       │
   │   │Par.│Ret.│  ← metade de cima  │   Frase do card           │
   │   ├────┴────┤                    │                           │
   │   │Iniciação│  ← metade de baixo │                           │
   │   └─────────┘   (bloco denso)    │                           │
   └──────────────────────────────────┴───────────────────────────┘
```

Regras do Prompt Mãe que o SVG tem que cumprir: linha horizontal corta o círculo ao meio; metade de baixo é bloco único mais escuro (Iniciação); metade de cima dividida por linha vertical em Partida (esq) e Retorno (dir); seta sai do quarto do Retorno, rompe a borda e sobe pra um círculo seguinte, menor, acima. O quarto/metade do Ato dele aceso e nomeado, os outros em opacidade 0.25. Marca pequena (ponto) na posição dentro do Ato: começo, meio ou fim, distribuída ao longo do arco daquele setor.

### Sequência (total ~4,5 s)

| t | O que acontece | Easing |
|---|---|---|
| 0.0 → 1.2 s | Círculo se desenha (dashoffset 100→0) em `--paper-ink` | power2.inOut |
| 1.0 → 1.6 s | Linha horizontal, depois vertical, se desenham | power2.out |
| 1.6 → 2.2 s | Os três setores ganham preenchimento em opacidade baixa (0.12) | linear |
| 2.2 → 2.9 s | O setor do Ato dele sobe pra opacidade 1 com o dualtone (gradiente A→B), o nome do Ato aparece por fade dentro do setor | power3.out |
| 2.9 → 3.3 s | O ponto de posição aparece com um pulso único (scale 0→1.3→1) | back.out |
| 3.3 → 4.0 s | Seta sai do Retorno, atravessa a borda e sobe; o círculo seguinte se desenha em opacidade 0.5 | power2.inOut |
| 3.8 → 4.5 s | Card do Movimento entra à direita (fade + 8px de deslocamento), nome em Cormorant, frase em Archivo | power2.out |

Depois disso, nada se move. Nenhum loop, nenhum brilho.

### Card do Movimento

`lib/movimentos.ts` mapeia os 20 pra `{ numero, nome, slug, ato, frase_card, tem_card }`. Se `tem_card` for `true`, renderiza `/public/cards/{slug}.webp` (arte oficial, paisagem). Se `false`, renderiza só o nome em tipografia sobre a placa, sem improvisar imagem (regra literal do Prompt Mãe). A pendência 8 do Prompt Mãe é levantar quais cards existem; até lá, `tem_card: false` em todos e o Davi vai ligando um a um conforme recebe a arte do Adriano.

Mobile: a placa vira duas linhas (espiral em cima, card embaixo), viewBox 0 0 360 560, mesma sequência.

Exportar: botão pequeno abaixo da placa, "Guardar a imagem", que rasteriza o SVG final em PNG 2x via canvas. Serve pro cara mandar no WhatsApp e é o único elemento de compartilhamento da página.

---

## 7. VSL placeholder

```tsx
// components/dossie/VslEmbed.tsx
const url = process.env.NEXT_PUBLIC_VSL_EMBED_URL;
if (!url) return <VslPlaceholder />;   // poster 16:9 escuro, borda --line, texto: "O vídeo entra aqui." (só em preview; em produção sem URL, esconder o bloco inteiro e logar warning no build)
return <iframe src={url} ... />          // YouTube unlisted, Vimeo, Panda, VTurb: todos por iframe
```

Acima do embed, uma linha em Archivo 15px, `--ink-2`, sem título: "A leitura inteira, em capítulos, começa aqui." (Adriano pode trocar. Nada de preço, sessões, nome de produto, isso é o vídeo.)

Evento `vsl_view` quando o iframe entra no viewport, `vsl_play` se o player expuser a API (YouTube/Vimeo expõem; Panda/VTurb têm data-layer próprio, integrar depois).

Quando a VSL chegar: setar `NEXT_PUBLIC_VSL_EMBED_URL` no Vercel (Production), redeploy. Nada no código muda.

---

## 8. Tracking

Eventos, disparados via `lib/tracking.ts` pra `dataLayer` (GTM) e `fbq` (Pixel):

| Evento | Quando |
|---|---|
| `quiz_start` | clique em [Começar] |
| `quiz_q{n}_sent` | cada pergunta enviada (com `via: texto|audio`) |
| `quiz_followup_shown` | repescagem apareceu |
| `quiz_reading_start` / `quiz_reading_done` | entrada/saída da Tela 6 (com `latency_ms`) |
| `quiz_spoiler_view` | Tela 7 |
| `quiz_form_view` | Tela 8 |
| `quiz_form_field_{campo}` | foco em cada campo (mede abandono campo a campo, pendência 3 do Prompt Mãe) |
| `quiz_lead` → Pixel `Lead` | lead salvo |
| `quiz_dossie_view` | Tela 9 |
| `quiz_infografico_done` | animação terminou |
| `vsl_view` / `vsl_play` | ver Seção 7 |
| `quiz_risk` / `quiz_joke` / `quiz_error` | desvios |

UTMs capturadas na Tela 0 e gravadas em `quiz_sessions.utm`.

---

## 9. Ordem de execução no Claude Code

Um repositório, três agentes, nesta ordem. O agente de design entrega a aplicação funcionando local. O de deploy sobe. O de QA testa a URL de produção e devolve um relatório. Se o QA reprovar, volta pro design com a lista.

Antes de rodar qualquer agente, criar na raiz o `CLAUDE.md` abaixo e colocar o Prompt Mãe em `docs/prompt-mae.md` (texto integral, sem editar).

### `CLAUDE.md`

```markdown
# Mini Dossiê Mítico

Quiz de entrada do funil de Mitobiografia (Adriano Rahde). Leia primeiro:
- docs/PLANEJAMENTO.md (este documento inteiro)
- docs/prompt-mae.md (fonte de verdade da copy e das regras de leitura; nunca reescrever)

Regras que não se negociam:
- Toda copy voltada ao usuário vem do Prompt Mãe ou da Seção 1 do planejamento. Não inventar texto de tela.
- Tratamento por "tu", português brasileiro.
- Zero travessão em qualquer texto de UI ou gerado.
- O dossiê nunca chega ao cliente antes do lead ser salvo.
- Nenhuma chave de API no cliente.
- Cantos retos, sem sombra difusa, sem gradiente decorativo, sem emoji na UI.
- Não adicionar botão de compra, countdown, escassez ou preço em lugar nenhum.

Stack: Next.js 15 App Router, TypeScript strict, Tailwind v4, GSAP, Supabase, Anthropic SDK, OpenAI SDK, Playwright.
Comandos: `pnpm dev`, `pnpm build`, `pnpm test:e2e`.
```

### Agente 1 · Design e build

```
Você é o agente de design e construção do Mini Dossiê Mítico. Leia CLAUDE.md, docs/PLANEJAMENTO.md e docs/prompt-mae.md antes de escrever qualquer arquivo.

Entregue a aplicação completa e funcionando em `pnpm dev`, seguindo o planejamento seção por seção:

1. Scaffold Next.js 15 (App Router, TS strict, Tailwind v4, pnpm). Fontes Cormorant Garamond, Instrument Serif e Archivo via next/font (self-hosted). Tokens da Seção 5 em globals.css.
2. Máquina de estados do quiz (Seção 1) com todas as telas, incluindo os desvios R, J e E. Persistência em localStorage + cookie de sessão. Copy literal, sem improviso.
3. Entrada por áudio com MediaRecorder, transcrição editável antes do envio, fallback pra texto quando o microfone é negado.
4. Route handlers da Seção 2. Engine da Seção 3 com system prompt = Prompt Mãe integral + contrato JSON, zod schema, validate.ts com todas as regras duras, retry até 2, risk.ts com pré-filtro.
5. Migrations do Supabase (Seção 4) em supabase/migrations, RLS ligado, view leads_para_contato.
6. Página do dossiê com parser de citações (<q> em itálico dourado), VslEmbed com placeholder controlado por env (Seção 7).
7. Infográfico SVG animado com GSAP exatamente na sequência da Seção 6, com IntersectionObserver, reduced-motion e versão mobile. lib/movimentos.ts com os 20 Movimentos e tem_card=false em todos.
8. Tracking da Seção 8 com Pixel e GTM lendo das envs, sem quebrar quando as envs estão vazias.
9. .env.example com todas as variáveis, README curto de setup.

Processo de design: antes de codar UI, escreva em docs/DESIGN-NOTES.md um plano de tokens, tipo e layout com wireframe ASCII de cada tela, revise contra a lista "O que não fazer" da Seção 5, e só então construa. Ao terminar cada tela, tire screenshot (desktop 1440 e mobile 390) com Playwright e critique: uma coisa memorável (o infográfico), tudo o resto quieto.

Fixture obrigatória: crie tests/fixtures/marcelo.json com as quatro respostas do caso do Anexo 11.1 do Prompt Mãe. Rode o engine contra ele e confira que sai Iniciação, Prova (9), Rei ↓ e Guerreiro ↓, e que o validador passa. Se o modelo sair de outro jeito, ajuste o contrato JSON ou os parâmetros, nunca o Prompt Mãe.

Não faça deploy. Não crie contas. Ao terminar, liste em docs/HANDOFF.md o que está pronto, o que depende de env, e qualquer decisão que você tomou fora do planejamento.
```

### Agente 2 · Deploy Vercel

```
Você é o agente de deploy do Mini Dossiê Mítico. Leia CLAUDE.md e docs/HANDOFF.md.

1. Confirme que `pnpm build` passa local sem warnings de tipo.
2. Crie o projeto na Vercel a partir do repositório (Git ou `vercel` CLI, o que estiver disponível), framework Next.js, root `.`, região gru1 (São Paulo).
3. Configure as envs de Production e Preview: ANTHROPIC_API_KEY, ANTHROPIC_MODEL, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_GTM_ID, NEXT_PUBLIC_VSL_EMBED_URL (vazia por enquanto), KV/Upstash do rate limit. Peça ao usuário cada valor que não estiver no ambiente; nunca invente.
4. Aplique as migrations no projeto Supabase de produção (via CLI `supabase db push` ou pelo MCP). Confira RLS ligado em todas as tabelas.
5. Deploy de Preview primeiro. Abra a URL, faça o fluxo inteiro uma vez com a fixture do Marcelo, confira no Supabase que a sessão, as 4 respostas, a leitura e o lead foram gravados. Só então promova pra Production.
6. Configure o domínio quando o usuário informar (sugestão: leitura.adrianorahde.com.br). Até lá, entregue a URL .vercel.app.
7. Verifique os headers: HSTS, X-Frame-Options DENY (exceto a rota do dossiê, que precisa permitir o iframe da VSL), Content-Security-Policy permitindo os domínios de vídeo, Pixel e GTM.
8. Escreva docs/DEPLOY.md com URLs, IDs do projeto, região, lista de envs (só nomes) e o passo a passo pra trocar a VSL depois: setar NEXT_PUBLIC_VSL_EMBED_URL e redeploy.

Não altere código de UI ou engine. Se algo quebrar no build, registre em docs/DEPLOY.md e devolva pro agente de design.
```

### Agente 3 · QA end-to-end

```
Você é o agente de QA do Mini Dossiê Mítico. Leia CLAUDE.md, docs/PLANEJAMENTO.md, docs/prompt-mae.md e docs/DEPLOY.md. Teste a URL de produção com Playwright e escreva docs/QA-REPORT.md com aprovado/reprovado por item, screenshot de cada tela e o que corrigir.

Fluxos:
A. Caminho feliz, texto: fixture marcelo.json. Confira cada tela na ordem da Seção 1, o spoiler entre 90 e 130 palavras, o formulário antes do dossiê, o dossiê usando o nome dado, o infográfico com Iniciação aceso e "Prova" no card, a VSL (ou o bloco escondido se a env estiver vazia).
B. Caminho feliz, áudio: envie um arquivo de áudio curto na P2, confira que o texto transcrito aparece editável antes de enviar.
C. Repescagem: responda P1 com "mudança de cidade, falecimento do meu pai, autoconhecimento" e confira que a tela de repescagem aparece uma vez e não aparece na segunda tentativa.
D. Material fino: quatro respostas curtas mesmo após repescagem. Dossiê entre 250 e 320 palavras, Movimento como aposta, infográfico com a linha "Aposta, pelo pouco que tu contou".
E. Risco: resposta com sinal de ideação. Fluxo interrompido, tela com CVV 188 e link tel:, sem formulário, sem dossiê, sessão com status risk no banco.
F. Piada: "sou o Batman e moro em Gotham". Tela J com botão de refazer que zera as respostas.
G. Portão: tente chamar /api/lead sem sessão válida, e /api/read duas vezes na mesma sessão. Ambos devem falhar limpos. Confirme por inspeção de rede que nenhuma resposta antes de /api/lead contém o texto do dossiê.
H. Validação de estilo: em 5 leituras geradas com fixtures variadas, confira zero travessão, zero "não é X, é Y", pelo menos 2 citações literais, fechamento com trecho literal da P4, ecos de tradições diferentes, Movimento e Ato fora do spoiler.
I. Design: screenshots 1440 e 390 de todas as telas. Reprove se encontrar qualquer item da lista "O que não fazer" da Seção 5. Contraste mínimo AA em texto sobre --bg e sobre --paper. Foco visível no teclado. Reduced motion mostra o infográfico no estado final sem animar.
J. Performance: Lighthouse mobile na Tela 0 e na Tela 9. LCP < 2,5 s, CLS < 0,1. Fontes sem flash.
K. Tracking: com a env do Pixel preenchida, confira no console que quiz_start, quiz_lead e quiz_dossie_view disparam. Sem a env, nada quebra.
L. Rate limit: 6 chamadas a /api/read do mesmo IP em uma hora, a sexta responde 429 com mensagem em português.

Critério de aprovação: A, E, G, H e I sem reprovação. Qualquer reprovação nesses cinco volta pro agente de design com a lista exata.
```

---

## 10. Testes e fixtures

`tests/fixtures/`:
- `marcelo.json`: caso do Anexo 11.1 (Iniciação, Prova, Rei ↓, Guerreiro ↓, recorrência em 2019/2022/junho).
- `fino.json`: quatro respostas de 10 palavras.
- `partida.json`: proposta concreta na mesa, hesitação declarada (esperado: Partida, provavelmente Recusa ou Chamado).
- `retorno.json`: crise já passou, "voltei e nada encaixa" (esperado: Retorno).
- `risco.json`, `piada.json`, `so-outra-pessoa.json` (fala só da mulher, nunca dele).
- `agencia-zero.json`: tudo no passivo (esperado: leitura nomeia isso pela gramática dele, Rei ↓).

`tests/engine.spec.ts` roda o engine contra cada fixture 3 vezes e reporta Ato/Movimento/arquétipo por rodada, pra ver a variância. Esse relatório é o insumo da pendência 1 do Prompt Mãe (comparar quiz com leitura completa em casos reais).

---

## 11. Decisões em aberto (pra Adriano e Davi)

Técnicas:
1. Modelo do engine: Sonnet 4.6 é o default por custo e latência. Se a Rodada 1 sair rasa, testar Opus 5 só na chamada principal.
2. Transcrição: OpenAI é o default. Alternativa é Deepgram (mais barato em volume, PT-BR bom). Decidir depois de 200 áudios.
3. Rate limit: Vercel KV vs Upstash. Tanto faz, o agente de deploy escolhe pelo que já existir na conta.
4. Domínio final.
5. Container do GTM: juntar no GTM-KCVSJH2W ou criar um novo pro quiz.

Do Prompt Mãe (Seção 12), que o engine já deixa preparado:
- Sete anos ou dois setênios na P1: o texto da pergunta está em um único arquivo (`lib/copy.ts`), trocar é uma linha.
- Ordem do campo de orçamento no formulário: `quiz_form_field_*` já mede o abandono por campo.
- Gancho do spoiler (eco vs arquétipo): `gancho_usado` fica salvo em `quiz_readings.output`, dá pra cruzar com conversão de lead. Se quiser forçar alternância em blocos, uma flag `SPOILER_GANCHO=eco|arquetipo|auto` no env.
- Dossiê por e-mail: pediria quinto campo, fora desta versão.
- Integração com "Pessoas": a view `leads_para_contato` é o contrato; webhook pra Notion/n8n entra numa segunda fase.
- Cards dos Movimentos: `tem_card` por Movimento em `lib/movimentos.ts`.

---

## 12. Pré-requisitos antes de rodar os agentes

- [ ] Prompt Mãe salvo como `docs/prompt-mae.md`, texto integral
- [ ] Este documento salvo como `docs/PLANEJAMENTO.md`
- [ ] Chave Anthropic, chave OpenAI, projeto Supabase criado (ou usar o MCP conectado)
- [ ] Projeto Vercel na conta certa
- [ ] Pixel ID e GTM ID (ou deixar vazio e ligar depois)
- [ ] Aprovação do Adriano na copy da Tela 0 e na linha acima da VSL (são as duas únicas frases fora do Prompt Mãe)
- [ ] Arte dos cards dos Movimentos, os que existirem, em `public/cards/{slug}.webp` paisagem
