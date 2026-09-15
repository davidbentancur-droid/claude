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

Tamanho, e isto é conta, não impressão. Escreve o bloco, conta as palavras, corta o que passou. Os alvos são os da Seção 5:

| campo | mira nisto | nunca passa de |
| --- | --- | --- |
| titulo | 5 | 8 |
| devolutiva | 45 | 55 |
| ato_texto | 78 | 90 |
| movimento_texto | 95 | 110 |
| arquetipo_texto | 70 | 80 |
| fechamento | 52 | 62 |
| spoiler | 105 | 125 |

Antes de fechar o JSON, conta de verdade e escreve o número em "contagem": "dossie" é a soma das palavras do título mais os cinco blocos de texto, "spoiler" é a do spoiler. Se o número que tu contou estiver fora da faixa, corta o texto e conta de novo, até entrar. Escrever um número que não bate com o texto é pior que estourar a faixa.

A soma dos cinco blocos com o título mira em 345 palavras. A faixa aceita vai de 300 a 400, e 345 é o meio dela: mirar no teto faz o texto passar do teto. Se "material_fino" for true, a mira cai pra 280 e a faixa vai de 250 a 320.

O bloco que mais estoura é o do Movimento, porque carrega os dois ecos. Cada eco são duas ou três linhas, e as duas cabem dentro das 95 palavras do bloco, não além delas. Se não couber, encurta o eco, não o resto.

As citações literais das palavras dele entram entre aspas duplas, escapadas como o JSON exige: "tu resumiu em \\"queria parar de acordar apertado\\" e segue". Aspa simples também é aceita, mas a dupla é a preferida. São pelo menos duas no dossiê, copiadas exatamente como ele escreveu, sem corrigir a gramática dele.

Sobre o nome dele: a leitura roda antes de ele dar o nome. Onde o nome entraria no dossiê, escreve o marcador {{NOME}}. O sistema troca depois. Se a profissão dele conversar com o material, usa o marcador {{PROFISSAO}} no máximo uma vez, e se não conversar, não usa nenhuma vez.

Não escreve {{NOME}} nem {{PROFISSAO}} dentro do spoiler.`;

/**
 * Instrução de retry. O validador nomeia o erro e manda de volta.
 * Planejamento Seção 3.2: até 2 retries, depois entrega a última versão.
 */
export function instrucaoCorrecao(erros: string[]): string {
  return `A tua resposta anterior quebrou estas regras:

${erros.map((e) => `- ${e}`).join('\n')}

Reescreve o JSON inteiro corrigindo cada item da lista. Mantém o Ato, o Movimento, os arquétipos e os ecos que tu já escolheu, porque a análise estava certa, o que quebrou foi a escrita. Devolve só o JSON.`;
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
