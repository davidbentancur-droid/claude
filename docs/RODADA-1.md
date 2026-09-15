# Rodada 1 · o engine rodando de verdade

Primeira execução do engine contra as oito fixtures, com `claude-sonnet-5`. Este documento é o insumo da pendência 1 do Prompt Mãe Seção 12: comparar o Ato e o Movimento que o quiz crava com o da leitura completa.

Reproduzir: `pnpm engine:fixture --todas 1`. As saídas completas ficam em `tmp/leituras/`.

## O resultado

| fixture | esperado | Ato | Movimento | Arquétipos | dossiê | validação |
|---|---|---|---|---|---|---|
| marcelo | Iniciação, Prova (9) | Iniciação (meio) | **9 Prova**, recorrência | Rei ↓, Guerreiro ↓ | 392 | passou |
| partida | Partida | **Partida** (meio) | 2 Recusa, recorrência | Guerreiro ↓, Rei ↓ | 378 | passou |
| retorno | Retorno | **Retorno** (meio) | 19 Acerto de Contas | Rei ↓, Amante ↓ | 388 | passou |
| fino | material fino, aposta | Retorno (meio) | 2 Recusa, **aposta** | Rei ↓, Mago ↓ | **298** | passou |
| agencia-zero | Rei ↓ | Iniciação (meio) | 8 Naufrágio, recorrência | **Rei ↓**, Guerreiro ↓ | 364 | passou |
| so-outra-pessoa | lê o gesto dele | Iniciação (meio) | 8 Naufrágio, recorrência | Rei ↓, Guerreiro ↓ | 376 | reprovou, `formula_nao_e` |
| piada | desvio J | — | — | — | — | **desvio piada**, 11 s |
| risco | desvio R | — | — | — | — | **pré-filtro**, sem chamada |

O Ato saiu certo em todas as fixtures direcionais. O caso canônico do Anexo 11.1 reproduziu item por item, em mais de doze execuções seguidas: Iniciação (meio), Movimento 9 Prova com recorrência detectada, Rei ↓ e Guerreiro ↓ com o Rei para fortalecer primeiro, e os ecos Jacó (bíblica) mais Odisseu (grega).

O protocolo de material fino funcionou sozinho: a fixture `fino` foi detectada como tal, o dossiê veio com 298 palavras dentro da faixa reduzida, e o Movimento entrou marcado como aposta.

A única reprovação real foi em `so-outra-pessoa`, na frase "Não foi uma decisão tua nem da Lú, foi". É a fórmula banida de verdade, não falso positivo, e um retry a teria reescrito. O retry não rodou porque o orçamento de tempo estava esgotado, que é o problema da seção seguinte.

## Latência, e o problema que ela cria

| configuração | latência | análise | validação de estilo |
|---|---|---|---|
| esforço alto, raciocínio ligado | 108 a 126 s | correta | variou |
| esforço médio, raciocínio ligado | 29 a 30 s, com picos de 108 s | correta | tamanho sempre estourava |
| esforço baixo mais retry | 52 s | correta | passou em 1 de 2 |
| raciocínio desligado | 29 s, cravado | correta | tamanho **sempre** estourava |
| **baixo, com contagem declarada** | **88 a 160 s** | correta | **passou em 3 de 3** |

A leitura é a mesma em todas as linhas. O que varia é só a disciplina de tamanho, e ela custa tempo de raciocínio: contar palavras e cortar é o único passo que o modelo não faz de improviso. Com o raciocínio desligado o texto sai bom e sempre longo demais; com ele ligado o texto entra na faixa e a latência vai a dois minutos.

**A configuração que passa na validação leva de 88 a 160 segundos, e o plano Hobby da Vercel corta a função em 60.** Não é ajuste fino que resolve.

Duas saídas, não excludentes:

1. **Vercel Pro.** Sobe o teto para 300 s e cabe a leitura mais dois retries com folga. Destrava hoje.
2. **Dividir em duas chamadas.** Spoiler primeiro, rápido, e o dossiê gerado enquanto ele preenche o formulário, com a análise da primeira chamada passada para a segunda para preservar a regra de honestidade da Seção 4.1. Esconde a latência inteira do usuário, e é a arquitetura melhor, mas é refatoração deliberada.

## O que esta rodada corrigiu no código

1. **`temperature` não existe na família Claude 5** e devolve 400. O planejamento fixava 0.7, parâmetro da geração anterior. O controle equivalente é `output_config.effort`.
2. **O modelo cita com aspas simples**, para não escapar aspas duplas dentro do JSON. Nem o validador nem o `partirCitacoes` da tela reconheciam isso, então as citações passavam despercebidas pela régua e não ganhavam o destaque dourado, que é o único destaque tipográfico do dossiê. Agora existe `lib/citacoes.ts`, usado pelos dois.
3. **Os alvos de palavra por bloco do Prompt Mãe somam 390**, que é o topo da faixa de 300 a 400. Pedir o topo garante estouro. O contrato agora mira em 345, o meio da faixa.
4. **O modelo não contava as palavras.** Pedir que ele declare a contagem num campo do JSON foi o que o fez contar: de 3 reprovações em 3 para 3 aprovações em 3.
5. **Termo clínico que o próprio usuário escreveu não é diagnóstico do agente.** A fixture `so-outra-pessoa` conta que a mulher teve "depressão pós parto em 2020"; devolver esse fato é repetir o material dele. O que o Prompt Mãe proíbe é o agente aplicar a categoria.
6. **Streaming e cache do system prompt.** O Prompt Mãe são mais de dez mil tokens idênticos em toda leitura; em cache, essa parte da entrada custa uma fração. O streaming evita timeout de HTTP numa chamada longa.

## O que ainda não foi medido

- Casos reais da Rodada 1, com material de gente de verdade. Todas as fixtures são construídas.
- Variância do Movimento em material ambíguo. Cada fixture rodou uma vez, salvo `marcelo`.
- Se `effort` mais alto muda a leitura em material difícil. Nas fixtures não mudou nada, mas todas elas são claras por construção.
