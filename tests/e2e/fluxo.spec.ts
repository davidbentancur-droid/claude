import { expect, test } from '@playwright/test';

import fixture from '../fixtures/marcelo.json';

/**
 * Smoke do caminho até o formulário, sem depender de chave de API.
 *
 * As telas de leitura e dossiê exigem o engine e ficam em `dossie.spec.ts`,
 * que só roda quando as envs estão preenchidas. O que este arquivo garante é a
 * fidelidade da copy e o portão, que são as duas coisas que não podem quebrar
 * em silêncio.
 */

const PERGUNTAS = [
  'Volta uns sete anos pra trás',
  'E nos últimos meses, o que está acontecendo na tua vida agora?',
  'O que tu mais tem buscado ultimamente',
];

/**
 * Preenche a tela `i` com a fixture.
 *
 * A terceira tela tem três campos desde o Prompt Mãe de 18/09: a busca, o
 * obstáculo e o preço de nada mudar. A fixture continua com quatro respostas,
 * porque o armazenamento continua com quatro, então as duas linhas da p3 mais a
 * p4 viram os três campos da tela.
 */
async function preencherTela(page: import('@playwright/test').Page, i: number) {
  const r = fixture.respostas;
  const areas = page.locator('textarea');

  if (i === 2) {
    const [busca, obstaculo] = r.p3.split('\n');
    await expect(areas).toHaveCount(3);
    await areas.nth(0).fill(busca);
    await areas.nth(1).fill(obstaculo);
    await areas.nth(2).fill(r.p4);
    return;
  }

  await areas.first().fill(i === 0 ? r.p1 : r.p2);
}

test('a tela da oferta promete o dossiê inteiro e não pede dado nenhum', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();

  const main = page.locator('main');
  // A promessa da Tela 1, item por item. É ela que o dossiê tem que cumprir.
  await expect(main).toContainText('qual é a armadilha desse ponto e qual é o convite dele');
  await expect(main).toContainText('o gesto que a tua vida vem repetindo há anos');
  await expect(main).toContainText('dois mitos ancestrais, milenares');
  await expect(main).toContainText('Uns cinco minutos, escrevendo ou falando.');
  // O heading de venda que a versão de 18/09 acrescentou.
  await expect(main).toContainText('Descubra em que Ato da tua vida tu está');

  const texto = (await page.locator('body').innerText()).toLowerCase();
  for (const proibida of ['inteligência artificial', ' ia ', 'quiz', 'teste', 'resultado']) {
    expect(texto).not.toContain(proibida);
  }
  // A régua das duas telas: a Tela 1 nunca explica o método.
  expect(texto).not.toContain('arquétipo');
  expect(await page.locator('input, textarea').count()).toBe(0);
});

test('a tela de como responder chega inteira, com o exemplo de cena', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();

  const main = page.locator('main');
  await expect(main).toContainText('me dá cena, não resumo');
  // A parte que um split ingênuo na palavra "cena" comeria.
  await expect(main).toContainText('Duas cenas bem contadas valem mais que dez tópicos.');
  // Ela nunca repete a promessa da Tela 1.
  await expect(main).not.toContainText('armadilha');
});

test('as três perguntas aparecem na ordem, com o contador', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Entendi, vamos' }).click();

  for (let i = 0; i < 3; i++) {
    await expect(page.getByText(`${i + 1} de 3`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(PERGUNTAS[i]);

    await preencherTela(page, i);
    await page.getByRole('button', { name: 'Enviar' }).click();
    if (i < 2) await page.waitForTimeout(600);
  }

  // Sem chave de API a leitura falha, e o que tem que aparecer é a tela de erro
  // com as respostas preservadas, nunca uma tela em branco.
  await expect(page.locator('main')).toContainText(/Separando cena de resumo|A leitura não fechou/, {
    timeout: 30_000,
  });
});

test('a repescagem é uma no fluxo inteiro: gasta na P1 e a P2 segue sem ela', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Entendi, vamos' }).click();

  // O "assim não" da própria pergunta: lista de tópicos sem verbo.
  await page
    .locator('textarea')
    .first()
    .fill('mudança de cidade, falecimento do meu pai, autoconhecimento');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.locator('main')).toContainText(
    'Me dá um dia, um lugar e uma pessoa dentro do que tu contou.',
    { timeout: 20_000 },
  );

  await page
    .locator('textarea')
    .first()
    .fill('em 2019 eu saí da empresa depois de uma briga com meu sócio em Porto Alegre');
  await page.getByRole('button', { name: 'Enviar' }).click();

  // Segue pra P2, sem segunda repescagem na própria P1.
  await expect(page.getByText('2 de 3')).toBeVisible({ timeout: 20_000 });

  /*
   * A cota é do fluxo, Prompt Mãe Seção 2. Esta resposta da P2 é o "assim não"
   * da própria pergunta e passaria no portão sozinha, mas a P1 já gastou a
   * única repescagem, então a P2 segue com o que veio.
   */
  await page
    .locator('textarea')
    .first()
    .fill('tenho buscado mais equilíbrio e presença, mas o trabalho consome');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('3 de 3')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('main')).not.toContainText('Me dá um dia, um lugar');
});

test('a terceira tela não tem repescagem, mesmo com resposta curta', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Entendi, vamos' }).click();

  for (let i = 0; i < 3; i++) {
    await preencherTela(page, i);
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForTimeout(600);
  }

  /*
   * A terceira tela pede três frases curtas, e o preço de nada mudar tem treze
   * palavras no caso canônico. O portão da Seção 2 nunca repesca esta tela, e a
   * triagem do Prompt Mãe 11.2 diz que ela basta assim.
   */
  await expect(page.locator('main')).not.toContainText('Me dá um dia, um lugar');
});

test('o portão recusa lead sem leitura salva', async ({ request }) => {
  const r = await request.post('/api/lead', {
    data: {
      nome: 'Teste',
      whatsapp: '(51) 99999-9999',
      profissao: 'Analista',
      orcamento: 'uns 200 por mês',
    },
  });

  expect(r.status()).toBeGreaterThanOrEqual(400);
  expect(await r.text()).not.toContain('dossie');
});

test('nenhuma resposta antes do lead carrega texto de dossiê', async ({ request }) => {
  const r = await request.post('/api/read', { data: { respostas: {} } });
  const corpo = await r.text();

  expect(corpo).not.toContain('"dossie"');
  expect(corpo).not.toContain('fechamento');
});

test('a política de privacidade existe e está fora do índice', async ({ page }) => {
  await page.goto('/privacidade');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Política de privacidade');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
});
