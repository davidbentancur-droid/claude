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
import { agruparCampos, espalharCampos, FORMULARIO, PERGUNTAS } from '@/lib/copy';
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

/** Três telas de pergunta, Prompt Mãe Seção 2 de 18/09. */
type NumeroPergunta = 1 | 2 | 3;

type Guardado = {
  tela: Tela;
  atual: NumeroPergunta;
  respostas: Record<string, string>;
  /**
   * Uma repescagem no fluxo inteiro, Prompt Mãe Seção 2. Era uma lista de
   * perguntas já repescadas, quando a cota era por pergunta.
   */
  repescou: boolean;
  /** Formato antigo, só pra retomar quem tinha estado salvo antes da troca. */
  repescadas?: number[];
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
  const [repescou, setRepescou] = useState(false);
  const [pendente, setPendente] = useState('');

  const [spoiler, setSpoiler] = useState('');
  const [desvio, setDesvio] = useState('');
  const [dossie, setDossie] = useState<DossiePublico | null>(null);
  const [errosForm, setErrosForm] = useState<Record<string, string> | null>(null);

  const [ocupado, setOcupado] = useState(false);
  /**
   * De onde veio o erro. Sem isso, "Tentar de novo" sempre voltava pra leitura,
   * e um erro na P1 mandaria o cara direto pra `/api/read` sem as respostas,
   * que responde `respostas_incompletas` e cai na mesma tela: um laço fechado
   * sem saída.
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
   * respostas pelo corpo, mas o lead chega no WhatsApp sem as respostas, que é
   * exatamente o que o formulário existe pra viabilizar.
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
    setRepescou(g.repescou ?? (g.repescadas ?? []).length > 0);
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
        JSON.stringify({ tela, atual, respostas, repescou } satisfies Guardado),
      );
    } catch {
      // Navegador com armazenamento bloqueado. O fluxo segue, só não retoma.
    }
  }, [tela, atual, respostas, repescou]);

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
    if (numero < PERGUNTAS.length) {
      setAtual((numero + 1) as NumeroPergunta);
      setTela('pergunta');
    } else {
      setTela('lendo');
    }
  }, []);

  /* --- envio de pergunta ------------------------------------------ */

  async function enviarPergunta({ partes, via }: Envio) {
    const numero = atual;
    const dadosPergunta = PERGUNTAS.find((p) => p.numero === numero);
    if (!dadosPergunta) return;

    /**
     * Uma tela pode virar mais de uma resposta no banco.
     *
     * A P3 tem três campos e grava dois registros: a busca e o obstáculo como
     * resposta 3, o preço de nada mudar como resposta 4. O porquê está em
     * `lib/copy.ts`, e é do Prompt Mãe: a dor tem trabalho próprio no último
     * parágrafo e no primeiro contato pelo WhatsApp.
     */
    const grupos = [...agruparCampos(dadosPergunta, partes)];
    const texto = grupos.map(([, t]) => t).join('\n');

    setOcupado(true);
    setRespostas((r) => ({
      ...r,
      ...Object.fromEntries(grupos.map(([n, t]) => [String(n), t])),
    }));

    try {
      /**
       * A cota é do fluxo, não da pergunta. Prompt Mãe Seção 2: uma repescagem
       * no máximo, em P1 ou P2, e o normal é zero. Se a P1 já gastou, a P2 segue
       * com o que vier.
       */
      const podeRepescar = dadosPergunta.repescagem && !repescou;

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
          for (const [n, t] of grupos) await gravarResposta(n, t, null, via);
          rastrear.risco();
          setTela('risco');
          return;
        }

        if (dados.needs_followup) {
          setPendente(texto);
          setRepescou(true);
          rastrear.repescagem(numero);
          setTela('repescagem');
          return;
        }
      }

      let risco = false;
      for (const [n, t] of grupos) {
        risco = (await gravarResposta(n, t, null, via)) || risco;
      }
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

  /**
   * Dispara a escrita do dossiê, que é a chamada 2 do engine.
   *
   * Uma vez por sessão: o servidor tem trava própria, mas disparar duas vezes
   * daqui gastaria uma requisição só pra ouvir "já tem alguém escrevendo".
   *
   * Erro aqui é silencioso e tem que ser. Se esta requisição não sair, a
   * `/api/lead` escreve o dossiê na hora, e o único custo é o cara esperar uns
   * segundos a mais depois de enviar o formulário. Mostrar tela de erro agora,
   * com o spoiler lido e o formulário na frente dele, perderia o lead por causa
   * de um problema que se conserta sozinho.
   */
  const dossieDisparado = useRef(false);

  const dispararDossie = useCallback(() => {
    if (dossieDisparado.current) return;
    dossieDisparado.current = true;

    void fetch('/api/dossie', { method: 'POST' }).catch(() => {
      // O plano B da /api/lead cobre.
    });
  }, []);

  const rodarLeitura = useCallback(async () => {
    setOcupado(true);
    rastrear.leituraComecou();

    try {
      await garantirSessao();

      const corpo = JSON.stringify({
        respostas: {
          p1: respostas['1'] ?? '',
          p2: respostas['2'] ?? '',
          p3: respostas['3'] ?? '',
          p4: respostas['4'] ?? '',
        },
      });

      /**
       * Uma repetição automática quando a conexão morre, antes de mostrar erro.
       *
       * A chamada 1 leva uns 35 segundos, e 35 segundos num celular é tempo de
       * sobra pra tela apagar, o cara trocar de app ou o sinal oscilar. Quando
       * isso acontece o `fetch` morre aqui, mas do lado do servidor a leitura
       * termina e fica salva. A segunda tentativa cai no caminho de recuperação
       * da `/api/read`, que devolve o spoiler guardado na hora, sem gastar
       * chamada nenhuma. O cara nem vê que teve problema.
       */
      let r: Response;
      try {
        r = await fetch('/api/read', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: corpo,
        });
      } catch {
        rastrear.erro('rede_retry');
        r = await fetch('/api/read', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: corpo,
        });
      }

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

      // A chamada 2 começa agora e roda enquanto ele lê o spoiler e preenche o
      // formulário. Sem await de propósito: o tempo dela é tempo que ele já ia
      // gastar digitando, e esperar aqui devolveria a latência que o corte em
      // duas chamadas existe pra esconder. A resposta não traz nada da leitura.
      dispararDossie();
    } catch {
      rastrear.erro('rede');
      setOrigemErro('leitura');
      setTela('erro');
    } finally {
      setOcupado(false);
    }
  }, [respostas, garantirSessao, dispararDossie]);

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
    setRepescou(false);
    setPendente('');
    setSpoiler('');
    setDesvio('');
    setAtual(1);
    leituraDisparada.current = false;
    dossieDisparado.current = false;
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
          valoresIniciais={espalharCampos(
            PERGUNTAS.find((p) => p.numero === atual)!,
            respostas,
          )}
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
