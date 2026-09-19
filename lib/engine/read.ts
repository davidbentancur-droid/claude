import { env } from '../env';
import {
  instrucaoCorrecao,
  montarAnaliseParaEscrita,
  montarRespostas,
} from './contract';
import { provedor, type Chamada, type Esforco } from './provedor';
import {
  AnaliseSchema,
  LeituraMinimaSchema,
  SaidaDossieSchema,
  type Analise,
  type DossieLeitura,
  type Leitura,
} from './schema';
import { systemAnalise, systemDossie } from './system-prompt';
import {
  mensagensDeErro,
  validarAnalise,
  validarDossie,
  type Respostas,
  type Resultado,
} from './validate';

/**
 * Orquestra as chamadas, a validação e o retry. Planejamento Seção 3.
 *
 * A leitura é feita em duas passadas. A primeira decide tudo (Ato, Movimento,
 * arquétipos, ecos, prática) e escreve o spoiler. A segunda recebe essa análise
 * fechada e só redige o dossiê.
 *
 * O corte existe por causa do teto de 60 s da função serverless. Numa passada
 * só, o modelo gastava o orçamento inteiro decidindo e sobrava uma tentativa mal
 * aparada pro texto: medido na fixture do Marcelo, 492 palavras contra um teto
 * de 420, em três rodadas seguidas. Separado, cada metade tem 60 s próprios, e a
 * chamada 2 roda enquanto o cara preenche o formulário, então o tempo dela sai
 * de graça.
 *
 * A regra de honestidade do Prompt Mãe Seção 4.1, "o spoiler só pode afirmar o
 * que o dossiê confirma", continua valendo por construção. Antes valia porque os
 * dois saíam da mesma passada. Agora vale porque os dois saem da mesma análise,
 * e o contrato da chamada 2 proíbe reabrir qualquer decisão.
 */

/**
 * O planejamento fixa 6000. Está em 16000 porque nos modelos Claude 5 o
 * raciocínio adaptativo conta dentro do `max_tokens`, e corte por limite vira
 * JSON truncado: falha no parse e queima um retry sem sinal claro. Aconteceu em
 * 16000. Como a chamada é por streaming, um teto alto não traz risco de timeout,
 * e só é cobrado o que for usado.
 */
const MAX_TOKENS = 32000;

/**
 * `temperature` foi removido na família Claude 5 e devolve 400. O planejamento
 * pedia 0.7, que é parâmetro da geração anterior. O controle equivalente hoje é
 * o esforço, que regula profundidade de raciocínio e gasto de token.
 *
 * `medium` e não `high`, e isso foi medido, não escolhido por gosto: contra a
 * fixture do Marcelo, `high` leva de 108 a 126 segundos e `medium` leva 29, com
 * análise idêntica nas duas (mesmo Ato, mesmo Movimento, mesma recorrência,
 * mesmos arquétipos, mesmos ecos). Quatro vezes o tempo sem diferença de
 * leitura não se paga, ainda mais contra um teto de 60 s.
 *
 * Se a Rodada 1 mostrar leitura rasa em casos reais, subir aqui é uma env.
 */
const ESFORCO = (process.env.ENGINE_EFFORT ?? 'medium') as Esforco;

/**
 * O retry roda em esforço baixo de propósito.
 *
 * Ele não refaz a análise: a instrução de correção manda manter o Ato, o
 * Movimento, os arquétipos e os ecos já escolhidos, porque o que quebrou foi a
 * escrita. Aparar palavras e trocar uma construção é trabalho mecânico, e em
 * `medium` cada chamada custa uns 30 segundos, o que não cabe duas vezes dentro
 * do teto de 60 s do plano Hobby. Em `low` cabe.
 */
const ESFORCO_RETRY: Esforco = 'low';

/**
 * Raciocínio adaptativo ligado ou desligado.
 *
 * É a maior fonte de variância de latência: com ele ligado a mesma fixture
 * levou de 29 a 126 segundos. Contra um teto rígido de 60 s, imprevisibilidade
 * custa mais que lentidão, porque o caso ruim não é lento, é erro na cara do
 * usuário com a leitura pronta e paga do outro lado.
 */
const PENSAR = (process.env.ENGINE_THINKING ?? 'adaptive') !== 'disabled';

/**
 * Quantas tentativas cada metade tem, e por que são números diferentes.
 *
 * A chamada 1 é a latência que o cara sente na tela, uns 30 s. Cada retry ali
 * custa o tempo dele, então três é o teto.
 *
 * A chamada 2 roda enquanto ele preenche os quatro campos do formulário, quer
 * dizer, num tempo que ele já ia gastar de qualquer jeito. Ali retry é de
 * graça, e o conserto de tamanho é justamente o que precisa de mais de uma
 * passada: medido, as tentativas 1 e 2 cortam pouco e a 3 e a 4 é que fazem o
 * dossiê caber. Quatro tentativas dão uns 30 s, dentro dos 40 s que
 * `/api/lead` espera e longe do teto de 60 s da função.
 */
