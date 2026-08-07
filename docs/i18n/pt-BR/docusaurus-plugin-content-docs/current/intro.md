---
id: intro
title: Visão geral
---

# Falou e Provou (Claim & Chain)

**Falou e Provou** é um agente [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw) hospedado
pelo próprio operador, que cobra clientes em dois trilhos, USDC na Solana e Pix em reais, e se
recusa a registrar qualquer coisa que não consiga verificar de forma independente na fonte.

Feito para o bounty da Superteam Brasil **"Build Solana-native plugins for Zeroclaw."**

**[Assista à demo](https://youtu.be/1YYHAs6ga1c)** ·
**[Landing page](https://falou-provou.onrender.com)** ·
**[Código-fonte](https://github.com/ceciliagalvaoo/falou_provou)**

## Assista à demo

<div style={{position:'relative',paddingBottom:'56.25%',height:0,overflow:'hidden',maxWidth:'820px',margin:'0 auto',borderRadius:'4px',border:'1px solid var(--fp-hairline)'}}>
  <iframe style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:0}} src="https://www.youtube.com/embed/1YYHAs6ga1c" title="Falou e Provou: um agente que só registra o que consegue provar" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
</div>

<div style={{textAlign:'center',opacity:0.75,marginTop:'0.9rem',fontSize:'0.85rem'}}>Um minuto e quarenta e quatro. A transação que aparece nele está na mainnet-beta, e você abre por conta própria.</div>

## A regra de ouro

Todo lançamento do caixa, em qualquer um dos dois trilhos, está em exatamente um destes estados.

<div className="fp-figure">

**Tabela 1: Os três estados**

| Estado | Como se conquista | Quem consegue falsificar |
|---|---|---|
| <span className="fp-state fp-state--falou">FALOU</span> | Alguém alegou, incluindo o próprio dono ao lançar na mão | O dono, e só contra si mesmo |
| <span className="fp-state fp-state--provou">PROVOU</span> | Uma assinatura confirmada na Solana, ou uma transação lida direto do extrato bancário de verdade via Pluggy | Ninguém |
| <span className="fp-state fp-state--nao">NÃO PROVOU</span> | Alegado, e a fonte foi consultada e não confirmou: ou negou, ou a transação simplesmente não estava lá | n/a |

</div>

Nenhum print, PDF, mensagem encaminhada ou "confia em mim" move um lançamento para PROVOU. Só uma
consulta direta e verificável de forma independente à fonte real consegue.

Isso não é promessa de marketing. Foi **testado ao vivo contra o agente rodando de verdade**,
inclusive sob ataques deliberados de manipulação (veja
[Segurança e custódia](./how-it-works/security.md)), e **já foi quebrado uma vez, durante o
desenvolvimento**
([o incidente completo](./how-it-works/security.md)),
que é exatamente o que levou a regra a ser endurecida estruturalmente, e não por instrução. O
mecanismo está descrito em [A regra de ouro](./how-it-works/the-golden-rule.md).

## Os dois agentes

O produto de verdade são dois bots de Telegram, cada um com um papel e um nível de confiança
completamente diferentes:

- **`dono`**: a superfície do produto. Emite cobranças avulsas via Solana Pay, autoriza e executa
  assinaturas recorrentes dentro de um teto imposto pelo próprio programa on-chain (nunca uma
  chave sem limite), paga fornecedores conhecidos via Solana Blinks com aprovação humana
  obrigatória fora do chat, e registra recebimentos de Pix que só viram PROVOU depois de
  conferidos contra o extrato bancário de verdade.
- **`contador`**: o dossiê do contador. Responde "quanto consolidou essa semana?" somando os dois
  trilhos em reais, e é **estruturalmente incapaz de mover dinheiro**: não porque "escolhe não
  fazer isso", mas porque essa capacidade simplesmente não existe no registro de ferramentas dele.
  Isso foi testado com um ataque real de prompt injection (veja
  [Segurança e custódia](./how-it-works/security.md)).

### Os dois bots, e com quem eles falam

Os dois estão no ar agora, não é maquete. **E os dois recusam quem o operador
não vinculou**, o que é de propósito e não limitação: os peer groups do ZeroClaw
são opt-in mútuo e negam por padrão, então um agente que cobra e aceitasse
mensagem de estranhos seria uma falha de custódia, não uma demonstração. Apontar
a câmera abre a conversa, e o bot vai dizer que precisa de aprovação do
operador.

O que não depende de autorização de ninguém é a chain. A assinatura de mainnet
em [Validação no mundo real](./evidence/validation.md) abre em qualquer
explorador de blocos público, e é o único tipo de prova que este produto
aceitaria vindo de outra pessoa.

### Para avaliadores: como testar de verdade

Ler não é a mesma coisa que testar, e esta seção existe pra que a segunda coisa
leve menos de um minuto pra começar.

1. **Assista à demo primeiro, se só tiver três minutos.** Está linkada acima
   e mostra os dois bots ao vivo, incluindo uma transação real na mainnet.
2. **Pra mandar mensagem pra um bot você mesmo**, aponte a câmera pra um dos
   códigos na Figura 1, ou abra
   [@falouprovou_bot](https://t.me/falouprovou_bot) (dono) ou
   [@falouprovou_contador_bot](https://t.me/falouprovou_contador_bot)
   (contador) direto no Telegram.
3. **O bot não vai responder de primeira.** Ele vai dizer que precisa de
   aprovação do operador — esse é o comportamento de negar por padrão
   descrito acima, não um deploy quebrado. Manda seu ID numérico do Telegram
   (pega com o [@userinfobot](https://t.me/userinfobot) se ainda não souber
   qual é) pra quem estiver em contato com você sobre essa submissão, e o
   vínculo é feito em minutos.
4. **Você só vai ser vinculado ao `contador`**, o agente-dossiê só de
   leitura, nunca ao `dono`. Isso não é uma demo menor dada a avaliadores no
   lugar da coisa de verdade: o `contador` não tem nenhuma ferramenta no
   registro dele capaz de mover dinheiro, então essa é a mesma instância
   completa que um contador de verdade usaria. Depois de vinculado, pergunte
   algo como "quanto consolidou essa semana?" e ele responde a partir do
   caixa real.
5. **Se você quiser ver o `dono` agindo em vez de só assistir ao vídeo**,
   avise isso no pedido de acesso e dá pra fazer uma demonstração ao vivo
   numa call em vez disso, já que vincular uma segunda identidade não
   verificada ao agente que de fato cobra e paga é exatamente o tipo de
   atalho de custódia que o próprio desenho deste produto argumenta contra.

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

**O que é**: você está aqui. [O contexto](./context.md) cobre por que isso existe, o que
substitui, e por que o Brasil é a versão mais difícil do problema em vez de uma versão estreita
dele.

**Como funciona**: o desenho. [A regra de ouro](./how-it-works/the-golden-rule.md) é a regra em
si e onde ela é imposta no código. [Arquitetura](./how-it-works/architecture.md) é como as peças
se encaixam: SOPs, skills, os dois trilhos, a stack.
[Segurança e custódia](./how-it-works/security.md) é o modelo de custódia, todos os ataques
rodados contra o agente ao vivo, e o incidente que moldou o projeto.

**Usando**: operação. [Fluxos de uso](./using-it/user-flows.md) é o que uma pessoa de verdade
digita e o que deve acontecer, passo a passo, nos cinco fluxos.
[Deploy](./using-it/deployment.md) é como e onde isso roda 24/7.
[Reprodutibilidade](./using-it/reproducibility.md) é como levantar tudo do zero em outra máquina.

**Evidência**: prova de que é real. [Validação no mundo real](./evidence/validation.md) são as
assinaturas de mainnet de verdade, abríveis em um explorador de blocos.
[Bugs encontrados e corrigidos](./evidence/bugs-found.md) é todo bug real encontrado nos testes,
como cada um foi corrigido, e as poucas coisas genuinamente ainda abertas.

**Projeto**: [Sistema de design](./project/design-system.md) e [Time](./project/team.md).

:::note[Sobre o idioma]

Esta documentação existe por inteiro em português e em inglês, com o mesmo conteúdo nas duas. O
seletor fica no canto superior direito. O produto em si fala português, porque é o idioma de quem
usa; a versão em inglês existe porque a listagem do bounty é global.

:::
