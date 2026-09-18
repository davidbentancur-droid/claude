'use client';

/**
 * A moldura do vídeo, compartilhada pela VSL e pelo downsell.
 *
 * Existe por causa da forma. A VSL do Adriano é vertical, gravada em 2560 de
 * altura, e numa moldura 16:9 ela toca num corredor estreito no meio, com
 * barras pretas comendo uns dois terços da largura. Num vídeo de venda isso é
 * caro: o rosto dele fica pequeno e o texto queimado no vídeo fica ilegível no
 * celular.
 *
 * Então a proporção é configuração e não constante, porque os dois vídeos da
 * página podem ter formas diferentes e o Adriano pode trocar qualquer um deles
 * sem mexer em código.
 *
 * Vídeo em pé ainda ganha um teto de largura. Sem ele, um 9:16 ocupando a
 * coluna inteira de 640 px teria 1138 px de altura, e o cara rolaria a tela
 * inteira só pra passar do vídeo.
 */

const TETO_EM_PE = 420;

export function Player({
  src,
  aspecto,
  titulo,
}: {
  src: string;
  /** Como em CSS: "16 / 9", "9 / 16", "4 / 5". */
  aspecto: string;
  titulo: string;
}) {
  const emPe = ehEmPe(aspecto);

  return (
    <div
      style={{
        aspectRatio: aspecto,
        border: '1px solid var(--line)',
        maxWidth: emPe ? TETO_EM_PE : undefined,
        marginInline: emPe ? 'auto' : undefined,
      }}
    >
      <iframe
        src={src}
        title={titulo}
        width="100%"
        height="100%"
        style={{ display: 'block', border: 0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

/** Moldura vazia, pra quando o link ainda não chegou. Só em desenvolvimento. */
export function PlayerVazio({ aspecto, texto }: { aspecto: string; texto: string }) {
  const emPe = ehEmPe(aspecto);

  return (
    <div
      style={{
        aspectRatio: aspecto,
        border: '1px solid var(--line)',
        background: 'var(--bg-2)',
        display: 'grid',
        placeItems: 'center',
        maxWidth: emPe ? TETO_EM_PE : undefined,
        marginInline: emPe ? 'auto' : undefined,
      }}
    >
      <span className="micro">{texto}</span>
    </div>
  );
}

function ehEmPe(aspecto: string): boolean {
  const [l, a] = aspecto.split('/').map((n) => Number(n.trim()));
  if (!l || !a) return false;
  return l < a;
}
