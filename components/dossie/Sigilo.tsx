/**
 * O sigilo. Um desenho de linha pros Movimentos que ainda não têm arte.
 *
 * Pedido do David em 21/09, e é provisório: sai no dia em que a prancha
 * ilustrada daquele Movimento chegar. Existe porque o card só com o nome ficava
 * mudo, e a alternativa que a especificação já tinha descartado era pior
 * (emprestar a arte de outro Movimento, que fica genérico).
 *
 * **O que ele pode e o que ele não pode.** Pode ser um símbolo: símbolo não é
 * copy, e a regra da casa proíbe inventar texto, não inventar desenho. Não pode
 * virar frase: os oito Movimentos sem arte também não têm frase aprovada em
 * lugar nenhum, então o card continua sem ela até o Adriano mandar.
 *
 * **Por que traço solto e não geometria.** O pedido foi "meio boêmio", e o kit
 * inteiro é desenho de pena com irregularidade. Um sigilo em círculo perfeito e
 * ângulo reto pertenceria a outro produto. Os caminhos são curvas de mão,
 * ligeiramente tortas de propósito.
 *
 * **A animação é a linha sendo desenhada**, com `stroke-dasharray`. Não é
 * enfeite: é o que faz ler como algo sendo inscrito na hora, e não como ícone
 * de biblioteca. Quem pede menos movimento recebe o desenho pronto.
 */

/** Cada sigilo é um punhado de caminhos, desenhados na ordem em que entram. */
const SIGILOS: Record<number, { d: string; titulo: string }[]> = {
  // Recusa: o limiar e a barra atravessada. Resistir a cruzar, nos dois sentidos.
  2: [
    { d: 'M30 78 Q30 34 50 32 Q70 34 70 78', titulo: 'o limiar' },
    { d: 'M18 56 Q50 50 82 58', titulo: 'a barra atravessada' },
  ],
  // Rebelião: a coroa com a ponta quebrada, caída fora do próprio desenho.
  3: [
    { d: 'M24 68 Q26 40 34 52 Q42 30 50 50 Q58 30 66 52 Q74 42 76 68 Z', titulo: 'a coroa' },
    { d: 'M62 24 Q72 14 84 20', titulo: 'a ponta quebrada' },
  ],
  // Rapto: a ave levando algo, e o fio que se rompe embaixo.
  5: [
    { d: 'M16 38 Q34 24 50 36 Q66 24 84 38', titulo: 'as asas' },
    { d: 'M50 36 Q52 52 48 64', titulo: 'o que é levado' },
    { d: 'M34 76 Q42 70 46 74 M56 74 Q62 70 70 76', titulo: 'o fio rompido' },
  ],
  // Ambição: a escada subindo pra estrela que fica sempre um degrau acima.
  6: [
    { d: 'M36 84 Q40 54 46 26 M58 84 Q60 54 62 26', titulo: 'os montantes' },
    { d: 'M38 72 Q48 70 59 71 M39 58 Q49 56 60 57 M41 44 Q50 42 61 43', titulo: 'os degraus' },
    { d: 'M54 16 l4 8 8 2 -6 6 2 8 -8-4 -8 4 2-8 -6-6 8-2 Z', titulo: 'a estrela' },
  ],
  // Tentação: o fruto pendurado, e o anzol escondido dentro da haste.
  10: [
    { d: 'M34 60 Q34 42 50 42 Q66 42 66 60 Q66 80 50 80 Q34 80 34 60 Z', titulo: 'o fruto' },
    { d: 'M50 42 Q52 28 44 20', titulo: 'a haste' },
    { d: 'M44 20 Q36 22 38 32 Q40 38 48 36', titulo: 'o anzol' },
  ],
  // Cegueira: o olho com a venda. O que cega é escolhido aos poucos.
  11: [
    { d: 'M16 52 Q50 26 84 52 Q50 78 16 52 Z', titulo: 'o olho' },
    { d: 'M50 44 Q58 46 58 52 Q58 60 50 60 Q42 60 42 52 Q42 46 50 44 Z', titulo: 'a íris' },
    { d: 'M12 68 Q50 44 88 36', titulo: 'a venda' },
  ],
  // Traição: o círculo do pacto, rompido por dentro e não por fora.
  13: [
    { d: 'M50 18 Q80 18 82 50 Q80 82 50 82 Q20 82 18 50 Q20 18 50 18', titulo: 'o pacto' },
    { d: 'M34 34 Q48 46 44 58 Q40 70 52 76', titulo: 'a fenda por dentro' },
  ],
  // Confronto Maior: a figura pequena diante da porta que é maior que ela.
  14: [
    { d: 'M52 88 Q52 46 52 34 Q66 22 82 30 Q88 58 84 88', titulo: 'a figura de poder' },
    { d: 'M24 88 Q24 68 24 60 Q18 52 26 48 Q34 52 28 60 Q28 70 28 88', titulo: 'quem encara' },
  ],
};

export function Sigilo({ movimento, nome }: { movimento: number; nome: string }) {
  const tracos = SIGILOS[movimento];
  if (!tracos) return null;

  return (
    <svg
      className="sigilo"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Sigilo do Movimento ${nome}.`}
    >
      {tracos.map((t, i) => (
        <path
          key={t.d}
          className="sigilo__traco"
          d={t.d}
          /*
           * O atraso escalonado é o que faz o desenho parecer traçado por uma
           * mão, um traço depois do outro, em vez de tudo aparecendo junto.
           */
          style={{ animationDelay: `${i * 0.42}s` }}
        >
          <title>{t.titulo}</title>
        </path>
      ))}
    </svg>
  );
}

export function temSigilo(movimento: number): boolean {
  return movimento in SIGILOS;
}
