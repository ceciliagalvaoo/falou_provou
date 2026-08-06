---
title: Validação no Mundo Real
---

# Validação no mundo real

Esta página existe para fechar a pergunta que mais importa em um bounty como este: **isso rodou de
fato contra infraestrutura real e dinheiro real, ou é simulação?** Tudo abaixo aconteceu na
**mainnet-beta** da Solana, com carteiras reais, USDC real e SOL real. Nada aqui é devnet nem
mockado. A evidência de devnet (usada para desenvolvimento iterativo e testes mais pesados, como
imposição de teto e cenários com vários clientes) também está incluída, claramente rotulada.

## Carteiras usadas (mainnet)

| Papel | Endereço |
|---|---|
| Cliente | `HTrLsm862Y3YKfBASVZK5vHXeQkQ5Difp2szKG7ziRrk` |
| Comerciante | `ADmd4LkUar6BpUZxAR24jL19QHKPZFqDiVPXqP1j1GzQ` |
| Agent-puller | `FxVNPbnRBBxGSKKiVnm8Rery3vxjMEeqs184VU55VVDa` |

O mint do USDC foi verificado de forma independente antes do uso, e não presumido de memória:
`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, confirmado via `getAccountInfo` (6 casas decimais,
~7,6 bilhões de supply, programa SPL Token padrão), consistente com o mint real de USDC emitido pela
Circle na mainnet.

## Camada 0: pagamento real de fatura em mainnet

- Fatura: 0,05 USDC.
- Assinatura do pagamento: `3DSMW25MJ7eR7CkVwDwCMDZuum2MkyUGfHvBxxTq36BkrJnjJkBN1Ng5LtausUFjURzFH3LCpmENBmqkbRYNM58B`
- Verificado de forma independente via `getTransaction`: finalizado, `err: null`, o signatário é a
  carteira do próprio cliente, e o saldo de USDC do cliente cai exatamente 0,05 enquanto o do
  comerciante sobe exatamente 0,05.

## Camada 1: autorização real de assinatura em mainnet, e cobrança autônoma

**Autorização** (assinaturas do próprio cliente, o agente nunca encostou em chave nenhuma):

1. `init_subscription_authority`: `4C2W189Fstiuy5Y7Pw8t5nB6UboKPMGfPeE3a6P9EVn9KebHseYZYbtJnUvZ66QbgWPPbZS8AMBDy8piA1KXwCVJ`
2. `create_recurring_delegation` (teto de 0,0004 USDC por período de 60s): `4NNSHG518KM8tWA4J9Q6zz7QUtc8dp7ya1YJ1fBbpXs1w3YCW5CSNX9K1gnJwLbS5oapkGtjXMpZ2ip1LKdVJbLB`

As duas assinadas inteiramente na Phantom do próprio cliente: o agente não teve acesso àquela chave
privada em momento nenhum.

**Cobrança autônoma** (assinatura do próprio agent-puller, sem humano no circuito):

- `transfer_recurring`: `22Sz4DZ7ETJ7GJw2eeX237e79S96oCMDuSFnomuRsUUtE2aQkCbqFD1FSmPvNfQyXNzGDWV1B1CFDKCY8FbEcMfD`
- Verificado de forma independente por dois caminhos: o `amountPulledInPeriod` da delegação on-chain
  bate exatamente com a cobrança (400 unidades = 0,0004 USDC), e o saldo real de USDC do comerciante
  foi de 0,0500 para 0,0504, uma correspondência exata.

## Camada 1, passo 4: pagamento real a fornecedor em mainnet

1. **Recusa por allowlist, fornecedor desconhecido**: um pedido para um fornecedor não listado
   retornou `"Unknown supplier ... not on the allowlist. Refusing to build a transaction."` Nenhuma
   transação chegou a ser montada.
2. **Pagamento real a um fornecedor conhecido**: 0,0002 USDC, assinatura
   `2ZHX2u4QDSwryAUg4dvusnS1PoGBz8k9U8JpWuquZXdM52drqpWWmM8kkgnM2h62ZCdurG5BpZ85jQMDoEy5B2yV`,
   verificado de forma independente via `getTransaction`. O saldo do comerciante caiu exatamente
   0,0002 e o do fornecedor subiu exatamente 0,0002.

## Problemas reais enfrentados nos testes de mainnet (divulgados, não maquiados)

- A MetaMask não assina transações Solana na configuração padrão dela: o operador trocou para Phantom
  neste teste.
- Abrir a página de teste via `file://` bloqueava silenciosamente a injeção da extensão da Phantom no
  Chrome. Resolvido servindo por um servidor HTTP local.
- O RPC público de mainnet retornou intermitentemente `403 Access forbidden` a requisições de poll
  com origem em navegador, mesmo com as mesmas chamadas funcionando de forma confiável no servidor.
  É uma limitação real para qualquer fluxo futuro que rode no navegador em escala, sinalizada em vez
  de escondida.
- Assinaturas transcritas a partir de print foram lidas errado duas vezes (caracteres visualmente
  parecidos em fonte monoespaçada pequena). Resolvido nas duas vezes re-derivando o valor real de
  forma independente on-chain, em vez de confiar na transcrição. É a mesma disciplina de "verificar
  na fonte, não confiar no relato" sobre a qual este produto inteiro é construído, aplicada à leitura
  de um print.

