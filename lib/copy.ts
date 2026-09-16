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
 * Duas coisas aqui merecem registro. A linha "Nenhum dado é pedido antes da
 * leitura estar pronta", do planejamento Seção 1, saiu: o Prompt Mãe manda colar
 * as duas telas inteiras e não inventar linha, e o CLAUDE.md diz que onde os
 * dois divergem em copy o Prompt Mãe vence. E o título vem partido em duas
 * chamadas porque são dezessete palavras: numa linha só, no corpo de display, o
 * cara lê cinco linhas de manchete antes de qualquer outra coisa. As palavras e
 * a ordem são as do documento.
 */
export const ABERTURA = {
  titulo: 'Quatro perguntas sobre a tua vida.',
  linha: 'No fim, a leitura do capítulo exato em que tu está.',
  paragrafos: [
    'É pra quem olha pra própria vida e vê as coisas acontecendo sem conseguir dizer o que está acontecendo. Decisão travada há meses, um cansaço que dormir não resolve, a sensação de já ter passado por isso antes.',
    'Tu sai daqui sabendo: em que ponto da travessia tu está, qual é a armadilha desse ponto e qual é o convite dele, o gesto que a tua vida vem repetindo há anos sem tu reparar, e duas histórias de três mil anos atrás que contam exatamente o que tu vive hoje.',
  ],
  botao: 'Começar',
  rodape: 'Uns oito minutos, escrevendo ou falando.',
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

export type NumeroPergunta = 1 | 2 | 3 | 4;

export type Pergunta = {
  numero: NumeroPergunta;
  titulo: string;
  pergunta: string;
  apoio: string;
  exemplos: { nao: string; sim: string } | null;
  /** P3 tem dois campos empilhados, salvos concatenados com quebra de linha. */
  campos: { chave: string; rotulo: string }[] | null;
  /**
   * Primeiro critério do portão de repescagem, Prompt Mãe Seção 2: só P1 e P2.
   * As P3 e P4 pedem frase, não cena, e nunca são repescadas.
   *
   * Isto sozinho não libera a pergunta. Os outros dois critérios rodam em
   * `lib/engine/read.ts`, e a cota de uma repescagem no fluxo inteiro é contada
   * na máquina de estados.
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
    titulo: 'A busca e o obstáculo',
    pergunta:
      'O que tu mais tem buscado ultimamente, mesmo sem saber nomear direito? E o que tu sente que está no caminho?',
    apoio: 'Uma frase pra cada. Sem filtrar.',
    exemplos: null,
    campos: [
      { chave: 'busca', rotulo: 'O que tu busca' },
      { chave: 'obstaculo', rotulo: 'O que está no caminho' },
    ],
    repescagem: false,
  },
  {
    numero: 4,
    titulo: 'O preço de nada mudar',
    pergunta:
      'Se daqui a dois anos nada disso tiver mudado, o que mais te incomoda de imaginar?',
    apoio: 'Responde com a primeira coisa que vier.',
    exemplos: null,
    campos: null,
    /**
     * Sem repescagem. O Prompt Mãe Seção 2 agora crava isto no primeiro critério
     * do portão, e o planejamento Seção 1, que pedia o contrário, perde.
     *
     * A razão é do desenho da pergunta: a repescagem pede "um dia, um lugar e uma
     * pessoa dentro do que tu contou", e a P4 pergunta sobre um futuro que não
     * aconteceu, então não existe cena pra pedir. O apoio da própria pergunta
     * manda responder com a primeira coisa que vier, e a triagem do caso canônico
     * (Prompt Mãe 11.2) dá Densidade 1 na P4 com o veredito "suficiente pro
     * fechamento", com 13 palavras, bem abaixo do piso de 25.
     *
     * O que a P4 precisa entregar é a dor na palavra dele, e isso ela entrega
     * curta. O protocolo de material fino cobre o caso de vir vazia demais.
     */
    repescagem: false,
  },
] as const;

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
