import { test, expect } from '@playwright/test';

const VEICULO = 1;

// Cada teste usa uma sessão própria para não misturar dados (favoritos/revisões ficam em memória).
const sessao = () => ({
  'X-Session-Id': `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

// Data local no formato YYYY-MM-DD, com deslocamento em dias.
const dia = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('sv-SE');
};

// Revisão concluída válida (base). Cada teste altera só o campo que quer exercitar.
const valida = (extra = {}) => ({
  mileage: 1000,
  date: dia(-1),
  type: 'preventiva',
  oilChanged: false,
  oilType: '',
  oilQuantity: null,
  notes: '',
  status: 'completed',
  ...extra,
});

const criar = (request, headers, data) =>
  request.post(`/api/vehicles/${VEICULO}/revisions`, { headers, data });

const atualizar = (request, headers, id, data) =>
  request.put(`/api/revisions/${id}`, { headers, data });

// A listagem pode vir como array ou dentro de um objeto; pega o primeiro array encontrado.
const extrairLista = (body) =>
  Array.isArray(body) ? body : Object.values(body).find(Array.isArray) ?? [];

const rejeitado = (resp) => {
  expect(resp.status(), 'deveria ser erro 4xx').toBeGreaterThanOrEqual(400);
  expect(resp.status()).toBeLessThan(500);
};

// ---------------------------------------------------------------------------
test.describe('API - Autenticação e veículos', () => {
  test('POST /api/login válido retorna token', async ({ request }) => {
    const r = await request.post('/api/login', {
      data: { email: 'qa@doutor-ie.com', password: 'Teste123' },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('token');
    expect(body.email).toBe('qa@doutor-ie.com');
  });

  test('[BUG-09] login com senha errada deve ser rejeitado (401)', async ({ request }) => {
    test.fail(); // Bug conhecido: a API retorna 200 mesmo com senha errada.
    const r = await request.post('/api/login', {
      data: { email: 'qa@doutor-ie.com', password: 'errada' },
    });
    expect(r.status()).toBe(401);
  });

  test('GET /api/vehicles retorna lista', async ({ request }) => {
    const r = await request.get('/api/vehicles', { headers: sessao() });
    expect(r.status()).toBe(200);
    expect(extrairLista(await r.json()).length).toBeGreaterThan(0);
  });

  test('GET /api/vehicles respeita ?limit=', async ({ request }) => {
    const r = await request.get('/api/vehicles?page=1&limit=2', { headers: sessao() });
    expect(r.status()).toBe(200);
    expect(extrairLista(await r.json()).length).toBeLessThanOrEqual(2);
  });

  test('GET /api/vehicles/:id retorna specs e electrical', async ({ request }) => {
    const r = await request.get(`/api/vehicles/${VEICULO}`, { headers: sessao() });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('id', VEICULO);
    expect(body).toHaveProperty('specs');
    expect(body).toHaveProperty('electrical');
  });

  test('[BUG-10] GET /api/vehicles/:id inexistente deve retornar 404', async ({ request }) => {
    test.fail(); // Bug conhecido: a API retorna 200 para veículo inexistente.
    const r = await request.get('/api/vehicles/999999', { headers: sessao() });
    expect(r.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
test.describe('API - Revisões: fluxo feliz', () => {
  test('cria revisão concluída válida', async ({ request }) => {
    const h = sessao();
    const r = await criar(request, h, valida());
    expect([200, 201]).toContain(r.status());
    const body = await r.json();
    expect(body.status).toBe('completed');
    expect(body.mileage).toBe(1000);
    expect(body.type).toBe('preventiva');
  });
});

// ---------------------------------------------------------------------------
test.describe('RN01 - Quilometragem (0 a 999999, inteiro, obrigatória)', () => {
  for (const km of [0, 1, 999998, 999999]) {
    test(`aceita km = ${km}`, async ({ request }) => {
      const r = await criar(request, sessao(), valida({ mileage: km }));
      expect([200, 201]).toContain(r.status());
    });
  }

  for (const km of [1.5, 'abc', null]) {
    test(`rejeita km = ${JSON.stringify(km)}`, async ({ request }) => {
      rejeitado(await criar(request, sessao(), valida({ mileage: km })));
    });
  }

  test('[BUG-11] rejeita km negativo (-1)', async ({ request }) => {
    test.fail(); // Bug conhecido: a API aceita (201) quilometragem negativa.
    rejeitado(await criar(request, sessao(), valida({ mileage: -1 })));
  });

  test('[BUG-11] rejeita km acima do limite (1000000)', async ({ request }) => {
    test.fail(); // Bug conhecido: a API aceita (201) km acima de 999999.
    rejeitado(await criar(request, sessao(), valida({ mileage: 1000000 })));
  });

  test('[BUG-02] rejeita km em notação científica (1e126)', async ({ request }) => {
    test.fail(); // Bug conhecido: o sistema aceita valores absurdos. Remova o test.fail() quando corrigido.
    rejeitado(await criar(request, sessao(), valida({ mileage: 1e126 })));
  });
});

// ---------------------------------------------------------------------------
test.describe('RN02 - Data (obrigatória, nunca no futuro)', () => {
  test('aceita data de hoje', async ({ request }) => {
    const r = await criar(request, sessao(), valida({ date: dia(0) }));
    expect([200, 201]).toContain(r.status());
  });

  test('[BUG-03] rejeita data de amanhã', async ({ request }) => {
    test.fail(); // Bug conhecido: data futura é aceita.
    rejeitado(await criar(request, sessao(), valida({ date: dia(1) })));
  });

  test('[BUG-03] rejeita data em 2040', async ({ request }) => {
    test.fail();
    rejeitado(await criar(request, sessao(), valida({ date: '2040-01-01' })));
  });

  test('rejeita concluir sem data', async ({ request }) => {
    rejeitado(await criar(request, sessao(), valida({ date: '' })));
  });
});

// ---------------------------------------------------------------------------
test.describe('RN03 - Tipo (preventiva, corretiva, inspecao)', () => {
  for (const tipo of ['preventiva', 'corretiva', 'inspecao']) {
    test(`aceita tipo = ${tipo}`, async ({ request }) => {
      const r = await criar(request, sessao(), valida({ type: tipo }));
      expect([200, 201]).toContain(r.status());
    });
  }

  test('rejeita tipo inválido', async ({ request }) => {
    rejeitado(await criar(request, sessao(), valida({ type: 'qualquer' })));
  });

  test('rejeita concluir sem tipo', async ({ request }) => {
    rejeitado(await criar(request, sessao(), valida({ type: '' })));
  });
});

// ---------------------------------------------------------------------------
test.describe('RN04 - Troca de óleo (tipo obrigatório, 0 < qtd <= 10 L)', () => {
  const oleo = (extra) => valida({ oilChanged: true, oilType: '5W-30', oilQuantity: 4, ...extra });

  for (const q of [0.1, 4, 10]) {
    test(`aceita quantidade = ${q} L`, async ({ request }) => {
      const r = await criar(request, sessao(), oleo({ oilQuantity: q }));
      expect([200, 201]).toContain(r.status());
    });
  }

  for (const q of [0, -1, 10.01, 11]) {
    test(`rejeita quantidade = ${JSON.stringify(q)}`, async ({ request }) => {
      rejeitado(await criar(request, sessao(), oleo({ oilQuantity: q })));
    });
  }

  test('[BUG-12] rejeita troca de óleo sem quantidade (null)', async ({ request }) => {
    test.fail(); // Bug conhecido: a API aceita (201) oilChanged=true sem oilQuantity.
    rejeitado(await criar(request, sessao(), oleo({ oilQuantity: null })));
  });

  test('[BUG-12] rejeita troca de óleo sem tipo do óleo', async ({ request }) => {
    test.fail(); // Bug conhecido: a API aceita (201) oilChanged=true sem oilType.
    rejeitado(await criar(request, sessao(), oleo({ oilType: '' })));
  });
});

// ---------------------------------------------------------------------------
test.describe('RN05 - Observações (opcional, máx. 300 caracteres)', () => {
  test('aceita observação vazia', async ({ request }) => {
    const r = await criar(request, sessao(), valida({ notes: '' }));
    expect([200, 201]).toContain(r.status());
  });

  test('aceita exatamente 300 caracteres sem truncar', async ({ request }) => {
    const texto = 'a'.repeat(300);
    const r = await criar(request, sessao(), valida({ notes: texto }));
    expect([200, 201]).toContain(r.status());
    expect((await r.json()).notes).toBe(texto);
  });

  test('[BUG-01] rejeita 301 caracteres (validação, nunca truncar)', async ({ request }) => {
    test.fail(); // Bug conhecido: texto longo é aceito.
    rejeitado(await criar(request, sessao(), valida({ notes: 'a'.repeat(301) })));
  });
});

// ---------------------------------------------------------------------------
test.describe('RN06 - Estados e histórico', () => {
  test('rascunho pode ser salvo incompleto (permitido pela regra)', async ({ request }) => {
    const r = await criar(request, sessao(), { status: 'draft' });
    expect([200, 201]).toContain(r.status());
    expect((await r.json()).status).toBe('draft');
  });

  test('rascunho pode ser editado e depois concluído', async ({ request }) => {
    const h = sessao();
    const { id } = await (await criar(request, h, { status: 'draft' })).json();

    const edit = await atualizar(request, h, id, { ...valida(), status: 'draft', notes: 'editado' });
    expect([200, 201]).toContain(edit.status());

    const concluir = await atualizar(request, h, id, valida());
    expect([200, 201]).toContain(concluir.status());
    expect((await concluir.json()).status).toBe('completed');
  });

  test('concluir sem preencher obrigatórios é rejeitado', async ({ request }) => {
    rejeitado(await criar(request, sessao(), { status: 'completed' }));
  });

  test('status inválido é rejeitado', async ({ request }) => {
    rejeitado(await criar(request, sessao(), valida({ status: 'xyz' })));
  });

  test('[BUG-04] revisão concluída não pode ser editada', async ({ request }) => {
    test.fail(); // Bug conhecido: edição de revisão concluída é aceita.
    const h = sessao();
    const { id } = await (await criar(request, h, valida())).json();
    rejeitado(await atualizar(request, h, id, valida({ mileage: 2222 })));
  });

  test('[BUG-05] revisão concluída não pode voltar a rascunho', async ({ request }) => {
    test.fail(); // Bug conhecido: regressão para rascunho é aceita.
    const h = sessao();
    const { id } = await (await criar(request, h, valida())).json();
    rejeitado(await atualizar(request, h, id, { status: 'draft' }));
  });

  test('histórico lista as revisões mais recentes primeiro', async ({ request }) => {
    const h = sessao();
    const ids = [];
    for (const km of [100, 200, 300]) {
      const r = await criar(request, h, valida({ mileage: km }));
      ids.push((await r.json()).id);
    }
    const resp = await request.get(`/api/vehicles/${VEICULO}/revisions`, { headers: h });
    expect(resp.status()).toBe(200);
    const lista = extrairLista(await resp.json());
    expect(lista.length).toBeGreaterThanOrEqual(3);
    // Esperado: a última criada (maior id) aparece primeiro.
    expect(lista.map((x) => x.id).slice(0, 3)).toEqual([...ids].reverse());
  });
});