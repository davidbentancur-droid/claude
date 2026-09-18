/**
 * Converte o link que a pessoa tem na mão no link que o iframe aceita.
 *
 * Existe porque os dois são diferentes e isso não é óbvio. O link que o YouTube
 * dá pra copiar é `youtube.com/watch?v=ID`, e essa página se recusa a ser
 * enquadrada: posta na env, o vídeo não toca e não aparece erro nenhum, só um
 * retângulo preto. A mesma coisa vale pro `youtu.be` do botão de compartilhar.
 *
 * Então a env aceita qualquer forma e a conversão acontece aqui. O que já
 * estiver em formato de embed passa direto, inclusive Panda, que é o que a casa
 * usa e já está liberado no CSP.
 */

/** Parâmetros que importam num vídeo de venda. */
const PARAMS_YOUTUBE = new URLSearchParams({
  // Não remove os relacionados, só restringe ao mesmo canal. O YouTube tirou a
  // opção de desligar em 2018, e é a razão principal pra preferir Panda aqui.
  rel: '0',
  modestbranding: '1',
  // Sem isto o iPhone joga o vídeo em tela cheia sozinho e o cara perde a
  // página, junto com os dois botões que vêm abaixo dela.
  playsinline: '1',
});

function youtube(id: string, inicio?: string | null): string {
  const p = new URLSearchParams(PARAMS_YOUTUBE);
  if (inicio) p.set('start', inicio);
  // `nocookie` não pede consentimento de cookie antes do play na Europa e não
  // muda nada pra quem assiste.
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}

export function urlDeEmbed(bruta: string): string {
  const texto = bruta.trim();
  if (texto.length === 0) return '';

  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    // Não é URL. Pode ser só o id do vídeo colado sozinho, que acontece.
    return /^[\w-]{11}$/.test(texto) ? youtube(texto) : texto;
  }

  const host = u.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    return youtube(u.pathname.slice(1), u.searchParams.get('t'));
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v');
    if (v) return youtube(v, u.searchParams.get('t'));

    // `/embed/ID`, `/live/ID` e `/shorts/ID` guardam o id no caminho.
    const doCaminho = u.pathname.match(/^\/(?:embed|live|shorts|v)\/([\w-]+)/);
    if (doCaminho) return youtube(doCaminho[1], u.searchParams.get('start'));
  }

  if (host === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean)[0];
    if (/^\d+$/.test(id ?? '')) return `https://player.vimeo.com/video/${id}`;
  }

  // Panda e qualquer outro player já entregam o link de embed pronto.
  return texto;
}
