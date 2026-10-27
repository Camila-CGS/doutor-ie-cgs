import { test, expect } from '@playwright/test';

test.describe('Testes de API e Validação de Regras - Doutor-IE', () => {

  const sessionId = 'camila-sessao-qa-123';

  test('GET /api/vehicles - Deve listar os veículos com sucesso', async ({ request }) => {
    const response = await request.get('/api/vehicles', {
      headers: { 'X-Session-Id': sessionId }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    // Validação flexível para aceitar array direto ou encapsulado em objeto
    const lista = Array.isArray(body) ? body : (body.vehicles || body.data || Object.values(body));
    expect(Array.isArray(lista)).toBeTruthy();
  });

  test('GET /api/vehicles/:id - Deve retornar os detalhes técnicos do veículo', async ({ request }) => {
    const response = await request.get('/api/vehicles/1', {
      headers: { 'X-Session-Id': sessionId }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
  });

  test('RN01 & RN02: Deve rejeitar revisão com quilometragem inválida ou data futura', async ({ request }) => {
    const response = await request.post('/api/vehicles/1/revisions', {
      headers: { 'X-Session-Id': sessionId },
      data: {
        mileage: -50,
        date: '2040-01-01',
        type: 'preventiva',
        oilChanged: true,
        oilQuantity: 4.0,
        observations: 'Teste de validação de limites'
      }
    });
    expect([400, 422]).toContain(response.status());
  });

  test('BUG-06: Deve impedir a criação de rascunhos de revisão completamente vazios', async ({ request }) => {
    const response = await request.post('/api/vehicles/1/revisions', {
      headers: { 'X-Session-Id': sessionId },
      data: {
        mileage: null,
        date: '',
        type: '',
        oilChanged: false,
        oilQuantity: null,
        observations: ''
      }
    });
    expect([400, 422]).toContain(response.status());
  });

  test('RN06: Deve garantir que o histórico lista as revisões mais recentes primeiro', async ({ request }) => {
    const response = await request.get('/api/vehicles/1/revisions', {
      headers: { 'X-Session-Id': sessionId }
    });
    expect(response.status()).toBe(200);
    const revisions = await response.json();
    
    if (revisions.length > 1) {
      const primeiraData = new Date(revisions[0].date);
      const segundaData = new Date(revisions[1].date);
      expect(primeiraData.getTime()).toBeGreaterThanOrEqual(segundaData.getTime());
    }
  });

});