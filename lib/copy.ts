/**
 * Toda a copy voltada ao usuário vive aqui.
 *
 * Origem de cada bloco está marcada. O que vem do Prompt Mãe é literal e não se
 * edita sem editar `docs/prompt-mae.md` antes. O que vem do planejamento está
 * marcado como rascunho e depende de aprovação do Adriano.
 *
 * Regra da casa: zero travessão em qualquer string deste arquivo.
 */

/**
 * Tela 1 · A oferta. Prompt Mãe Seção 2, copy fixa, colada como está.
 *
 * A régua das duas telas: esta promete só o que o dossiê entrega, nunca explica
 * o método, nunca usa "quiz" nem "arquétipo", nunca pede dado nenhum.
 *
 * A linha "Nenhum dado é pedido antes da leitura estar pronta", do planejamento
 * Seção 1, saiu: o Prompt Mãe manda colar as duas telas inteiras e não inventar
 * linha, e o CLAUDE.md diz que onde os dois divergem em copy o Prompt Mãe vence.
 *
 * Três níveis de texto, e os três são do documento. O `heading` é a manchete de
 * venda que a versão de 18/09 acrescentou. O `titulo` e a `linha` são as duas
 * metades da promessa curta, partidas só por tipografia: numa linha só, no
 * corpo de display, viram cinco linhas de manchete antes de qualquer outra
 * coisa. As palavras e a ordem são as do documento.
 */
export const ABERTURA = {
  heading:
    'Descubra em que Ato da tua vida tu está, e qual é o próximo passo pra seguir com mais coragem',
  titulo: 'Três perguntas sobre a tua vida.',
  linha: 'No fim, a leitura do capítulo exato em que tu está.',
  paragrafos: [
    'É pra quem olha pra própria vida e vê as coisas acontecendo sem conseguir dizer o que está acontecendo. Decisão travada há meses, um cansaço que dormir não resolve, a sensação de já ter passado por isso antes.',
    'Tu sai daqui sabendo: em que ponto da travessia tu está, qual é a armadilha desse ponto e qual é o convite dele, o gesto que a tua vida vem repetindo há anos sem tu reparar, e dois mitos ancestrais, milenares (um deles pode ser menos conhecido), que contam exatamente o que tu vive hoje.',
  ],
  botao: 'Começar',
  rodape: 'Uns cinco minutos, escrevendo ou falando.',
} as const;

/**
 * Tela 2 · Como responder. Prompt Mãe Seção 2, copy fixa.
 *
 * Ela nunca repete a promessa da Tela 1: o trabalho dela é só a forma da
 * resposta. A ênfase em "cena" é do próprio documento, que escreve a palavra em
 * negrito, e é a linha de maior alcance do quiz inteiro.
 */
export const ENQUADRAMENTO = {
  paragrafos: [
    'Uma coisa só antes de começar, e é ela que decide se a leitura vai ser sobre ti ou sobre qualquer um: me dá cena, não resumo. Cena é o que aconteceu num dia, com lugar e gente dentro.',
    '"Mudei muito de cidade" é assunto. "Em 2019 eu saí da empresa depois de uma briga com meu sócio e a gente não se falou mais" é cena.',
    'Duas cenas bem contadas valem mais que dez tópicos. Escreve ou fala, do jeito que sair.',
  ],
  enfase: 'cena',
  botao: 'Entendi, vamos',
} as const;

/** O que o cara vê: três telas de pergunta. */
export type NumeroPergunta = 1 | 2 | 3;

/**
 * Onde a resposta é gravada. São quatro, e não três, de propósito.
 *
 * O Prompt Mãe de 18/09 fundiu as antigas P3 e P4 numa tela só, mas continua
 * chamando a dor de "Pergunta 4" na Seção 4.3, na Seção 6 e no item 11 do
 * checklist, porque ela tem trabalho próprio: é a matéria-prima obrigatória do
 * último parágrafo, o que emenda na VSL.
 *
 * Então a tela é uma e o armazenamento é dois. A terceira pergunta grava a
 * busca e o obstáculo como resposta 3, e o preço de nada mudar como resposta 4.
 * Isso mantém a dor num campo próprio no banco, que é como a view
 * `leads_para_contato` a entrega pro WhatsApp, e mantém a âncora do fechamento
 * conferível no validador.
 */
export type NumeroArmazenado = 1 | 2 | 3 | 4;

export type CampoPergunta = {
  chave: string;
  rotulo: string;
  /** Em qual resposta este campo é gravado. Campos com o mesmo número são juntados. */
  guardaEm: NumeroArmazenado;
};

