# Diário de Uso de IA



# Diário de Uso de IA

Usei IA ao longo de todo o teste, como o enunciado recomenda. Usei o Gemini para montar a primeira versão dos testes e dos relatórios, e o Claude para revisar o repositório contra o enunciado, corrigir a suíte e melhorar a documentação. Abaixo, o que ajudou, o que errou e o que decidi por conta própria.

## 1. Prompts-chave que mais ajudaram

1. **Base dos testes (Gemini):** pedi um script inicial em Playwright cobrindo login, favoritos e o fluxo completo de revisão de veículo (salvar rascunho, editar para corretiva, validar campos e concluir).
2. **Correção de falhas (Gemini):** enviei capturas de tela de erros de timeout e de "elemento não encontrado" (principalmente no Firefox e no WebKit) e pedi ajuda para estabilizar os testes e os seletores com `data-testid`.
3. **Regra de dados em memória (Gemini):** perguntei como alinhar os testes à RN06 (os dados somem ao reiniciar o executável), o que levou ao ajuste da verificação após `page.reload()`.
4. **Revisão contra o enunciado (Claude):** anexei o PDF do teste e o repositório e perguntei "como posso melhorar meus resultados?", pedindo uma resposta enxuta.
5. **Descoberta do contrato da API (Claude):** pedi ajuda para descobrir o formato real da API de revisões. Rodei os comandos sugeridos no PowerShell e colei o resultado para ajustar os testes.

## 2. Onde a IA ajudou bem

- Transformar o roteiro manual de QA em testes Playwright com `data-testid`, incluindo o fluxo de rascunho, edição e conclusão.
- Diagnosticar os timeouts no `beforeEach` em outros navegadores.
- Comparar meu repositório com o enunciado e apontar as lacunas: testes sem asserção, ausência de login inválido e busca sem resultado, RN01 a RN06 sem valores-limite, README incompleto e diário genérico.
- Estruturar o relatório de bugs no formato pedido, com severidade, passos, resultado esperado e obtido, e associar cada bug à regra violada (RN01 a RN06).
- Sugerir a técnica de testar valores-limite e partições (por exemplo km 0, 999999 e 1000000; óleo 0, 10 e 10,01; observações com 300 e 301 caracteres).
- Descobrir o contrato da API testando valores de `status`: a API aceitou `draft` e `completed`.

## 3. Onde a IA errou (ou eu errei ao confiar nela) e como percebi

1. **Testes sem verificação.** Vários testes da primeira versão só clicavam nos elementos e não tinham nenhum `expect` (favoritos, ordenação, cenário negativo). Eles passavam sem validar nada. Percebi ao revisar o código: o teste de ordenação não teria detectado o bug de ordenação que eu mesma encontrei manualmente. Reescrevi com asserções reais.
2. **Campos e valores da API assumidos sem conferir.** Os testes de API usavam nomes de campos e valores que ninguém tinha verificado, como `status: "concluida"`. Ao chamar a API de verdade, ela respondeu `Status inválido`. Testando variações, descobri que os valores corretos são `draft` e `completed`. Corrigi os testes com base na resposta real.
3. **Resíduos no relatório.** O relatório gerado com apoio da IA trazia marcações como `[cite: 11]` e um campo "Evidência" duplicado no BUG-09. Percebi ao reler o markdown e removi.
4. **Resultado esperado contrário à regra (BUG-01).** A primeira versão sugeria "truncar o texto com botão Ver mais", mas a RN05 diz que deve haver validação e nunca truncamento silencioso. Percebi ao reler a regra e corrigi o resultado esperado.
5. **Teste de API que contradizia a especificação.** A primeira versão tinha um teste que esperava erro 400 para rascunho vazio, mas a RN06 permite rascunhos incompletos. Percebi ao comparar o teste com a regra e o substituí por um teste que confirma que rascunhos incompletos são aceitos.
6. **Verificação silenciosa de ordem.** O teste de ordenação do histórico só executava a verificação se houvesse mais de uma revisão, então passava em silêncio com a lista vazia. Passei a criar as revisões dentro do próprio teste antes de checar a ordem.

## 4. Decisões que tomei contra a sugestão da IA

- **Rascunho vazio:** a IA recomendou descartar esse item por não ser desvio da RN06. Decidi manter como **observação/sugestão (OBS-01)**, e não como bug, porque a especificação não define um mínimo para um rascunho e isso pode poluir o histórico na prática. Registrei explicitamente que não viola a regra.
- **Conferir antes de confiar:** a IA gerou testes de API com nomes de campos presumidos. Em vez de aceitar, chamei a API real e só então ajustei os testes ao contrato verdadeiro.
- **Testes que "falham de propósito":** optei por usar `test.fail()` com o comportamento correto esperado, em vez de deixar a suíte vermelha ou de testar o comportamento errado, para deixar claro qual bug cada teste expõe.

## 5. Aprendizados

- Sempre conferir a resposta real da API antes de escrever asserções.
- Teste sem `expect` dá falsa sensação de cobertura.
- Ler a regra de negócio antes de classificar algo como bug, e registrar como observação o que é lacuna de especificação.
- A IA acelera a estrutura e a escrita, mas o contrato da API, as regras de negócio e o resultado real precisam ser validados por mim.