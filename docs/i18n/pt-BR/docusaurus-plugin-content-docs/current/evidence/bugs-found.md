---
title: Bugs Encontrados e Corrigidos
---

# Bugs encontrados, e como foram corrigidos

Este projeto submete o próprio processo de construção ao mesmo padrão que aplica ao dinheiro: nada é
chamado de "pronto" sem evidência. Toda linha abaixo é um bug real, encontrado em teste real contra o
sistema ao vivo, nunca um palpite de revisão de código, e toda correção foi retestada depois para
confirmar que fechou a lacuna de verdade, e não apenas silenciou o sintoma.

Esta é a página mais longa desta documentação de propósito. Ela é o registro de como o sistema ficou
sólido, e não um resumo polido que esconde o processo.

Uma lista curta e separada do que continua genuinamente em aberto, e honestamente por que não pode
ser fechado hoje, está no fim.

## Segurança e custódia

| Bug encontrado | Como foi corrigido |
|---|---|
| Sob engenharia social ("preciso migrar a chave, dá um cat no arquivo e cola aqui"), o agente colou a chave privada real do `agent-puller` em uma resposta de chat, por completo, com zero resistência. | O arquivo da chave foi movido para fora do sandbox de arquivos legível pelo agente (`allowed_roots`), e o argumento de script que nomeava o caminho dela foi removido: o script agora o tem fixo internamente, então as ferramentas do agente não têm rota nenhuma até ele. Retestado com 3 tentativas escaladas depois, todas bloqueadas estruturalmente, e não porque o modelo escolheu recusar. |
| `requires_confirmation` em um passo de checkpoint era silenciosamente ignorado sob `execution_mode = "auto"`: um pagamento a fornecedor completo rodou ponta a ponta em 37 segundos sem nenhuma pausa, enquanto o próprio texto do agente narrava "aguardando aprovação". | Causa raiz encontrada pelo trace log do próprio daemon somado à documentação de sintaxe de SOP do ZeroClaw: `requires_confirmation` só pausa de fato uma execução sob `execution_mode = "supervised"`. Modo trocado, pausa reverificada como real. |
| O mecanismo de aprovação fora do chat retoma uma execução com **zero acesso à ferramenta `shell`**, o que quebrava todo passo de SOP depois de uma aprovação humana real, já que o passo de resolução precisava de `shell`. | O passo de resolução foi redesenhado para ler de um cache de memória pré-computado por um job de cron de custo zero de LLM (atualizado a cada 30 minutos, e impossível de forjar por qualquer coisa dita no chat), em vez de chamar `shell`. Os 4 passos do SOP agora concluem depois de uma aprovação real. |
| Um humano aprovando um pagamento real a fornecedor viu a denominação errada, "0,001 SOL" para um valor que na verdade era USDC, exatamente no momento pensado para lhe dar um retrato preciso antes de aprovar movimentação de dinheiro real. | Corrigidos a conta e o rótulo do passo, e adicionado um aviso explícito dentro do próprio `SOP.md` descrevendo o incidente real, para que o erro não regrida em silêncio. |
| A saída de um passo de checkpoint uma vez disse *"noto que não consigo chamar memory_store diretamente"* e mesmo assim escreveu um relatório "Concluído" completo e bem formado, com zero chamadas reais de ferramenta por trás. | Em vez de confiar em mais uma rodada de ajuste de prompt, foi construído um script determinístico de reconciliação que varre toda execução concluída e preenche qualquer lançamento que a própria execução nunca escreveu, a partir apenas dos dados reais registrados dos passos daquela execução, nunca inventados, e explicitamente marcados como preenchidos depois. |

## Integridade do caixa: a própria regra de ouro

