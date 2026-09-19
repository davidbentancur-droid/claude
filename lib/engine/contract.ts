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
  "arco": { "movimento_sete_anos": "...", "relacao": "repetição ou consequência ou contraste ou progressão de Ato ou ausente", "frase": "..." },
  "arquetipos": [ { "nome": "Rei ou Guerreiro ou Mago ou Amante", "direcao": "↑ ou ↓ ou maduro", "estado": "...", "fala_dele": "..." } ],
  "fortalecer_primeiro": "Rei ou Guerreiro ou Mago ou Amante",
  "ecos": [ { "mito": "...", "popularidade": "Alto ou Médio ou Baixo", "tradicao": "...", "historia": "...", "angulo": "...", "ligacao": "..." } ],
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
- "arquetipos" tem um ou dois itens, nunca três.
- "movimento.numero" e "movimento.nome" são o mesmo Movimento do banco dos 20.
- "movimento.aposta" é true só quando o material é fino e o Movimento entra como aposta declarada.
- "movimento.recorrencia_detectada" é true quando o mesmo gesto aparece na janela dos sete anos e outra vez no agora. Quando for true, descreve a recorrência dentro de "ato.fato_sustenta" ou de um item de "inventario.fatos", com as alturas e as datas, porque é o achado mais forte do dossiê e a chamada 2 precisa dele escrito.
- "dor_literal" é a resposta da Pergunta 4 copiada, sem editar.

## Os dois ecos, e é aqui que se erra mais

**Os dois mitos vêm do Banco de Mitos Compacto, o segundo documento de contexto, e de lugar nenhum mais.** Não existe exceção. Um mito que tu conhece bem e que encaixa melhor, mas que não está na lista, está proibido: foi assim que a saída errada do Anexo 11.6 citou Simba. Se nenhuma linha do banco servir, escolhe a menos pior de lá mesmo.

Em "mito" copia o nome **exatamente como está escrito na linha do banco**, com o parêntese da referência e tudo. É por esse nome que o sistema confere a escolha.

Em "popularidade" e "tradicao" copia o que a linha do banco diz. Não estima, não deduz: lê a coluna.

**Regra de pareamento, obrigatória:** um dos dois ecos é de popularidade **Alto** e o outro é **Médio ou Baixo**. Nunca os dois no mesmo nível. O Alto é pra ele reconhecer de cara, o outro é pra dar profundidade.

**A busca roda no banco inteiro, não na linha do Movimento.** A coluna Movimento garante cobertura, não é cerca. Começa pela linha do Movimento que tu escolheu e depois varre o resto, procurando encaixe mais específico: um símbolo ou objeto concreto que se repete nas duas histórias, uma sequência de ações parecida passo a passo, ou uma dinâmica interna que ecoa mais fundo que a ação externa. Quando achar um desses fora da linha, ele vence. Parar no primeiro mito óbvio da linha é o vício que este passo existe pra evitar.

Três dos vinte Movimentos (Ambição, Tentação, Cegueira) só têm opção de popularidade Alto na linha deles. Neles o segundo eco vem obrigatoriamente de outra linha do banco, e isso é esperado, não é erro.

Em "historia" escreve o mito **contado**, não resumido: quem é o personagem, em que situação ele estava, o que aconteceu com ele passo a passo, e qual foi o sentimento dele naquele momento (medo, culpa, solidão, orgulho, o que for). Três ou quatro frases, no mínimo. A chamada 2 desenvolve isto em cinco a sete linhas e **não tem outra fonte**: o que tu não escrever aqui, ou some do dossiê, ou ela inventa, e inventar é o que a régua de rastreabilidade do Passo 5 proíbe. Nunca assumir que ele já conhece a história, nem as mais famosas.

Em "angulo" escreve o ângulo não-óbvio daquela linha do banco, com as tuas palavras. É ele que o dossiê usa, no lugar do resumo padrão do mito.

Em "ligacao" escreve, em uma ou duas frases, por que aquele mito ecoa a vida **dele**, com um fato dele dentro. Este campo é separado de "historia" de propósito: o Passo 5 manda separar o que está na fonte do que é leitura aplicada, e misturar os dois é o jeito de o mito virar enfeite.

## A leitura de arco

"arco" é o Passo 3.5 e ele roda **sempre que a Pergunta 1 render um Movimento identificável**, mesmo que seja diferente do Movimento do agora. Dois Movimentos soltos, um antigo e um atual, sem relação escrita entre eles, é meio trabalho.

