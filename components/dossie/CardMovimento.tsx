import Image from 'next/image';

import { INFOGRAFICO } from '@/lib/copy';
import type { DossiePublico } from '@/lib/render';

/**
 * O card do Movimento. Prompt Mãe Seção 7, Elemento 2.
 *
 * Dois estados, e a diferença entre eles é só se a arte existe.
 *
 * **Com arte.** Desenha o arquivo do kit, intocado. A Seção 7 é explícita: o
 * card "nunca pode ser gerado de novo, redesenhado nem ter a frase trocada".
 * A frase aparece de novo embaixo, como legenda, e isso não é repetição
 * gratuita: a arte tem 1264 px e no celular ela cai pra uns 340, onde o texto
 * dentro dela fica com cinco pixels. Foi o mesmo problema que a espiral teve.
 * Na tela grande a legenda lê como legenda de prancha, que é o que ela é.
 *
 * **Sem arte.** Card só de texto, na especificação que o David mandou em
 * 21/09. Ele existe porque a regra anterior, usar a arte do Ato no lugar,
 * ficava genérica: três imagens cobrindo vinte Movimentos diziam menos que um
 * card honesto dizendo qual Movimento é. O que ele nunca faz é imitar a arte:
 * sem moldura dupla, sem capitular, sem papel falso. Ele pertence à família
 * visual do site, não à da prancha ilustrada.
 *
 * A frase vem sempre de `lib/movimentos.ts`, copiada da própria arte, e nunca
 * do modelo. É isso que garante que o texto na tela e o texto dentro da imagem
 * sejam o mesmo texto.
 */

type Dados = DossiePublico['infografico'];

export function CardMovimento({ dados }: { dados: Dados }) {
  const m = dados.movimento;

  if (m.arte !== null) {
    return (
      <figure className="card-mov">
        <Image
          src={m.arte}
          alt={`Card do Movimento ${m.nome}.${m.frase_card ? ` ${m.frase_card}` : ''}`}
          width={1264}
          height={848}
          className="card-mov__arte"
          sizes="(max-width: 760px) 92vw, 560px"
        />
        {m.frase_card && (
          <figcaption className="card-mov__legenda">{m.frase_card}</figcaption>
        )}
        {dados.aposta && <p className="micro card-mov__aposta">{INFOGRAFICO.aposta}</p>}
      </figure>
    );
  }

  return (
    <figure className="card-mov card-mov--texto">
      <p className="card-mov__rotulo">Movimento {m.numero}</p>
      <p className="card-mov__nome">{m.nome}</p>
      {m.frase_card && (
        <>
          <span className="card-mov__filete" aria-hidden="true" />
          <p className="card-mov__frase">{m.frase_card}</p>
        </>
      )}
      {dados.aposta && <p className="micro card-mov__aposta">{INFOGRAFICO.aposta}</p>}
    </figure>
  );
}
