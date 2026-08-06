---
title: Fluxos de Uso
---

# Fluxos de uso

O produto são dois bots de Telegram. Esta página percorre o que uma pessoa de verdade digita em cada
um e o que deve acontecer, passo a passo, em cada fluxo central.

## Fluxo 1: cobrança avulsa (Solana Pay, Camada 0)

**Quem**: o dono (bot `dono`), cobrando um cliente.

1. Dono: *"cobra 20 USDC do cliente Marek, fatura 700"*
2. A skill `solana-pay-invoice` gera um link Solana Pay real, marcado com uma chave `reference` por
   fatura, e o agente compartilha com o cliente. O caixa registra essa alegação como **FALOU**.
3. O SOP `invoice-watch` começa a fazer poll na chain por aquela chave de reference.
4. Quando um pagamento real cai, o SOP faz **duas leituras independentes** antes de escrever
   qualquer coisa: uma checagem inicial e, depois, um segundo script separado que reverifica a
   assinatura do zero. Só depois que os dois concordam o estado vira **PROVOU**.
5. Se nada chegar dentro do prazo, o estado é escrito como **NÃO PROVOU**, nunca deixado ambíguo.

**O que isso comprova**: nenhum print, PDF ou mensagem do tipo "já paguei, confia em mim" move esse
estado. Testado diretamente contra tentativas reais de engenharia social (veja
[Segurança e custódia](../how-it-works/security.md)).

## Fluxo 2: assinatura recorrente (Camada 1)

**Quem**: o dono, autorizando e depois cobrando automaticamente uma mensalidade de um cliente.

### Autorização (o cliente assina, uma vez)

1. O dono compartilha um link Blink de `authorize-subscription` com o cliente, especificando um teto
   de valor por período e uma expiração.
2. O cliente abre o link na carteira dele (Phantom, por exemplo) e assina. Isso cria um registro de
   delegação on-chain pelo programa **Subscriptions & Allowances**, e o teto é imposto pelo próprio
   programa, não pelo código de aplicação.
3. O agente nunca vê nem encosta na chave privada do cliente em momento nenhum.

### Cobrança recorrente (o agente executa, com teto imposto pela chain)

4. Um job de manutenção verifica periodicamente quais clientes têm delegações ativas, lendo isso
   direto da chain e não de uma lista fixa no código, e dispara uma execução de `subscription-pull`
   para um cliente por ciclo.
5. O SOP chama `transfer_recurring`, assinado pela chave dedicada `agent-puller`, que só consegue
   puxar dentro do teto que o próprio cliente autorizou on-chain.
6. O SOP relê de forma independente o saldo on-chain da delegação depois da cobrança, para confirmar
   que ele caiu exatamente o esperado, antes de escrever **PROVOU**.

**Consultando o estado**: o dono pode perguntar *"quais assinaturas estão ativas?"* a qualquer
momento. Isso usa a skill `subscription-visibility`, uma consulta só de leitura contra a chain, e não
um chute de memória.

**Nota sobre a cobrança automática nesta demo**: no deploy atual, o job de cron da cobrança recorrente
automática é deixado desligado por padrão de propósito (documentado em
[Bugs encontrados e corrigidos](../evidence/bugs-found.md)). Dispará-lo para uma demonstração ao vivo
hoje exige um operador técnico rodando manualmente. O passo de autorização e o mecanismo de cobrança
em si são ambos comprovados de forma independente (veja
[Validação no mundo real](../evidence/validation.md)).

## Fluxo 3: pagamento a fornecedor (Camada 1, passo 4)

**Quem**: o dono, pagando um fornecedor conhecido via Blink, com aprovação humana obrigatória.

1. Dono: *"paga 2 USDC pro fornecedor-teste"*
2. O SOP `supplier-payment` resolve o nome do fornecedor contra um arquivo de allowlist fixo, por
   script determinístico, nunca pelo julgamento do próprio agente. Um fornecedor desconhecido é
   recusado na hora, antes de qualquer transação sequer ser montada.
