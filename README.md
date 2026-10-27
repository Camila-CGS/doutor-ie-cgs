# Teste Técnico QA - Doutor-IE

Automação com **Playwright (JavaScript)** para o app Doutor-IE (catálogo, favoritos, ordenação e módulo de revisões), mais relatório de bugs e diário de uso de IA.

## Conteúdo do repositório

| Arquivo / pasta | Descrição |
|---|---|
| `RELATORIO-DE-BUGS.md` | Parte 1: bugs encontrados (UI e API) |
| `tests/doutor.ie.spec.js` | Testes E2E de UI (login, favoritos, busca, ordenação, revisões) |
| `tests/api-revisoes.spec.js` | Testes de API: contrato, RN01 a RN06 com valores-limite |
| `DIARIO-DE-IA.md` | Como a IA foi usada, onde errou e decisões tomadas |
| `imagens-de-teste/` | Evidências (prints) dos bugs |

## Pré-requisitos

- Node.js 18 ou superior
- Executável do Doutor-IE rodando (abre em `http://localhost:3000`). Mantenha a janela aberta durante os testes.

## Como executar

```bash
npm install
npx playwright install chromium
npx playwright test
npx playwright show-report
```

Comandos úteis:

```bash
npx playwright test tests/api-revisoes.spec.js   # só API
npx playwright test tests/doutor.ie.spec.js      # só UI
npx playwright test --headed                     # com navegador visível
```

> Os dados ficam em memória. Para um estado limpo, feche e abra o executável novamente.

## Testes que expõem bugs conhecidos

Testes com prefixo `[BUG-XX]` descrevem o **comportamento correto esperado** e usam `test.fail()`.
Isso significa que o teste é dado como "passou" enquanto o bug existir. Quando o bug for corrigido, o teste passa a
reportar falha inesperada e o `test.fail()` deve ser removido.

> A tag `[BUG-XX]` é a identificação usada no código dos testes. A coluna **Bug no relatório** indica o número
> correspondente em `RELATORIO-DE-BUGS.md`.

| Tag no teste | Bug no relatório | Descrição | Regra |
|---|---|---|---|
| `[BUG-01]` 301 caracteres | BUG-01 | Observações acima de 300 caracteres são aceitas | RN05 |
| `[BUG-02]` km 1e126 | BUG-02 | Quilometragem absurda aceita | RN01 |
| `[BUG-03]` data futura | BUG-03 | Data futura aceita (API e UI) | RN02 |
| `[BUG-04]` editar concluída | BUG-04 | Revisão concluída pode ser editada | RN06 |
| `[BUG-05]` concluída para rascunho | BUG-05 | Revisão concluída volta a rascunho | RN06 |
| `[BUG-06]` ordenação por ano | BUG-07 | Lista não reordena | UI |
| `[BUG-07]` contador de favoritos | BUG-08 | Contador não atualiza ao remover | UI |
| `[BUG-09]` login inválido | BUG-10 | API retorna 200 com senha errada | API |
| `[BUG-10]` veículo inexistente | BUG-11 | API retorna 200 em vez de 404 | API |
| `[BUG-11]` km -1 e 1000000 | BUG-12 | API aceita quilometragem fora do intervalo | RN01 |
| `[BUG-12]` troca de óleo incompleta | BUG-13 | API aceita óleo sem tipo ou sem quantidade | RN04 |

Itens do relatório **sem teste automatizado** (verificados manualmente):

- **ESPECIFICAÇÃO-06**: rascunho totalmente vazio é aceito. A RN06 permite rascunhos incompletos, então foi registrado como lacuna de especificação, e não como bug.
- **BUG-09**: o número em "Editando revisão #X" muda a cada salvamento do rascunho.

## Decisões

- Execução sequencial (`workers: 1`) por causa do estado em memória do app.
- Cada teste de API usa um `X-Session-Id` único para isolar os dados.
- Datas calculadas dinamicamente, sem valores fixos que quebrariam com o tempo.
- Rascunho vazio foi registrado como lacuna de especificação (ESPECIFICAÇÃO-06) e não como bug, pois a RN06 permite rascunhos incompletos.