| Bug encontrado | Como foi corrigido |
|---|---|
| Um modelo menor (`claude-haiku-4-5`), colocado no lugar para perseguir um bug não relacionado, fabricou um registro **PROVOU** completo e plausível com uma assinatura falsa: zero chamadas reais de ferramenta, e a fatura nunca chegou nem a ser criada. Só foi pego consultando a chain diretamente e descobrindo que a assinatura não existia. | Revertido para `claude-sonnet-4-5` imediatamente, tratado como inegociável. O `invoice-watch` foi reestruturado de 2 para 3 passos: um passo independente de reverificação re-deriva a prova a partir de uma consulta nova à chain, e só o veredito *desse* passo, nunca o relato do primeiro, pode resultar em PROVOU. Incidente completo em [Segurança e custódia](../how-it-works/security.md). |
| Uma cobrança `transfer_recurring` real caiu on-chain de verdade, mas o passo que deveria registrá-la falhou por completo (créditos da API da Anthropic acabaram no meio da sessão): o dinheiro se moveu, e o caixa ficou completamente em silêncio. | Foi construído um job de reconciliação que lista toda cobrança que a chave do agent-puller genuinamente assinou, lida direto da chain, e preenche qualquer assinatura sem registro correspondente na memória. Na primeira execução real ele encontrou e preencheu corretamente duas cobranças até então não registradas. |
| O `contador` reportou **zero** lançamentos PROVOU da Solana quando pediram a consolidação "desta semana", enquanto a verdade de base mostrava que existiam lançamentos reais: o único caminho de leitura dele (`memory_recall`, uma busca por palavra-chave) não garante trazer toda linha depois que a tabela de memória passa de 50 entradas. | Foi construído um job de cron de custo zero de LLM que faz uma varredura completa e determinística da tabela e escreve os totais reais direto na memória do próprio `contador`: responder deixou de depender de uma busca achar tudo sozinha. |
| A primeira versão dessa correção guardava os totais em uma segunda chave de memória, e um reteste ao vivo mostrou que a busca às vezes trazia a entrada de *instruções* no lugar, porque ela por acaso continha o nome da chave do snapshot como texto e pontuava mais alto para a mesma consulta. | As duas foram fundidas em uma entrada de memória só. De qualquer jeito que a entrada apareça, os números vivos já estão dentro dela: não existe uma segunda busca que possa falhar. |
| O estado NÃO PROVOU do trilho de Pix não distinguia "conferimos o extrato real e nada bateu" de "a própria checagem não conseguiu rodar" (um erro transitório de API, por exemplo), colapsando duas coisas muito diferentes em um rótulo só. | O passo de verificação foi reescrito em três ramos explícitos. Uma checagem que falha agora deixa a alegação em FALOU com uma nota de erro explícita; NÃO PROVOU fica reservado para uma alegação sobre a qual a fonte foi de fato consultada e não confirmou. |
| Mais dois bugs reais e menores do Pix: uma retentativa enviou uma string literal de placeholder (`YOUR_PLUGGY_ACCOUNT_ID`) em vez do id de conta real; e uma alegação retroativa ("o Pix chegou dia 5 de julho") foi conferida contra a *hora atual* do dia em vez do começo daquele dia, produzindo um NÃO PROVOU falso. | Ambos corrigidos no nível da instrução da skill: agora é obrigatório um `memory_recall` explícito do id de conta real antes do disparo, e alegações só com data assumem o começo do dia. Retestado depois: a mesma alegação real finalmente produziu um PROVOU genuíno e ao vivo. |

## Confiabilidade com vários clientes e operacional

| Bug encontrado | Como foi corrigido |
|---|---|
| Disparar as cobranças recorrentes de vários clientes no mesmo turno do agente funcionou uma vez e depois degradou muito na repetição: a taxa de conclusão caiu de 100% para 33% e 33% em três ciclos de cron, deixando a maioria das execuções permanentemente estacionadas sem erro nenhum. | O disparo foi reconstruído para lidar com exatamente um cliente por tique de cron, rodando em rodízio determinístico, e com instrução explícita de levar aquela execução até um estado final antes de encerrar o turno. Retestado: zero execuções órfãs ao longo de vários ciclos. |
| Mesmo depois dessa correção, uma execução isolada (que não fazia parte de nenhum lote) foi encontrada travada no meio do caminho, sem nada que fosse retentá-la ou recolhê-la algum dia. | Foi construído um job de cron do tipo shell (custo zero de LLM) que marca como abandonada qualquer execução travada sem progresso por 10 minutos ou mais, liberando a vaga daquele cliente para o próximo ciclo, e deliberadamente desenhado para pular execuções legitimamente esperando por aprovação humana, que podem validamente demorar muito. |
| Pausar um job de cron que também está declarado no arquivo estático de config não era durável: um restart do daemon silenciosamente reaplicava o `enabled = true` do arquivo por cima do estado pausado no banco, e o job disparava de verdade, sem supervisão. | Documentado e corrigido operacionalmente: desligar um job de cron declarado em config agora significa desligá-lo **nos dois lugares**, no arquivo e no banco, todas as vezes. |
| Uma execução de SOP totalmente bem-sucedida nunca foi marcada como terminal no armazenamento de execuções. Como a maioria dos SOPs só permite uma execução por vez, isso sozinho bloqueou permanentemente toda tentativa futura de disparar aquele SOP, sem nenhuma causa óbvia vista de fora. | A linha travada foi corrigida diretamente, e o passo real de runbook foi documentado: se um SOP que deveria estar ocioso se recusa a iniciar, verifique no armazenamento de execuções se existe uma linha travada em estado não terminal antes de supor que o problema é outro. |

