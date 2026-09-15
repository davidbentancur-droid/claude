import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  robots: { index: false, follow: true },
};

export default function Privacidade() {
  return (
    <main className="palco">
      <div className="coluna" style={{ paddingBlock: '2rem' }}>
        <h1 className="display" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
          Política de privacidade
        </h1>

        <div className="corpo" style={{ display: 'grid', gap: '1.5rem' }}>
          <section>
            <h2 className="subtitulo">O que é coletado</h2>
            <p>
              As quatro respostas que tu escreve ou fala, e os quatro campos do formulário: nome,
              WhatsApp, profissão e a resposta sobre orçamento mensal. Junto disso ficam a data, os
              parâmetros de campanha do link que te trouxe, o navegador usado e um código derivado do
              teu endereço de rede, que não permite chegar de volta no endereço.
            </p>
          </section>

          <section>
            <h2 className="subtitulo">O áudio</h2>
            <p>
              Se tu responder falando, o áudio é enviado só para virar texto e não fica guardado em
              lugar nenhum. O que fica é o texto, que tu vê e pode corrigir antes de enviar.
            </p>
          </section>

          <section>
            <h2 className="subtitulo">Para que é usado</h2>
            <p>
              Para escrever a tua leitura e para o contato pelo WhatsApp, feito por uma pessoa. Não
              existe lista de disparo e teus dados não são vendidos nem cedidos para terceiros.
            </p>
          </section>

          <section>
            <h2 className="subtitulo">Quem processa</h2>
            <p>
              A leitura é gerada pela API da Anthropic e a transcrição do áudio pela API da OpenAI.
              As duas operam sob contrato de processamento de dados e não usam este conteúdo para
              treinar modelos. O armazenamento é feito no Supabase, e a hospedagem na Vercel.
            </p>
          </section>

          <section>
            <h2 className="subtitulo">Teus direitos</h2>
            <p>
              Tu pode pedir cópia, correção ou apagamento de tudo o que está guardado, a qualquer
              momento, escrevendo para{' '}
              <a href="mailto:contato@adrianorahde.com.br" style={{ color: 'var(--gold)' }}>
                contato@adrianorahde.com.br
              </a>
              . O pedido de apagamento é atendido sem pergunta de volta.
            </p>
          </section>

          <section>
            <h2 className="subtitulo">Medição</h2>
            <p>
              A página usa Google Tag Manager e Meta Pixel para medir quantas pessoas começam e
              quantas terminam. Nenhuma resposta tua é enviada para essas ferramentas.
            </p>
          </section>
        </div>

        <p className="micro" style={{ marginTop: '3rem' }}>
          <Link href="/" style={{ color: 'var(--ink-2)' }}>
            Voltar
          </Link>
        </p>
      </div>
    </main>
  );
}
