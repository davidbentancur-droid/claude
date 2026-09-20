/**
 * Sessão do painel: um cookie assinado, sem tabela e sem estado no servidor.
 *
 * Substituiu o Basic Auth de 20/09, que funcionava e era feio: a caixa de
 * diálogo do navegador não aceita identidade visual nenhuma e não tem como
 * sair sem fechar o navegador.
 *
 * O cookie carrega a validade e uma assinatura HMAC dela, com a `PAINEL_SENHA`
 * de chave. Quem não tem a senha não consegue produzir a assinatura, e mexer na
 * validade invalida ela. Não tem o que guardar do outro lado: a verificação é
 * recalcular e comparar.
 *
 * Web Crypto e não `node:crypto` porque o middleware roda no runtime Edge, onde
 * o segundo não existe. O primeiro existe nos dois lados, então este arquivo
 * serve o middleware e a rota de login sem duplicar nada.
 */

const VERSAO = 'painel.v1';
const COOKIE = 'mdm_painel';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000;

export const COOKIE_PAINEL = COOKIE;
export const DURACAO_SEGUNDOS = DURACAO_MS / 1000;

function base64url(bytes: ArrayBuffer): string {
  let s = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function assinatura(expira: number, senha: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(senha),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    chave,
    new TextEncoder().encode(`${VERSAO}.${expira}`),
  );
  return base64url(mac);
}

/**
 * Comparação de tempo constante.
 *
 * Comparar com `===` vaza o tamanho do prefixo certo pelo tempo de resposta.
 * Cinco linhas pra fazer certo, então não tem desculpa pra fazer errado.
 */
export function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function criarToken(senha: string): Promise<string> {
  const expira = Date.now() + DURACAO_MS;
  return `${expira}.${await assinatura(expira, senha)}`;
}

export async function tokenValido(
  token: string | undefined,
  senha: string,
): Promise<boolean> {
  if (!token) return false;

  const corte = token.indexOf('.');
  if (corte < 1) return false;

  const expira = Number(token.slice(0, corte));
  if (!Number.isFinite(expira) || expira < Date.now()) return false;

  return iguais(token.slice(corte + 1), await assinatura(expira, senha));
}

/**
 * A senha configurada, ou null quando o painel está desligado.
 *
 * O piso de 8 caracteres é o que transforma "esqueci de configurar" numa porta
 * fechada em vez de numa porta com senha vazia. O painel falha fechado.
 */
export function senhaDoPainel(): string | null {
  const s = process.env.PAINEL_SENHA;
  return s && s.length >= 8 ? s : null;
}
