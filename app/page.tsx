'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Dossie } from '@/components/quiz/Dossie';
import { Formulario, type DadosFormulario } from '@/components/quiz/Formulario';
import { Pergunta, Repescagem, type Envio } from '@/components/quiz/Pergunta';
import {
  Abertura,
  Enquadramento,
  Erro,
  Lendo,
  Piada,
  Risco,
  Spoiler,
} from '@/components/quiz/Telas';
import { FORMULARIO, PERGUNTAS } from '@/lib/copy';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

/**
 * Máquina de estados do quiz. Planejamento Seção 1.
 *
 * Uma rota só, uma tela por vez, nada de menu e nada de barra lateral. O estado
 * vive aqui e é espelhado no localStorage, pra que um refresh no meio não apague
 * o que o cara escreveu. O portão do dossiê é do servidor, não daqui: este
 * componente nunca tem o texto do dossiê antes do lead entrar.
 */

type Tela =
  | 'abertura'
  | 'enquadramento'
  | 'pergunta'
  | 'repescagem'
  | 'lendo'
  | 'spoiler'
  | 'formulario'
  | 'dossie'
  | 'risco'
  | 'piada'
  | 'erro';

type NumeroPergunta = 1 | 2 | 3 | 4;

type Guardado = {
  tela: Tela;
  atual: NumeroPergunta;
  respostas: Record<string, string>;
  repescadas: number[];
};

const CHAVE = 'mdm_estado';

function lerGuardado(): Guardado | null {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Guardado) : null;
  } catch {
    return null;
  }
}

function capturarUtm(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const saida: Record<string, string> = {};
  for (const [k, v] of p.entries()) {
    if (k.startsWith('utm_') || k === 'gclid' || k === 'fbclid') saida[k] = v;
  }
  return saida;
}

