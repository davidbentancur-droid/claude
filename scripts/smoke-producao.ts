/**
 * Percorre o fluxo inteiro contra uma URL publicada, como um usuário faria.
 *
 * Uso: pnpm smoke [url]   (default: a produção)
 *
 * Confere as duas coisas que não podem quebrar em silêncio: que o dossiê não
 * atravessa a rede antes do lead, e que as quatro respostas chegam no banco,
 * que é o que torna o contato por WhatsApp possível.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'https://mitobiografia.adrianorahde.com.br';

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'tests', 'fixtures', 'marcelo.json'), 'utf8'),
) as { respostas: Record<string, string> };

let cookie = '';

async function chamar(rota: string, corpo: unknown) {
  const t = Date.now();
  const r = await fetch(`${BASE}${rota}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(corpo),
  });

  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];

  const texto = await r.text();
  let dados: Record<string, unknown> = {};
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { _bruto: texto.slice(0, 200) };
  }

  return { status: r.status, dados, texto, ms: Date.now() - t };
}

function ok(rotulo: string, passou: boolean, detalhe = '') {
  console.log(`  ${passou ? 'ok  ' : 'FALHA'}  ${rotulo}${detalhe ? '  ' + detalhe : ''}`);
  return passou;
}

async function main() {
  console.log(`\nFluxo completo contra ${BASE}\n`);
  let tudoBem = true;

  const saude = await (await fetch(`${BASE}/api/health`)).json();
  tudoBem =
    ok('health', saude.ok === true, JSON.stringify(saude)) && tudoBem;

  const sessao = await chamar('/api/session', { utm: { utm_source: 'smoke' } });
  tudoBem = ok('sessão criada', sessao.status === 200 && Boolean(cookie)) && tudoBem;

  for (const n of [1, 2, 3, 4] as const) {
    const r = await chamar('/api/answer', {
      pergunta: n,
      texto: fixture.respostas[`p${n}`],
      via: 'texto',
    });
    tudoBem = ok(`resposta ${n} gravada`, r.status === 200) && tudoBem;
  }

  console.log('\n  lendo, isto leva uns 30 a 40 segundos...');
  const leitura = await chamar('/api/read', {});

  tudoBem = ok('leitura', leitura.status === 200, `${(leitura.ms / 1000).toFixed(1)}s`) && tudoBem;
  tudoBem =
    ok(
      'spoiler voltou',
      typeof leitura.dados.spoiler === 'string' && (leitura.dados.spoiler as string).length > 100,
      `${String(leitura.dados.spoiler ?? '').split(/\s+/).length} palavras`,
    ) && tudoBem;

  // O portão: nada do dossiê pode ter atravessado a rede ainda.
  const vazou = ['dossie', 'fechamento', 'devolutiva', 'movimento_texto'].filter((c) =>
    leitura.texto.includes(c),
  );
  tudoBem = ok('o dossiê NÃO vazou antes do lead', vazou.length === 0, vazou.join(', ')) && tudoBem;

  /*
   * A chamada 2, que é o que o navegador dispara sozinho quando o spoiler
   * aparece. Aqui ela é esperada de propósito, pra o smoke medir o tempo dela e
   * conferir que a resposta não traz texto nenhum da leitura. No fluxo real
   * ninguém espera: ela roda enquanto o cara preenche o formulário.
   */
  /*
   * O caso do celular do Adriano, 16/09.
   *
   * A chamada 1 leva uns 35 s, e nesse tempo a tela do iPhone apaga, o Safari
   * suspende a página e o fetch morre. Do lado de cá a leitura terminou e está
   * salva. Ele volta, vê a tela de erro, aperta "Tentar de novo", e isto aqui é
   * exatamente o que acontece: uma segunda `/api/read` na mesma sessão.
   *
   * Antes respondia 409 e ele ficava preso pra sempre com a leitura pronta do
   * outro lado. Agora tem que devolver o spoiler guardado, na hora, sem gastar
   * chamada de modelo.
   */
  const recuperada = await chamar('/api/read', {});
  tudoBem =
    ok(
      'segunda leitura recupera em vez de travar',
      recuperada.status === 200 && recuperada.dados.recuperada === true,
      `${recuperada.status} em ${(recuperada.ms / 1000).toFixed(1)}s`,
    ) && tudoBem;
  tudoBem =
    ok(
      'e recupera o mesmo spoiler',
      recuperada.dados.spoiler === leitura.dados.spoiler,
    ) && tudoBem;

  const escrita = await chamar('/api/dossie', {});
  tudoBem =
    ok('dossiê escrito', escrita.status === 200, `${(escrita.ms / 1000).toFixed(1)}s`) &&
    tudoBem;

  const vazouNaEscrita = ['titulo', 'fechamento', 'devolutiva', 'ato_texto'].filter((c) =>
    escrita.texto.includes(c),
  );
  tudoBem =
    ok(
      'a rota da escrita NÃO devolve o texto',
      vazouNaEscrita.length === 0,
      vazouNaEscrita.join(', '),
    ) && tudoBem;

  const lead = await chamar('/api/lead', {
    nome: 'Marcelo',
    whatsapp: '(51) 99999-1234',
    profissao: 'Consultor',
    orcamento: 'uns 300 por mês, já paguei mais',
  });

  tudoBem = ok('lead gravado e dossiê liberado', lead.status === 200) && tudoBem;

  const dossie = lead.dados.dossie as Record<string, unknown> | undefined;
  tudoBem = ok('dossiê voltou', Boolean(dossie)) && tudoBem;

  if (dossie) {
    const titulo = String(dossie.titulo ?? '');
    const info = dossie.infografico as Record<string, unknown>;
    const mov = info?.movimento as Record<string, unknown>;

    console.log(`\n    Título       ${titulo}`);
    console.log(`    Ato          ${info?.ato} (${info?.posicao})`);
    console.log(`    Movimento    ${mov?.numero} ${mov?.nome}`);

    const texto = JSON.stringify(dossie);
    tudoBem = ok('o nome dele entrou no dossiê', texto.includes('Marcelo')) && tudoBem;
    tudoBem = ok('nenhum marcador sobrou', !/\{\{/.test(texto)) && tudoBem;
    tudoBem = ok('zero travessão', !/[—–]/.test(texto)) && tudoBem;
  }

  // Segunda chamada ao lead tem que ser recusada: uma leitura, um lead.
  const repetido = await chamar('/api/lead', {
    nome: 'Outro',
    whatsapp: '(51) 98888-1111',
    profissao: 'x',
    orcamento: 'y',
  });
  tudoBem = ok('lead repetido recusado', repetido.status >= 400, String(repetido.status)) && tudoBem;

  console.log(`\n${tudoBem ? 'TUDO PASSOU' : 'TEVE FALHA'}\n`);
  process.exitCode = tudoBem ? 0 : 1;
}

void main();
