---
title: A Regra de Ouro
---

# A regra de ouro

Todo o resto deste projeto é detalhe de implementação de uma regra só. Ela merece uma página
própria, porque é a coisa que precisa sobreviver ao contato com um modelo de linguagem, com um
usuário hostil e com um dia ruim.

> Um lançamento só é marcado como provado quando a própria fonte confirma.

## Os três estados

Todo lançamento do caixa, em qualquer um dos dois trilhos, está em exatamente um destes estados.
Não existe um quarto, e não existe meio ponto.

<div className="fp-figure">

**Tabela 1: Os três estados, e como cada um se conquista**

| Estado | O que significa | Como se conquista | Quem consegue falsificar |
|---|---|---|---|
| <span className="fp-state fp-state--falou">FALOU</span> | Alegado | Alguém disse que aconteceu, incluindo o dono ao lançar na mão | O dono, e só contra si mesmo |
| <span className="fp-state fp-state--provou">PROVOU</span> | Provado | Uma assinatura confirmada lida da Solana, ou uma transação lida do extrato bancário de verdade via Pluggy | Ninguém |
| <span className="fp-state fp-state--nao">NÃO PROVOU</span> | Não provado | Alegado, e a fonte foi consultada e não confirmou | — |

</div>

Duas coisas nessa tabela importam mais do que parecem.

**FALOU não é estado de fracasso.** Toda alegação é registrada no instante em que é feita,
inclusive as que depois se revelam falsas. Nada é escondido nem descartado em silêncio: apenas
ainda não é tratado como verdade. Um livro que joga fora discretamente o que não consegue
verificar é um livro que mente por omissão.

**NÃO PROVOU é uma afirmação mais forte do que "não sei".** Não quer dizer que a checagem foi
pulada ou deu timeout. Quer dizer que a fonte foi consultada de verdade, e a fonte não confirmou.
Colapsar "conferi e não está lá" em "não sei" jogaria fora o sinal mais útil do sistema inteiro.

## O que nunca conquista PROVOU

Nenhum artefato que um humano consiga produzir move um lançamento para provado. Nem print, nem
PDF, nem mensagem encaminhada de WhatsApp, nem e-mail de confirmação do banco, nem o dono
insistindo. Tudo isso é alegação, e alegação é
<span className="fp-state fp-state--falou">FALOU</span>.

A leitura que o próprio modelo faz dessas coisas também não conta. Um agente que olha a imagem de
um comprovante e conclui "isto parece um pagamento válido" produziu uma alegação, não uma prova:
ele só lavou uma alegação humana através de uma máquina.

Só vale uma leitura direta e independente da fonte de verdade:

- **Solana**: uma assinatura confirmada, buscada com `getTransaction` e reconferida do zero.
- **Pix**: uma transação encontrada no extrato bancário de verdade, lida pela API de Open Finance
  da Pluggy, casada por valor e janela de tempo.

## Onde a regra mora de verdade

A regra não é imposta pedindo bom comportamento ao modelo. Ela é imposta pelo formato dos
procedimentos que ele é obrigado a rodar.

Toda verificação crítica é um **SOP**: um procedimento de vários passos definido em texto puro
(`SOP.md` + `SOP.toml`), em vez de deixado ao julgamento do modelo. Os passos que fazem a
conferência de fato chamam scripts determinísticos por `shell`. O trabalho do modelo é decidir
**qual** procedimento se aplica e conversar com o humano. Ele nunca é a coisa que decide se o
dinheiro chegou.

<div className="fp-figure">

**Tabela 2: Sem o que cada procedimento não escreve PROVOU**

| SOP | O que verifica | Nunca escreve PROVOU sem... |
|---|---|---|
| `invoice-watch` | Cobrança avulsa via Solana Pay | duas leituras independentes contra a chain |
| `subscription-pull` | Cobrança recorrente | uma chamada `transfer_recurring` real e confirmada |
| `pix-watch` | Recebimento de Pix | uma transação real encontrada no extrato via Pluggy |
| `supplier-payment` | Pagamento a fornecedor | nunca escreve PROVOU: compartilhar um link de pagamento não é prova de que um pagamento aconteceu |

</div>

A última linha é a regra sendo honesta sobre o próprio limite. Soltar um Blink para um fornecedor
é uma ação que o agente tomou, não um desfecho que ele observou, então continua alegação para
sempre.

## Duas leituras independentes, e por quê

O `invoice-watch` não confirma um pagamento uma vez. Ele confirma, e depois um segundo script
reverifica a assinatura do zero, sem confiar no resultado do primeiro.

Essa redundância não é paranoia genérica, é cicatriz. Durante o desenvolvimento, um modelo menor
**fabricou uma assinatura** que nunca existiu, e o lançamento foi carimbado como provado em cima
disso. O incidente completo, inclusive o que mudou depois, está em
[Segurança e custódia](/docs/how-it-works/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule).

A correção que importou não foi "usar um modelo melhor". Foi deixar o caminho de verificação
estruturalmente incapaz de aceitar um valor produzido pelo modelo.

## A regra sob ataque

A regra foi testada contra o agente rodando ao vivo, e não só argumentada: comprovantes
fabricados, uma tentativa de escrever um lançamento provado sem nunca encostar na chain, uma
tentativa de burlar a aprovação de pagamento a fornecedor, e um prompt injection exigindo
transferência de fundos do agente contador, que é só de leitura.

Cada tentativa, e o que ela devolveu, está documentada em
[Segurança e custódia](/docs/how-it-works/security#real-attacks-tested-against-the-live-agent).
