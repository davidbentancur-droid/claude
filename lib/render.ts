import { movimentoPorNumero, type Ato } from './movimentos';
import type { Leitura } from './engine/schema';

/**
 * Monta o que o cliente recebe depois do lead.
 *
 * Só o que a tela usa. Triagem, inventário, ecos crus e descartados ficam no
 * banco e nunca saem pela rede: são o raciocínio, e o Prompt Mãe Seção 3 diz pra
 * rodar o motor "sem mostrar o raciocínio pro usuário".
 */

export type BlocoDossie = { subtitulo: string | null; texto: string };

export type DossiePublico = {
  titulo: string;
  devolutiva: string;
  ato: BlocoDossie;
  movimento: BlocoDossie;
  arquetipo: BlocoDossie;
  fechamento: string;
  infografico: {
    ato: Ato;
    posicao: 'começo' | 'meio' | 'fim';
    movimento: {
      numero: number;
      nome: string;
      slug: string;
      frase_card: string | null;
      tem_card: boolean;
    };
    aposta: boolean;
  };
};

export type DadosLead = { nome: string; profissao: string };

/**
 * Troca os marcadores. A leitura roda antes do formulário, então o modelo
 * escreve {{NOME}} e {{PROFISSAO}} e a substituição acontece aqui.
 *
 * O nome só entra em vocativo ("Marcelo, em sete anos tu deu..."), então não tem
 * concordância pra resolver. Nome vazio não acontece, o campo é obrigatório, mas
 * se acontecer vira "tu" e a frase continua de pé.
 */
export function substituirMarcadores(texto: string, lead: DadosLead): string {
  const nome = lead.nome.trim();
  const profissao = lead.profissao.trim();

  return texto
    .replace(/\{\{\s*NOME\s*\}\}/g, nome.length > 0 ? nome : 'tu')
    .replace(/\{\{\s*PROFISSAO\s*\}\}/g, profissao)
    // Se o modelo abriu vocativo com o marcador e o nome caiu pra "tu", sobra
    // "tu, em sete anos tu deu". Uma vírgula órfã no começo é pior que nada.
    .replace(/^tu,\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function limparSubtitulo(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export function montarDossie(leitura: Leitura, lead: DadosLead): DossiePublico {
  const sub = (s: string) => {
    const v = limparSubtitulo(s);
    return v === null ? null : substituirMarcadores(v, lead);
  };
  const txt = (s: string) => substituirMarcadores(s, lead);

  const doBanco = movimentoPorNumero(leitura.movimento.numero);

  return {
    titulo: txt(leitura.dossie.titulo),
    devolutiva: txt(leitura.dossie.devolutiva),
    ato: { subtitulo: sub(leitura.dossie.ato_subtitulo), texto: txt(leitura.dossie.ato_texto) },
    movimento: {
      subtitulo: sub(leitura.dossie.movimento_subtitulo),
      texto: txt(leitura.dossie.movimento_texto),
    },
    arquetipo: {
      subtitulo: sub(leitura.dossie.arquetipo_subtitulo),
      texto: txt(leitura.dossie.arquetipo_texto),
    },
    fechamento: txt(leitura.dossie.fechamento),
    infografico: {
      ato: leitura.ato.nome,
      posicao: leitura.ato.posicao,
      movimento: {
        numero: leitura.movimento.numero,
        nome: doBanco?.nome ?? leitura.movimento.nome,
        slug: doBanco?.slug ?? '',
        frase_card: doBanco?.frase_card ?? null,
        tem_card: doBanco?.tem_card ?? false,
      },
      aposta: leitura.movimento.aposta || leitura.material_fino,
    },
  };
}

/**
 * Quebra o texto nas citações entre aspas, pra a tela renderizar cada uma em
 * <q>. As palavras dele são o único destaque tipográfico do dossiê, então a
 * marcação precisa ser exata: aspas que não fecham ficam como texto.
 */
export type Pedaco = { tipo: 'texto' | 'citacao'; valor: string };

const ASPAS_TIPOGRAFICAS = /[“”„«»]/g;

export function partirCitacoes(texto: string): Pedaco[] {
  const normalizado = texto.replace(ASPAS_TIPOGRAFICAS, '"');
  const pedacos: Pedaco[] = [];
  const re = /"([^"]+)"/g;

  let ultimo = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(normalizado)) !== null) {
    if (m.index > ultimo) {
      pedacos.push({ tipo: 'texto', valor: normalizado.slice(ultimo, m.index) });
    }
    pedacos.push({ tipo: 'citacao', valor: m[1] });
    ultimo = m.index + m[0].length;
  }

  if (ultimo < normalizado.length) {
    pedacos.push({ tipo: 'texto', valor: normalizado.slice(ultimo) });
  }

  return pedacos.filter((p) => p.valor.length > 0);
}

/** O que vai pro banco desnormalizado, pro momento do contato no WhatsApp. */
export function resumoParaContato(leitura: Leitura) {
  const a = leitura.arquetipos[0];
  return {
    ato: leitura.ato.nome,
    movimento: `${leitura.movimento.numero} ${leitura.movimento.nome}`,
    arquetipo: a ? `${a.nome} ${a.direcao}${a.estado ? ` (${a.estado})` : ''}` : null,
    dor_literal: leitura.dor_literal,
  };
}