## Evidência de devnet (desenvolvimento e testes mais pesados)

Os testes de mainnet acima provam que o mecanismo funciona com dinheiro real; os testes de devnet
(muito mais extensos, já que não custam dinheiro de verdade) provam que o mecanismo se sustenta sob
condições adversariais e com vários clientes:

- **Imposição de teto, provada duas vezes de forma independente**: o teto exato de uma delegação foi
  puxado com sucesso, e uma tentativa imediata de puxar mais uma unidade no mesmo período foi
  recusada on-chain (`AMOUNT_EXCEEDS_PERIOD_LIMIT`, program error 400). Sem assinatura, sem
  movimentação de fundos. Reproduzido com duas delegações novas e separadas.
- **`revoke_delegation` provado de verdade**: um cliente revogou a própria delegação; a conta foi
  confirmada como inexistente on-chain, e uma cobrança tentada contra ela depois foi recusada de
  forma explícita (`Invalid account owner`), não silenciosamente ignorada.
- **Loop de cobrança com vários clientes**: testado contra 6 delegações reais acumuladas na chave do
  agent-puller. Três resultaram em cobranças `PROVOU` reais com assinaturas reais, duas registraram
  corretamente `NÃO PROVOU` (nada devido, recusado pelo programa), e uma corretamente se recusou a
  escrever qualquer estado ao bater em um rate limit no meio do passo, em vez de fabricar um desfecho.
- **Primeira autorização de um cliente novo**, que exige uma cadeia de duas transações
  (`init_subscription_authority` não pode ser agrupado com `create_recurring_delegation` na mesma
  transação, confirmado por uma falha real on-chain na primeira tentativa), provada ponta a ponta com
  um par de chaves genuinamente novo, com as duas etapas gerando assinaturas reais.
- **Jobs de manutenção automatizados**, rodados com custo zero de LLM via jobs de cron do tipo shell:
  um coletor de execuções travadas, e um job de reconciliação que varre o histórico real de transações
  on-chain do agent-puller e preenche qualquer cobrança que caiu on-chain mas nunca foi registrada no
  caixa (uma lacuna real encontrada e fechada: duas cobranças genuinamente não registradas foram
  encontradas e corretamente preenchidas a partir de dados on-chain, nunca de um documento ou de uma
  suposição).

## Trilho Pix: evidência real de sandbox

- Item real da Pluggy: `92b3e82c-46f1-4558-abeb-50f1c0bac934` (conector sandbox, "Pluggy Bank"),
  confirmado de forma independente com `status: "UPDATED"` por uma chamada direta de API.
- Conta real: `e5fcba94-ee8e-4e36-81b7-deef4315d520`.
- Pipeline completo rodado ao vivo contra o daemon real, nos dois desfechos: uma alegação sem
  transação correspondente registrou corretamente **NÃO PROVOU**, e a transação de salário real
  conhecida (`"SALARIO EMPRESA XYZ LTDA"`, R$8.500) registrou corretamente **PROVOU** depois de
  consultar de forma independente o extrato bancário real.
- Um bug real de API apareceu no meio dos testes (o endpoint `/v2/transactions` da Pluggy recusando um
  parâmetro de query anteriormente documentado). Ele foi pego, corrigido e reverificado. E, mais
  importante, **antes da correção entrar, o SOP falhou fechado corretamente**: registrou NÃO PROVOU em
  vez de silenciosamente cair em um falso positivo quando a checagem por baixo deu erro.

## Testes de prompt injection e ataque

O relato completo está em [Segurança e custódia](../how-it-works/security.md). Em resumo:
comprovantes de pagamento falsos, alegações de confirmação por fora, tentativas de autoaprovação de
checkpoint e engenharia social direta para exfiltrar chave foram todos testados contra o agente ao
vivo. Um achado real e sério (exfiltração de chave) foi encontrado e corrigido estruturalmente; toda
outra tentativa ou falhou de imediato ou expôs uma lacuna menor, divulgada com honestidade.

## O que os testes no mundo real não cobrem

- Hospedagem pública do servidor de Actions/Blinks especificamente em configuração de mainnet (o
  servidor suporta isso por variáveis de ambiente, e o mecanismo foi comprovado funcionando contra
  mainnet, mas o deploy permanente hoje roda configurado para devnet; veja
  [Deploy](../using-it/deployment.md)).
- O fluxo nativo de URI do Solana Pay em carteira (leitura de QR) especificamente em mainnet: o teste
  de fatura em mainnet acima passou por um caminho alternativo de transferência manual, documentado
  com honestidade em vez de escondido, porque a configuração de carteira disponível não suportava
  abrir uma URI `solana:` diretamente naquele ambiente.
- Uma execução conversacional completa da trava de checkpoint de pagamento a fornecedor
  especificamente contra mainnet (o mecanismo da trava em si foi comprovado como agnóstico de rede em
  devnet, e o pagamento em mainnet foi comprovado separadamente, mas os dois não passaram pelo SOP
  conversacional completo em mainnet na mesma sessão).