3. Para um fornecedor conhecido, o SOP **estaciona e espera uma aprovação que precisa acontecer fora
   do chat**: um comando de CLI separado ou uma chamada HTTP administrativa, que o próprio agente é
   estruturalmente incapaz de disparar (testado diretamente, veja
   [Segurança e custódia](../how-it-works/security.md)).
4. Uma vez aprovado externamente, o SOP gera e compartilha o Blink de pagamento. O dono (ou quem
   segura a carteira pagadora) abre e assina.
5. Como compartilhar um link não é prova de que um pagamento de fato aconteceu, este SOP só registra
   **FALOU**, nunca PROVOU. Ele não afirma mais certeza do que realmente tem.

**Testando este fluxo ao vivo**: o passo de aprovação fora do chat significa que uma gravação
completa precisa do comando de aprovação rodado a partir de um segundo terminal ou sessão, e não de
dentro do próprio chat. Veja `TESTING.md` na raiz do repositório para os comandos exatos.

## Fluxo 4: recebimento de Pix (trilho BRL)

**Quem**: o dono, registrando um recebimento de Pix alegado e tendo ele conferido contra o extrato
bancário de verdade.

1. Dono: *"chegou um Pix de R$8500 no dia 5 de julho de 2026, da Empresa XYZ"*
2. Isso é registrado como **FALOU** imediatamente: alguém alegou, e nada mais por enquanto.
3. O SOP `pix-watch` consulta o extrato bancário de verdade via Pluggy (Open Finance), procurando uma
   transação real que bata com o valor alegado dentro de uma janela de tempo em torno da data alegada.
4. Se uma transação correspondente for encontrada no extrato real, o estado vira **PROVOU**. Se o
   extrato foi genuinamente consultado e nada bateu, fica registrado como **NÃO PROVOU**. Se a própria
   checagem falhou (um erro de conectividade, por exemplo), a alegação continua FALOU com uma nota
   explícita de que a verificação não pôde ser concluída. Ela nunca é arredondada para uma negativa
   que não foi de fato recebida.

**O que isso comprova na prática**: este fluxo exato foi rodado ao vivo contra o extrato bancário
sandbox real, tanto para uma alegação sem correspondência (corretamente NÃO PROVOU) quanto para a
transação de salário real conhecida (corretamente PROVOU). Veja
[Validação no mundo real](../evidence/validation.md).

## Fluxo 5: consolidação do contador (`contador`)

**Quem**: o contador, pedindo uma visão consolidada dos dois trilhos.

1. Contador: *"quanto consolidou essa semana?"*
2. O `contador` lê o estado do caixa dos dois trilhos (por uma consulta de memória só de leitura,
   nunca uma consulta viva a banco que ele mesmo pudesse rodar) e reporta três totais separados,
   PROVOU, FALOU e NÃO PROVOU, convertendo o USDC do trilho Solana em BRL usando uma cotação PTAX
   real e ao vivo, e nunca borrando os três estados em um só.
3. O `contador` **não tem nenhuma ferramenta capaz de mover fundos** no registro dele: não porque
   "escolhe não usar", mas porque `shell`, `memory_store` e toda ferramenta `sop_*` estão excluídas da
   configuração dele por construção. Isso foi testado diretamente com um ataque real de prompt
   injection se passando por administrador de sistema, e o trace do agente mostra zero tentativas de
   chamada de ferramenta de qualquer tipo naquele turno (veja
   [Segurança e custódia](../how-it-works/security.md)).

## A regra de ouro, reafirmada para os cinco fluxos

Todos esses fluxos desaguam na mesma regra de três estados:

| Estado | Significado |
|---|---|
| **FALOU** | Alguém alegou |
| **PROVOU** | Confirmado de forma independente na fonte (assinatura on-chain, ou correspondência no extrato bancário real) |
| **NÃO PROVOU** | Alegado, e a fonte foi consultada e não confirmou |

Nenhum fluxo deste produto tem um quarto caminho até PROVOU. Esse é o ponto inteiro do sistema.