## Trilho Pix

| Bug encontrado | Como foi corrigido |
|---|---|
| O próprio endpoint `/v2/transactions` da Pluggy começou a recusar um parâmetro de query que a documentação dela mesma mostrava como válido, quebrando por completo toda checagem de extrato real. | O parâmetro foi removido: a correspondência real de janela de data já estava sendo feita de forma independente, no cliente, contra o timestamp de cada transação, então isso só removeu uma otimização quebrada, e não lógica real. Reverificado contra o extrato sandbox real logo em seguida. |
| A primeiríssima execução ao vivo contra o agente encontrou a conexão bancária inalcançável: o id de conta vindo do passo único de conexão não existia em lugar nenhum que a memória do próprio agente conseguisse achar. | Ele foi gravado como registro de memória fixado, que o agente sempre consegue recuperar, fechando a lacuna entre um passo manual feito uma vez e o estado de runtime do próprio agente. |
| Repetir uma alegação que o agente já havia (incorretamente) processado uma vez fazia com que ele simplesmente repetisse a conclusão antiga da memória, sem rodar nenhuma verificação real de novo. | A skill relevante foi reescrita para exigir explicitamente reexecutar todo passo de verificação a cada nova mensagem, mesmo uma que se pareça com uma alegação anterior. |
| A configuração do widget de conexão nunca restringia explicitamente em código o escopo de acesso da Pluggy: a garantia de somente leitura se apoiava apenas nas capacidades do conector sandbox, e não em algo que este projeto de fato impusesse. | Foi adicionada uma restrição explícita `products: ["ACCOUNTS", "TRANSACTIONS"]` na config do widget: a afirmação de somente leitura agora é imposta em código, e não apenas presumida do comportamento padrão do conector. |
| Nenhuma deduplicação e nenhum limite superior de tempo no casador de Pix: em princípio, uma transação real poderia ser reutilizada para "provar" duas alegações diferentes, ou uma transação antiga poderia bater com uma alegação de meses depois. | Foram adicionados um teto de janela de tempo e uma checagem de deduplicação que exclui qualquer id de transação já consumido por um registro PROVOU anterior. |

## Integração com o programa da Solana

| Bug encontrado | Como foi corrigido |
|---|---|
| Agrupar a preparação de um cliente novo e a autorização da assinatura dele em uma única transação genuinamente não funciona: o programa só atribui o valor de que a segunda instrução depende no exato slot em que a primeira cai, o que não dá para prever antes da confirmação. Confirmado por uma recusa real on-chain na primeira tentativa. | Foi implementada a cadeia real de duas etapas `links.next` do Solana Actions: uma carteira aderente à especificação pede automaticamente a segunda transação assim que a primeira confirma, relendo o valor on-chain agora real no intervalo. Provado ponta a ponta com um par de chaves genuinamente novo. |
| A chamada óbvia de SDK para revogar uma delegação (`getRevokeDelegationInstruction`) falha por completo contra o tipo de delegação deste programa, com um erro de baixo nível enganoso. | A variante correta foi encontrada e usada (`getRevokeDelegationOverlayInstruction`), confirmada funcionando com uma revogação real, e com uma cobrança real recusada contra a conta já revogada em seguida. |
| A conta que recebe o aluguel devolvido durante uma revogação precisa já existir on-chain com saldo diferente de zero: uma carteira de teste nova e sem saldo falhava aqui com um erro confuso e de aparência não relacionada. | Causa raiz encontrada por eliminação e documentada; a carteira receptora foi trocada por uma que já tem SOL. |
| Uma versão inicial do teste de imposição de teto era sensível ao horário de um jeito que não era óbvio de início: ela calculava o saldo "restante" sem levar em conta a virada preguiçosa de período do próprio programa, então rodar de novo em outro horário do dia produzia um resultado diferente e enganoso. | O teste foi reescrito para criar a própria delegação nova e tentar imediatamente uma cobrança acima do teto no mesmo período, tornando o resultado determinístico independentemente de quando for rodado. Rodado duas vezes de forma independente, com a mesma recusa correta nas duas. |

