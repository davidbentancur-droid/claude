import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { COOKIE_PAINEL, senhaDoPainel, tokenValido } from '@/lib/painel/sessao';

import { Dossie } from '@/components/quiz/Dossie';
import type { Ato } from '@/lib/movimentos';
import { caminhoDoCard, movimentoPorNumero } from '@/lib/movimentos';
import type { DossiePublico } from '@/lib/render';

/**
 * Preview do dossiê. Existe em desenvolvimento e em deploy de preview, nunca em
 * produção.
 *
 * Serve pra revisar tipografia e a animação do infográfico sem gastar chamada de
 * engine, pro QA conferir design sem depender de chave de API, e pro Adriano ver
 * o dossiê montado antes de aprovar a copy. Em produção responde 404, porque o
 * dossiê ali é texto de referência e não a leitura de ninguém.
 *
 * Query: ?ato=Partida|Iniciação|Retorno  &movimento=1..20  &posicao=começo|meio|fim  &aposta=1
 *
 * O texto abaixo é o dossiê do Anexo 11.5 do Prompt Mãe, que é referência de
 * forma. Ele nunca sai daqui: dossiê de usuário é sempre gerado.
 */

const TEXTO = {
  titulo: 'Três vezes a mesma porta fechada',
  devolutiva:
    'Marcelo, em sete anos tu deu três fatos: a saída da empresa em 2019 depois da briga com teu cunhado, a filha em 2021, e os dois meses em Pelotas dormindo no sofá da casa do teu pai. No agora tu deu junho: recusou a proposta e ficou três semanas sem contar pra tua mulher, até o cara ligar em casa. E resumiu tudo em duas frases, "queria parar de acordar apertado" e "eu não consigo pedir nada pra ninguém".',
  ato_subtitulo: 'Onde tu está',
  ato_texto:
    'Tu está no meio da Iniciação. A prova já começou, ela está na consultoria que tu toca sozinho e no sustento que depende só de ti, e tu ainda não sabe por onde sai. A armadilha desse lugar, na tua versão exata, é aguentar calado achando que contar piora. Foi o que tu fez em junho por três semanas, e a conta chegou pela pior via, com um telefone tocando em casa. O convite é o oposto e é pequeno: deixar uma pessoa saber o tamanho real da coisa enquanto ela ainda está acontecendo.',
  movimento_subtitulo: 'O gesto que voltou três vezes',
  movimento_texto:
    'O Movimento do teu momento é a Prova, ser testado num lugar onde ninguém assiste o resultado. E tem uma coisa nas tuas respostas que vale mais que o nome: em 2019 tu rompeu e parou de falar, em 2022 tu foi pra Pelotas e não contou pro trabalho, em junho tu decidiu e não contou em casa. Três alturas diferentes, o mesmo gesto.\n\nDuas histórias fazem esse desenho. Jacó, na véspera de reencontrar o irmão que ele havia enganado, manda a família atravessar o rio na frente e fica sozinho na margem. Luta a noite inteira com alguma coisa que não se nomeia, sai com o quadril deslocado e com um nome novo. E Odisseu, depois de perder a última balsa, passa dias agarrado a um madeiro no mar aberto, sem ninguém pra ver se ele aguenta. Nos dois casos a plateia é zero, e nos dois o homem sai marcado no corpo.',
  arquetipo_subtitulo: 'A força que pede trabalho',
  arquetipo_texto:
    'O Rei ↓ (Fraco, fugido do trono) aparece na cena de junho: tu decidiu e não assumiu a decisão em voz alta. Atrás dele vem o Guerreiro ↓ (Masoquista, sem fronteira), que é a tua frase "não consigo pedir nada pra ninguém". Começa pelo Rei, porque sem ele o Guerreiro só aguenta mais. Prática desta semana: senta com tua mulher e conta a decisão de junho numa frase que comece com "eu decidi", e no fim pede uma coisa concreta, pequena, com prazo.',
  fechamento:
    'Tu disse que o que mais te incomoda é "meus filhos me vendo assim e achando que é normal". Essa frase é sobre repetição, e a repetição é exatamente o que quatro perguntas não alcançam. O gesto de guardar sozinho apareceu três vezes em sete anos, e ele começou bem antes de 2019, num lugar que essas quatro respostas não chegam. A jornada inteira, em capítulos, com a origem de cada gesto e o dia em que cada um foi aprendido, é outra coisa. O vídeo aqui embaixo é o convite pra isso.',
};

type Busca = Promise<Record<string, string | string[] | undefined>>;

/* Lê cookie, então nunca é estática. */
export const dynamic = 'force-dynamic';

export default async function Preview({ searchParams }: { searchParams: Busca }) {
  /*
   * Em produção a rota existe, mas só pra quem tem a senha do painel.
   *
   * Ela respondia 404 e isso virou problema em 21/09: revisar as artes dos
   * vinte Movimentos exigia preencher o quiz vinte vezes e torcer pra cair no
   * Movimento certo, o que é inviável. O risco que o 404 protegia era outro,
   * o dossiê de referência do Anexo 11.5 vazar como se fosse leitura de
   * alguém, e a senha protege disso do mesmo jeito.
   *
   * Sem `PAINEL_SENHA` configurada, volta a ser 404: falha fechada.
   */
  const ambiente = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  if (ambiente === 'production') {
    const senha = senhaDoPainel();
    const autorizado =
      senha !== null && (await tokenValido((await cookies()).get(COOKIE_PAINEL)?.value, senha));
    if (!autorizado) notFound();
  }

  const q = await searchParams;
  const um = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]);

  const ato = (um('ato') ?? 'Iniciação') as Ato;
  const numero = Number(um('movimento') ?? 9);
  const posicao = (um('posicao') ?? 'meio') as 'começo' | 'meio' | 'fim';
  const aposta = um('aposta') === '1';

  const m = movimentoPorNumero(numero) ?? movimentoPorNumero(9)!;

  const dossie: DossiePublico = {
    titulo: TEXTO.titulo,
    devolutiva: TEXTO.devolutiva,
    ato: { subtitulo: TEXTO.ato_subtitulo, texto: TEXTO.ato_texto },
    movimento: { subtitulo: TEXTO.movimento_subtitulo, texto: TEXTO.movimento_texto },
    arquetipo: { subtitulo: TEXTO.arquetipo_subtitulo, texto: TEXTO.arquetipo_texto },
    fechamento: TEXTO.fechamento,
    infografico: {
      ato,
      posicao,
      movimento: {
        numero: m.numero,
        nome: m.nome,
        slug: m.slug,
        frase_card: m.frase_card,
        tem_card: m.tem_card,
        arte: m.tem_card ? caminhoDoCard(m) : null,
      },
      aposta,
    },
  };

  return <Dossie dossie={dossie} />;
}
