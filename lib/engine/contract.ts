/**
 * Contrato de saída, apensado ao fim do Prompt Mãe.
 *
 * Planejamento Seção 3.1. O Prompt Mãe não sabe que existe JSON, e é assim que
 * tem que ser: ele manda na leitura, este arquivo manda no formato.
 */

export const CONTRATO_JSON = `

---

# Formato da resposta

Tudo acima é a leitura. Isto aqui é só o formato de entrega, e ele não muda nada do que está escrito acima.

Devolve SOMENTE um JSON válido, sem markdown, sem crase, sem texto antes ou depois, neste formato:

{
  "triagem": [ { "pergunta": 1, "densidade": 0, "recorrencia": 0, "carga": 0, "agencia": 0, "temporalidade": 0, "nome": 0, "veredito": "string curta" } ],
  "inventario": { "fatos": ["..."], "expressoes_literais": ["..."] },
  "material_fino": false,
  "ato": { "nome": "Partida ou Iniciação ou Retorno", "posicao": "começo ou meio ou fim", "fato_sustenta": "..." },
  "movimento": { "numero": 9, "nome": "...", "aposta": false, "recorrencia_detectada": false, "descartados": ["..."] },
  "arquetipos": [ { "nome": "Rei ou Guerreiro ou Mago ou Amante", "direcao": "↑ ou ↓ ou maduro", "estado": "...", "fala_dele": "..." } ],
  "fortalecer_primeiro": "Rei ou Guerreiro ou Mago ou Amante",
  "ecos": [ { "historia": "...", "fonte": "...", "tradicao": "bíblica ou grega ou nórdica ou egípcia ou védica ou mesopotâmica ou conto popular ou matéria da Bretanha" } ],
  "pratica": "...",
  "dor_literal": "...",
  "spoiler": "...",
  "gancho_usado": "eco ou arquetipo",
  "dossie": {
    "titulo": "...",
    "devolutiva": "...",
    "ato_subtitulo": "...",
    "ato_texto": "...",
    "movimento_subtitulo": "...",
    "movimento_texto": "...",
    "arquetipo_subtitulo": "...",
    "arquetipo_texto": "...",
    "fechamento": "..."
  },
  "sinalizacao": { "risco": false, "risco_motivo": "...", "piada": false },
  "contagem": { "dossie": 0, "spoiler": 0 }
}

Regras do formato:

- "triagem" tem exatamente quatro itens, um por pergunta, na ordem 1 a 4. Cada eixo é nota de 0 a 3, como na grade do Passo 0.
- "ecos" tem exatamente dois itens, de tradições diferentes.
- "arquetipos" tem um ou dois itens, nunca três.
- "movimento.numero" e "movimento.nome" são o mesmo Movimento do banco dos 20.
- "movimento.aposta" é true só quando o material é fino e o Movimento entra como aposta declarada.
- "movimento.recorrencia_detectada" é true quando o mesmo Movimento aparece na janela dos sete anos e outra vez no agora.
- "dor_literal" é a resposta da Pergunta 4 copiada, sem editar.

- "sinalizacao.risco" é true se aparecer ideação suicida, violência sofrida ou praticada, ou uso de substância em nível de emergência. Quando for true, ainda assim preenche o resto do JSON com o que der, porque o sistema descarta o dossiê e mostra só o acolhimento. Em "risco_motivo" escreve duas ou três frases humanas reconhecendo o que ele escreveu, que é o texto que ele vai ler na tela.
- "sinalizacao.piada" é true quando as respostas são brincadeira ou teste do sistema. Quando for true, escreve em "spoiler" a devolutiva curta e bem humorada, e o resto do JSON pode vir mínimo.

Forma de "ato_texto", e ela é obrigatória. As quatro batidas da Seção 5, nesta ordem, com as duas últimas em linha própria e rotuladas:

1. Primeiro parágrafo: o Ato e a posição dentro dele, com o fato dele que sustenta.
2. Ainda no primeiro parágrafo: o que essa travessia quer dizer, em duas ou três frases de linguagem comum. O que acontece com um homem nesse ponto da volta, o que costuma cair, o que costuma nascer, quanto costuma durar.
3. Linha própria, começando exatamente assim: **A armadilha:** seguido de uma ou duas frases escritas com a cena dele.
4. Linha própria, começando exatamente assim: **O convite:** seguido de uma ou duas frases com o que muda se ele fizer.

As linhas 3 e 4 são separadas por uma quebra de linha simples (\\n) dentro da string, não por linha em branco. Os dois asteriscos de cada lado do rótulo são o negrito e o sistema sabe lê-los.

Forma de "movimento_texto", também obrigatória. Começa com o nome do Movimento em negrito, sozinho na primeira linha, assim: **Prova**. Depois uma quebra de linha simples e o resto do bloco: o gesto em linguagem larga reescrito com as palavras do caso dele, a cena dele que sustenta a escolha, a recorrência se ela existir, e os dois ecos. Não inventa frase de card e não escreve frase nenhuma entre aspas logo abaixo do nome: a frase oficial vem do kit de arte, que o sistema ainda não tem, e frase inventada ali é erro maior que a ausência dela.

Fora esses dois negritos e o nome do Movimento, nada de markdown no JSON. Sem títulos com cerquilha, sem listas com hífen, sem itálico.

Tamanho, e isto é conta, não impressão. Os alvos são os da Seção 5:

| campo | frases, no máximo | palavras, mira nisto | palavras, nunca passa de |
| --- | --- | --- | --- |
| titulo | 1 | 5 | 8 |
| devolutiva | 3 | 43 | 52 |
| ato_texto | 7 | 111 | 126 |
| movimento_texto | 8 | 119 | 135 |
| arquetipo_texto | 3 | 43 | 50 |
| fechamento | 4 | 51 | 62 |
| spoiler | 6 | 105 | 125 |

**A coluna que manda é a das frases.** Isto está medido, não é preferência: nas rodadas anteriores tu declarou 369 palavras num dossiê de 496, quer dizer, tu conta um quarto a menos do que escreve, e a régua de palavras sozinha não segura nada porque tu acredita na tua própria contagem errada. Frase tu conta certo. Então o jeito de caber é este: escreve o bloco, **conta os pontos finais**, e se passou do número de frases da tabela, apaga frases inteiras até bater. Vinte e seis frases no dossiê inteiro é o teto.

A outra metade da conta é o tamanho da frase. As tuas saem com dezesseis palavras em média e as da devolutiva saíram com vinte e cinco. Frase de mais de vinte palavras quase sempre tem duas orações coladas por vírgula, e uma delas é enfeite. Corta a de enfeite.

Antes de fechar o JSON, escreve em "contagem" o número de palavras que tu contou: "dossie" é a soma do título mais os cinco blocos de texto, "spoiler" é a do spoiler. Escrever um número que não bate com o texto é pior que estourar a faixa.

A soma dos cinco blocos com o título mira em 370 palavras, o meio da faixa de 320 a 420. Mirar no teto faz o texto passar do teto. Baixar a mira além disto foi testado e não adianta: o modelo tem um piso de concisão e a instrução já chegou no limite do que consegue. Se "material_fino" for true, a mira cai pra 280 e a faixa vai de 250 a 320.

O Ato e o Movimento juntos ocupam cerca de dois terços do dossiê, e é por isso que os números acima são o que são. Se o texto estourar, corta do arquétipo e da devolutiva. Nunca corta do Ato nem do Movimento: foi essa a falha do Teste 1, Ato raso com o arquétipo ocupando espaço demais.

O bloco que mais estoura é o do Movimento, porque carrega os dois ecos. Cada eco são duas ou três linhas, e as duas cabem dentro das 119 palavras do bloco, não além delas. Se não couber, encurta o eco, não o resto.

As citações literais das palavras dele entram entre aspas duplas, escapadas como o JSON exige: "tu resumiu em \\"queria parar de acordar apertado\\" e segue". Aspa simples também é aceita, mas a dupla é a preferida. São pelo menos duas no dossiê, copiadas exatamente como ele escreveu, sem corrigir a gramática dele.

Sobre o nome dele: a leitura roda antes de ele dar o nome. Onde o nome entraria no dossiê, escreve o marcador {{NOME}}. O sistema troca depois. Se a profissão dele conversar com o material, usa o marcador {{PROFISSAO}} no máximo uma vez, e se não conversar, não usa nenhuma vez.

Não escreve {{NOME}} nem {{PROFISSAO}} dentro do spoiler.`;