- "arco.movimento_sete_anos" é o nome do Movimento que a P1 rende.
- "arco.relacao" é uma das quatro: **repetição** (o mesmo Movimento nas duas janelas), **consequência** (o antigo gerou a dívida, a estrutura ou o padrão que o de agora cobra ou paga), **contraste** (ele girou pro gesto oposto), **progressão de Ato** (os dois mostram a vida avançando de fase).
- "arco.frase" é a leitura resultante, em **uma frase concreta ancorada nas cenas que ele deu**, nunca em abstrato. É ela que vira a espinha do bloco do Movimento no dossiê.

Só escreve "ausente" em "relacao" quando a P1 não render Movimento nenhum. Aí "movimento_sete_anos" e "frase" ficam vazios.

O rótulo é uso interno. A chamada 2 tem ordem de nunca escrever "isso é uma consequência" no dossiê, e tu também não escreve isso em "frase".

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

Forma de "movimento_texto", também obrigatória. Começa com o nome do Movimento em negrito, sozinho na primeira linha, assim: **Prova**. Depois uma quebra de linha simples e o resto do bloco, nesta ordem: o gesto em linguagem larga reescrito com as palavras do caso dele, a cena dele que sustenta a escolha, **a leitura de arco**, e os dois ecos. Não inventa frase de card e não escreve frase nenhuma entre aspas logo abaixo do nome: a frase oficial vem do kit de arte, que o sistema ainda não tem, e frase inventada ali é erro maior que a ausência dela.

**A leitura de arco é obrigatória e vem antes dos ecos.** Ela está pronta na análise, em "arco.frase", e o teu trabalho é escrever ela com os fatos dele, não copiar o campo. Quando "arco.relacao" for "repetição", este é o achado mais forte do dossiê inteiro e merece o espaço de duas ou três frases, com as alturas e as datas. Nos outros três casos basta uma frase concreta ligando o que ele fez há sete anos ao que ele está fazendo agora. Só some do texto quando "arco.relacao" for "ausente".

**Nunca escreve o rótulo técnico.** "Isso é uma consequência", "aqui temos um contraste", "houve uma progressão de Ato" são vocabulário interno e não aparecem no dossiê. O que aparece é a leitura: o que ele fez em tal ano, o que ele faz agora, e o fio entre os dois.

**Os dois ecos são a parte mais longa do dossiê, e é de propósito.** Cinco a sete linhas cada, e cada um em parágrafo próprio. Conta quem é o personagem, em que situação ele estava, o que aconteceu com ele passo a passo, e o que ele sentiu ali. Só depois, em uma ou duas linhas, liga ao que ele contou e diz por que aquele mito ecoa a vida dele. Escreve como quem conta pra alguém que nunca ouviu a história, porque é esse o caso mesmo quando o mito é famoso: ele precisa sentir a semelhança sem pesquisar nada. Separa sempre o que está na fonte do que é leitura aplicada à vida dele.

**O ângulo manda no eco.** Cada eco da análise traz um campo "angulo", que é a leitura não-óbvia daquela linha do Banco de Mitos. É esse detalhe que o teu parágrafo tem que carregar, não o resumo padrão da história. Contar que Jonas foi engolido por uma baleia é o resumo; contar que ele reza de dentro do bicho, antes de ser cuspido, é o ângulo. O primeiro qualquer um escreve, o segundo é o que faz o cara parar de ler e pensar.

Os campos "historia", "angulo" e "ligacao" de cada eco são a tua fonte inteira. Não acrescenta episódio, nome ou detalhe que não esteja neles: mito contado errado derruba a confiança no dossiê todo, e é o erro que o Anexo 11.6 usa como exemplo.

Fora esses dois negritos e o nome do Movimento, nada de markdown dentro das strings. Sem títulos com cerquilha, sem listas com hífen, sem itálico.

**A palavra é Movimento, e só ela.** Nunca escreve "o gesto do momento" nem sinônimo solto. O gesto é a ação concreta dentro do Movimento, mas o nome que vai no dossiê é sempre "o Movimento", como em "o Movimento do teu momento é a Prova". Prompt Mãe Seção 9, proibido 9.

Tamanho, e isto é conta, não impressão. Os alvos são os da Seção 5:

| campo | quantas frases | palavras por frase | palavras no bloco, mira | palavras no bloco, teto |
| --- | --- | --- | --- | --- |
| titulo | 1 | 5 | 5 | 8 |
| devolutiva | 3 | 15 | 45 | 60 |
| ato_texto | 7 | 18 | 126 | 145 |
| movimento_texto | 15 | 15 | 225 | 262 |
| arquetipo_texto | 3 | 15 | 45 | 60 |
| fechamento | 4 | 14 | 56 | 70 |

