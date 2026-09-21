import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CardMovimento } from '@/components/dossie/CardMovimento';
import { MOVIMENTOS } from '@/lib/movimentos';
import { COOKIE_PAINEL, senhaDoPainel, tokenValido } from '@/lib/painel/sessao';

/**
 * Os vinte cards numa tela só, pra revisar arte.
 *
 * Existe porque revisar o kit era impraticável: o card aparece dentro do
 * dossiê, e pra ver um Movimento específico era preciso preencher o quiz e
 * torcer pra cair nele. Vinte vezes.
 *
 * Mesma tranca do `/preview`: em produção só com a sessão do painel, e sem
 * `PAINEL_SENHA` configurada volta a ser 404.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Cards dos Movimentos',
  robots: { index: false, follow: false },
};

export default async function Cards() {
  const ambiente = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  if (ambiente === 'production') {
    const senha = senhaDoPainel();
    const autorizado =
      senha !== null &&
      (await tokenValido((await cookies()).get(COOKIE_PAINEL)?.value, senha));
    if (!autorizado) notFound();
  }

  const comArte = MOVIMENTOS.filter((m) => m.tem_card);
  const semArte = MOVIMENTOS.filter((m) => !m.tem_card);

  return (
    <main className="palco tela">
      <div className="coluna galeria">
        <h1 className="display">Os vinte cards</h1>
        <p className="corpo">
          {comArte.length} com arte, {semArte.length} com sigilo provisório. Cada um está
          do tamanho que aparece no dossiê.
        </p>

        <h2 className="subtitulo galeria__secao">Com arte</h2>
        {comArte.map((m) => (
          <Ficha key={m.numero} numero={m.numero} />
        ))}

        <h2 className="subtitulo galeria__secao">
          Sem arte ainda, com sigilo no lugar
        </h2>
        {semArte.map((m) => (
          <Ficha key={m.numero} numero={m.numero} />
        ))}

        <p className="corpo galeria__volta">
          <Link href="/painel">Voltar ao painel</Link>
        </p>
      </div>
    </main>
  );
}

function Ficha({ numero }: { numero: number }) {
  const m = MOVIMENTOS.find((x) => x.numero === numero);
  if (!m) return null;

  return (
    <section className="galeria__ficha">
      <p className="galeria__nome">
        {m.numero} · {m.nome}
        {!m.frase_card && <span className="galeria__falta">sem frase</span>}
      </p>

      <CardMovimento
        dados={{
          ato: m.ato,
          posicao: 'meio',
          aposta: false,
          movimento: {
            numero: m.numero,
            nome: m.nome,
            slug: m.slug,
            frase_card: m.frase_card,
            tem_card: m.tem_card,
            arte: m.tem_card ? `/cards/mov_${String(m.numero).padStart(2, '0')}_${m.slug.replace(/-/g, '_')}.webp` : null,
          },
        }}
      />
    </section>
  );
}