export type Pergunta = {
  numero: NumeroPergunta;
  titulo: string;
  pergunta: string;
  apoio: string;
  exemplos: { nao: string; sim: string } | null;
  /** Campos empilhados numa tela só. Null quando a tela tem um campo único. */
  campos: CampoPergunta[] | null;
  /**
   * Primeiro critério do portão de repescagem, Prompt Mãe Seção 2: só P1 e P2.
   * A P3 pede frase, não cena, e nunca é repescada.
   *
   * Isto sozinho não libera a pergunta. Os outros dois critérios rodam em
   * `lib/engine/repescagem.ts`, e a cota de uma repescagem no fluxo inteiro é
   * contada na máquina de estados.
   */
  repescagem: boolean;
};

/**
 * Prompt Mãe Seção 2, literal.
 *
 * Pendência 2 do Prompt Mãe: decidir se a P1 pede sete anos ou dois setênios.
 * Trocar é uma linha, a de `pergunta` logo abaixo.
 */
export const PERGUNTAS: readonly Pergunta[] = [
  {
    numero: 1,
    titulo: 'Os sete anos',
    pergunta:
      'Volta uns sete anos pra trás. Quais foram as duas ou três coisas que mais mudaram a tua vida nesse período?',
    apoio:
      'Escolhe duas ou três, e não precisa ser a mais importante, precisa ser uma que tu ainda consegue ver. Pra cada uma me diz quatro coisas: que ano ou idade era, onde tu estava, quem estava junto, e o que tu fez ou falou. Vale coisa boa e vale coisa ruim.',
    exemplos: {
      nao: 'mudança de cidade, falecimento do meu pai, destravamento do autoconhecimento.',
      sim: 'em 2022 meu pai teve um AVC e eu fui morar dois meses na casa dele, em Pelotas, pra cuidar. Dormia no sofá da sala e não contei pra ninguém do trabalho que eu estava lá.',
    },
    campos: null,
    repescagem: true,
  },
  {
    numero: 2,
    titulo: 'O agora',
    pergunta: 'E nos últimos meses, o que está acontecendo na tua vida agora?',
    apoio:
      'Um dia, uma conversa, uma decisão que tu tomou ou que tu tá adiando. Onde tu estava, quem estava junto, o que foi dito.',
    exemplos: {
      nao: 'tenho buscado mais equilíbrio e presença, mas o trabalho consome.',
      sim: 'em junho recusei uma proposta de emprego boa e não contei pra minha mulher por três semanas. Ela descobriu quando o cara ligou em casa.',
    },
    campos: null,
    repescagem: true,
  },
  {
    numero: 3,
    titulo: 'A busca, o obstáculo e o preço de nada mudar',
    pergunta:
      'O que tu mais tem buscado ultimamente, mesmo sem saber nomear direito? O que tu sente que está no caminho? E se daqui a dois anos nada disso tiver mudado, o que mais te incomoda de imaginar?',
    apoio: 'Uma frase pra cada uma das três partes. Sem filtrar.',
    exemplos: null,
    campos: [
      { chave: 'busca', rotulo: 'O que tu busca', guardaEm: 3 },
      { chave: 'obstaculo', rotulo: 'O que está no caminho', guardaEm: 3 },
      { chave: 'preco', rotulo: 'O que te incomoda imaginar daqui a dois anos', guardaEm: 4 },
    ],
    /**
     * Sem repescagem. O Prompt Mãe Seção 2 crava isto no primeiro critério do
     * portão, e o planejamento Seção 1, que pedia o contrário, perde.
     *
     * A razão é do desenho da pergunta: a repescagem pede "um dia, um lugar e
     * uma pessoa dentro do que tu contou", e as três partes desta tela pedem
     * frase, não cena. A terceira pergunta sobre um futuro que não aconteceu,
     * então não existe cena pra pedir. O apoio manda responder sem filtrar, e a
     * triagem do caso canônico (Prompt Mãe 11.2) dá Densidade 0 e 1 aqui com o
     * veredito de que basta.
     *
     * O que esta tela precisa entregar são três frases curtas na palavra dele,
     * e isso ela entrega curta. O protocolo de material fino cobre o caso de
     * vir vazia demais.
     */
    repescagem: false,
  },
];

/** Em quais respostas esta pergunta é gravada, na ordem. */
export function armazenamentoDa(p: Pergunta): NumeroArmazenado[] {
  if (!p.campos) return [p.numero as NumeroArmazenado];
  const vistos: NumeroArmazenado[] = [];
  for (const c of p.campos) if (!vistos.includes(c.guardaEm)) vistos.push(c.guardaEm);
  return vistos;
}