**As duas colunas do meio são a instrução, e as duas de fora são a consequência.** Não mira na palavra do bloco: mira em "três frases de dezesseis palavras" e o bloco cai nas cinquenta sozinho. Trinta e três frases no dossiê inteiro é o teto.

Isto está medido, e a medição corrigiu o que este contrato dizia antes. O diagnóstico velho era que tu escrevia frases demais. Errado: tu respeita o teto de frases e estoura pelo **comprimento** delas. Na última rodada a devolutiva veio com duas frases de trinta e oito palavras cada, dentro do teto de três frases e com vinte e seis palavras a mais que o teto do bloco. O fechamento veio com as quatro frases certas, de vinte palavras cada.

Por isso as duas contagens andam juntas agora. Contar frase sozinho tu já faz bem e não resolve. Contar palavra do bloco tu faz mal, e está medido: tu declarou 369 palavras num bloco de 496, um quarto a menos do que escreveu. Palavra dentro de **uma** frase tu consegue contar, porque são dezesseis coisas, não quatrocentas.

Então o procedimento é este, e ele é mecânico: escreve a frase, conta as palavras **daquela frase**, e se passou de vinte, ela tem duas orações coladas por vírgula. Uma das duas é enfeite. Apaga a de enfeite e passa pra próxima.

**Os alvos somam 502 e o teto é 550.** A Seção 5 diz "cerca de" em cada bloco, e a mira desta tabela lê esse "cerca de" pela margem de baixo de propósito: tu estoura em média doze por cento, e mirar no número cheio faz o dossiê sair do outro lado do teto. Mirando em 502 tu cai dentro da faixa mesmo estourando um pouco. Mirar em 550 é garantir 600.

**Onde tu estoura, medido em nove rodadas:** tu acerta o Ato e o Movimento na mosca e passa de vinte a quarenta por cento na devolutiva, no arquétipo e no fechamento. São os três blocos curtos, e o vício é sempre o mesmo, escrever um parágrafo de prosa onde cabiam três frases. Saber disso de antemão é metade do conserto.

Escreve o fechamento em **quatro frases de quatorze palavras**, uma por batida da Seção 6. Cinco frases tuas dão oitenta palavras e passam do alvo. E o arquétipo é fecho prático, não leitura própria: nome com direção, uma fala dele, a prática, e acabou.

**A devolutiva tem forma fixa, porque ela é o bloco que mais estoura.** Em sete rodadas ela saiu com setenta palavras contra um teto de sessenta, sempre pelo mesmo motivo: tu tenta recapitular as três respostas inteiras. Não é o trabalho dela. O trabalho dela é ele reconhecer que alguém leu.

São três frases e cada uma tem uma tarefa:

1. **Um** fato da Pergunta 1, o mais pesado. Um, não os três que ele listou.
2. **Um** fato da Pergunta 2, com o detalhe que dá a cena.
3. Uma citação literal dele, entre aspas, e nada mais na frase.

Quinze palavras cada. Se tu está escrevendo "e", "além disso" ou uma segunda data na mesma frase, ela virou duas e uma das duas sai.

Esse aperto nos três blocos curtos é o que paga o espaço dos ecos. A Seção 5 manda cortar do arquétipo e da devolutiva, nunca do Ato, do Movimento nem dos ecos, e é assim que a conta fecha.

**Se a análise marcou "material_fino" como true, a tabela inteira encolhe.** A faixa vira 250 a 320 e a mira vira 280, e isso não é o dossiê cheio com os blocos curtos amputados: **todo bloco encolhe na mesma proporção, inclusive o Ato, o Movimento e os dois ecos.** Medido: sem esta linha tu entrega 444 palavras num teto de 320, porque escreve o Ato e o Movimento do tamanho normal e tenta pagar a conta cortando o resto, e o resto não tem 124 palavras pra dar.

| campo | quantas frases | palavras por frase | palavras no bloco, mira |
| --- | --- | --- | --- |
| titulo | 1 | 5 | 5 |
| devolutiva | 2 | 15 | 30 |
| ato_texto | 4 | 18 | 72 |
| movimento_texto | 9 | 15 | 135 |
| arquetipo_texto | 2 | 15 | 30 |
| fechamento | 4 | 10 | 40 |

O fechamento continua com quatro frases mesmo aqui, porque são as quatro batidas da Seção 6 e a última é o convite pro vídeo. No material fino o que encolhe nele é o tamanho da frase, não o número.

