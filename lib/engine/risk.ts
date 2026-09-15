/**
 * Pré-filtro de risco. Prompt Mãe Seção 8, planejamento Seção 3.4.
 *
 * Roda a cada resposta, antes de gastar uma chamada do engine, pra interromper
 * cedo. É a primeira de duas camadas. A segunda é `sinalizacao.risco` no output
 * do modelo, que pega o que uma lista de palavras nunca pega.
 *
 * A lista aqui é deliberadamente estreita, de alta precisão. Motivo: um falso
 * positivo mata o funil de um lead legítimo e mostra uma tela de emergência pra
 * quem falou de briga no trabalho. Um falso negativo cai na segunda camada. Os
 * dois erros não custam a mesma coisa, então a rede larga fica com o modelo.
 */

export type Risco = {
  risco: boolean;
  /** Só pra log e triagem interna. Nunca vai pra tela. */
  categoria: 'ideacao' | 'autolesao' | 'violencia' | 'substancia' | null;
  termo: string | null;
};

const SEM_RISCO: Risco = { risco: false, categoria: null, termo: null };

type Padrao = { re: RegExp; categoria: Risco['categoria'] };

/**
 * Ideação. "matar" sozinho não entra: "matar a saudade", "matando o tempo" e
 * "matar no peito" são uso corrente. Só entra quando o objeto é ele mesmo.
 */
const IDEACAO: Padrao[] = [
  { re: /\bsuic[ií]d\w*/i, categoria: 'ideacao' },
  { re: /\bme\s+mat(?:ar|o|ei|asse|aria)\b/i, categoria: 'ideacao' },
  { re: /\bmatar\s+(?:a\s+)?mim\b/i, categoria: 'ideacao' },
  { re: /\btirar\s+a\s+(?:minha\s+)?(?:própria\s+)?vida\b/i, categoria: 'ideacao' },
  { re: /\bp[ôo]r\s+um\s+fim\s+(?:n|em\s+)?(?:a\s+)?minha\s+vida\b/i, categoria: 'ideacao' },
  { re: /\bnão\s+quero\s+mais\s+(?:viver|acordar|existir)\b/i, categoria: 'ideacao' },
  { re: /\bn[ãa]o\s+aguento\s+mais\s+viver\b/i, categoria: 'ideacao' },
  { re: /\bvontade\s+de\s+(?:morrer|sumir\s+de\s+vez|desaparecer\s+de\s+vez)\b/i, categoria: 'ideacao' },
  { re: /\bpreferia\s+(?:estar\s+)?morto\b/i, categoria: 'ideacao' },
  { re: /\bmelhor\s+(?:se\s+eu\s+)?(?:morrer|estivesse\s+morto)\b/i, categoria: 'ideacao' },
  { re: /\bdar\s+um\s+fim\s+em\s+mim\b/i, categoria: 'ideacao' },
];

const AUTOLESAO: Padrao[] = [
  { re: /\bautomutila\w*/i, categoria: 'autolesao' },
  { re: /\bme\s+cort(?:ar|o|ei|ava)\b/i, categoria: 'autolesao' },
  { re: /\bme\s+machuc(?:ar|o|ei)\s+de\s+prop[óo]sito\b/i, categoria: 'autolesao' },
];

/**
 * Violência sofrida ou praticada. "bati" sozinho fica de fora por causa de
 * "bati o carro" e "bati de frente com ele".
 */
const VIOLENCIA: Padrao[] = [
  { re: /\bviol[êe]ncia\s+dom[ée]stica\b/i, categoria: 'violencia' },
  { re: /\bestupr\w*/i, categoria: 'violencia' },
  { re: /\babus(?:o|ei|ou|ada|ado)\s+sexual\w*/i, categoria: 'violencia' },
  { re: /\bapanh(?:ei|ava|ando)\s+d(?:o|a|e)\b/i, categoria: 'violencia' },
  { re: /\bmeu\s+(?:pai|padrasto|irmão)\s+me\s+bat(?:ia|eu)\b/i, categoria: 'violencia' },
  { re: /\bbati\s+n(?:a|o)\s+(?:minha|meu|meus|minhas)\s+(?:mulher|filho|filha|esposa|namorada|filhos)\b/i, categoria: 'violencia' },
  { re: /\bencostei\s+a\s+m[ãa]o\s+n(?:a|o)\b/i, categoria: 'violencia' },
  { re: /\bmedida\s+protetiva\b/i, categoria: 'violencia' },
];

/**
 * Substância em nível de emergência. Uso recreativo declarado não entra, e
 * "bebo socialmente" muito menos.
 */
const SUBSTANCIA: Padrao[] = [
  { re: /\boverdose\b/i, categoria: 'substancia' },
  { re: /\bcracol[âa]ndia\b/i, categoria: 'substancia' },
  { re: /\bn[ãa]o\s+consigo\s+parar\s+de\s+(?:beber|usar|cheirar|fumar\s+pedra)\b/i, categoria: 'substancia' },
  { re: /\bbebo\s+(?:todo\s+dia|todos\s+os\s+dias|desde\s+cedo|pra\s+dormir)\b/i, categoria: 'substancia' },
  { re: /\bapaguei\s+de\s+b[êe]bado\b/i, categoria: 'substancia' },
  { re: /\bsurto\s+(?:psic[óo]tico|por\s+droga)\b/i, categoria: 'substancia' },
];

const PADROES: Padrao[] = [...IDEACAO, ...AUTOLESAO, ...VIOLENCIA, ...SUBSTANCIA];

/** Checa uma resposta só. Chamado a cada envio, antes do engine. */
export function checarRisco(texto: string): Risco {
  if (!texto || texto.trim().length === 0) return SEM_RISCO;

  for (const { re, categoria } of PADROES) {
    const achado = re.exec(texto);
    if (achado) {
      return { risco: true, categoria, termo: achado[0] };
    }
  }

  return SEM_RISCO;
}

/** Checa o conjunto. Usado antes de montar a chamada do engine. */
export function checarRiscoConjunto(textos: string[]): Risco {
  for (const t of textos) {
    const r = checarRisco(t);
    if (r.risco) return r;
  }
  return SEM_RISCO;
}
