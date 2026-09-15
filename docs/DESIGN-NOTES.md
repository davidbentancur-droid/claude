# Notas de design

Registro das decisões de tela. O planejamento pedia este documento antes de codar; ele foi escrito junto, e o que está aqui é o que efetivamente foi construído, não um plano anterior. Vale como referência pra quem mexer depois.

## A regra que organiza tudo

Uma coisa memorável por página, e ela é o infográfico. Todo o resto fica quieto. Isso decide quase todas as escolhas abaixo: nada de eyebrow, nada de palavra colorida no meio do título, nada de card com sombra, nada de barra de progresso, uma transição só entre telas.

O único outro destaque tipográfico do dossiê são as citações literais do usuário, em itálico dourado. Elas ganham esse peso porque carregam significado: são as palavras dele voltando sem correção, e é o que faz ele confiar no resto.

## Tokens

Os do planejamento Seção 5, sem mudança. Preto quente `#0E0C0A` em vez de preto puro, creme `#EDE6D8` no texto, dourado `#C9A85C` em título e traço. Bordas de 1px em `--line`. Cantos retos em tudo, aplicado por um reset global em `*`.

A placa do infográfico usa a paleta do método (Prompt Mãe Seção 7) e não os tokens da página. Ela está em hexadecimal em `components/dossie/espiral.ts` e não como variável CSS, porque a placa é exportada em PNG por canvas e variável de CSS não resolve em SVG serializado. São cores do método, não do tema, então fixar é honesto.

## Wireframes

```
TELA 0 · Abertura                     TELA 2-5 · Pergunta
┌──────────────────────────┐          ┌──────────────────────────┐
│                          │          │ 1 de 4                   │
│  Quatro perguntas. Uma   │          │                          │
│  leitura da tua vida     │          │  Volta uns sete anos     │
│  com as tuas palavras.   │          │  pra trás. Quais foram…  │
│  Leva uns oito minutos…  │          │  Escolhe duas ou três…   │
│                          │          │  ┌────────────────────┐  │
│  [ Começar ]             │          │  │ Assim não / sim    │  │
│  Nenhum dado é pedido…   │          │  └────────────────────┘  │
│                          │          │  ┌────────────────────┐  │
└──────────────────────────┘          │  │ campo              │  │
                                      │  └────────────────────┘  │
TELA 6 · Lendo                        │  (o) Falar em vez de…    │
┌──────────────────────────┐          │  [ Enviar ]              │
│                          │          └──────────────────────────┘
│           ╭───╮          │
│          ─┼───┼─         │          TELA 9 · Dossiê
│           ╰───╯          │          ┌──────────────────────────┐
│                          │          │  Título, dourado         │
│  Separando cena de       │          │  Devolutiva              │
│  resumo.                 │          │  Onde tu está            │
└──────────────────────────┘          │  ┌────────────────────┐  │
                                      │  │ PLACA CREME        │  │
TELA 8 · Formulário                   │  │  ○   Prova         │  │
┌──────────────────────────┐          │  │ (◐)                │  │
│  Pra liberar a tua       │          │  └────────────────────┘  │
│  leitura                 │          │  Guardar a imagem        │
│  Nome                    │          │  O gesto que voltou…     │
│  Como tu quer ser…       │          │  A força que pede…       │
│  ┌────────────────────┐  │          │  Fechamento              │
│  └────────────────────┘  │          │  A leitura inteira…      │
│  … mais três campos      │          │  ┌────────────────────┐  │
│  [ Abrir o dossiê ]      │          │  │ VSL 16:9           │  │
└──────────────────────────┘          │  └────────────────────┘  │
                                      └──────────────────────────┘
```

## Decisões que mereceram discussão

**A placa muda de proporção conforme exista arte de card.** São quatro layouts, não dois. Sem a arte oficial (hoje, todos os 20), a placa larga de 720x420 deixaria metade da área vazia com uma palavra solta, o que lê como imagem quebrada. A versão sem card é 620x400 no desktop e 360x440 no celular, com o nome do Movimento centrado embaixo do círculo. Quando os cards chegarem, `tem_card` vira true em `lib/movimentos.ts` e a placa larga volta sozinha.

**A marca de posição fica sobre a borda, não no meio do setor.** No meio ela colidia com o nome do Ato, que também é escrito no eixo central do setor. Na borda ela também lê melhor como posição ao longo da travessia, que é o que ela significa. Leva um anel creme de 2px pra sobreviver tanto ao setor aceso quanto ao papel, sem precisar de sombra.

**A exportação em PNG redesenha em Canvas2D, não serializa o SVG.** `Path2D` aceita o mesmo path do SVG, e `fillText` usa as fontes já carregadas no documento. Um SVG serializado dentro de `<img>` perderia Cormorant e Archivo e cairia em Georgia, o que estragaria a peça justamente na hora em que ela vai pro WhatsApp.

**O limiar do IntersectionObserver é 60% ou o que couber na tela.** Numa placa mais alta que a janela, 60% nunca é alcançado e a animação não roda nunca. O código desce o limiar pro que a janela comporta quando for o caso.

**A P3 tem dois campos com microfone em cada um.** A pergunta pede uma frase pra cada, e áudio pra uma frase é exagero, mas remover o botão quebraria a promessa de "escrevendo ou falando" feita no enquadramento. Dois círculos de 44px é o custo aceitável.

**A ênfase em "cena" no enquadramento.** É a única liberdade tomada sobre a copy literal do Prompt Mãe: a palavra aparece em dourado. A frase inteira existe pra ensinar o que é cena, e o destaque faz esse trabalho sem mudar uma letra. Fácil de remover se o Adriano não gostar.

## Lista de "o que não fazer", conferida

| Item | Situação |
|---|---|
| Eyebrow em caixa alta acima de título | não existe |
| Palavra destacada em cor dentro do título | não existe (o dourado está no título inteiro do dossiê) |
| Card com border-radius e sombra | reset global zera radius, nenhuma sombra no CSS |
| Barra de progresso | só o contador "1 de 4" em 13px |
| Emoji na UI | nenhum; os do Prompt Mãe ficam na tabela interna |
| Botão de compra ou countdown | não existe |
| Menção a IA | nenhuma; a tela de espera fala de cena e gesto |
