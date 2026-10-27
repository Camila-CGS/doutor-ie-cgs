# Diário de Bordo — Uso de Inteligência Artificial (QA)

Este documento registra a colaboração com a Inteligência Artificial (Gemini) durante o desenvolvimento da suíte de testes automatizados e estruturação dos relatórios de qualidade do projeto Doutor-IE.

## 1. Objetivos do Apoio da IA
* **Estruturação de Cenários de Teste:** Auxílio na conversão de fluxos manuais de QA em scripts automatizados robustos utilizando o **Playwright**.
* **Resolução de Problemas e Debugging:** Identificação de timeouts em hooks de inicialização (`beforeEach`) no navegador Firefox e ajuste de seletores baseados em `data-testid`.
* **Alinhamento com Regras de Negócio (RNs):** Compreensão de estados do sistema, como a regra de dados em memória (**RN06**), ajustando a asserção de persistência pós-recarregamento (`page.reload()`).
* **Criação de Relatórios:** Formatação profissional de relatórios de bugs e documentação do projeto.

## 2. Prompts e Interações Chave
1. **Criação da Base dos Testes:** Solicitação de script inicial em Playwright cobrindo login, favoritos e o fluxo completo de revisões de veículos (rascunho, edição para corretiva, validação de campos e conclusão).
2. **Correção de Falhas de Execução:** Análise conjunta de capturas de tela de erros de timeout e elementos não encontrados, refinando a estabilidade dos testes em múltiplos navegadores (Chromium, Firefox, WebKit).
3. **Mapeamento de Regras:** Discussão sobre o comportamento de dados em memória da aplicação para alinhar os testes à **RN06**.