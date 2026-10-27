import { test, expect } from '@playwright/test';

const EMAIL = 'qa@doutor-ie.com';
const SENHA = 'Teste123';

// Data local de hoje (YYYY-MM-DD) com deslocamento opcional em dias.
const dia = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('sv-SE');
};

async function login(page, email = EMAIL, senha = SENHA) {
  await page.goto('/');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(senha);
  await page.getByTestId('login-submit').click();
}

async function logado(page) {
  await login(page);
  await expect(page.getByTestId('nav-catalog')).toBeVisible();
}

async function abrirNovaRevisao(page) {
  await page.getByTestId('nav-catalog').click();
  await page.getByTestId('open-vehicle').first().click();
  await page.getByTestId('start-review').click();
  await expect(page.getByTestId('revision-mileage')).toBeVisible();
}

// ---------------------------------------------------------------------------
test.describe('UI - Login', () => {
  test('login válido leva ao catálogo', async ({ page }) => {
    await logado(page);
    await expect(page.getByTestId('open-vehicle').first()).toBeVisible();
  });

  test('login com senha inválida permanece na tela de login', async ({ page }) => {
    await login(page, EMAIL, 'senha-errada');
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page.getByTestId('nav-catalog')).toBeHidden();
  });

  test('login com campos vazios não autentica', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('nav-catalog')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
test.describe('UI - Catálogo e favoritos', () => {
  test('fluxo feliz: login -> abrir manual -> favoritar', async ({ page }) => {
    await logado(page);

    // abre um manual e confere que a tela de detalhes carregou
    await page.getByTestId('open-vehicle').first().click();
    await expect(page.getByTestId('start-review')).toBeVisible();

    // volta ao catálogo, favorita e confere na tela de favoritos
    await page.getByTestId('nav-catalog').click();
    await page.getByTestId('favorite-btn').first().click();
    await page.getByTestId('nav-favorites').click();
    await expect(page.getByRole('button', { name: '✕' }).first()).toBeVisible();
  });

  test('busca sem resultado não exibe veículos', async ({ page }) => {
    await logado(page);
    // AJUSTE se necessário: troque pelo data-testid real do campo de busca.
    const busca = page.getByRole('searchbox').or(page.getByPlaceholder(/busc|pesquis|search/i)).first();
    await busca.fill('zzzz-inexistente-9999');
    await expect(page.getByTestId('open-vehicle')).toHaveCount(0);
  });

  test('[BUG-07] contador de favoritos diminui ao remover', async ({ page }) => {
    test.fail(); // Bug conhecido: contador do menu não atualiza após remoção.
    await logado(page);
    await page.getByTestId('favorite-btn').first().click();
    await page.getByTestId('favorite-btn').nth(1).click();
    await page.getByTestId('nav-favorites').click();

    const antes = (await page.getByTestId('nav-favorites').innerText()).match(/\d+/)?.[0];
    await page.getByRole('button', { name: '✕' }).first().click();
    const depois = (await page.getByTestId('nav-favorites').innerText()).match(/\d+/)?.[0];
    expect(Number(depois)).toBe(Number(antes) - 1);
  });

  test('[BUG-06] ordenação por ano reordena a lista', async ({ page }) => {
    test.fail(); // Bug conhecido: a lista não muda ao alternar Ano crescente/decrescente.
    await logado(page);

    const anos = () =>
      page.getByTestId('open-vehicle').evaluateAll((els) =>
        els
          .map((e) => ((e.closest('article, li, [class*=card]') || e.parentElement).innerText.match(/\b(19|20)\d{2}\b/) || [])[0])
          .filter(Boolean)
          .map(Number)
      );

    const botaoAno = page.getByRole('button', { name: /Ano/ });
    await expect(botaoAno).toBeVisible();

    await botaoAno.click();
    const primeira = await anos();
    await botaoAno.click();
    const segunda = await anos();

    expect(primeira.length).toBeGreaterThan(1);
    expect(JSON.stringify(primeira)).not.toBe(JSON.stringify(segunda));
  });
});

// ---------------------------------------------------------------------------
test.describe('UI - Revisões', () => {
  test('conclui revisão válida e exibe no histórico', async ({ page }) => {
    await logado(page);
    await abrirNovaRevisao(page);

    await page.getByTestId('revision-mileage').fill('12345');
    await page.getByTestId('revision-date').fill(dia(-1));
    await page.getByTestId('revision-type').selectOption('preventiva');
    await page.getByTestId('revision-notes').fill('Revisão de teste automatizado');
    await page.getByTestId('complete-review').click();

    await expect(page.getByTestId('revision-status').first()).toContainText(/conclu/i);
  });

  test('salva rascunho e permite editar até concluir', async ({ page }) => {
    await logado(page);
    await abrirNovaRevisao(page);

    await page.getByTestId('revision-mileage').fill('500');
    await page.getByTestId('save-draft').click();
    await expect(page.getByTestId('revision-status').first()).toContainText(/rascunho/i);

    await page.getByTestId('edit-review').first().click();
    await page.getByTestId('revision-date').fill(dia(-1));
    await page.getByTestId('revision-type').selectOption('corretiva');
    await page.getByTestId('complete-review').click();
    await expect(page.getByTestId('revision-status').first()).toContainText(/conclu/i);
  });

  test('negativo: concluir sem campos obrigatórios não conclui', async ({ page }) => {
    await logado(page);
    await abrirNovaRevisao(page);
    await page.getByTestId('complete-review').click();
    await expect(page.getByTestId('revision-status')).toHaveCount(0);
  });

  test('[BUG-03] não deve concluir revisão com data futura', async ({ page }) => {
    test.fail(); // Bug conhecido: data futura é aceita.
    await logado(page);
    await abrirNovaRevisao(page);

    await page.getByTestId('revision-mileage').fill('1000');
    await page.getByTestId('revision-date').fill(dia(30));
    await page.getByTestId('revision-type').selectOption('preventiva');
      const resposta = page.waitForResponse(
    (r) => r.url().includes('/revisions') && r.request().method() === 'POST'
  );
  await page.getByTestId('complete-review').click();
  expect((await resposta).status()).toBeGreaterThanOrEqual(400); // data futura deveria ser rejeitada
  });
});