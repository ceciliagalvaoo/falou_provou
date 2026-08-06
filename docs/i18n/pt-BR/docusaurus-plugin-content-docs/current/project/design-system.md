---
title: Sistema de Design
---

# Tinta sobre Creme

A landing page, este site de documentação e as duas pequenas páginas de operador rodam todos sobre
um sistema de design só. Ele está escrito aqui porque um projeto sobre não afirmar aquilo que você
não consegue mostrar não deveria ter uma interface que se enfeita com coisas que não significam nada.

Três regras geram quase tudo:

1. **Tinta sobre creme.** Um fundo de papel quente, uma tinta turquesa. Sem superfícies escuras, sem
   gradientes, sem glassmorphism, sem sombra fazendo o trabalho que um fio de cabelo faz, e sem
   nenhum bloco chapado de cor em lugar nenhum, exceto um botão primário, que é ação e não rótulo.
   Ênfase se faz com um traço desenhado, não com uma caixa colorida.
2. **Nada é decorativo se também não for verdade.** Os riscos de contagem contam coisas reais. Os
   três chips de estado são os três estados reais. O selo da marca é o selo do caixa.
3. **Traço é desenhado, não colocado.** Todo traço da página é um traço: ele se desenha ao longo do
   próprio caminho, e tem permissão de sair torto.

## Cor

<div className="fp-figure">

**Tabela 1: A paleta, e onde cada cor pode aparecer**

| Token | Valor | Usada para | Contraste no creme |
|---|---|---|---|
| `--cream` | `#f4f0e5` | a página | — |
| `--cream-deep` | `#ebe5d6` | cartões, poços | — |
| `--ink` | `#0e3d3f` | texto corrido, títulos | 10,5:1 |
| `--ink-soft` | `#427070` | texto secundário | 4,8:1 |
| `--turquoise` | `#0a7575` | links, botões, eyebrows, PROVOU | 4,8:1 |
| `--turquoise-bright` | `#14a8a0` | só traços de pincel, nunca texto | — |
| `--vermilion` | `#c0391b` | NÃO PROVOU, destrutivo | 4,8:1 |
| `--amber` | `#92590f` | em andamento: "conferindo a fonte…" | 5,0:1 |

</div>

A tinta é um verde-azulado profundo em vez de um azul-marinho, de propósito: a paleta inteira fica
dentro de uma família de matiz só, então o turquesa lê como a cor do projeto e não como um destaque
emprestado sobre um neutro. Toda cor que carrega texto passa de 4,5:1 contra a página.

Cor nunca é o único sinal. Cada um dos três estados carrega o próprio nome por escrito, além do
tratamento visual, porque quem não consegue separar o chip turquesa do chip vermelhão ainda precisa
conseguir ler o caixa.

## Tipografia

Três famílias, cada uma com um trabalho.

- **Cormorant Garamond**: display. Títulos, títulos de cartão, os números dos passos, e o número
  único de uma estatística. Uma serifada em tamanho grande é o que impede uma página minimalista de
  parecer um template.
- **Inter**: tudo o que você realmente lê. Texto corrido, rótulos, botões.
- **IBM Plex Mono**: a voz da máquina. Assinaturas, handles, valores lidos de um extrato, e os três
  chips de estado. Se uma string veio de uma chain ou de um banco em vez de vir de uma pessoa, ela é
  monoespaçada.

O **eyebrow** é o tecido conjuntivo do sistema: 11px, peso 500, `0.18em` de entreletra, caixa alta.
Rótulos de seção, cabeçalhos de tabela e chapéus de cartão usam todos ele, então a estrutura de uma
página é legível antes de uma palavra dela ser lida.

## A marca

Uma garra segurando um selo de prova, desenhada com quatro traços de tinta e nada mais. A garra é o
ZeroClaw; o selo é a única coisa que consegue carimbar um lançamento. Ela tira a cor de
`currentColor`, então um arquivo só serve o cabeçalho, o hero e o favicon sem uma segunda cópia em
uma segunda cor.

