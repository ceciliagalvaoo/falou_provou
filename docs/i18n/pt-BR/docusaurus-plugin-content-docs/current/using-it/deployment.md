---
title: Deploy
---

# Deploy

Este produto roda 24/7 em um servidor real e publicamente alcançável, e não só no notebook de um
desenvolvedor durante a demonstração. Esta página documenta exatamente como e onde.

## Onde roda

Uma VM de camada gratuita da Oracle Cloud Infrastructure (OCI) (`VM.Standard.E2.1.Micro`, Oracle
Linux 9), sempre ligada. Os dois bots de Telegram (`dono` e `contador`) estão alcançáveis a qualquer
momento, e os jobs de manutenção de recorrência e reconciliação rodam continuamente por `cron`, e não
apenas durante uma sessão de teste manual.

## O que está rodando na VM

- **O daemon do ZeroClaw**: um serviço `systemd`, rodando o runtime do agente continuamente,
  cuidando dos dois bots de Telegram e do agendador de cron de todos os jobs de manutenção.
- **O servidor de Actions/Blinks**: um segundo serviço `systemd`, servindo os endpoints HTTP reais de
  Solana Actions (`authorize-subscription`, `pay-supplier`) aos quais as carteiras se conectam quando
  um cliente ou fornecedor abre um link compartilhado.
- **Caddy**, atuando como proxy reverso na frente do servidor de Actions, terminando HTTPS real e
  confiável.

Os dois serviços estão habilitados e configurados para reiniciar sozinhos. O SELinux roda em modo
enforcing (o padrão do Oracle Linux), o que exigiu uma correção real e nada óbvia durante a
instalação, veja abaixo.

## HTTPS público, sem comprar domínio

O servidor de Actions precisa estar alcançável por HTTPS real para que as carteiras confiem nos links
que ele serve, e `localhost` não basta para um produto no ar. Este deploy usa uma escolha deliberada
e documentada, em vez de um atalho:

- **[nip.io](https://nip.io)**, um serviço gratuito de DNS curinga que resolve
  `<ip-com-hifens>.nip.io` direto para aquele IP, sem registro e sem espera.
- **Caddy**, que obtém automaticamente um certificado Let's Encrypt real para qualquer domínio sobre
  o qual consiga provar controle pelo desafio HTTP-01 padrão.

Juntos, isso dá HTTPS genuíno e confiado pelo navegador a custo zero, sem atraso de propagação de
DNS. Um domínio próprio de verdade continua sendo um upgrade futuro possível e direto: esta foi uma
escolha considerada para o cronograma do bounty, não uma limitação técnica.

## Um bug de deploy real e nada óbvio: SELinux bloqueando um binário lançado pelo systemd

A primeira tentativa do serviço `systemd` para o daemon falhou com `status=203/EXEC`, "Permission
denied", mesmo com as permissões de arquivo do binário corretas e com a execução manual a partir de
um shell interativo funcionando bem. Isso apontava para longe de um problema simples de permissão
POSIX.

A causa real, confirmada via `ausearch -m avc`: uma negação AVC genuína do SELinux. Processos
lançados pelo `systemd` rodam no domínio de segurança `init_t`, que não tem permissão de `execute`
sobre um binário com o rótulo padrão `user_home_t`, que é o rótulo que qualquer coisa dentro do
diretório home de um usuário recebe por padrão no Oracle Linux, que já vem com SELinux ativo. Essa é
uma camada de controle de acesso em nível de sistema operacional, completamente separada das
permissões de arquivo Unix padrão, e ela bloqueia silenciosamente exatamente esse caso de "o arquivo
parece executável mas o systemd ainda assim não consegue rodar".

Corrigido com um relabel persistente: `semanage fcontext -a -t bin_t <caminho>` seguido de
`restorecon -v <caminho>`. Isso sobrevive a substituições futuras do arquivo (um novo build do
binário, por exemplo), porque é uma regra atada ao caminho, e não um rótulo pontual no arquivo atual.

## Mantendo a VM em sincronia com o repositório

O checkout da VM é mantido atualizado com `git pull` contra a branch principal. Um detalhe real e
recorrente: um script de reescrita de caminho (veja [Reprodutibilidade](./reproducibility.md)) grava
permanentemente o caminho absoluto de instalação da própria VM em arquivos de config, SOP e skill que
estão versionados, já que não existe camada de templating em runtime para esses caminhos. Puxar um
commit novo que toque em um arquivo já reescrito causa conflito local. A correção estabelecida e
repetível: descartar a versão local reescrita (é seguro, ela é totalmente regenerável), puxar, e
rodar de novo o script de reescrita de caminho.

## O que deliberadamente ainda não foi feito

- A conexão bancária da Pluggy no trilho de Pix roda em modo sandbox na VM, igual ao desenvolvimento
  local. É uma escolha deliberada e divulgada (veja
  [Segurança e custódia](../how-it-works/security.md)),
  não um atalho tomado sob pressão de prazo.
- O job de cron da cobrança recorrente automática sai desligado por padrão neste deploy (veja
  [Bugs encontrados e corrigidos](../evidence/bugs-found.md)). O mecanismo em si está totalmente
  comprovado, mas rodá-lo continuamente e sem supervisão contra infraestrutura de teste compartilhada
  não é algo que se liga sem um motivo específico.
- A configuração de mainnet do servidor de Actions (ele suporta mainnet por variáveis de ambiente, e o
  mecanismo de mainnet em si está comprovado, veja
  [Validação no mundo real](../evidence/validation.md)) não é o que está no ar no deploy permanente
  hoje, que roda configurado para devnet.
