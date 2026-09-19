/**
 * O portão da repescagem, Prompt Mãe Seção 2.
 *
 * Mora sozinho, longe de `read.ts`, e o motivo é peso e não organização. Isto é
 * função pura de texto, roda entre uma pergunta e a outra com o cara parado
 * olhando pra tela, e é a única coisa que a `/api/check-answer` precisa. Quando
 * vivia dentro do engine, aquela rota arrastava junto o provedor, os dois SDKs
 * de modelo e o Prompt Mãe inteiro, e a primeira resposta do fluxo pagava esse
 * carregamento antes de qualquer coisa acontecer.
 */

/** Verbo de ação conjugado, feito por ele. É o sinal de que existe cena. */
const VERBO_DE_ACAO =
  /\b(?:fui|foi|era|eram|estava|estive|tinha|tive|fiz|fez|saí|saiu|falei|falou|disse|contei|contou|nasceu|morreu|comecei|começou|parei|parou|decidi|decidiu|pedi|pediu|mudei|mudou|voltei|voltou|perdi|perdeu|casei|casou|larguei|largou|briguei|brigou|recusei|recusou|aceitei|aceitou|assinei|assinou|entrei|entrou|liguei|ligou|escrevi|escreveu|vendi|vendeu|comprei|comprou|dormia|trabalhava|morava|cuidava)\b/i;

/** Ano, idade ou mês nomeado. */
const MARCA_DE_TEMPO =
  /\b(?:19|20)\d{2}\b|\b\d{1,2}\s+anos\b|\baos\s+\d{1,2}\b|\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i;

/**
 * Todas as marcas de tempo de um texto, sem repetir.
 *
 * O validador usa isto pra conferir a leitura de arco: o Passo 3.5 manda
 * ancorar a relação nas cenas que ele deu, e uma data da Pergunta 1 dentro do
 * bloco do Movimento é exatamente essa âncora. Mora aqui, e não no validador,
 * porque o padrão é o mesmo do portão de repescagem e duas cópias divergiriam.
 */
export function marcasDeTempo(texto: string): string[] {
  const re = new RegExp(MARCA_DE_TEMPO.source, 'gi');
  const achadas = texto.match(re) ?? [];
  const vistas = new Set<string>();
  const fora: string[] = [];
  for (const m of achadas) {
    const k = m.toLowerCase().trim();
    if (vistas.has(k)) continue;
    vistas.add(k);
    fora.push(m.trim());
  }
  return fora;
}

/**
 * Nome próprio que não abre frase: "em Pelotas", "meu sócio Rafa".
 *
 * Um só teste cobre lugar e pessoa, e cobre os dois do jeito que o Prompt Mãe
 * cobra: o que ancora a resposta é o lugar nomeado e a gente nomeada, não o
 * substantivo genérico.
 */
const NOME_PROPRIO = /(?<=[a-zà-ÿ,]\s)(?!De\b|Da\b|Do\b)[A-ZÀ-Ý][a-zà-ÿ]{2,}/u;

/**
 * Devolve true quando repesca.
 *
 * Os três critérios precisam bater juntos, e o primeiro (só P1 e P2) mora no
 * `repescagem` de cada pergunta em `lib/copy.ts`. Aqui rodam os outros dois:
 * resposta curta ou lista sem verbo, e resposta puramente conceitual.
 *
 * A régua que governa tudo isto é "na dúvida, não pergunta", e o normal é zero
 * repescagem no fluxo inteiro. Por isso o portão é uma conjunção e não uma
 * disjunção: qualquer coordenada que apareça, e a resposta passa.
 *
 * DESVIO. O documento escreve "nenhuma pessoa" no terceiro critério, e o
 * exemplo canônico de resposta ruim da própria P1 ("mudança de cidade,
 * falecimento do meu pai, destravamento do autoconhecimento") tem "meu pai"
 * dentro. Lido ao pé da letra, o critério salvaria justamente a resposta que o
 * documento usa como modelo do que repescar. O que se lê aqui é a pessoa que
 * ancora a resposta, quer dizer, a nomeada, porque "meu pai" dentro de uma
 * nominalização sem verbo continua sendo conceito, que é o que "puramente
 * conceitual" quer dizer.
 *
 * A chamada de modelo que existia aqui saiu junto. Ela respondia a pergunta da
 * régua velha ("tem cena?"), que era difusa e por isso precisava de julgamento.
 * A régua nova é contável.
 */
export function precisaRepescagem(texto: string): boolean {
  const limpo = texto.trim();
  const n = limpo.split(/\s+/).filter(Boolean).length;

  const temVerbo = VERBO_DE_ACAO.test(limpo);

  /**
   * Critério 2: menos de umas 25 palavras, ou lista de tópicos sem verbo.
   *
   * O que faz de uma coisa uma lista é o tamanho dos itens, não a quantidade de
   * vírgulas. "Se ele escreveu bastante, não repesca, mesmo que falte uma
   * coordenada": um parágrafo corrido de cinquenta palavras sem verbo de ação
   * tem quatro vírgulas e continua sendo texto, com material de sobra pra
   * leitura. Só a vírgula por régua transformava esse parágrafo em tópico.
   */
  const itens = limpo.split(',').map((p) => p.trim()).filter(Boolean);
  const palavrasPorItem = itens.length > 0 ? n / itens.length : n;
  const listaSemVerbo = itens.length >= 3 && palavrasPorItem <= 5 && !temVerbo;

  const curto = n < 25;
  if (!curto && !listaSemVerbo) return false;

  // Critério 3: puramente conceitual, sem nenhuma coordenada.
  if (temVerbo) return false;
  if (MARCA_DE_TEMPO.test(limpo)) return false;
  if (NOME_PROPRIO.test(limpo)) return false;

  return true;
}
