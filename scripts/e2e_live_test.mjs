/**
 * 真实联调 E2E：uvicorn(8000) + Vite(8080) + Playwright 浏览器
 *
 * 用法:
 *   node scripts/e2e_live_test.mjs
 *   node scripts/e2e_live_test.mjs --base http://127.0.0.1:8080
 */
import { chromium } from 'playwright';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://127.0.0.1:8080';
const API = 'http://127.0.0.1:8000';
const DEV_EMAIL = 'dev@local.test';
const DEV_PASSWORD = 'dev123456';

let passed = 0;
let failed = 0;

function record(name, ok, detail = '') {
  if (ok) passed++;
  else failed++;
  console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitUrl(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function loginApi() {
  const r = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
  });
  const j = await r.json();
  if (!j.success || !j.data?.access_token) {
    throw new Error(j.message || '登录失败');
  }
  return j.data.access_token;
}

async function loginInBrowser(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('dev 或 dev@local.test').fill(DEV_EMAIL);
  await page.locator('input[type="password"]').fill(DEV_PASSWORD);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForTimeout(2000);
  const onHome = !page.url().includes('/login');
  record('浏览器登录', onHome, page.url());
  return onHome;
}

async function run() {
  console.log('\n=== 真实联调 E2E（浏览器 + 真实服务）===\n');
  console.log(`BASE=${BASE}  API=${API}\n`);

  console.log('[检查服务]');
  const backendOk = await waitUrl(`${API}/health`);
  record('后端 uvicorn /health', backendOk, `${API}/health 不可达`);
  const frontendOk = await waitUrl(BASE);
  record('前端 Vite', frontendOk, `${BASE} 不可达`);

  if (!backendOk || !frontendOk) {
    console.log('\n请先启动:');
    console.log('  后端(WSL): bash scripts/start_backend.sh');
    console.log('  前端(Win):  cd nocode && npm run dev');
    process.exit(1);
  }

  let token;
  try {
    token = await loginApi();
    record('后端登录 API', !!token);
  } catch (e) {
    record('后端登录 API', false, e.message);
  }

  if (token) {
    try {
      const r = await fetch(`${BASE}/api/v1/pricing/price-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: '保温杯', platforms: ['taobao'] }),
      });
      const j = await r.json();
      record('Vite 代理 /api → 后端（已鉴权）', j.success === true && !!j.data?.summary);
    } catch (e) {
      record('Vite 代理 /api → 后端（已鉴权）', false, e.message);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('\n[浏览器页面]');

  const loggedIn = await loginInBrowser(page);
  if (!loggedIn) {
    await browser.close();
    console.log('\n登录失败，跳过后续页面测试');
    process.exit(1);
  }

  // 1. 比价页
  await page.goto(`${BASE}/#/pricing-cost/price-compare`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  record('打开比价页', (await page.locator('text=多平台比价与智能定价').count()) > 0);

  await page.getByPlaceholder('例如：304不锈钢保温杯 500ml').fill('不锈钢保温杯');
  await page.getByRole('button', { name: /AI 一键全网比价/ }).click();
  await page.waitForTimeout(8000);
  const compareOk =
    (await page.locator('text=最低价').count()) > 0 ||
    (await page.locator('text=平均价').count()) > 0;
  record('比价页 API 联调', compareOk);

  if (compareOk) {
    await page.getByRole('button', { name: '生成定价方案' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /基于比价结果生成定价方案/ }).click();
    await page.waitForTimeout(8000);
    const pricingOk =
      (await page.locator('text=推荐定价区间').count()) > 0 ||
      (await page.locator('text=最优价格').count()) > 0;
    record('定价页 API 联调（先比价后定价）', pricingOk);
  }

  // 2. 推广效果
  await page.goto(`${BASE}/#/data-operation/promotion`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByPlaceholder('例如：5000').fill('5000');
  await page.getByRole('button', { name: '效果预估' }).click();
  await page.waitForTimeout(3000);
  const promoOk =
    (await page.locator('text=效果预估完成').count()) > 0 ||
    (await page.locator('text=曝光').count()) > 0 ||
    (await page.locator('text=ROI').count()) > 0;
  record('推广效果页 API 联调', promoOk);

  // 3. 产业链匹配
  await page.goto(`${BASE}/#/market-analysis/industry`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByPlaceholder('例如：不锈钢保温杯').first().fill('不锈钢保温杯');
  await page.getByRole('button', { name: '匹配产业链资源' }).click();
  await page.waitForTimeout(3000);
  const industryOk =
    (await page.locator('text=产业链匹配完成').count()) > 0 ||
    (await page.locator('text=上游').count()) > 0 ||
    (await page.locator('text=供应商').count()) > 0;
  record('产业链匹配页 API 联调', industryOk);

  // 4. 平台推荐（产品列表）
  await page.goto(`${BASE}/#/publish/platform`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const platformOk = (await page.locator('text=平台推荐').count()) > 0;
  record('上架-平台推荐页加载', platformOk);

  // 5. 数据监控
  await page.goto(`${BASE}/#/data-operation/monitor`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const monitorBtn = page.getByRole('button', { name: /接入|监控|开始/ });
  if ((await monitorBtn.count()) > 0) {
    await monitorBtn.first().click();
    await page.waitForTimeout(3000);
  }
  const monitorOk =
    (await page.locator('text=数据监控已接入').count()) > 0 ||
    (await page.locator('text=浏览量').count()) > 0 ||
    (await page.locator('text=访客').count()) > 0;
  record('数据监控页 API 联调', monitorOk);

  // 6. 营销策略
  await page.goto(`${BASE}/#/data-operation/marketing`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByPlaceholder('例如：304不锈钢保温杯').fill('保温杯');
  await page.getByPlaceholder('例如：5000').fill('5000');
  await page.getByRole('button', { name: '生成营销策略' }).click();
  await page.waitForTimeout(3000);
  const marketingOk =
    (await page.locator('text=营销策略生成成功').count()) > 0 ||
    (await page.locator('text=方案 A').count()) > 0;
  record('营销策略页 API 联调', marketingOk);

  // 7. BOM 成本分析
  await page.goto(`${BASE}/#/pricing-cost/bom`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByPlaceholder('例如：304不锈钢保温杯 500ml').fill('保温杯');
  await page.getByRole('button', { name: /AI 一键拆解成本/ }).click();
  await page.waitForTimeout(8000);
  const bomOk =
    (await page.locator('text=AI 估算总成本').count()) > 0 ||
    (await page.locator('text=总成本').count()) > 0;
  record('BOM 分析页 API 联调', bomOk);

  // 8. 未登录重定向
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/#/pricing-cost/price-compare`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  record('未登录重定向到登录页', page.url().includes('/login'));

  await browser.close();

  const total = passed + failed;
  console.log(`\n${'='.repeat(40)}`);
  console.log(`通过: ${passed}/${total}  失败: ${failed}/${total}`);
  console.log();
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
