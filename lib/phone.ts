/**
 * Normalização de WhatsApp brasileiro.
 *
 * Guarda `whatsapp` como só dígitos com DDI 55 na frente, e `whatsapp_raw` com o
 * que o cara digitou. O banco tem as duas colunas por isso.
 */

const DDI = '55';

/** Só os dígitos, sem DDI, sem máscara. */
function somenteDigitos(valor: string): string {
  return valor.replace(/\D+/g, '');
}

/**
 * Tira o DDI se ele veio, e devolve DDD + número.
 * Aceita 10 dígitos (fixo antigo ou celular sem o 9) e 11 (celular com o 9).
 */
function semDdi(digitos: string): string {
  if (digitos.length > 11 && digitos.startsWith(DDI)) {
    return digitos.slice(DDI.length);
  }
  return digitos;
}

export type TelefoneNormalizado =
  | { ok: true; e164: string; ddd: string; numero: string }
  | { ok: false; motivo: 'curto' | 'longo' | 'ddd' };

/**
 * Valida e normaliza. Não inventa o nono dígito: se o cara mandou 10, guarda 10.
 * Adivinhar aqui gera número que não existe e queima o contato.
 */
export function normalizarTelefone(valor: string): TelefoneNormalizado {
  const local = semDdi(somenteDigitos(valor));

  if (local.length < 10) return { ok: false, motivo: 'curto' };
  if (local.length > 11) return { ok: false, motivo: 'longo' };

  const ddd = local.slice(0, 2);
  const numero = local.slice(2);

  // DDD brasileiro vai de 11 a 99, e nenhum começa com 0.
  const dddNum = Number(ddd);
  if (dddNum < 11 || dddNum > 99) return { ok: false, motivo: 'ddd' };

  return { ok: true, e164: `${DDI}${local}`, ddd, numero };
}

/**
 * Máscara de digitação: (DD) 9XXXX-XXXX para 11 dígitos, (DD) XXXX-XXXX para 10.
 * Roda a cada tecla, então tem que aguentar string pela metade.
 */
export function mascararTelefone(valor: string): string {
  const d = semDdi(somenteDigitos(valor)).slice(0, 11);

  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;

  const ddd = d.slice(0, 2);
  const resto = d.slice(2);

  if (resto.length <= 4) return `(${ddd}) ${resto}`;

  const corte = resto.length > 8 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/**
 * Triagem grosseira do campo aberto de orçamento. Prompt Mãe Seção 4.2:
 * "classificar internamente em três: quem fala em dezenas, quem fala em centenas,
 * quem fala em milhares". O humano lê o texto na hora do contato, isto é só filtro.
 */
export type FaixaOrcamento = 'dezenas' | 'centenas' | 'milhares' | 'indefinido';

export function classificarOrcamento(texto: string): FaixaOrcamento {
  const t = texto.toLowerCase();

  // "1.200", "1200", "1,2 mil", "3 mil", "2k"
  const comMil = /(\d+(?:[.,]\d+)?)\s*(mil|k)\b/.exec(t);
  if (comMil) return 'milhares';

  const numeros = [...t.matchAll(/\d{1,3}(?:\.\d{3})+|\d+/g)]
    .map((m) => Number(m[0].replace(/\./g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (numeros.length > 0) {
    const maior = Math.max(...numeros);
    if (maior >= 1000) return 'milhares';
    if (maior >= 100) return 'centenas';
    return 'dezenas';
  }

  // Sem número nenhum. "nada", "zero", "não tenho como" caem em dezenas com a
  // ressalva de que o verbo importa mais que a cifra, e o verbo o humano lê.
  if (/\b(nada|zero|nenhum|não tenho|nao tenho|sem condi)/.test(t)) return 'dezenas';

  return 'indefinido';
}
