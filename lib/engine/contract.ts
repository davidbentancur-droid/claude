/**
 * Contratos de saída, apensados ao fim do Prompt Mãe.
 *
 * Planejamento Seção 3.1. O Prompt Mãe não sabe que existe JSON, e é assim que
 * tem que ser: ele manda na leitura, este arquivo manda no formato.
 *
 * São dois porque a leitura são duas chamadas. A chamada 1 decide e escreve o
 * spoiler, a chamada 2 recebe a decisão fechada e só redige o dossiê. O corte
 * existe pelo teto de 60 s da função serverless: junto, o modelo gastava o
 * orçamento inteiro na análise e sobrava uma tentativa mal aparada pro texto.
 * Separado, cada metade tem os 60 s dela e a chamada 2 tem retry de verdade.
 */

/* ------------------------------------------------------------------ */
/* Chamada 1 · análise e spoiler                                       */
/* ------------------------------------------------------------------ */

export const CONTRATO_ANALISE = `

---

# Formato da resposta

Tudo acima é a leitura. Isto aqui é só o formato de entrega, e ele não muda nada do que está escrito acima.

**Nesta passada tu não escreve o dossiê.** Tu roda o motor de leitura da Seção 3 inteiro, fecha as decisões e escreve o spoiler. O dossiê é escrito depois, numa segunda passada, a partir exatamente do que tu decidir aqui. Então decide com cuidado: o que sair daqui não é revisto.

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
  "sinalizacao": { "risco": false, "risco_motivo": "...", "piada": false },
  "contagem_spoiler": 0
}

Regras do formato:

- "triagem" tem exatamente quatro itens, um por pergunta, na ordem 1 a 4. Cada eixo é nota de 0 a 3, como na grade do Passo 0.
- "inventario.expressoes_literais" são as três a cinco expressões mais dele, copiadas exatas, sem corrigir gramática. A chamada 2 escreve o dossiê com elas, então o que não entrar aqui não existe lá.
- "ecos" tem exatamente dois itens, de tradições diferentes. Em "historia" escreve o que **acontece** na história, em uma ou duas linhas, não só o nome dela. É esse resumo que a chamada 2 vai desenvolver, e ela não tem outra fonte.
- "arquetipos" tem um ou dois itens, nunca três.
- "movimento.numero" e "movimento.nome" são o mesmo Movimento do banco dos 20.
- "movimento.aposta" é true só quando o material é fino e o Movimento entra como aposta declarada.
- "movimento.recorrencia_detectada" é true quando o mesmo gesto aparece na janela dos sete anos e outra vez no agora. Quando for true, descreve a recorrência dentro de "ato.fato_sustenta" ou de um item de "inventario.fatos", com as alturas e as datas, porque é o achado mais forte do dossiê e a chamada 2 precisa dele escrito.
- "dor_literal" é a resposta da Pergunta 4 copiada, sem editar.

- "sinalizacao.risco" é true se aparecer ideação suicida, violência sofrida ou praticada, ou uso de substância em nível de emergência. Quando for true, preenche o resto do JSON com o que der, porque o sistema para o fluxo e mostra só o acolhimento. Em "risco_motivo" escreve duas ou três frases humanas reconhecendo o que ele escreveu, que é o texto que ele vai ler na tela.
- "sinalizacao.piada" é true quando as respostas são brincadeira ou teste do sistema. Quando for true, escreve em "spoiler" a devolutiva curta e bem humorada, e o resto do JSON pode vir mínimo.

O spoiler tem no máximo **6 frases** e fica entre 90 e 130 palavras, mirando em 105. Conta os pontos finais antes de fechar o JSON e escreve o número de palavras em "contagem_spoiler".

As quatro batidas do spoiler são as da Seção 4.1, nesta ordem: reconhecimento com uma expressão dele entre aspas, um achado verdadeiro e pequeno, o gancho (o eco **ou** o arquétipo, nunca os dois), e a promessa concreta mais o pedido dos quatro campos.

O spoiler nunca traz o nome do Movimento, o nome do arquétipo, a prática, a armadilha, o convite, o desfecho de nenhuma das duas histórias, nem qualquer menção a vídeo. E não leva {{NOME}} nem {{PROFISSAO}}.`;

/* ------------------------------------------------------------------ */
/* Chamada 2 · o dossiê                                                */
/* ------------------------------------------------------------------ */