/**
 * Junta os campos preenchidos na tela nas respostas que vão pro banco.
 *
 * Campos que dividem o mesmo `guardaEm` viram uma resposta só, coladas com
 * quebra de linha, que é como o engine já lia a antiga P3 de dois campos.
 */
export function agruparCampos(p: Pergunta, partes: string[]): Map<NumeroArmazenado, string> {
  const saida = new Map<NumeroArmazenado, string>();

  if (!p.campos) {
    saida.set(p.numero as NumeroArmazenado, partes[0]?.trim() ?? '');
    return saida;
  }

  p.campos.forEach((campo, i) => {
    const valor = (partes[i] ?? '').trim();
    if (valor.length === 0) return;
    const anterior = saida.get(campo.guardaEm);
    saida.set(campo.guardaEm, anterior ? `${anterior}\n${valor}` : valor);
  });

  return saida;
}

/** O caminho de volta: o que já está gravado vira o valor inicial dos campos. */
export function espalharCampos(
  p: Pergunta,
  respostas: Record<string, string>,
): string[] {
  if (!p.campos) return [respostas[String(p.numero)] ?? ''];

  const linhasPorResposta = new Map<NumeroArmazenado, string[]>();
  for (const n of armazenamentoDa(p)) {
    linhasPorResposta.set(n, (respostas[String(n)] ?? '').split('\n'));
  }

  return p.campos.map((campo) => {
    const fila = linhasPorResposta.get(campo.guardaEm);
    return fila?.shift() ?? '';
  });
}

export const EXEMPLOS_ROTULO = {
  nao: 'Assim não',
  sim: 'Assim sim',
} as const;

/**
 * Repescagem. Prompt Mãe Seção 2.
 *
 * Uma no fluxo inteiro, no máximo, e o normal é zero. Perguntar de novo a cada
 * resposta arrasta o quiz, cansa o cara e faz ele desistir antes do formulário.
 */
export const REPESCAGEM = {
  texto:
    'Só uma coisa antes de seguir. Me dá um dia, um lugar e uma pessoa dentro do que tu contou.',
  botao: 'Enviar',
} as const;

/** Tela 6. Sem "IA", sem "processando". Planejamento Seção 1. */
export const LENDO = {
  frases: [
    'Separando cena de resumo.',
    'Procurando o gesto que se repete.',
    'Achando as histórias com o mesmo desenho.',
  ],
  intervaloMs: 6000,
} as const;

/** Tela 7. O texto do spoiler vem do engine. Só o botão é nosso. */
export const SPOILER = {
  botao: 'Liberar a leitura',
} as const;

/** Tela 8. Microtextos literais do Prompt Mãe Seção 4.2. */
export const FORMULARIO = {
  titulo: 'Pra liberar a tua leitura',
  botao: 'Abrir o dossiê',
  enviando: 'Abrindo',
  campos: {
    nome: {
      rotulo: 'Nome',
      micro: 'Como tu quer ser chamado no dossiê.',
    },
    whatsapp: {
      rotulo: 'WhatsApp',
      micro: 'É por aqui que eu te procuro, se fizer sentido. Nada de lista de disparo.',
    },
    profissao: {
      rotulo: 'Profissão',
      micro: 'O que tu faz hoje pra viver.',
    },
    orcamento: {
      rotulo: 'Orçamento mensal',
      micro:
        'Quanto tu consegue destinar por mês pro teu próprio caminho hoje? De R$ 50 a R$ 250, ou tu já tá acostumado (e aberto) com cursos mais avançados e terapias especializadas, na faixa de R$ 500 a R$ 3 mil? Escreve do teu jeito.',
    },
  },
  erros: {
    nome: 'Escreve o nome que tu quer ver no dossiê.',
    whatsapp: 'Preciso do DDD e do número.',
    profissao: 'Escreve o que tu faz hoje pra viver.',
    orcamento: 'Escreve do teu jeito, mesmo que seja pouco.',
    geral: 'Alguma coisa não passou. Confere os campos e tenta de novo.',
  },
} as const;

/** Tela 9. A linha acima da VSL. Planejamento Seção 7. Aprovada pelo Adriano. */
export const VSL = {
  linha: 'A leitura inteira, em capítulos, começa aqui.',
  placeholder: 'O vídeo entra aqui.',
  /**
   * Os dois botões abaixo do vídeo, pedidos pelo David em 18/09.
   *
   * O preenchido vai pro WhatsApp do Adriano. O vazado não é um "sair": ele
   * leva pro downsell, que é a segunda oferta. Por isso ele existe e por isso
   * não pode parecer um botão de fechar.
   *
   * Esta copy não vem do Prompt Mãe, vem da instrução do David, e fica marcada
   * assim pra quando o Adriano revisar.
   */
  botaoSim: 'Quero saber mais sobre a mentoria',
  botaoNao: 'Não, obrigado',
} as const;

