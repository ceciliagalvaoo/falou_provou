---
title: Arquitetura
---

# Arquitetura

## Visão geral do sistema

```
                    ┌─────────────────────┐
                    │  Telegram (dono)     │◄──── clientes, fornecedores
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐        ┌──────────────────────┐
                    │   daemon ZeroClaw    │───────►│ Telegram (contador)  │◄── contador
                    │  (agentes: dono,     │        └──────────────────────┘
                    │   contador)          │
                    └──────┬───────┬───────┘
                            │       │
              memory_recall│       │só leitura
                (entre agentes, uma via só)
                            │
              ┌─────────────▼─────────────┐
              │   SOPs (procedimentos)     │   invoice-watch · subscription-pull
              │   + Skills (interpretação) │   pix-watch · supplier-payment
              └──────┬──────────────┬──────┘
                     │              │
        ┌────────────▼───┐   ┌──────▼─────────────┐
        │  Solana (real)  │   │  Pluggy (Open       │
        │  devnet/mainnet │   │  Finance, sandbox)   │
        └─────────────────┘   └──────────────────────┘
```

## Os dois trilhos

### Trilho Solana (USDC)

- **Camada 0, cobrança avulsa**: a skill `solana-pay-invoice` gera um link Solana Pay de verdade,
  com uma chave `reference` por fatura. O SOP `invoice-watch` faz poll na chain e só escreve
  PROVOU depois de **duas leituras independentes**: uma checagem inicial, e uma segunda, feita por
  outro script, que reverifica a assinatura do zero sem confiar no resultado da primeira. Essa
  segunda checagem existe especificamente porque, durante o desenvolvimento, um modelo menor
  **fabricou** uma assinatura falsa uma vez (veja [Segurança e custódia](./security.md)). O desenho
  em dois passos trata isso como risco estrutural permanente, não como bug isolado.
- **Camada 1, assinatura recorrente**: usa o programa on-chain **Subscriptions & Allowances**
  (`De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44`). O cliente autoriza uma vez, definindo um teto
  por período e um prazo de expiração. Esse teto é **imposto pelo próprio programa da Solana**, não
  pelo nosso código de aplicação. Uma chave dedicada do agente (`agent-puller`), usada para executar
  cobranças recorrentes já autorizadas, só consegue chamar uma instrução específica, dentro de um
  teto registrado on-chain pelo programa. Isso é verificável: uma tentativa de puxar acima do teto é
  recusada pelo programa, e não pelo nosso código. Veja o
  [parágrafo completo sobre custódia](./security.md).
- **Camada 1, passo 4, pagamento a fornecedor**: via Solana Actions/Blinks, com duas travas. Primeira:
  o destino precisa bater contra uma allowlist conferida por script, nunca pela leitura que o próprio
  agente faz dela. Segunda: liberar o link exige aprovação humana **fora do chat**, e o agente não
  consegue aprovar o próprio pedido. Isso foi testado sob ataque real, veja Segurança.

### Trilho Pix (BRL)

Via [Pluggy](https://pluggy.ai) (Open Finance), em modo sandbox por escolha de projeto, e não por
atalho: o motivo está em [Reprodutibilidade](../using-it/reproducibility.md). O dono registra um
recebimento alegado ("chegou um Pix de R$50, cliente X") como FALOU. O SOP `pix-watch` lê o extrato
bancário de verdade via Pluggy e só confirma PROVOU se encontrar uma transação real que bata em
valor e janela de tempo. Nunca por uma etiqueta "Pix" no extrato: a conta sandbox da Pluggy não
rotula transações desse jeito, e o texto de extrato real varia demais para se confiar em qualquer
um dos dois.

## Os SOPs (Standard Operating Procedures)

Toda verificação crítica do produto é um SOP: um procedimento de vários passos definido em texto
puro (`SOP.md` + `SOP.toml`), e não uma decisão livre do modelo. Os passos que fazem a conferência
de verdade chamam scripts determinísticos (Python/Node) por `shell`, nunca a "opinião" do próprio
modelo sobre se algo aconteceu.

| SOP | O que verifica | Nunca escreve PROVOU sem... |
|---|---|---|
| `invoice-watch` | Cobrança avulsa via Solana Pay | duas leituras independentes contra a chain |
| `subscription-pull` | Cobrança recorrente | uma chamada `transfer_recurring` real e confirmada |
| `pix-watch` | Recebimento de Pix | uma transação real encontrada no extrato via Pluggy |
| `supplier-payment` | Pagamento a fornecedor | (nunca escreve PROVOU: compartilhar um link não é prova de que um pagamento aconteceu) |

## Custódia, o resumo mais importante de todos

O agente **nunca** segura uma chave sem teto. Existem três padrões de custódia distintos neste
produto, e nenhum deles é "o agente gasta o que quiser":

1. **O cliente sempre assina.** Em toda cobrança avulsa e em toda autorização de assinatura, a única
   assinatura que de fato move ou autoriza dinheiro é a da carteira do próprio cliente. O agente
   nunca vê essa chave privada.
2. **A chave do agente, com teto imposto pelo programa.** A chave `agent-puller`, usada para executar
   cobranças recorrentes já autorizadas, só consegue chamar uma instrução específica, dentro de um
   teto registrado on-chain pelo próprio programa da Solana. Isso é verificável: uma tentativa de
   puxar acima do teto é recusada pelo programa, não pelo nosso código.
3. **Aprovação humana fora do chat.** Pagamentos a fornecedor exigem uma aprovação que o agente não
   consegue se dar, testada sob ataque real.

O detalhamento completo está em [Segurança e custódia](./security.md).

## Stack

- **Runtime do agente**: [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) v0.8.3 (Rust),
  rodando como daemon.
- **Modelo**: Claude Sonnet 4.5, via API da Anthropic. Essa escolha específica é tratada como
  **decisão relevante para segurança**, e não só de custo e qualidade. O motivo está em
  [Segurança e custódia](./security.md).
- **Solana**: `@solana/web3.js`, `@solana/kit`, `@solana-program/token`, `@solana/subscriptions`.
- **Servidor de Actions/Blinks**: Node.js puro, implementando a especificação real de Solana Actions.
- **Pix/Open Finance**: um cliente HTTP mínimo contra a API real da Pluggy, sem SDK.
- **Persistência**: SQLite (memória do agente, estado de execução dos SOPs, cron).
- **Jobs de manutenção**: scripts de custo zero de LLM (nunca chamam o modelo) rodando por cron,
  cuidando de reconciliação de dados e de limpar execuções travadas. Detalhado em
  [Bugs encontrados e corrigidos](../evidence/bugs-found.md).
