Quanto custa rodar +4.900 análises com um Agente OCR?

Recentemente dei manutenção em um agente OCR e precisei criar uma fórmula para auditar cada centavo gasto com o Gemini 2.5 Pro. Levei os dados para o Excel e mapeei Input, Output e, principalmente, o Thinking.

A fórmula que valida o custo real:
Custo = (Input x $1.25) + ((Output + Thinking) x $10.00) / 1M

Desde o dia 27/11/2025 até hoje, o agente processou exatos 4.909 documentos complexos.

Não foi uma leitura simples. Usei a técnica do Chain of Thought (CoT) no prompt, forçando o modelo a raciocinar antes de extrair os dados. Isso garante precisão, mas tem um "preço invisível".

Os Números da Operação:
→ Total de Docs: 4.909
→ Tokens de Input: 4.0 Milhões
→ Tokens de Output (Texto): 880 Mil
→ Tokens de Thinking (Raciocínio): 4.25 Milhões 🤯

O modelo gerou 4x mais pensamento do que texto final. Isso significa que mais de 80% do custo de saída foi o Agente "refletindo" antes de responder. É o custo invisível da inteligência.

A Conta Final:
→ Custo Médio por Doc: $0.011
→ Custo Total da Operação: $56.38 (aprox. R$ 302,00)

Conclusão:
Por 6 centavos de real, um "analista" lendo, pensando e estruturando quase 5 mil documentos. A precisão do CoT pode pagar cada centavo desse processamento.

---

Em 2026, o RAG que usamos hoje será considerado "burro".

Essa leitura de 10 minutos do artigo da Leonie Monigatti pode economizar horas de refatoração na arquitetura de novos agentes.

Como estou desenvolvendo um projeto open source, tenho estudado novas arquiteturas de IA. E, ao analisar os diagramas abaixo, a progressão fica nítida, quando o agente deixa de ser só leitor e passa a ser leitor + escritor.

É isso que Leonie chama de expansão do fluxo: não é sobre “mais features”, é sobre como a informação flui.

→ RAG Tradicional: read-only, one-shot.
→ Agentic RAG: leitura mais inteligente.
→ Agent Memory: read-write. O sistema aprende e personaliza.

Na pratica significa sair de um "Chatbot de Suporte" para um "Consultor Pessoal".

Imagine um médico perguntando no OpenEvidence:

“Qual o tratamento recomendado para pneumonia adquirida na comunidade?”

→ No RAG (indexação estática):

O sistema busca nos artigos indexados e devolve alguns trechos (3 chunks, por exemplo) de estudos e guidelines. O médico precisa ler tudo e extrair manualmente o que importa.

→ No Agent Memory:

1. O agente busca os artigos relevantes na base (mesmo passo do RAG).
2. Antes de responder, ele consulta a Memória.
3. Ele encontra um registro: “Usuário prefere respostas em bullets, com dosagem e contraindicações destacadas.”
4. Ação: O agente organiza automaticamente a evidência em uma tabela de recomendação + resumo executivo.

→ Resultado: O médico recebe uma síntese clara, com bullets, tabela de tratamento e citações, sem ter pedido esse formato dessa vez.

A virada de chave da arquitetura não é apenas conectar no banco de dados da empresa, é criar um sistema personalizado ao longo do tempo que evolui com o uso. O RAG traz o dado, a Memória traz o contexto.

Claro, gerenciar essa memória (o que esquecer? o que é fato vs opinião?) é o novo desafio da engenharia. Mas estou atacando/aprendendo como lidar.

Link do artigo nos comentários 👇

---

Todo Engenheiro de IA precisa saber disso!

O problema não é o tamanho do seu prompt. 

Recentemente, mergulhei no ebook de Context Engineering do Weaviate e tive alguns insights que mudam o jogo na construção de Agentes.

Frequentemente recebo pedidos de ajuda em projetos onde a preocupação principal é: "Meu prompt está grande demais, o modelo vai se perder?". Mas a verdade dura é que o problema raramente é o tamanho, e sim a falta de técnica e estrutura.

Não basta escrever um texto longo. É preciso saber diferenciar Prompt Engineering (como você pede) de Context Engineering (o que você entrega para a IA saber).

Estou aplicando a estratégia avançada de ReAct Prompting (Reason + Act) em um novo Agente de Voice AI focado em cobrança e a diferença é brutal.