/**
 * Downsell. Rascunho a partir da instrução do David em 18/09, pendente de
 * aprovação do Adriano.
 *
 * A regra da casa proíbe botão de compra, escassez e preço no dossiê, e isso
 * continua valendo lá. Aqui é outra página e outra oferta, pedida explicitamente
 * como downsell, então a régua é a de uma página de venda. Mesmo assim: sem
 * contagem regressiva, sem preço na copy, sem promessa de resultado.
 */
export const DOWNSELL = {
  titulo: 'Espere aqui!',
  linha: 'Esta oferta existe só nesta página.',
  /**
   * Sem o nome do produto em lugar nenhum da página, por pedido do David em
   * 18/09. Quem apresenta a oferta é o vídeo, e nomear o produto antes dele
   * entrega a resposta antes da pergunta.
   *
   * Por isso a linha de apoio fala do que a coisa é, e não de como ela se
   * chama. O nome também sai do título da aba e da rota, que é `/oferta`.
   */
  apoio:
    'Antes de tu ir, tem uma segunda porta. Mais curta, mais barata, e pela mesma lente que tu acabou de ler.',
  botao: 'Quero aproveitar a oferta',
  placeholder: 'O vídeo da oferta entra aqui.',
  voltar: 'Voltar pro meu dossiê',
} as const;

/**
 * As três descrições de Ato, transcritas da arte oficial da espiral.
 *
 * Não é copy nova: são exatamente as palavras que o Adriano desenhou dentro do
 * arquivo. Elas vivem aqui porque no celular a arte é reduzida a um terço, e o
 * texto que está desenhado nela fica com quatro pixels e meio, que é ilegível.
 * Como texto de verdade ele fica no tamanho do corpo, dá pra selecionar, o
 * leitor de tela lê, e o Ato dele pode ficar aceso enquanto os outros dois
 * apagam, que é o que a Seção 7 pede e a imagem sozinha não entrega.
 */
export const ATOS_DESCRICAO = {
  Partida:
    'O chamado aparece com nome e custo. Seguir exige abrir mão de algo importante, e é aí que a hesitação começa.',
  Iniciação:
    'A crise já está em curso. A estrutura antiga é destruída, questionada ou limpada à força, e ainda não existe saída visível.',
  Retorno:
    'A pior parte passou, e a volta é pra um lugar que já não é o mesmo. O trabalho agora é integrar o que mudou.',
} as const;

export const INFOGRAFICO = {
  exportar: 'Guardar a imagem',
  aposta: 'Aposta, pelo pouco que tu contou.',
  atos: { Partida: 'Partida', Iniciação: 'Iniciação', Retorno: 'Retorno' },
} as const;

/** Desvio R. Prompt Mãe Seção 8. As frases de reconhecimento vêm do engine. */
export const RISCO = {
  fallback:
    'O que tu escreveu aqui é sério e merece uma pessoa do outro lado, agora. Eu não sou esse lugar.',
  cvvChamada: 'O CVV atende 24 horas, de graça, no 188.',
  cvvNumero: '188',
  cvvHref: 'tel:188',
  fechamento: 'Este espaço não é o lugar pra isso.',
} as const;

/** Desvio J. Prompt Mãe Seção 8. O texto com humor vem do engine. */
export const PIADA = {
  fallback: 'Boa. Mas com essas respostas eu não consigo ler nada da tua vida.',
  botao: 'Refazer com respostas de verdade',
} as const;

/** Desvio E. Planejamento Seção 1. */
export const ERRO = {
  texto: 'A leitura não fechou. Tuas respostas estão guardadas, tenta de novo.',
  botao: 'Tentar de novo',
} as const;

export const RODAPE = {
  privacidade: 'Política de privacidade',
  marca: 'Adriano Rahde',
} as const;

export const CONTADOR = (n: number, total: number) => `${n} de ${total}`;

/** Microfone. Nada aqui pode virar menção a transcrição automática ou IA. */
export const AUDIO = {
  gravar: 'Falar em vez de escrever',
  gravando: 'Gravando',
  parar: 'Parar',
  processando: 'Passando pro texto',
  erro: 'O áudio não passou. Escreve aí que funciona igual.',
  limite: 'Três minutos é o limite por resposta.',
  revisar: 'Confere o texto antes de enviar, dá pra corrigir.',
} as const;
