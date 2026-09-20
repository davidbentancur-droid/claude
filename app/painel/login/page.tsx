import { Formulario } from './Formulario';

export const dynamic = 'force-dynamic';

/**
 * O `de` vem do middleware e é sempre um caminho interno.
 *
 * Conferido de novo aqui mesmo assim: query string é entrada do usuário, e
 * `router.replace` com uma URL absoluta vinda de fora transformaria a tela de
 * login num trampolim de phishing. Só passa o que começa com uma barra e não
 * com duas, porque `//outro.site` é URL absoluta disfarçada de caminho.
 */
function destinoSeguro(de: string | undefined): string {
  if (typeof de !== 'string') return '/painel';
  if (!de.startsWith('/') || de.startsWith('//')) return '/painel';
  if (!de.startsWith('/painel')) return '/painel';
  return de;
}

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;
  return <Formulario de={destinoSeguro(de)} />;
}
