---
title: Reprodutibilidade
---

# Reprodutibilidade

Um relato honesto de até onde este projeto vai para permitir que outra pessoa o reproduza na própria
máquina: o que está automatizado, e o que genuinamente ainda exige configuração manual.

## O problema que isto resolve

Uma auditoria independente feita cedo deu nota baixa em reprodutibilidade: o caminho absoluto de
instalação do projeto estava fixo no código, direto no arquivo de config do daemon, nas instruções de
ferramenta shell de todo SOP, nas referências de script de toda skill, e nos scripts de teste
avulsos. Um estranho clonando o repositório em outro lugar teria que caçar e editar cada um desses
arquivos à mão antes de qualquer coisa rodar.

## A correção: `tooling/rewrite-install-path.sh`

Um único script recebe uma nova raiz absoluta de projeto e reescreve toda ocorrência do caminho
antigo em todo `config.toml`, `SOP.toml`/`SOP.md`, `SKILL.md` e script `.mjs`/`.py` que o referencie,
excluindo `node_modules/` (irrelevante) e `evidence/` (que é registro histórico do que aconteceu na
máquina original, e não pode ser silenciosamente reescrito para parecer que aconteceu em outro lugar).

Ele também lida com uma peculiaridade real e nada óbvia: os prompts dos jobs de cron de um daemon em
execução ficam guardados em um banco de dados, e não só no `config.toml`. E os dois podem realmente
divergir, porque as entradas declarativas de cron do `config.toml` só sincronizam para o banco na
primeiríssima inicialização do daemon daquela máquina contra um banco vazio. Editar só o
`config.toml` depois disso não atualiza uma instalação já provisionada. O script reescreve também a
cópia do banco, em uma instalação existente; um clone novo ainda não tem banco nenhum, então esse
passo é pulado de forma limpa e a primeira inicialização do daemon o semeia corretamente a partir da
config já reescrita.

Isso foi verificado contra uma fixture isolada (não contra o projeto ao vivo, para não quebrar uma
instalação funcionando no meio do teste): um arquivo de config, um arquivo de SOP e um banco de
dados, cada um contendo o caminho antigo, todos corretamente reescritos e verificados relendo-os
depois.

## O que isto resolve e o que não resolve

**Resolvido**: reproduzir este projeto em uma máquina nova agora é *"clone, rode um script com o seu
caminho de destino, siga a configuração"*, em vez de *"clone, ache e edite N arquivos à mão"*.

**Não resolvido, e não afirmado como resolvido**: isto é uma ferramenta de substituição de caminho,
não independência total de localização. Os arquivos de config, SOP e skill são texto estático que o
ZeroClaw lê diretamente, e não existe camada de templating em runtime que resolva caminhos
dinamicamente, então um caminho absoluto é inevitável em algum lugar desses arquivos, por construção.
Separadamente, e deixados como passos genuinamente manuais por bom motivo (envolvem segredos reais e
contas reais, que não deveriam ser automatizados dentro de um script):

- Um estranho precisa dos próprios pares de chave de devnet da Solana, com saldo (cliente,
  comerciante, agent-puller).
- Da própria chave de API da Anthropic.
- Dos próprios tokens de bot do Telegram, criados via `@BotFather`.
- Das próprias credenciais sandbox da Pluggy, se for reproduzir o trilho de Pix.

## Passos para reproduzir, ponta a ponta

1. Clone o repositório.
2. Rode `tooling/rewrite-install-path.sh <sua-raiz-absoluta-do-projeto>`.
3. Forneça seus próprios pares de chave de devnet da Solana, com saldo pelo faucet de devnet.
4. Forneça sua própria chave de API da Anthropic na config do ZeroClaw.
5. Crie seus próprios bots de Telegram via `@BotFather` e faça o binding.
6. (Opcional, para o trilho de Pix) Forneça seus próprios `CLIENT_ID`/`CLIENT_SECRET` sandbox da
   Pluggy em `pix-rail/.env`.
7. Suba o daemon (`zeroclaw daemon`) e o servidor de Actions
   (`node tooling/actions-server/server.mjs`).

Isso espelha exatamente os passos que o próprio deploy deste projeto seguiu em uma VM nova da Oracle
Cloud. Veja [Deploy](./deployment.md) para como isso foi na prática, incluindo uma correção real de
SELinux que não faz parte deste script (é uma questão de sistema operacional, não de caminho em
arquivo de projeto).