A **trava tipográfica** põe `falou` de forma discreta, em display itálico, e `PROVOU` na fonte da
própria máquina, monoespaçada, com um carimbo desenhado em volta: duas voltas, à mão, na mesma tinta
da marca. Ela deliberadamente **não** é vazada de dentro de um bloco chapado. Um retângulo saturado
seria a coisa mais alta de uma página feita inteira de traços e fios de cabelo, e estaria gritando em
vez de carimbando. Circular a palavra que importa é o gesto que uma pessoa de fato faz numa página
impressa, e ele pertence à mesma mão que desenhou todo o resto.

A mesma contenção vale para os três chips de estado: uma forma, três tintas.
<span className="fp-state fp-state--falou">FALOU</span> em tinta suave atrás de um fio de cabelo,
<span className="fp-state fp-state--provou">PROVOU</span> em turquesa sobre uma lavagem turquesa
fraca, e <span className="fp-state fp-state--nao">NÃO PROVOU</span> em vermelhão. Em que estado um
lançamento está se lê pela palavra e pela cor dela, nunca por um dos três estar mais alto que os
outros dois.

## Tinta

**Traços de pincel** são dois ou três caminhos deslocados em opacidade decrescente, empurrados por um
filtro de deslocamento `feTurbulence` para que as bordas nunca fiquem mecânicas. Essa sobreposição é
o que lê como guache e não como linha vetorial. Eles são usados grandes, assimétricos e sangrando
para fora da borda: cantos do hero, réguas de seção, atrás de uma chamada final. Nunca são usados
pequenos, e nunca como ícone.

**Riscos de contagem** são quatro traços em pé e um quinto na diagonal, desenhados à mão com uma leve
tremida para que nenhum seja igual ao outro. Eles aparecem só onde algo real está sendo contado: dois
bots no ar, três padrões de custódia. Um risco que não conta nada seria exatamente o tipo de
afirmação decorativa que este projeto existe para recusar.

## Movimento

Movimento serve para uma coisa: mostrar que algo foi *desenhado*. Traços se pintam ao longo de
`stroke-dashoffset` em cerca de 1,3 segundo; o conteúdo sobe 10 pixels e assenta ao entrar em cena; o
cartão de demonstração leva uma alegação por "conferindo" até a prova em um ciclo de quatro segundos.

Nada disso é estrutural. Sob `prefers-reduced-motion: reduce` toda animação para e, o que é
importante, tudo que anima *a partir de* `opacity: 0` volta fixado em visível, para que quem pediu
menos movimento receba uma página pronta em vez de uma página vazia.

## Layout e responsividade

- Uma casca só, máximo de `1100px`, com `1.5rem` de respiro lateral em qualquer largura.
- O ritmo de seção é `3.5rem` de respiro vertical no celular e `6rem` a partir de 48rem.
- Tipografia de display é definida com `clamp()` em vez de por breakpoint, para que um título seja
  proporcional à tela em vez de pular entre dois tamanhos fixos.
- Conteúdo largo, como tabelas, assinaturas e código, rola dentro da própria caixa. O corpo da página
  nunca rola de lado, em largura nenhuma.
- Strings longas e sem quebra (uma assinatura da Solana, um handle de bot) recebem
  `overflow-wrap: anywhere`, porque uma string base58 de 88 caracteres alarga sozinha o layout de um
  celular.

## Onde isso está implementado

<div className="fp-figure">

**Tabela 2: Um sistema, três superfícies**

| Arquivo | Superfície |
|---|---|
| `landing/styles.css` | a landing page: o sistema inteiro, como custom properties, sem etapa de build |
| `docs/src/css/custom.css` | este site: os mesmos tokens, mapeados nas variáveis do Infima |
| `docs/src/components/ink/` | `Mark`, `BrushStroke` e `TallyMarks` como componentes React |
| `docs/src/pages/index.module.css` | a página inicial deste site |
| `pix-rail/connect-page/index.html` | a página de conexão bancária, de uso único |
| `tooling/actions-server/*.html` | as páginas de teste de Blink em mainnet |

</div>

Os tokens são duplicados em vez de compartilhados, porque a landing page não tem etapa de build e
importar uma folha de estilo entre três alvos de deploy compraria menos do que custaria. Eles são
mantidos em sincronia à mão, e a tabela de cores acima é a fonte da verdade.
