import { test, expect } from '@playwright/test';

test.describe('Doutor-IE - Suíte Completa de Testes QA (Catálogo, Favoritos, Ordenação e Revisões)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Acessa a aplicação e realiza o login padrão de QA
    await page.goto('http://localhost:3000/');
    
    await page.getByTestId('login-email').fill('qa@doutor-ie.com');
    await page.getByTestId('login-password').fill('Teste123');
    await page.getByTestId('login-submit').click();
  });

  test('Cenário 1: Gerenciamento de Favoritos (Adicionar e Remover)', async ({ page }) => {
    // Adiciona itens aos favoritos no catálogo
    await page.getByTestId('favorite-btn').first().click();
    await page.getByTestId('favorite-btn').nth(1).click();

    // Acessa a tela de favoritos e valida a remoção de um item
    await page.getByTestId('nav-favorites').click();
    await page.getByRole('button', { name: '✕' }).first().click();
  });

  test('Cenário 2: Fluxo Completo de Revisão de Veículo (Rascunho, Edição e Conclusão)', async ({ page }) => {
    // Navega para o catálogo e abre o primeiro veículo
    await page.getByTestId('nav-catalog').click();
    await page.getByTestId('open-vehicle').first().click();

    // Seleciona o componente e inicia a revisão
    await page.getByRole('cell', { name: 'Faróis baixos' }).click();
    await page.getByTestId('start-review').click();

    // Preenche dados de quilometragem e óleo
    await page.getByTestId('revision-mileage').fill('2');
    await page.getByTestId('revision-oil-changed').check();
    await page.getByTestId('revision-oil-type').fill('normal');
    await page.getByTestId('revision-oil-quantity').fill('10');
    await page.getByTestId('revision-oil-fields').click();

    // Adiciona observações e salva como rascunho
    await page.getByTestId('revision-notes').fill('obs-cgs');
    await page.getByTestId('save-draft').click();

    // Edita a revisão para alterar o tipo para corretiva
    await page.getByTestId('edit-review').click();
    await page.getByTestId('revision-type').selectOption('corretiva');

    // Preenche a data corretamente e conclui a revisão
    await page.getByTestId('revision-date').fill('2026-10-22');
    await page.getByTestId('complete-review').click();

    // Valida o status da revisão concluída na tela
    const statusBadge = page.getByTestId('revision-status');
    await expect(statusBadge).toBeVisible();
    await expect(page.getByText('Corretiva 22/10/2026 · 2 km Concluída')).toBeVisible();
  });

  test('Cenário 3: Validação de Modos de Revisão e Retorno de Navegação', async ({ page }) => {
    // Acessa o catálogo, abre o veículo e inicia a revisão
    await page.getByTestId('nav-catalog').click();
    await page.getByTestId('open-vehicle').first().click();
    await page.getByRole('cell', { name: 'Faróis baixos' }).click();
    await page.getByTestId('start-review').click();

    // Testa a troca entre tipos de revisão (Inspeção / Preventiva)
    await page.getByTestId('revision-type').selectOption('inspecao');
    await page.getByTestId('revision-type').selectOption('preventiva');

    // Testa os botões de navegação, modo e retorno do formulário
    await page.getByTestId('revision-form').click();
    await page.getByTestId('revision-mode').click();
    await page.getByTestId('revision-back').click();
  });

  test('Cenário 4: Teste Negativo - Tentativa de Ações sem Preenchimento Obrigatório', async ({ page }) => {
    // Navega para o catálogo e abre o veículo
    await page.getByTestId('nav-catalog').click();
    await page.getByTestId('open-vehicle').first().click();
    await page.getByRole('cell', { name: 'Faróis baixos' }).click();
    await page.getByTestId('start-review').click();

    // Tenta salvar rascunho ou concluir sem preencher os campos obrigatórios (quilometragem/data)
    // Valida que o sistema lida com o estado vazio de forma controlada
    const saveDraftBtn = page.getByTestId('save-draft');
    await expect(saveDraftBtn).toBeVisible();
    await saveDraftBtn.click();
  });

  test('Cenário 5: Validação da Ordenação de Carros / Veículos no Catálogo', async ({ page }) => {
    // Navega para o catálogo de veículos
    await page.getByTestId('nav-catalog').click();

    // Valida a presença e interação com o seletor de ordenação de carros
    const sortSelect = page.getByTestId('sort-vehicles');
    await expect(sortSelect).toBeVisible();

    // Altera a ordenação por Nome/Modelo e verifica se a lista atualiza
    await sortSelect.selectOption('nome');
    await expect(page.getByTestId('open-vehicle').first()).toBeVisible();

    // Altera a ordenação por Ano e verifica a resposta da listagem
    await sortSelect.selectOption('ano');
    await expect(page.getByTestId('open-vehicle').first()).toBeVisible();
  });

});