const MAX_TENTATIVAS_ANALISE = 3; // 1 mais 2 retries
const MAX_TENTATIVAS_DOSSIE = 4; // 1 mais 3 retries, de graça

/**
 * Orçamento de tempo do conjunto de tentativas.
 *
 * A função tem `maxDuration = 60` no plano Hobby da Vercel. Três chamadas de 20
 * segundos estouram isso, e o pior jeito de estourar é no último retry: a
 * leitura estava pronta e válida o bastante desde a primeira passada, e o
 * usuário recebe erro. Antes de cada retry a gente checa se dá tempo, e se não
 * der, entrega o que tem e loga. Dossiê com um deslize de estilo é melhor que
 * tela de erro.
 *
 * Em plano Pro, subir `maxDuration` e esta env juntos.
 */
const ORCAMENTO_MS = Number(process.env.ENGINE_BUDGET_MS ?? 48_000);

export type ResultadoLeitura = {
  leitura: Leitura;
  model: string;
  latency_ms: number;
  tentativas: number;
  validacao: {
    ok: boolean;
    duras: string[];
    suaves: string[];
    /** True quando esgotou os retries e a gente entregou assim mesmo. */
    entregue_com_falha: boolean;
  };
};

export class DesvioError extends Error {
  constructor(
    readonly tipo: 'risco' | 'piada',
    readonly texto: string,
  ) {
    super(`desvio:${tipo}`);
    this.name = 'DesvioError';
  }
}

/* ------------------------------------------------------------------ */
/* Parse                                                               */
/* ------------------------------------------------------------------ */

/**
 * Extrai o primeiro objeto JSON balanceado do texto. O modelo às vezes embrulha
 * em cerca de markdown ou escreve uma linha antes, mesmo com o contrato pedindo
 * pra não fazer isso. Regex de cerca não cobre todos os casos, contagem de
 * chaves com consciência de string cobre.
 */
export function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf('{');
  if (inicio === -1) throw new Error('A resposta do modelo não trouxe JSON.');

  let profundidade = 0;
  let dentroDeString = false;
  let escapado = false;

  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];

    if (escapado) {
      escapado = false;
      continue;
    }
    if (c === '\\') {
      escapado = true;
      continue;
    }
    if (c === '"') {
      dentroDeString = !dentroDeString;
      continue;
    }
    if (dentroDeString) continue;

    if (c === '{') profundidade++;
    else if (c === '}') {
      profundidade--;
      if (profundidade === 0) {
        return JSON.parse(texto.slice(inicio, i + 1));
      }
    }
  }

  throw new Error('O JSON da resposta veio truncado.');
}