Em vez de o modelo tentar "alucinar" ou dar uma resposta genérica quando o cliente pede pare renegociar, o ReAct força a IA a entrar num ciclo de raciocínio lógico antes de falar:

> Pensar: "O cliente confirmou a pendência, mas disse que está apertado. Preciso formular uma proposta viável."
> Agir: "Vou consultar as regras de negociação do workflow que recebeu no prompt ou chamar a tool calcular_divida."
> Observar: "O sistema permite parcelar e quitar à vista."
> Responder: "Entendo seu cenário. Consigo fazer uma condição especial em 3 parcelas... Fica melhor para você?"

Isso transforma um chatbot que apenas "cobra" em um Agente que entende o contexto, consulta dados dinâmicos e negocia em tempo real.

Se você ainda está preso apenas no "Zero-shot" (perguntar e esperar a resposta), está deixando muito potencial na mesa.

Vocês já aplicam frameworks como ReAct ou Tree of Thoughts (ToT) nos fluxos de vocês? 👇

Coloquei o link do ebook nos comentários

---

O agente errava mais da metade das decisões. Agora erra 1 em cada 7.

44% → 86% de acurácia em 5 versões de prompt.

O case é: um agente de WhatsApp que decide se resolve o problema do usuário sozinho ou chama um humano.

Achávamos que estava funcionando. Mas não tinha como comprovar. 

A solução começou com observabilidade.

Fiz o projeto com o Lucas Rodrigues, que tem experiência em Evals e Machine Learning. Decidimos usar o Langfuse para rastrear cada decisão do agente. Input, output, raciocínio e outros dados relevantes. 

Depois de algumas reuniões dele me passando conhecimento e discutindo sobre a base de Evals e ML, decidimos aplicar o seguinte:

→ Selecionar 50 traces reais no Langfuse
→ Criar um dataset com esses traces
→ Fazer human annotation: "deveria escalar?" sim ou não, e por quê
→ Rodar experiments (novos prompts) em cima do dataset
→ Comparar resultados com as anotações humanas

Essa técnica se chama evaluation com human annotation. É a base de qualquer melhoria de agente. E foi baseada no texto "LLM Evals: Everything You Need to Know" de Hamel Husain.

O resultado? 44% de acurácia. O agente escalava quase tudo. Chamava humano pra resolver coisas que ele mesmo poderia fazer.

Depois de 5 versões refinando o prompt: 86% de acurácia. Hoje já estamos na versão 9, focados em outras melhorias.

Acurácia = (acertos / total de casos)

É a métrica mais simples de ML. E a mais ignorada em agentes de IA.

Você não pode colocar o agente em produção e torcer pra dar certo. Observabilidade + dataset + anotação humana + métricas é o que separa achismo de engenharia.

---

Quanto custa rodar +4.900 análises com um Agente OCR?

Recentemente dei manutenção em um agente OCR e precisei criar uma fórmula para auditar cada centavo gasto com o Gemini 2.5 Pro. Levei os dados para o Excel e mapeei Input, Output e, principalmente, o Thinking.

A fórmula que valida o custo real:
Custo = (Input x $1.25) + ((Output + Thinking) x $10.00) / 1M

Desde o dia 27/11/2025 até hoje, o agente processou exatos 4.909 documentos complexos.

Não foi uma leitura simples. Usei a técnica do Chain of Thought (CoT) no prompt, forçando o modelo a raciocinar antes de extrair os dados. Isso garante precisão, mas tem um "preço invisível".

Os Números da Operação:
→ Total de Docs: 4.909
→ Tokens de Input: 4.0 Milhões
→ Tokens de Output (Texto): 880 Mil
→ Tokens de Thinking (Raciocínio): 4.25 Milhões 🤯

O modelo gerou 4x mais pensamento do que texto final. Isso significa que mais de 80% do custo de saída foi o Agente "refletindo" antes de responder. É o custo invisível da inteligência.

A Conta Final:
→ Custo Médio por Doc: $0.011
→ Custo Total da Operação: $56.38 (aprox. R$ 302,00)

Conclusão:
Por 6 centavos de real, um "analista" lendo, pensando e estruturando quase 5 mil documentos. A precisão do CoT pode pagar cada centavo desse processamento.

