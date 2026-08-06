---
title: Time
---

# Time

O Falou e Provou foi feito para o bounty da Superteam Brasil **"Build Solana-native plugins for
Zeroclaw."**

- **Cecília Galvão**: [@ceciliagalvaoo](https://github.com/ceciliagalvaoo)
- **Pablo Azevedo**: [@zzaved](https://github.com/zzaved)

Código-fonte:
[github.com/ceciliagalvaoo/falou_provou](https://github.com/ceciliagalvaoo/falou_provou)

## Onde está o trabalho

Nada neste projeto é maquete, então o jeito honesto de descrever o trabalho é apontar para as coisas
que rodam.

<div className="fp-figure">

**Tabela 1: O que existe, e onde mora**

| Peça | Onde |
|---|---|
| Os dois agentes (SOPs, skills, jobs de manutenção) | `zeroclaw-data/` |
| O trilho de Pix, contra a API de Open Finance da Pluggy | `pix-rail/` |
| O servidor de Solana Actions (Blinks) | `tooling/actions-server/` |
| Testes em devnet das chamadas do programa de delegação recorrente | `tooling/subscriptions-test/` |
| A landing page | `landing/` |
| Este site de documentação | `docs/` |

</div>

Os dois bots rodam 24/7 em um servidor público, e não em um notebook. Como e onde está em
[Deploy](../using-it/deployment.md), incluindo um bug de deploy que demorou a ser encontrado. O que
foi de fato rodado contra dinheiro real, com assinaturas, está em
[Validação no mundo real](../evidence/validation.md). O que quebrou pelo caminho, e o que continua em
aberto, está em [Bugs encontrados e corrigidos](../evidence/bugs-found.md).
