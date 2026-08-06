---
id: intro
title: Visão geral
---

# Falou e Provou (Claim & Chain)

**Falou e Provou** é um agente [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) hospedado
pelo próprio operador, que cobra clientes em dois trilhos, USDC na Solana e Pix em reais, e se
recusa a registrar qualquer coisa que não consiga verificar de forma independente na fonte.

Feito para o bounty da Superteam Brasil **"Build Solana-native plugins for Zeroclaw."**

**Landing page:** [falou-provou.onrender.com](https://falou-provou.onrender.com)

## A regra de ouro

Todo lançamento do caixa, em qualquer um dos dois trilhos, está em exatamente um destes estados.

<div className="fp-figure">

**Tabela 1: Os três estados**

| Estado | Como se conquista | Quem consegue falsificar |
|---|---|---|
| <span className="fp-state fp-state--falou">FALOU</span> | Alguém alegou, incluindo o próprio dono ao lançar na mão | O dono, e só contra si mesmo |
| <span className="fp-state fp-state--provou">PROVOU</span> | Uma assinatura confirmada na Solana, ou uma transação lida direto do extrato bancário de verdade via Pluggy | Ninguém |
| <span className="fp-state fp-state--nao">NÃO PROVOU</span> | Alegado, e a fonte foi consultada e não confirmou: ou negou, ou a transação simplesmente não estava lá | — |

</div>

Nenhum print, PDF, mensagem encaminhada ou "confia em mim" move um lançamento para PROVOU. Só uma
consulta direta e verificável de forma independente à fonte real consegue.

Isso não é promessa de marketing. Foi **testado ao vivo contra o agente rodando de verdade**,
inclusive sob ataques deliberados de manipulação (veja
[Segurança e custódia](/docs/how-it-works/security)), e **já foi quebrado uma vez, durante o
desenvolvimento**
([o incidente completo](/docs/how-it-works/security#the-single-most-important-finding-of-this-project-a-model-swap-that-broke-the-golden-rule)),
que é exatamente o que levou a regra a ser endurecida estruturalmente, e não por instrução. O
mecanismo está descrito em [A regra de ouro](/docs/how-it-works/the-golden-rule).

## Os dois agentes

O produto de verdade são dois bots de Telegram, cada um com um papel e um nível de confiança
completamente diferentes:

- **`dono`** — a superfície do produto. Emite cobranças avulsas via Solana Pay, autoriza e executa
  assinaturas recorrentes dentro de um teto imposto pelo próprio programa on-chain (nunca uma
  chave sem limite), paga fornecedores conhecidos via Solana Blinks com aprovação humana
  obrigatória fora do chat, e registra recebimentos de Pix que só viram PROVOU depois de
  conferidos contra o extrato bancário de verdade.
- **`contador`** — o dossiê do contador. Responde "quanto consolidou essa semana?" somando os dois
  trilhos em reais, e é **estruturalmente incapaz de mover dinheiro**: não porque "escolhe não
  fazer isso", mas porque essa capacidade simplesmente não existe no registro de ferramentas dele.
  Isso foi testado com um ataque real de prompt injection (veja
  [Segurança e custódia](/docs/how-it-works/security)).

### Experimente você mesmo: aponte a câmera e abra um bot

Os dois estão no ar agora, não é maquete.

<div className="fp-figure">

**Figura 1: Os dois bots no Telegram**

<table>
<tr>
<td align="center">
<img src="/falou_provou/img/qr-dono.svg" width="140" height="140" alt="QR code que abre @falouprovou_bot no Telegram" /><br/>
<strong><a href="https://t.me/falouprovou_bot">@falouprovou_bot</a></strong><br/>
<sub>dono: cobrança, assinaturas, Pix</sub>
</td>
<td align="center">
<img src="/falou_provou/img/qr-contador.svg" width="140" height="140" alt="QR code que abre @falouprovou_contador_bot no Telegram" /><br/>
<strong><a href="https://t.me/falouprovou_contador_bot">@falouprovou_contador_bot</a></strong><br/>
<sub>contador: dossiê só de leitura</sub>
</td>
</tr>
</table>

</div>

## Como este site está organizado

Quatro perguntas, quatro categorias. Nada está documentado em dois lugares.

**O que é**: você está aqui. [O contexto](/docs/context) cobre por que isso existe, o que
substitui, e por que o Brasil é a versão mais difícil do problema em vez de uma versão estreita
dele.

**Como funciona**: o desenho. [A regra de ouro](/docs/how-it-works/the-golden-rule) é a regra em
si e onde ela é imposta no código. [Arquitetura](/docs/how-it-works/architecture) é como as peças
se encaixam: SOPs, skills, os dois trilhos, a stack.
[Segurança e custódia](/docs/how-it-works/security) é o modelo de custódia, todos os ataques
rodados contra o agente ao vivo, e o incidente que moldou o projeto.

**Usando**: operação. [Fluxos de uso](/docs/using-it/user-flows) é o que uma pessoa de verdade
digita e o que deve acontecer, passo a passo, nos cinco fluxos.
[Deploy](/docs/using-it/deployment) é como e onde isso roda 24/7.
[Reprodutibilidade](/docs/using-it/reproducibility) é como levantar tudo do zero em outra máquina.

**Evidência**: prova de que é real. [Validação no mundo real](/docs/evidence/validation) são as
assinaturas de mainnet de verdade, abríveis em um explorador de blocos.
[Bugs encontrados e corrigidos](/docs/evidence/bugs-found) é todo bug real encontrado nos testes,
como cada um foi corrigido, e as poucas coisas genuinamente ainda abertas.

**Projeto**: [Sistema de design](/docs/project/design-system) e [Time](/docs/project/team).

:::note[Sobre o idioma]

A documentação existe em inglês e em português, e o seletor fica no canto superior direito. O
produto em si fala português, porque é o idioma de quem usa. Algumas páginas mais técnicas ainda
aparecem em inglês nesta versão: quando isso acontece, é a versão em inglês sendo exibida, e o
conteúdo é o mesmo.

:::
