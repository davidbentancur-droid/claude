import { NextResponse, type NextRequest } from 'next/server';

/**
 * Tranca do painel.
 *
 * O `/painel` mostra o WhatsApp, a profissão, o orçamento e as respostas
 * inteiras de todo mundo que passou pelo quiz. Isso é dado pessoal de gente que
 * preencheu um formulário confiando que ia virar contato do Adriano, não página
 * pública. Então ele não sobe sem senha, e sem `PAINEL_SENHA` configurada ele
 * não sobe de jeito nenhum: falha fechada é a única falha aceitável aqui.
 *
 * Basic Auth e não formulário porque é ferramenta interna. O navegador guarda a
 * credencial, não tem sessão pra expirar, não tem tabela de usuário pra manter,
 * e a superfície de ataque é uma comparação de string.
 */

const REALM = 'Painel Mini Dossiê';

function pedirSenha(): NextResponse {
  return new NextResponse('Acesso restrito.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}

/**
 * Comparação de tempo constante.
 *
 * Comparar senha com `===` vaza o tamanho do prefixo certo pelo tempo de
 * resposta. Aqui o custo de fazer certo é de cinco linhas, então não tem
 * desculpa pra fazer errado, mesmo numa ferramenta interna.
 */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

export function middleware(req: NextRequest) {
  const senha = process.env.PAINEL_SENHA;
  if (!senha || senha.length < 8) {
    return new NextResponse(
      'O painel está desligado: falta a variável PAINEL_SENHA, com pelo menos 8 caracteres.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const header = req.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return pedirSenha();

  let decodificado = '';
  try {
    decodificado = atob(header.slice('Basic '.length));
  } catch {
    return pedirSenha();
  }

  // Usuário é ignorado de propósito: uma senha só, ferramenta de duas pessoas.
  const informada = decodificado.slice(decodificado.indexOf(':') + 1);
  if (!iguais(informada, senha)) return pedirSenha();

  /*
   * `noindex` no caminho de entrada, além do robots.txt. Página com dado
   * pessoal não entra em buscador nem por acidente de link colado em lugar
   * errado, e o header vale mesmo quando o robots não é lido.
   */
  const res = NextResponse.next();
  res.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return res;
}

export const config = {
  matcher: ['/painel', '/painel/:path*'],
};
