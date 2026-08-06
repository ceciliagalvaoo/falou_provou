---
title: O Contexto
---

# Por que isso existe

A maioria dos textos sobre um agente que mexe em dinheiro começa pelo agente. Este começa pelo
comprovante, porque o comprovante é o problema inteiro.

## O comprovante deixou de ser prova

Ao longo de 2026 o varejo brasileiro convergiu para uma frase só, repetida no balcão e nos grupos
de lojista: **"comprovante não é pagamento"**.

Virou frase porque falsificar comprovante deixou de ser artesanato e virou serviço. Bots vendidos
abertamente em grupos de Telegram e WhatsApp geram PDFs indistinguíveis dos do próprio banco, com
logo, fonte e diagramação, em segundos. O golpe do Pix agendado escalou em cima disso, e o Banco
Central mexeu nas regras em fevereiro de 2026 por causa disso.

Então a frase é verdadeira, e sozinha ela não serve para nada. Dizer que comprovante não é
pagamento não diz ao lojista o que **é** um pagamento. É nessa brecha que este produto mora.

## Os livros que estão sendo mantidos não são livros

A brecha importa mais por causa de onde ela cai. Segundo o Sebrae, em
**Hábitos Financeiros dos Pequenos Negócios**:

- **61%** dos donos de pequeno negócio pagam despesa da empresa pela conta pessoal. Era 60% em
  2023, ou seja, não melhorou. No Nordeste chega a **67%**.
- Entre os que controlam as finanças de alguma forma: **30%** usam planilha, **25%** usam
  **caderno de papel**, **20%** usam aplicativo.

Um quarto desse mercado mantém o livro-caixa em um caderno. Isso merece ser dito sem nenhuma
condescendência, porque o caderno não é o erro. Riscar contagem no papel é uma tecnologia honesta
e antiquíssima, e é justamente por isso que os riscos de contagem do sistema visual deste produto
são riscos de contagem de verdade. O que o caderno não consegue fazer é dizer se o dinheiro que
ele registra chegou mesmo. A planilha também não. O aplicativo também não.

## E o dinheiro está chegando por dois lados

A mesma pessoa agora fatura para fora. O levantamento da Payoneer com freelancers brasileiros
encontrou **83%** que já atendem ou pretendem atender clientes no exterior, e de 1.428
desenvolvedores brasileiros que trabalham para organizações estrangeiras, **1.220** trabalham
para americanas. A maioria opera como PJ ou MEI, emitindo nota.

Enquanto isso o Pix corre por baixo de tudo que é doméstico: **36,3 bilhões de transações** entre
janeiro e maio de 2026, movimentando cerca de **R$ 16 trilhões**, segundo números do Banco
Central.

Ou seja: dois trilhos, um livro só, e nenhuma forma de provar nenhum dos dois.

## O regulador fechou uma porta e abriu outra

Desde a **Resolução BCB 521/2025**, operação com stablecoin de moeda estrangeira é operação de
câmbio, com o reporte e o IOF que isso implica. A **Resolução 561/2026** vai além e veda ativo
virtual como trilho de liquidação em eFX a partir de outubro.

Lido de um jeito, isso é aperto. Lido com precisão, é obrigação: o brasileiro que recebe em USDC
hoje precisa de rastro auditável, e ninguém está entregando isso a ele.

## A síntese

> A Solana não tem um problema de trilho no Brasil. Tem um problema de prova.

O trilho existe e é bom. O que trava a adoção é que quem usa não consegue explicar ao contador,
nem à Receita, o que era aquele dinheiro em dólar. O gargalo em 2026 é contábil e regulatório,
não técnico.

## E é por isso que este produto se recusa a ser agradável

O discurso padrão de cripto no Brasil promete rendimento, ou dólar mais barato. Esse discurso
está ficando mais quieto, em parte porque o Banco Central está fechando ele, e em parte porque
todo mundo está fazendo o mesmo.

Este aqui promete uma coisa fora de moda e bem menor: **prova**. O agente vai dizer "não" para o
próprio dono. Vai recusar um comprovante de um cliente de verdade. Vai marcar como
<span className="fp-state fp-state--nao">NÃO PROVOU</span> quando a fonte ficar em silêncio, em
vez de supor discretamente o melhor. Um produto que diz não para quem paga por ele é uma coisa
estranha de se construir, e é a única versão disso que vale alguma coisa.

O resto desta documentação é sobre como essa recusa é imposta no código, e não prometida num
prompt. Comece por [A regra de ouro](/docs/how-it-works/the-golden-rule).

## Por que o Brasil primeiro

O Brasil não é uma versão mais estreita deste problema. É a versão mais difícil: o maior sistema
de pagamento instantâneo do mundo em número de transações, somado a um regime de stablecoin como
câmbio recém-regulado. Construir para cá primeiro significa resolver as partes chatas em vez de
adiá-las.

Duas das três camadas abaixo são adaptadores específicos do Brasil. O núcleo, cobrar e verificar
on-chain, é universal. Alguém em outro país roda o núcleo em uma noite sem encostar em banco
brasileiro.

<div className="fp-figure">

**Tabela 1: O que é local, e o que não é**

| Camada | No Brasil hoje | O que trocar para expandir |
|---|---|---|
| Cobrança e verificação on-chain | Solana Pay + delegação recorrente | Nada muda, é universal |
| Trilho local de recebimento | Pix via Open Finance | SEPA, UPI, SPEI, ACH, um agregador equivalente |
| Conversão e prestação de contas | PTAX, API pública do Banco Central | A taxa de referência local, ou uma fonte de mercado |

</div>

## O que este projeto deliberadamente não afirma

O trilho da Solana já moveu dinheiro de verdade na mainnet-beta, e as assinaturas estão
publicadas em [Validação no mundo real](/docs/evidence/validation). O trilho de Pix roda contra o
sandbox da Pluggy por escolha de projeto, e o motivo está em
[Reprodutibilidade](/docs/using-it/reproducibility). O agente **tem** uma chave privada real e
reutilizável, e o que se garante sobre ela é mais estreito do que "sem chaves": veja
[Segurança e custódia](/docs/how-it-works/security). Tudo que continua em aberto está listado,
sem maquiagem, em [Bugs encontrados e corrigidos](/docs/evidence/bugs-found).

## Uma nota sobre estes números

Todo dado acima vem com a fonte na mesma frase, porque um texto que infla um número perde o
benefício da dúvida em todos os outros. Os números do Sebrae, da Payoneer e do Banco Central são
os que sustentam o argumento. Se você está conferindo este documento, são esses os quatro para
conferir.