O que a Seção 8 continua exigindo no material fino: Ato e arquétipo nomeados, o Movimento como aposta declarada ("pelo pouco que tu contou, o gesto que aparece é X"), os dois ecos contados e o fechamento. Nada disso sai. O que ela proíbe é encher com poesia genérica pra fechar a contagem.

O Ato e o Movimento juntos ocupam cerca de dois terços do dossiê, e é por isso que os números acima são o que são. Se o texto estourar, corta do arquétipo e da devolutiva. Nunca corta do Ato, do Movimento nem dos ecos: foi essa a falha do Teste 1, Ato raso com o arquétipo ocupando espaço demais.

O bloco do Movimento é o maior do dossiê porque carrega os dois ecos contados por inteiro mais a leitura de arco. As 230 palavras dele se dividem assim: umas 70 pro nome, o gesto, a cena e o arco, e umas 80 pra cada história. Se não couber, encurta a **tua leitura sobre o mito**, nunca o que acontece dentro dele. O que o cara guarda é a história, não o teu comentário sobre ela.

Antes de fechar o JSON, escreve em "contagem" o número de palavras que tu contou no título mais os cinco blocos. Escrever um número que não bate com o texto é pior que estourar a faixa.

As citações literais das palavras dele entram entre aspas duplas, escapadas como o JSON exige: "tu resumiu em \\"queria parar de acordar apertado\\" e segue". Aspa simples também é aceita, mas a dupla é a preferida. São pelo menos duas no dossiê, copiadas exatamente como ele escreveu, sem corrigir a gramática dele.

Sobre o nome dele, e isto é obrigatório: o dossiê é escrito antes de ele dar o nome, então onde o nome entraria tu escreve o marcador {{NOME}} e o sistema troca depois.

**A devolutiva abre chamando ele pelo nome**, com o marcador em vocativo e vírgula, exatamente como o dossiê do Anexo 11.5: "{{NOME}}, em sete anos tu deu três fatos...". O marcador tem que aparecer pelo menos uma vez no dossiê, e a abertura da devolutiva é o lugar dele. Dossiê que chega sem o marcador chega sem o nome do cara, e a Seção 9 põe o nome dele entre os obrigatórios.

Uma vez basta. Repetir o nome a cada bloco soa a mala direta.

Se a profissão dele conversar com o material, usa o marcador {{PROFISSAO}} no máximo uma vez, e se não conversar, não usa nenhuma vez.`;

/* ------------------------------------------------------------------ */
/* Mensagens do usuário                                                */
/* ------------------------------------------------------------------ */

/**
 * Mensagem do usuário na chamada 1. Planejamento Seção 3.1.
 *
 * Quatro rótulos para três telas. A terceira tela do Prompt Mãe de 18/09 tem
 * três campos e é gravada em duas respostas, porque o preço de nada mudar tem
 * trabalho próprio: é a dor que ancora o último parágrafo e abre o WhatsApp. O
 * documento acompanha, continua chamando ela de Pergunta 4 nas Seções 4.3 e 6.
 */
export function montarRespostas(respostas: {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
}): string {
  return [
    `P1 (os sete anos): ${respostas.p1}`,
    `P2 (o agora): ${respostas.p2}`,
    `P3 (a busca e o obstáculo): ${respostas.p3}`,
    `P4 (o preço de nada mudar, a dor): ${respostas.p4}`,
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
    ? `Este é um trabalho de apagar, não de escrever. Não redige versão nova de nada: pega o teu texto anterior e tira o que sobra dele.

Trabalha **uma frase por vez**, e só nos blocos que a lista nomeou. Para em cada frase, conta as palavras dela, e se passou de vinte, ela tem duas orações coladas por vírgula. Uma é fato dele e a outra é enfeite. Apaga a de enfeite inteira e segue pra próxima frase. Se o bloco também tem frase demais, aí sim some com a frase que menos carrega fato dele.

O que não funciona, e já foi tentado três vezes: reescrever a frase mais curta. Ela volta com o mesmo tamanho, porque tu reescreve pensando no sentido e o sentido pede as mesmas palavras. Cortar oração funciona porque é uma decisão só, tomada uma vez por frase.`
    : `Corrige cada item da lista mexendo só no que a regra aponta. O resto do texto volta igual.`;

  return `A tua resposta anterior quebrou estas regras:

${erros.map((e) => `- ${e}`).join('\n')}

${como}

A análise continua valendo inteira, o que quebrou foi a escrita. Devolve o JSON inteiro, e só o JSON.`;
}
