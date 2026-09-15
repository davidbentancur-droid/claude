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
  'Se daqui a dois anos nada disso tiver mudado',
];

test('abertura não pede dado nenhum e não menciona IA', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();
  await expect(
    page.getByText('Nenhum dado é pedido antes da leitura estar pronta.'),
  ).toBeVisible();

  const texto = (await page.locator('body').innerText()).toLowerCase();
  for (const proibida of ['inteligência artificial', ' ia ', 'quiz', 'teste', 'resultado']) {
    expect(texto).not.toContain(proibida);
  }
  expect(await page.locator('input, textarea').count()).toBe(0);
});

test('o enquadramento chega inteiro, com o exemplo de cena', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();

  const main = page.locator('main');
  await expect(main).toContainText('o que eu preciso aqui é cena, não resumo');
  // A parte que um split ingênuo na palavra "cena" comeria.
  await expect(main).toContainText('Duas cenas bem contadas valem mais que dez tópicos.');
});

test('as quatro perguntas aparecem na ordem, com o contador', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Entendi, vamos' }).click();

  for (let i = 0; i < 4; i++) {
    await expect(page.getByText(`${i + 1} de 4`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(PERGUNTAS[i]);

    const respostas = Object.values(fixture.respostas);
    const areas = page.locator('textarea');

    if (i === 2) {
      // P3 tem dois campos empilhados.
      await expect(areas).toHaveCount(2);
      const [busca, obstaculo] = respostas[2].split('\n');
      await areas.nth(0).fill(busca);
      await areas.nth(1).fill(obstaculo);
    } else {
      await areas.first().fill(respostas[i]);
    }

    await page.getByRole('button', { name: 'Enviar' }).click();
    if (i < 3) await page.waitForTimeout(600);
  }

  // Sem chave de API a leitura falha, e o que tem que aparecer é a tela de erro
  // com as respostas preservadas, nunca uma tela em branco.
  await expect(page.locator('main')).toContainText(/Separando cena de resumo|A leitura não fechou/, {
    timeout: 30_000,
  });
});

test('a repescagem aparece uma vez na P1 e não volta na segunda', async ({ page }) => {
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

  // Segue pra P2, sem segunda repescagem.
  await expect(page.getByText('2 de 4')).toBeVisible({ timeout: 20_000 });
});

test('a P4 não tem repescagem, mesmo com resposta curta', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: 'Entendi, vamos' }).click();

  const respostas = Object.values(fixture.respostas);

  for (let i = 0; i < 4; i++) {
    const areas = page.locator('textarea');
    if (i === 2) {
      const [busca, obstaculo] = respostas[2].split('\n');
      await areas.nth(0).fill(busca);
      await areas.nth(1).fill(obstaculo);
    } else {
      await areas.first().fill(respostas[i]);
    }
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForTimeout(600);
  }

  // A P4 canônica tem 13 palavras e a triagem do Prompt Mãe diz que ela basta.
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
