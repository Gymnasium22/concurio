import { chromium } from 'playwright';

const email = 'review+20260713221958@concurio.test';
const password = 'ReviewTest123!';
const base = 'https://gymnasium22.github.io/concurio/';

// iPhone 14-ish + Telegram-like tall narrow
const devices = [
  { name: 'iphone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tg', width: 390, height: 720, isMobile: true, hasTouch: true, tg: true },
];

const browser = await chromium.launch({ headless: true });

for (const d of devices) {
  const context = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    isMobile: d.isMobile,
    hasTouch: d.hasTouch,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  if (d.tg) {
    await page.addInitScript(() => {
      // Minimal Telegram WebApp mock
      window.Telegram = {
        WebApp: {
          initData: 'mock',
          initDataUnsafe: { user: { id: 1, first_name: 'Test' } },
          version: '7.0',
          platform: 'ios',
          colorScheme: 'light',
          themeParams: {
            bg_color: '#ffffff',
            text_color: '#000000',
            hint_color: '#999999',
            link_color: '#2481cc',
            button_color: '#2481cc',
            button_text_color: '#ffffff',
            secondary_bg_color: '#f4f4f5',
          },
          isExpanded: true,
          viewportHeight: 720,
          viewportStableHeight: 720,
          headerColor: '#ffffff',
          backgroundColor: '#ffffff',
          ready() {},
          expand() {},
          close() {},
          MainButton: {
            text: '',
            isVisible: false,
            isActive: true,
            isProgressVisible: false,
            setText() {},
            onClick() {},
            offClick() {},
            show() {
              this.isVisible = true;
              document.body.classList.add('tg-main-button-open');
            },
            hide() {
              this.isVisible = false;
              document.body.classList.remove('tg-main-button-open');
            },
            enable() {},
            disable() {},
            showProgress() {},
            hideProgress() {},
            setParams() {},
          },
          BackButton: {
            isVisible: false,
            onClick() {},
            offClick() {},
            show() {},
            hide() {},
          },
          HapticFeedback: {
            impactOccurred() {},
            notificationOccurred() {},
            selectionChanged() {},
          },
          setHeaderColor() {},
          setBackgroundColor() {},
          enableClosingConfirmation() {},
          disableClosingConfirmation() {},
          onEvent() {},
          offEvent() {},
          sendData() {},
          openLink(url) {
            window.open(url);
          },
          openTelegramLink() {},
          showPopup() {},
          showAlert() {},
          showConfirm() {},
        },
      };
      document.documentElement.classList.add('tg-mini-app');
      document.body?.classList.add('tg-mini-app');
    });
  }

  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);

  // login if needed
  const emailSel = 'input[type=email], input[name=email]';
  if (await page.locator(emailSel).count()) {
    await page.fill(emailSel, email);
    await page.fill('input[type=password]', password);
    await page.locator('button[type=submit]').first().click();
    await page.waitForTimeout(4000);
  }

  // dismiss onboarding
  for (let i = 0; i < 10; i++) {
    if (!(await page.locator('text=Добро пожаловать').count())) break;
    const btn = page.getByRole('button', { name: /далее|готово|начать/i });
    if (await btn.count()) {
      await btn.first().click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
      break;
    }
  }
  await page.evaluate(() => {
    localStorage.setItem('concurio-onboarding-done', '1');
  });

  const paths = [
    ['home', ''],
    ['kanban', 'kanban'],
    ['create', 'create'],
    ['calendar', 'calendar'],
    ['profile', 'profile'],
    ['analytics', 'analytics'],
  ];

  for (const [name, path] of paths) {
    try {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      if (await page.locator('text=Добро пожаловать').count()) {
        for (let i = 0; i < 8; i++) {
          const btn = page.getByRole('button', { name: /далее|готово|начать/i });
          if (await btn.count()) {
            await btn.first().click();
            await page.waitForTimeout(350);
          } else break;
        }
      }
      await page.screenshot({
        path: `tmp-screens/${d.name}-${name}.png`,
        fullPage: false,
      });
      console.log(d.name, name, 'ok', page.url());
    } catch (e) {
      console.log(d.name, name, 'fail', e.message);
    }
  }

  await context.close();
}

await browser.close();
console.log('done');