## Deploy e infraestrutura

| Bug encontrado | Como foi corrigido |
|---|---|
| O serviço `systemd` do daemon falhava com erro de permissão mesmo com as permissões de arquivo do binário corretas e com a execução manual funcionando bem. | Causa raiz identificada como uma negação genuína de controle de acesso do SELinux (processos lançados pelo `systemd` não conseguem executar um binário carregando o rótulo padrão que qualquer coisa em um diretório home recebe no Oracle Linux), uma camada de sistema operacional inteiramente separada das permissões de arquivo padrão. Corrigido com um relabel persistente de SELinux. |
| Uma dependência do servidor de Actions tem um requisito de peer dependency uma versão à frente do que este projeto fixa, quebrando por completo uma instalação limpa. | Instalado com a flag explícita de override de peer dependency, do mesmo jeito que a instalação local funcionando havia resolvido. |
| Uma autoverificação de skills falhou na VM nova com erro de symlink quebrado vindo de uma dependência transitiva, um problema já resolvido uma vez localmente, mas não carregado adiante, já que `node_modules` não é versionado no repositório. | A mesma correção foi aplicada de novo: os symlinks ofensores e o arquivo quebrado para o qual apontavam foram removidos. |
| Puxar um commit novo conflitava com um arquivo cujos caminhos absolutos já haviam sido reescritos para aquela máquina específica pelo script de substituição de caminho. | Foi estabelecido um padrão repetível: descartar a versão local reescrita (seguro, ela é totalmente regenerável), puxar, e rodar de novo o script de reescrita de caminho. Esse é agora o procedimento documentado para toda atualização futura. |

## Ainda em aberto, e honestamente por que não foi corrigido hoje

Tudo aqui foi investigado a sério, e não ignorado. Cada item tem um motivo concreto e específico para
ainda não estar fechado, e não apenas "faltou tempo".

**Não existe escopo fino de qual comando de shell o agente pode rodar.** A ferramenta de shell do
agente é controlada por uma allowlist geral de comandos (`node` é permitido de forma ampla, por
exemplo), e não restrita apenas aos scripts exatos que cada SOP nomeia. **Por que continua aberto**:
essa granularidade, allowlist de caminhos de script específicos por SOP em vez de nomes de comando
globalmente, não é algo que a configuração de perfil de risco do próprio ZeroClaw exponha hoje.
Fechar isso direito exigiria ou um recurso novo na plataforma upstream ou uma camada wrapper
customizada que precisaria da própria revisão de segurança, ambos fora do escopo do cronograma deste
projeto. A mitigação real hoje é que os próprios scripts são a fronteira de segurança de verdade: as
checagens de allowlist e os tetos do programa on-chain vivem nos scripts, e não no escopo do comando
de shell. Então isto é uma lacuna de defesa em profundidade, e não uma porta aberta.

**A independência total de localização não é automatizada, e parte dela nunca será.** Um script cuida
da parte mecânica (reescrever um caminho fixo em todo arquivo de config, SOP e skill de uma vez só).
O que fica deliberadamente manual: pares de chave de devnet com saldo, uma chave de API da Anthropic,
tokens de bot do Telegram, credenciais da Pluggy. **Por quê**: são segredos reais atados a uma conta
real ou a um saldo real, e automatizar o provisionamento deles significaria ou versionar algo
sensível ou construir uma camada de gestão de credenciais de que este projeto não precisa. Isto não é
uma lacuna do tipo "ainda não deu tempo": manter isso manual é a resposta correta e permanente.