export const CONTRATO_DOSSIE = `

---

# Formato da resposta

Tudo acima é a leitura. Isto aqui é o formato de entrega.

**A análise já foi feita e está fechada.** Ela chega junto com as respostas dele, em JSON, e o teu trabalho nesta passada é um só: escrever o dossiê a partir dela. Não reabre o Ato, não troca o Movimento, não escolhe outro arquétipo, não busca outra história. Se alguma coisa na análise te parecer discutível, escreve assim mesmo: ela já foi mostrada ao cara na forma do spoiler, e contradizer agora quebra a leitura na cara dele.

O que tu decide aqui é só a escrita: o título, os subtítulos, as palavras, o corte.

Devolve SOMENTE um JSON válido, sem markdown por fora, sem crase, sem texto antes ou depois, neste formato:

{
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
  "contagem": 0
}

Forma de "ato_texto", e ela é obrigatória. As quatro batidas da Seção 5, nesta ordem, com as duas últimas em linha própria e rotuladas:

1. Primeiro parágrafo: o Ato e a posição dentro dele, com o fato dele que sustenta.
2. Ainda no primeiro parágrafo: o que essa travessia quer dizer, em duas ou três frases de linguagem comum. O que acontece com um homem nesse ponto da volta, o que costuma cair, o que costuma nascer, quanto costuma durar.
3. Linha própria, começando exatamente assim: **A armadilha:** seguido de uma ou duas frases escritas com a cena dele.
4. Linha própria, começando exatamente assim: **O convite:** seguido de uma ou duas frases com o que muda se ele fizer.

As linhas 3 e 4 são separadas por uma quebra de linha simples (\\n) dentro da string, não por linha em branco. Os dois asteriscos de cada lado do rótulo são o negrito e o sistema sabe lê-los.

Forma de "movimento_texto", também obrigatória. Começa com o nome do Movimento em negrito, sozinho na primeira linha, assim: **Prova**. Depois uma quebra de linha simples e o resto do bloco: o gesto em linguagem larga reescrito com as palavras do caso dele, a cena dele que sustenta a escolha, a recorrência se a análise marcou uma, e os dois ecos. Não inventa frase de card e não escreve frase nenhuma entre aspas logo abaixo do nome: a frase oficial vem do kit de arte, que o sistema ainda não tem, e frase inventada ali é erro maior que a ausência dela.

Fora esses dois negritos e o nome do Movimento, nada de markdown dentro das strings. Sem títulos com cerquilha, sem listas com hífen, sem itálico.

Tamanho, e isto é conta, não impressão. Os alvos são os da Seção 5:

| campo | frases, no máximo | palavras, mira nisto | palavras, nunca passa de |
| --- | --- | --- | --- |
| titulo | 1 | 5 | 8 |
| devolutiva | 3 | 43 | 52 |
| ato_texto | 7 | 111 | 126 |
| movimento_texto | 8 | 119 | 135 |
| arquetipo_texto | 3 | 43 | 50 |
| fechamento | 4 | 51 | 62 |

**A coluna que manda é a das frases.** Isto está medido, não é preferência: em rodadas anteriores tu declarou 369 palavras num dossiê de 496, quer dizer, tu conta um quarto a menos do que escreve, e a régua de palavras sozinha não segura nada porque tu acredita na tua própria contagem errada. Frase tu conta certo. Então o jeito de caber é este: escreve o bloco, **conta os pontos finais**, e se passou do número de frases da tabela, apaga frases inteiras até bater. Vinte e seis frases no dossiê inteiro é o teto.

A outra metade da conta é o tamanho da frase. As tuas saem com dezesseis palavras em média e as da devolutiva saíram com vinte e cinco. Frase de mais de vinte palavras quase sempre tem duas orações coladas por vírgula, e uma delas é enfeite. Corta a de enfeite.

**Duas contas da Seção 5 não fecham sozinhas, e a tabela acima é quem decide.** Isto está medido em oito rodadas: tu escreve exatamente os números da Seção 5 no Ato e no Movimento, e estoura a devolutiva e o fechamento em vinte a quarenta por cento. É aritmética do documento, não desatenção tua, e vale a pena saber por quê.

Primeira: os alvos por bloco da Seção 5 somam 435 palavras e a faixa dela termina em 420. Quando os dois números brigarem, obedece a faixa e tira as quinze palavras da devolutiva e do fechamento, que é a ordem explícita de corte da própria Seção 5.

Segunda: a Seção 6 pede o fechamento em "quatro ou cinco frases" e a Seção 5 pede o mesmo bloco em 60 palavras. Cinco frases tuas dão 80 palavras, então as duas só fecham com frase curta. Escreve o fechamento em **quatro frases de quinze palavras**, uma por batida, e as duas seções ficam satisfeitas.

Mesma coisa na devolutiva: três frases de quinze palavras, não três de vinte e cinco. Ela espelha o que ele contou, não recapitula as quatro respostas. Dois fatos e uma citação bastam.

A soma do título com os cinco blocos mira em 370 palavras, o meio da faixa de 320 a 420. Mirar no teto faz o texto passar do teto. Se a análise marcou "material_fino" como true, a mira cai pra 280 e a faixa vai de 250 a 320.

O Ato e o Movimento juntos ocupam cerca de dois terços do dossiê, e é por isso que os números acima são o que são. Se o texto estourar, corta do arquétipo e da devolutiva. Nunca corta do Ato nem do Movimento: foi essa a falha do Teste 1, Ato raso com o arquétipo ocupando espaço demais.

O bloco que mais estoura é o do Movimento, porque carrega os dois ecos. Cada eco são duas ou três linhas, e as duas cabem dentro das 119 palavras do bloco, não além delas. Se não couber, encurta o eco, não o resto.

Antes de fechar o JSON, escreve em "contagem" o número de palavras que tu contou no título mais os cinco blocos. Escrever um número que não bate com o texto é pior que estourar a faixa.

As citações literais das palavras dele entram entre aspas duplas, escapadas como o JSON exige: "tu resumiu em \\"queria parar de acordar apertado\\" e segue". Aspa simples também é aceita, mas a dupla é a preferida. São pelo menos duas no dossiê, copiadas exatamente como ele escreveu, sem corrigir a gramática dele.

Sobre o nome dele, e isto é obrigatório: o dossiê é escrito antes de ele dar o nome, então onde o nome entraria tu escreve o marcador {{NOME}} e o sistema troca depois.

**A devolutiva abre chamando ele pelo nome**, com o marcador em vocativo e vírgula, exatamente como o dossiê do Anexo 11.5: "{{NOME}}, em sete anos tu deu três fatos...". O marcador tem que aparecer pelo menos uma vez no dossiê, e a abertura da devolutiva é o lugar dele. Dossiê que chega sem o marcador chega sem o nome do cara, e a Seção 9 põe o nome dele entre os obrigatórios.

Uma vez basta. Repetir o nome a cada bloco soa a mala direta.

Se a profissão dele conversar com o material, usa o marcador {{PROFISSAO}} no máximo uma vez, e se não conversar, não usa nenhuma vez.`;