function tentarExtrair(bruto: string): unknown {
  try {
    return extrairJson(bruto);
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* O laço de tentativa, compartilhado pelas duas chamadas               */
/* ------------------------------------------------------------------ */

type Passo<T> = {
  system: string;
  primeiraMensagem: string;
  /** Devolve o valor tipado, ou a lista de erros de contrato. */
  parse: (cru: unknown) => { ok: true; valor: T } | { ok: false; erros: string[] };
  validar: (valor: T) => Resultado;
  esforco: Esforco;
  orcamentoMs: number;
  maxTentativas: number;
  /**
   * Gancho da chamada 1. Roda antes do parse estrito e permite sair do laço
   * quando o modelo sinaliza risco ou piada, que é quando o Prompt Mãe manda
   * parar o fluxo e cobrar dossiê completo vira trabalho jogado fora.
   */
  desvio?: (cru: unknown) => void;
};

type Saida<T> = {
  valor: T;
  model: string;
  latency_ms: number;
  tentativas: number;
  validacao: ResultadoLeitura['validacao'];
};

async function rodar<T>(passo: Passo<T>): Promise<Saida<T>> {
  const comeco = Date.now();
  const motor = provedor();
  const model = `${motor.nome}:${motor.modelo}`;

  const mensagens: Chamada['mensagens'] = [
    { role: 'user', content: passo.primeiraMensagem },
  ];

  let ultimo: T | null = null;
  let ultimoResultado: Resultado | null = null;
  let tentativas = 0;
  let duracaoMedia = 0;

  for (let i = 0; i < passo.maxTentativas; i++) {
    const decorrido = Date.now() - comeco;

    // Da segunda tentativa em diante, só segue se couber no orçamento. O retry
    // roda em esforço baixo, então custa bem menos que a chamada que o
    // antecedeu: estimar pelo tempo dela cheio bloquearia retries que cabem.
    const estimativa = duracaoMedia * (i === 1 ? 0.6 : 1) * 1.2;

    if (i > 0 && decorrido + estimativa > passo.orcamentoMs) {
      console.warn('[engine] orçamento de tempo esgotado, entregando o que tem', {
        decorrido,
        tentativas: i,
      });
      break;
    }

    tentativas = i + 1;
    const antes = Date.now();

    const msg = await motor.chamar({
      system: passo.system,
      mensagens,
      maxTokens: MAX_TOKENS,
      esforco: i === 0 ? passo.esforco : ESFORCO_RETRY,
      pensar: PENSAR,
      json: true,
    });

    const duracao = Date.now() - antes;
    duracaoMedia = duracaoMedia === 0 ? duracao : (duracaoMedia + duracao) / 2;

    if (msg.truncou) {
      throw new Error('A resposta estourou o limite de tokens antes de fechar o JSON.');
    }

    const bruto = msg.texto;
    const cru = tentarExtrair(bruto);

    passo.desvio?.(cru);

    const parsed = passo.parse(cru);

    if (!parsed.ok) {
      if (i === passo.maxTentativas - 1) {
        throw new Error(`O JSON não bateu com o contrato: ${parsed.erros.join('; ')}`);
      }
      mensagens.push({ role: 'assistant', content: bruto });
      mensagens.push({ role: 'user', content: instrucaoCorrecao(parsed.erros) });
      continue;
    }

    ultimo = parsed.valor;
    ultimoResultado = passo.validar(parsed.valor);

    if (ultimoResultado.ok) {
      return {
        valor: parsed.valor,
        model,
        latency_ms: Date.now() - comeco,
        tentativas,
        validacao: {
          ok: true,
          duras: [],
          suaves: ultimoResultado.suaves.map((f) => f.regra),
          entregue_com_falha: false,
        },
      };
    }

    if (i < passo.maxTentativas - 1) {
      mensagens.push({ role: 'assistant', content: bruto });
      mensagens.push({
        role: 'user',
        content: instrucaoCorrecao(mensagensDeErro(ultimoResultado)),
      });
    }
  }

  // Esgotou os retries. Planejamento Seção 3.2: entrega a última versão e loga.
  if (ultimo === null || ultimoResultado === null) {
    throw new Error('A chamada não fechou em nenhuma das tentativas.');
  }

  return {
    valor: ultimo,
    model,
    latency_ms: Date.now() - comeco,
    tentativas,
    validacao: {
      ok: false,
      duras: ultimoResultado.duras.map((f) => f.regra),
      suaves: ultimoResultado.suaves.map((f) => f.regra),
      entregue_com_falha: true,
    },
  };
}

function errosDeContrato(issues: readonly { path: PropertyKey[]; message: string }[]): string[] {
  return issues.slice(0, 8).map((e) => `${e.path.map(String).join('.')}: ${e.message}`);
}

/* ------------------------------------------------------------------ */
/* Chamada 1 · análise e spoiler                                        */
/* ------------------------------------------------------------------ */

function instrucaoGancho(): string {
  const g = env.spoilerGancho;
  if (g === 'auto') return '';
  return `\n\nNesta leitura, o gancho do spoiler é ${
    g === 'eco' ? 'o eco' : 'o arquétipo'
  }. Marca "gancho_usado" como "${g}".`;
}

export type ResultadoAnalise = Omit<Saida<Analise>, 'valor'> & { analise: Analise };

export async function gerarAnalise(respostas: Respostas): Promise<ResultadoAnalise> {
  const saida = await rodar<Analise>({
    system: systemAnalise(),
    primeiraMensagem: montarRespostas(respostas) + instrucaoGancho(),
    esforco: ESFORCO,
    orcamentoMs: ORCAMENTO_MS,
    maxTentativas: MAX_TENTATIVAS_ANALISE,

    // Risco e piada saem antes do parse estrito: o Prompt Mãe manda parar o
    // fluxo, então cobrar spoiler de 90 palavras aqui é cobrar texto que vai
    // pro lixo.
    desvio: (cru) => {
      const minima = LeituraMinimaSchema.safeParse(cru);
      if (!minima.success) return;
      if (!minima.data.sinalizacao.risco && !minima.data.sinalizacao.piada) return;

      // Quando o JSON inteiro veio bom mesmo com a sinalização, deixa o fluxo
      // normal seguir: o chamador lê `sinalizacao` e decide.
      if (AnaliseSchema.safeParse(cru).success) return;

      throw new DesvioError(
        minima.data.sinalizacao.risco ? 'risco' : 'piada',
        minima.data.sinalizacao.risco
          ? minima.data.sinalizacao.risco_motivo
          : minima.data.spoiler,
      );
    },

    parse: (cru) => {
      const p = AnaliseSchema.safeParse(cru);
      return p.success
        ? { ok: true, valor: p.data }
        : { ok: false, erros: errosDeContrato(p.error.issues) };
    },

    validar: (a) =>
      a.sinalizacao.risco || a.sinalizacao.piada
        ? { ok: true, duras: [], suaves: [] }
        : validarAnalise(a, respostas),
  });

  const { valor, ...resto } = saida;
  return { analise: valor, ...resto };
}

/* ------------------------------------------------------------------ */
/* Chamada 2 · o dossiê                                                 */
/* ------------------------------------------------------------------ */

/**
 * Esforço da escrita, separado do da análise.
 *
 * São trabalhos diferentes e o corte em duas chamadas é o que permite dar régua
 * própria pra cada um. A análise é decisão e tolera esforço baixo porque o
 * resultado dela se provou estável em toda rodada. A escrita é onde a disciplina
 * de contagem mora.
 *
 * `medium` fixo e não herdado de `ENGINE_EFFORT` de propósito. Produção roda a
 * análise em `minimal` por causa dos 60 s, e antes do corte a escrita era
 * arrastada junto pra lá. Agora a chamada 2 tem orçamento próprio e gasta 23 a
 * 28 s dos 60 dela, então economizar esforço aqui seria economizar na única
 * metade que ainda erra.
 */
const ESFORCO_DOSSIE = (process.env.ENGINE_EFFORT_DOSSIE ?? 'medium') as Esforco;

const ORCAMENTO_DOSSIE_MS = Number(
  process.env.ENGINE_BUDGET_DOSSIE_MS ?? process.env.ENGINE_BUDGET_MS ?? 48_000,
);

export type ResultadoDossie = Omit<Saida<DossieLeitura>, 'valor'> & {
  dossie: DossieLeitura;
  contagem_declarada: number;
};

export async function escreverDossie(
  respostas: Respostas,
  analise: Analise,
): Promise<ResultadoDossie> {
  let declarada = 0;

  const saida = await rodar<DossieLeitura>({
    system: systemDossie(),
    primeiraMensagem: montarAnaliseParaEscrita(respostas, analise),
    esforco: ESFORCO_DOSSIE,
    orcamentoMs: ORCAMENTO_DOSSIE_MS,
    maxTentativas: MAX_TENTATIVAS_DOSSIE,

    parse: (cru) => {
      const p = SaidaDossieSchema.safeParse(cru);
      if (!p.success) return { ok: false, erros: errosDeContrato(p.error.issues) };
      declarada = p.data.contagem;
      return { ok: true, valor: p.data.dossie };
    },

    validar: (d) => validarDossie(d, analise, respostas),
  });

  const { valor, ...resto } = saida;
  return { dossie: valor, contagem_declarada: declarada, ...resto };
}

/* ------------------------------------------------------------------ */
/* As duas juntas                                                       */
/* ------------------------------------------------------------------ */

/**
 * Roda as duas chamadas em sequência e devolve a leitura montada.
 *
 * Em produção ninguém chama isto: a graça do corte é justamente a chamada 2
 * rodar depois, enquanto o cara preenche o formulário. Quem usa é o script de
 * fixture, que precisa da leitura inteira pra comparar com o Anexo 11.
 */
export async function gerarLeitura(respostas: Respostas): Promise<ResultadoLeitura> {
  const comeco = Date.now();
  const a = await gerarAnalise(respostas);

  if (a.analise.sinalizacao.risco || a.analise.sinalizacao.piada) {
    throw new DesvioError(
      a.analise.sinalizacao.risco ? 'risco' : 'piada',
      a.analise.sinalizacao.risco
        ? a.analise.sinalizacao.risco_motivo
        : a.analise.spoiler,
    );
  }

  const d = await escreverDossie(respostas, a.analise);

  return {
    leitura: { ...a.analise, dossie: d.dossie },
    model: a.model,
    latency_ms: Date.now() - comeco,
    tentativas: a.tentativas + d.tentativas,
    validacao: {
      ok: a.validacao.ok && d.validacao.ok,
      duras: [...a.validacao.duras, ...d.validacao.duras],
      suaves: [...a.validacao.suaves, ...d.validacao.suaves],
      entregue_com_falha:
        a.validacao.entregue_com_falha || d.validacao.entregue_com_falha,
    },
  };
}