/**
 * Instrução de retry. O validador nomeia o erro e manda de volta.
 * Planejamento Seção 3.2: até 2 retries, depois entrega a última versão.
 *
 * Quando a falha é de tamanho, a instrução vira tarefa de apagar e não de
 * reescrever. O verbo importa: contra o teto de 60 s do Hobby só cabe um retry,
 * e "reescreve o JSON inteiro" fazia o modelo redigir um rascunho novo do mesmo
 * comprimento, gastando a única tentativa que existe. Medido na fixture do
 * Marcelo: 497 palavras na primeira passada, 496 depois do retry.
 */
export function instrucaoCorrecao(erros: string[]): string {
  const tamanho = erros.some((e) => /palavras|frases|teto/i.test(e));

  const como = tamanho
    ? `Este é um trabalho de apagar, não de escrever. Não redige versão nova de nada: pega o teu texto anterior, palavra por palavra, e tira o que sobra. Nos blocos que estouraram, conta os pontos finais, apaga frases inteiras das que menos carregam fato dele, e só depois apara palavra solta. Cada frase que tu reescrever em vez de cortar volta com o mesmo tamanho, que foi o que aconteceu na rodada passada.`
    : `Corrige cada item da lista mexendo só no que a regra aponta. O resto do texto volta igual.`;

  return `A tua resposta anterior quebrou estas regras:

${erros.map((e) => `- ${e}`).join('\n')}

${como}

Mantém o Ato, o Movimento, os arquétipos e os ecos que tu já escolheu, porque a análise estava certa, o que quebrou foi a escrita. Devolve o JSON inteiro, e só o JSON.`;
}

/** Mensagem do usuário na chamada. Planejamento Seção 3.1. */
export function montarRespostas(respostas: {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
}): string {
  return [
    `P1 (os sete anos): ${respostas.p1}`,
    `P2 (o agora): ${respostas.p2}`,
    `P3 (busca e obstáculo): ${respostas.p3}`,
    `P4 (o preço de nada mudar): ${respostas.p4}`,
  ].join('\n\n');
}