/* ------------------------------------------------------------------ */
/* Mensagens do usuário                                                */
/* ------------------------------------------------------------------ */

/** Mensagem do usuário na chamada 1. Planejamento Seção 3.1. */
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

/**
 * Mensagem do usuário na chamada 2: as respostas dele mais a análise fechada.
 *
 * As respostas cruas vão junto de propósito, apesar de a análise já trazer o
 * inventário. O dossiê precisa citar as palavras dele exatas e devolver fato
 * concreto, e trabalhar só com o resumo da análise faria o texto ficar sobre a
 * análise em vez de ficar sobre a vida dele, que é o vício que a Seção 9 chama
 * de comprar a lição pronta.
 *
 * O spoiler também vai, porque é a única parte da leitura que ele já leu. O
 * dossiê precisa cumprir o que aquele texto prometeu.
 */
export function montarAnaliseParaEscrita(
  respostas: { p1: string; p2: string; p3: string; p4: string },
  analise: unknown,
): string {
  return [
    'As quatro respostas dele, cruas:',
    '',
    montarRespostas(respostas),
    '',
    '---',
    '',
    'A análise fechada. Escreve o dossiê a partir dela, sem reabrir nenhuma decisão:',
    '',
    JSON.stringify(analise, null, 2),
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Retry                                                               */
/* ------------------------------------------------------------------ */

/**
 * Instrução de retry. O validador nomeia o erro e manda de volta.
 * Planejamento Seção 3.2: até 2 retries, depois entrega a última versão.
 *
 * Quando a falha é de tamanho, a instrução vira tarefa de apagar e não de
 * reescrever. O verbo importa: "reescreve o JSON inteiro" fazia o modelo redigir
 * um rascunho novo do mesmo comprimento. Medido na fixture do Marcelo, numa só
 * chamada: 497 palavras na primeira passada, 496 depois do retry.
 */
export function instrucaoCorrecao(erros: string[]): string {
  const tamanho = erros.some((e) => /palavras|frases|teto/i.test(e));

  const como = tamanho
    ? `Este é um trabalho de apagar, não de escrever. Não redige versão nova de nada: pega o teu texto anterior, palavra por palavra, e tira o que sobra. Nos blocos que estouraram, conta os pontos finais, apaga frases inteiras das que menos carregam fato dele, e só depois apara palavra solta. Cada frase que tu reescrever em vez de cortar volta com o mesmo tamanho.`
    : `Corrige cada item da lista mexendo só no que a regra aponta. O resto do texto volta igual.`;

  return `A tua resposta anterior quebrou estas regras:

${erros.map((e) => `- ${e}`).join('\n')}

${como}

A análise continua valendo inteira, o que quebrou foi a escrita. Devolve o JSON inteiro, e só o JSON.`;
}
