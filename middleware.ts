import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE_PAINEL, senhaDoPainel, tokenValido } from '@/lib/painel/sessao';

/**
 * Tranca do painel.
 *
 * O `/painel` mostra o WhatsApp, a profissão, o orçamento e as respostas
 * inteiras de todo mundo que passou pelo quiz. Isso é dado pessoal de gente que
 * preencheu um formulário confiando que ia virar contato do Adriano, não página
 * pública. Então ele não sobe sem senha, e sem `PAINEL_SENHA` configurada ele
 * não sobe de jeito nenhum: falha fechada é a única falha aceitável aqui.
 *
 * A verificação é só recalcular o HMAC do cookie. Não tem sessão guardada, não
 * tem tabela de usuário, não tem ida ao banco no caminho de cada requisição.
 */

const LOGIN = '/painel/login';

export async function middleware(req: NextRequest) {
  const senha = senhaDoPainel();

  if (senha === null) {
    return new NextResponse(
      'O painel está desligado: falta a variável PAINEL_SENHA, com pelo menos 8 caracteres.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const naTelaDeLogin = req.nextUrl.pathname === LOGIN;
  const autenticado = await tokenValido(req.cookies.get(COOKIE_PAINEL)?.value, senha);

  // Já entrou e voltou pro login: manda pro painel em vez de mostrar o formulário.
  if (naTelaDeLogin && autenticado) {
    return NextResponse.redirect(new URL('/painel', req.url));
  }

  if (!naTelaDeLogin && !autenticado) {
    const url = new URL(LOGIN, req.url);
    /*
     * Guarda pra onde ele ia, pra cair na janela de dias certa depois de
     * entrar. Só o caminho e a busca, nunca uma URL absoluta vinda de fora:
     * `redirect` aberto é como um login vira trampolim pra phishing.
     */
    const destino = req.nextUrl.pathname + req.nextUrl.search;
    if (destino !== '/painel') url.searchParams.set('de', destino);
    return NextResponse.redirect(url);
  }

  /*
   * `noindex` no caminho de entrada, além da meta tag do layout. Página com
   * dado pessoal não entra em buscador nem por acidente de link colado em
   * lugar errado, e o header vale também no redirecionamento pro login.
   */
  const res = NextResponse.next();
  res.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return res;
}

export const config = {
  matcher: ['/painel', '/painel/:path*'],
};