export default function Quiz() {
  const [tela, setTela] = useState<Tela>('abertura');
  const [atual, setAtual] = useState<NumeroPergunta>(1);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [repescadas, setRepescadas] = useState<number[]>([]);
  const [pendente, setPendente] = useState('');

  const [spoiler, setSpoiler] = useState('');
  const [desvio, setDesvio] = useState('');
  const [dossie, setDossie] = useState<DossiePublico | null>(null);
  const [errosForm, setErrosForm] = useState<Record<string, string> | null>(null);

  const [ocupado, setOcupado] = useState(false);
  /**
   * De onde veio o erro. Sem isso, "Tentar de novo" sempre voltava pra leitura,
   * e um erro na P1 mandaria o cara direto pra `/api/read` sem as quatro
   * respostas, que responde `respostas_incompletas` e cai na mesma tela: um
   * laço fechado sem saída.
   */
  const [origemErro, setOrigemErro] = useState<'resposta' | 'leitura'>('leitura');
  const leituraDisparada = useRef(false);

  /* --- sessão e restauração ------------------------------------- */

  /**
   * A promessa da sessão, não o resultado dela.
   *
   * Toda chamada de API espera por isto antes de sair. Sem essa espera, um cara
   * rápido envia a P1 antes do cookie existir, leva 401 e a resposta não é
   * gravada em silêncio: a leitura até sai, porque `/api/read` aceita as
   * respostas pelo corpo, mas o lead chega no WhatsApp sem as quatro respostas,
   * que é exatamente o que o formulário existe pra viabilizar.
   */
  const sessao = useRef<Promise<void> | null>(null);

  const garantirSessao = useCallback(async () => {
    if (sessao.current === null) {
      sessao.current = fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ utm: capturarUtm() }),
      }).then(() => undefined);
    }
    await sessao.current;
  }, []);

  useEffect(() => {
    void garantirSessao();

    const g = lerGuardado();
    if (!g) return;

    setRespostas(g.respostas ?? {});
    setRepescadas(g.repescadas ?? []);
    setAtual(g.atual ?? 1);

    // Dossiê e spoiler não voltam do localStorage: eles vivem no servidor e só
    // saem de lá pelo portão. Retomar cai na pergunta onde ele parou.
    if (g.tela === 'pergunta' || g.tela === 'repescagem') setTela('pergunta');
  }, [garantirSessao]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        CHAVE,
        JSON.stringify({ tela, atual, respostas, repescadas } satisfies Guardado),
      );
    } catch {
      // Navegador com armazenamento bloqueado. O fluxo segue, só não retoma.
    }
  }, [tela, atual, respostas, repescadas]);

  /* --- gravação -------------------------------------------------- */

  const gravarResposta = useCallback(
    async (numero: number, texto: string, repescagem: string | null, via: 'texto' | 'audio') => {
      await garantirSessao();

      const r = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pergunta: numero, texto, repescagem, via }),
      });

      // Resposta que não gravou é resposta perdida, e o lead chega vazio no
      // outro lado. Melhor mostrar a tela de erro, que preserva o texto dele,
      // do que seguir fingindo que deu certo.
      if (!r.ok) throw new Error(`answer:${r.status}`);

      const dados = (await r.json().catch(() => ({}))) as { risco?: boolean };
      return Boolean(dados.risco);
    },
    [garantirSessao],
  );

  const seguir = useCallback((numero: NumeroPergunta) => {
    if (numero < 4) {
      setAtual((numero + 1) as NumeroPergunta);
      setTela('pergunta');
    } else {
      setTela('lendo');
    }
  }, []);

  /* --- envio de pergunta ------------------------------------------ */

  async function enviarPergunta({ texto, via }: Envio) {
    const numero = atual;
    setOcupado(true);
    setRespostas((r) => ({ ...r, [numero]: texto }));

    try {
      const dadosPergunta = PERGUNTAS.find((p) => p.numero === numero);
      const podeRepescar = dadosPergunta?.repescagem && !repescadas.includes(numero);

      if (podeRepescar) {
        await garantirSessao();
        const r = await fetch('/api/check-answer', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ texto, pergunta: numero }),
        });
        const dados = (await r.json().catch(() => ({}))) as {
          needs_followup?: boolean;
          risco?: boolean;
        };

        if (dados.risco) {
          await gravarResposta(numero, texto, null, via);
          rastrear.risco();
          setTela('risco');
          return;
        }

        if (dados.needs_followup) {
          setPendente(texto);
          setRepescadas((v) => [...v, numero]);
          rastrear.repescagem(numero);
          setTela('repescagem');
          return;
        }
      }

      const risco = await gravarResposta(numero, texto, null, via);
      rastrear.perguntaEnviada(numero, via);

      if (risco) {
        rastrear.risco();
        setTela('risco');
        return;
      }

      seguir(numero);
    } catch {
      rastrear.erro('answer');
      setOrigemErro('resposta');
      setTela('erro');
    } finally {
      setOcupado(false);
    }
  }

  async function enviarRepescagem(texto: string) {
    const numero = atual;
    setOcupado(true);

    try {
      const risco = await gravarResposta(numero, pendente, texto, 'texto');
      setRespostas((r) => ({ ...r, [numero]: `${pendente}\n\n${texto}` }));
      rastrear.perguntaEnviada(numero, 'texto');

      if (risco) {
        rastrear.risco();
        setTela('risco');
        return;
      }

      setPendente('');
      seguir(numero);
    } catch {
      rastrear.erro('repescagem');
      setOrigemErro('resposta');
      setTela('erro');
    } finally {
      setOcupado(false);
    }
  }

  /* --- leitura ----------------------------------------------------- */

  const rodarLeitura = useCallback(async () => {
    setOcupado(true);
    rastrear.leituraComecou();

    try {
      await garantirSessao();

      const r = await fetch('/api/read', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          respostas: {
            p1: respostas['1'] ?? '',
            p2: respostas['2'] ?? '',
            p3: respostas['3'] ?? '',
            p4: respostas['4'] ?? '',
          },
        }),
      });

      const dados = (await r.json().catch(() => ({}))) as {
        tipo?: 'spoiler' | 'risco' | 'piada';
        spoiler?: string;
        texto?: string;
        latency_ms?: number;
        erro?: string;
      };

      if (!r.ok) {
        rastrear.erro(dados.erro ?? String(r.status));
        setOrigemErro('leitura');
        setTela('erro');
        return;
      }

      rastrear.leituraTerminou(dados.latency_ms ?? 0);

      if (dados.tipo === 'risco') {
        setDesvio(dados.texto ?? '');
        rastrear.risco();
        setTela('risco');
        return;
      }

      if (dados.tipo === 'piada') {
        setDesvio(dados.texto ?? '');
        rastrear.piada();
        setTela('piada');
        return;
      }

      setSpoiler(dados.spoiler ?? '');
      rastrear.spoiler();
      setTela('spoiler');
    } catch {
      rastrear.erro('rede');
      setOrigemErro('leitura');
      setTela('erro');
    } finally {
      setOcupado(false);
    }
  }, [respostas, garantirSessao]);

  useEffect(() => {
    if (tela !== 'lendo' || leituraDisparada.current) return;
    leituraDisparada.current = true;
    void rodarLeitura();
  }, [tela, rodarLeitura]);

  /* --- lead --------------------------------------------------------- */

  async function enviarLead(dados: DadosFormulario) {
    setOcupado(true);
    setErrosForm(null);

    try {
      await garantirSessao();

      const r = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dados),
      });

      const corpo = (await r.json().catch(() => ({}))) as {
        dossie?: DossiePublico;
        campos?: Record<string, string>;
        erro?: string;
        ok?: boolean;
      };

      if (r.status === 400 && corpo.campos) {
        setErrosForm(corpo.campos);
        return;
      }

      if (!r.ok || !corpo.dossie) {
        // Honeypot devolve 200 sem dossiê. Bot não chega aqui de qualquer jeito.
        setErrosForm({ geral: FORMULARIO.erros.geral });
        return;
      }

      rastrear.lead();
      setDossie(corpo.dossie);
      setTela('dossie');
    } catch {
      setErrosForm({ geral: FORMULARIO.erros.geral });
    } finally {
      setOcupado(false);
    }
  }

  function refazer() {
    setRespostas({});
    setRepescadas([]);
    setPendente('');
    setSpoiler('');
    setDesvio('');
    setAtual(1);
    leituraDisparada.current = false;
    try {
      window.localStorage.removeItem(CHAVE);
    } catch {
      // sem armazenamento, nada a limpar
    }
    setTela('pergunta');
  }

  /* --- render -------------------------------------------------------- */

  switch (tela) {
    case 'abertura':
      return (
        <Abertura
          onComecar={() => {
            rastrear.inicio();
            setTela('enquadramento');
          }}
        />
      );

    case 'enquadramento':
      return <Enquadramento onSeguir={() => setTela('pergunta')} />;

    case 'pergunta':
      return (
        <Pergunta
          key={atual}
          numero={atual}
          valorInicial={respostas[String(atual)] ?? ''}
          onEnviar={enviarPergunta}
          ocupado={ocupado}
        />
      );

    case 'repescagem':
      return <Repescagem onEnviar={enviarRepescagem} ocupado={ocupado} />;

    case 'lendo':
      return <Lendo />;

    case 'spoiler':
      return <Spoiler texto={spoiler} onLiberar={() => setTela('formulario')} />;

    case 'formulario':
      return <Formulario onEnviar={enviarLead} ocupado={ocupado} erros={errosForm} />;

    case 'dossie':
      return dossie ? <Dossie dossie={dossie} /> : <Erro onTentar={refazer} ocupado={ocupado} />;

    case 'risco':
      return <Risco texto={desvio} />;

    case 'piada':
      return <Piada texto={desvio} onRefazer={refazer} />;

    case 'erro':
      return (
        <Erro
          onTentar={() => {
            if (origemErro === 'resposta') {
              setTela('pergunta');
              return;
            }
            leituraDisparada.current = false;
            setTela('lendo');
          }}
          ocupado={ocupado}
        />
      );
  }
}
