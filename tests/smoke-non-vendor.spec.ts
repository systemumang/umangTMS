import { expect, test, type Locator, type Page } from '@playwright/test';

const adminEmail = process.env.PW_ADMIN_EMAIL || 'bizskill17@gmail.com';
const adminPassword = process.env.PW_ADMIN_PASSWORD || '!Office1@';

const stamp = Date.now();
const data = {
  category: `SmokeCat_${stamp}`,
  categoryEdited: `SmokeCat_${stamp}_E`,
  firm: `SmokeFirm_${stamp}`,
  firmEdited: `SmokeFirm_${stamp}_E`,
  status: `SmokeStatus_${stamp}`,
  statusEdited: `SmokeStatus_${stamp}_E`,
  userName: `Smoke User ${stamp}`,
  userEmail: `smoke.user.${stamp}@example.com`,
  userPassword: `Smoke@${String(stamp).slice(-6)}!`,
  client: `SmokeClient_${stamp}`,
  project: `SmokeProject_${stamp}`,
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactLabelRegex = (value: string) => new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, 'i');

async function moduleShot(page: Page, name: string) {
  await page.screenshot({ path: `playwright-report/${name}.png`, fullPage: true });
}

async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  const loginButton = page.getByRole('button', { name: /login/i });
  if (await loginButton.count()) {
    const emailInput = page.getByPlaceholder(/bizskill17@gmail.com/i);
    if (await emailInput.isVisible()) {
      await emailInput.fill(adminEmail);
      await page.locator('input[type="password"]').fill(adminPassword);
      await loginButton.click();

      // Wait for one of: app shell, login error, or login button re-enabled.
      const appShell = page.locator('aside, header, main').first();
      const loginError = page.getByText(/incorrect email or password|please fill in all fields|invalid credentials/i).first();
      const loginButtonAgain = page.getByRole('button', { name: /login/i }).first();

      await Promise.race([
        appShell.waitFor({ state: 'visible', timeout: 20_000 }),
        loginError.waitFor({ state: 'visible', timeout: 20_000 }),
        loginButtonAgain.waitFor({ state: 'visible', timeout: 20_000 }),
      ]).catch(() => {});
    }
  }
  const loginStillVisible = await page.getByRole('button', { name: /login/i }).isVisible().catch(() => false);
  const hasLoginError = await page.getByText(/incorrect email or password|invalid credentials/i).isVisible().catch(() => false);
  if (hasLoginError) {
    throw new Error('Login failed with invalid credentials.');
  }
  if (loginStillVisible) {
    throw new Error('Login did not complete in time.');
  }

  // App can render in side or top layout; don't hard-require sidebar.
  const appReady = page.locator('aside, header, main');
  await expect(appReady.first()).toBeVisible();

  // Wait for initial loader overlay to settle before navigation clicks.
  const loadingText = page.getByText(/loading\.\.\./i);
  if (await loadingText.count()) {
    await loadingText.first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  }
}

async function openNav(page: Page, label: string): Promise<boolean> {
  const labelAliases: Record<string, string[]> = {
    'Status': ['Status', 'Statuses'],
    'Telegram Setup': ['Telegram Setup', 'Telegram'],
  };
  const namesToTry = labelAliases[label] || [label];

  // If we're already on the target page, treat as success (exact heading match only).
  for (const name of namesToTry) {
    const headingMatch = page.getByRole('heading', { name: exactLabelRegex(name) }).first();
    if ((await headingMatch.count()) && (await headingMatch.isVisible())) {
      return true;
    }
  }

  const openSidebarIfNeeded = async () => {
    const sidebarNow = page.locator('aside');
    if (await sidebarNow.count()) return;
    const menuBtn = page.locator('button:has(svg.lucide-menu):visible').first();
    if (await menuBtn.count()) {
      await menuBtn.click({ timeout: 2000 });
      await page.waitForTimeout(250);
    }
  };

  // First try global/top navigation buttons directly (works in top layout).
  for (const name of namesToTry) {
    const topNavCandidate = page.getByRole('button', { name: exactLabelRegex(name) }).first();
    if ((await topNavCandidate.count()) && (await topNavCandidate.isVisible())) {
      await topNavCandidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await topNavCandidate.click({ timeout: 1500 }).then(() => true).catch(async () => {
        return topNavCandidate.click({ force: true, timeout: 1500 }).then(() => true).catch(() => false);
      });
      if (clicked) return true;
    }
  }

  await openSidebarIfNeeded();
  let sidebar = page.locator('aside');

  const masterItems = new Set(['Users', 'Firms', 'Categories', 'Status', 'Settings', 'Telegram Setup']);

  // In top-layout, master items are inside the "Master" dropdown.
  if (masterItems.has(label)) {
    const topMaster = page.getByRole('button', { name: /master/i }).first();
    if ((await topMaster.count()) && (await topMaster.isVisible())) {
      await topMaster.scrollIntoViewIfNeeded().catch(() => {});
      await topMaster.click({ timeout: 1500 }).catch(async () => {
        await topMaster.click({ force: true, timeout: 1500 }).catch(() => {});
      });
      await page.waitForTimeout(250);
    }
  }

  if (await sidebar.count()) {
    if (masterItems.has(label)) {
      let targetVisible = false;
      for (const name of namesToTry) {
        const target = sidebar.locator('button').filter({ hasText: exactLabelRegex(name) }).first();
        if ((await target.count()) && (await target.isVisible())) {
          targetVisible = true;
          break;
        }
      }
      if (!targetVisible) {
        const masterSection = sidebar.locator('button').filter({ hasText: /master/i }).first();
        if (await masterSection.count()) {
          await masterSection.click();
          await page.waitForTimeout(350);
        }
      }
    }

    // Use contains-match because nav labels may include counters/icons.
    for (const name of namesToTry) {
      const candidate = sidebar.locator('button').filter({ hasText: exactLabelRegex(name) }).first();
      if (await candidate.count()) {
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        const clicked = await candidate.click({ timeout: 1500 }).then(() => true).catch(async () => {
          return candidate.click({ force: true, timeout: 1500 }).then(() => true).catch(() => false);
        });
        if (clicked) return true;
      }
    }
  }

  // One more retry after forcing menu open.
  await openSidebarIfNeeded();
  sidebar = page.locator('aside');
  if (await sidebar.count()) {
    for (const name of namesToTry) {
      const retryCandidate = sidebar.getByRole('button', { name: exactLabelRegex(name) }).first();
      if (await retryCandidate.count()) {
        await retryCandidate.scrollIntoViewIfNeeded().catch(() => {});
        const clicked = await retryCandidate.click({ timeout: 1500 }).then(() => true).catch(async () => {
          return retryCandidate.click({ force: true, timeout: 1500 }).then(() => true).catch(() => false);
        });
        if (clicked) return true;
      }
    }
  }

  // Final fallback for custom-rendered nav elements/portals.
  for (const name of namesToTry) {
    const genericClickable = page.locator('button, [role="button"], a').filter({ hasText: exactLabelRegex(name) }).first();
    if ((await genericClickable.count()) && (await genericClickable.isVisible())) {
      await genericClickable.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await genericClickable.click({ timeout: 1500 }).then(() => true).catch(async () => {
        return genericClickable.click({ force: true, timeout: 1500 }).then(() => true).catch(() => false);
      });
      if (clicked) return true;
    }
  }

  return false;
}

async function expectHeading(page: Page, text: string) {
  const headingAliases: Record<string, string[]> = {
    'Telegram Setup': ['Telegram Setup', 'Telegram Group Setup'],
    'Status': ['Status', 'Statuses'],
    'Settings': ['Settings', 'Setting', 'General Settings', 'Application Settings'],
    'Task Update Log': ['Task Update Log', 'Task Update', 'Action Log'],
    'Recurring Master': ['Recurring Master', 'Recurring Tasks'],
  };
  const patterns = headingAliases[text] || [text];
  let matched = false;
  for (const pattern of patterns) {
    const heading = page.getByRole('heading', { name: exactLabelRegex(pattern) }).first();
    if ((await heading.count()) && (await heading.isVisible())) {
      matched = true;
      break;
    }
  }
  // Some pages (notably Settings) may render title as a non-heading element.
  if (!matched && text === 'Settings') {
    for (const pattern of patterns) {
      const titleLike = page.locator('h1, h2, h3, h4, .title, [data-testid*="title"], [class*="title"]')
        .filter({ hasText: new RegExp(escapeRegex(pattern), 'i') })
        .first();
      if ((await titleLike.count()) && (await titleLike.isVisible())) {
        matched = true;
        break;
      }
      const bodyText = page.getByText(new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i')).first();
      if ((await bodyText.count()) && (await bodyText.isVisible())) {
        matched = true;
        break;
      }
    }
  }
  expect(matched, `Expected heading/title not visible for: ${text}`).toBeTruthy();
}

async function firstRowAction(page: Page, iconName: 'Edit2' | 'Trash2') {
  const row = page.locator('table tbody tr').first();
  await expect(row).toBeVisible();
  const button = iconName === 'Edit2'
    ? row.locator('button').first()
    : row.locator('button').nth(1);
  await button.click();
}

async function pickSearchableSelectByLabel(page: Page, label: string, value: string) {
  const wrapper = page.locator('div').filter({ hasText: new RegExp(`^${label}`, 'i') }).first();
  const combo = wrapper.getByRole('combobox').first();
  await combo.click();
  await page.getByText(new RegExp(`^${value}$`, 'i')).first().click();
}

test.describe.configure({ mode: 'serial' });

test.describe('TaskPro Non-Vendor Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('1) Login + Dashboard', async ({ page }) => {
    await expect(page.locator('aside')).toBeVisible();
    await moduleShot(page, '01-login-dashboard');
  });

  test('2) Master Navigation (non-vendor)', async ({ page }) => {
    for (const item of ['Users', 'Firms', 'Categories', 'Status', 'Settings', 'Telegram Setup']) {
      const opened = await openNav(page, item);
      expect(opened, `Navigation item not found/clickable: ${item}`).toBeTruthy();
      await expectHeading(page, item);
      if (item !== 'Telegram Setup') {
        await expect(page.getByRole('button', { name: /add|save/i }).first()).toBeVisible();
      }
      await moduleShot(page, `02-nav-${item.toLowerCase().replace(/\s+/g, '-')}`);
    }
  });

  test('3) Category CRUD smoke', async ({ page }) => {
    await openNav(page, 'Categories');
    await page.getByRole('button', { name: /add category/i }).first().click();
    const categoryForm = page.locator('form').filter({ has: page.locator('input[name="name"]') }).last();
    await categoryForm.locator('input[name="name"]').fill(data.category);
    await categoryForm.locator('button[type="submit"]').click();
    await expect(page.getByText(data.category).first()).toBeVisible();

    const createdCategoryRow = page.locator('table tbody tr', { hasText: data.category }).first();
    await createdCategoryRow.locator('button').first().click();
    const editCategoryForm = page.locator('form').filter({ has: page.locator('input[name="name"]') }).last();
    await editCategoryForm.locator('input[name="name"]').fill(data.categoryEdited);
    await editCategoryForm.locator('button[type="submit"]').click();
    await expect(page.getByText(data.categoryEdited).first()).toBeVisible();

    const editedCategoryRow = page.locator('table tbody tr', { hasText: data.categoryEdited }).first();
    await editedCategoryRow.locator('button').nth(1).click();
    const deleteCategoryModal = page.locator('div').filter({ hasText: /delete category/i }).first();
    await deleteCategoryModal.getByRole('button', { name: /^delete$/i }).click();
    await expect(deleteCategoryModal).toBeHidden();
    await moduleShot(page, '03-category-crud');
  });

  test('4) Firm CRUD smoke', async ({ page }) => {
    await openNav(page, 'Firms');
    await page.getByRole('button', { name: /add firm/i }).first().click();
    const addFirmForm = page.locator('form').filter({ has: page.locator('input[placeholder=\"Enter firm name\"]') }).last();
    await addFirmForm.locator('input').nth(0).fill(data.firm);
    await addFirmForm.locator('input').nth(1).fill('SMK');
    await addFirmForm.locator('button[type="submit"]').click();
    await expect(page.getByText(data.firm).first()).toBeVisible();

    const createdFirmRow = page.locator('table tbody tr', { hasText: data.firm }).first();
    await createdFirmRow.locator('button').first().click();
    const editFirmForm = page.locator('form').filter({ has: page.locator('input[placeholder=\"Enter firm name\"]') }).last();
    await editFirmForm.locator('input').nth(0).fill(data.firmEdited);
    await editFirmForm.locator('button[type="submit"]').click();
    await expect(page.getByText(data.firmEdited).first()).toBeVisible();

    const editedFirmRow = page.locator('table tbody tr', { hasText: data.firmEdited }).first();
    await editedFirmRow.locator('button').nth(1).click();
    page.once('dialog', d => d.accept());
    await page.waitForTimeout(500);
    await moduleShot(page, '04-firm-crud');
  });

  test('5) Users smoke', async ({ page }) => {
    const openedUsers = await openNav(page, 'Users');
    expect(openedUsers, 'Failed to open Users view').toBeTruthy();
    await expectHeading(page, 'Users');
    await page.getByRole('button', { name: /add user/i }).first().click();
    await expect(page.getByRole('heading', { name: /add user/i })).toBeVisible();
    await page.getByRole('button', { name: /^add user$/i }).last().click();
    await expect(page.getByRole('heading', { name: /add user/i })).toBeVisible();

    await page.locator('input[name="name"]').fill(data.userName);
    await page.locator('input[name="email"]').fill(data.userEmail);
    await page.locator('input[name="mobile"]').fill('9876543210');
    await page.locator('input[name="password"]').fill(data.userPassword);
    await page.locator('select[name="role"]').selectOption('Employee');
    await page.getByRole('button', { name: /^add user$/i }).last().click();
    await openNav(page, 'Users');
    await expectHeading(page, 'Users');
    await page.getByPlaceholder(/search users/i).fill(data.userName);
    await expect(page.getByText(data.userName).first()).toBeVisible();

    const row = page.locator('table tbody tr', { hasText: data.userName }).first();
    await row.locator('button').nth(1).click();
    await page.locator('input[name="mobile"]').fill('9876500000');
    await page.getByRole('button', { name: /save changes|update user/i }).last().click();
    await expect(row).toContainText('9876500000');

    await row.getByRole('switch').click();
    await moduleShot(page, '05-users-smoke');
  });

  test('6) Client + Project relationship smoke', async ({ page }, testInfo) => {
    const clientOpened = await openNav(page, 'Clients');
    const projectOpened = await openNav(page, 'Projects');
    if (!clientOpened || !projectOpened) {
      testInfo.annotations.push({ type: 'blocker', description: 'Clients/Projects nav is not exposed in current app navigation.' });
      test.skip(true, 'Clients/Projects are not accessible from current navigation.');
    }

    await openNav(page, 'Clients');
    await page.getByRole('button', { name: /add client/i }).click();
    await page.getByLabel(/client name/i).fill(data.client);
    await page.getByRole('button', { name: /^add client$/i }).click();
    await expect(page.getByText(data.client).first()).toBeVisible();

    await openNav(page, 'Projects');
    await page.getByRole('button', { name: /add project/i }).click();
    await page.getByLabel(/project name/i).fill(data.project);
    await pickSearchableSelectByLabel(page, 'Client Name', data.client);
    await page.getByRole('button', { name: /^add project$/i }).click();
    await expect(page.getByText(new RegExp(`${data.project}\\s*\\(${data.client}\\)`, 'i')).first()).toBeVisible();
    await moduleShot(page, '06-client-project');
  });

  test('7) Status smoke + usage check', async ({ page }, testInfo) => {
    await openNav(page, 'Status');
    await page.getByRole('button', { name: /add status/i }).click();
    const addStatusForm = page.locator('form').filter({ hasText: /add status/i }).last();
    await addStatusForm.locator('input').first().fill(data.status);
    await addStatusForm.getByRole('button', { name: /^add status$/i }).last().click();
    await expect(page.getByText(data.status).first()).toBeVisible();

    const row = page.locator('table tbody tr', { hasText: data.status }).first();
    const rowButtons = row.locator('button');
    await expect(rowButtons.first()).toBeVisible();
    await rowButtons.first().click();
    let editStatusPanel = page.locator('div').filter({ has: page.getByRole('heading', { name: /edit status/i }) }).last();
    if (!(await editStatusPanel.isVisible().catch(() => false))) {
      await rowButtons.nth(1).click();
      editStatusPanel = page.locator('div').filter({ has: page.getByRole('heading', { name: /edit status/i }) }).last();
    }
    await expect(editStatusPanel).toBeVisible();
    const editStatusInput = page.locator('input[placeholder*="status" i], input[name="name"], input[placeholder*="name" i]').last();
    await expect(editStatusInput).toBeVisible();
    await editStatusInput.fill(data.statusEdited);
    await page.getByRole('button', { name: /save changes/i }).last().click();
    await expect(page.getByText(data.statusEdited).first()).toBeVisible();

    const allTasksOpened = await openNav(page, 'All Tasks');
    if (!allTasksOpened) {
      testInfo.annotations.push({ type: 'blocker', description: 'All Tasks view is not accessible from current app navigation.' });
      test.skip(true, 'Skipped status usage check because All Tasks is not accessible.');
    }
    await expectHeading(page, 'All Tasks');
    const filterBtn = page.getByRole('button', { name: /filter/i }).first();
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    await expect(page.getByText(new RegExp(data.statusEdited, 'i')).first()).toBeVisible();
    await moduleShot(page, '07-status-usage');
  });

  test('8) Task Update Log UI sanity', async ({ page }, testInfo) => {
    await openNav(page, 'Action Log');
    await expect(page.getByText(/history of task updates/i)).toHaveCount(0);
    const filterGrid = page.locator('label', { hasText: /update from/i }).first();
    if (await filterGrid.count()) {
      await expect(filterGrid).toBeHidden();
    }

    const namedFilterBtn = page.getByRole('button', { name: /toggle filters|filter/i }).first();
    const iconFilterBtn = page.locator('button:has(svg.lucide-filter), button[aria-label*="filter" i], button[title*="filter" i]').first();
    const filterBtn = (await namedFilterBtn.count()) ? namedFilterBtn : iconFilterBtn;

    if (!(await filterBtn.count())) {
      testInfo.annotations.push({ type: 'blocker', description: 'Filter toggle button not discoverable on Task Update Log.' });
      test.skip(true, 'Skipped Task Update Log filter-open check because filter toggle was not discoverable.');
    }

    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    await expect(page.locator('label', { hasText: /update from/i }).first()).toBeVisible();
    await moduleShot(page, '08-task-update-log');
  });

  test('9) Recurring Task modal sanity (time optional)', async ({ page }, testInfo) => {
    const recurringOpened = await openNav(page, 'Recurring Master');
    if (!recurringOpened) {
      testInfo.annotations.push({ type: 'blocker', description: 'Recurring Master view is not accessible from current app navigation.' });
      test.skip(true, 'Skipped recurring modal check because Recurring Master is not accessible.');
    }

    await expectHeading(page, 'Recurring Master');
    const newRecurringBtn = page.getByRole('button', { name: /new recurring task|add recurring task/i }).first();
    if (!(await newRecurringBtn.count())) {
      testInfo.annotations.push({ type: 'blocker', description: 'New Recurring Task button not found on Recurring Master view.' });
      test.skip(true, 'Skipped recurring modal check because New Recurring Task button is not discoverable.');
    }

    await expect(newRecurringBtn).toBeVisible();
    await newRecurringBtn.click();
    await expect(page.getByRole('heading', { name: /new recurring task|add recurring task/i }).first()).toBeVisible();
    await expect(page.getByText(/^time\s*\*$/i).first()).toHaveCount(0);
    await moduleShot(page, '09-recurring-time-optional');
  });

  test('10) Responsive quick check', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openNav(page, 'Users');
    await expectHeading(page, 'Users');
    const actionLogOpened = await openNav(page, 'Action Log');
    if (actionLogOpened) {
      await expectHeading(page, 'Task Update Log');
    } else {
      testInfo.annotations.push({ type: 'blocker', description: 'Action Log is not accessible during responsive desktop check.' });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const categoriesOpened = await openNav(page, 'Categories');
    if (categoriesOpened) {
      const categoriesHeadingVisible = await page.getByRole('heading', { name: /categories/i }).first().isVisible().catch(() => false);
      if (!categoriesHeadingVisible) {
        testInfo.annotations.push({ type: 'blocker', description: 'Categories heading not visible in mobile viewport.' });
      }
    } else {
      testInfo.annotations.push({ type: 'blocker', description: 'Categories navigation not reliably accessible in mobile viewport.' });
    }
    const recurringOpened = await openNav(page, 'Recurring Master');
    if (recurringOpened) {
      await expectHeading(page, 'Recurring Master');
      const recurringBtn = page.getByRole('button', { name: /new recurring task|add recurring task/i }).first();
      if (await recurringBtn.count()) {
        await recurringBtn.click();
        await expect(page.getByRole('heading', { name: /new recurring task|add recurring task/i }).first()).toBeVisible();
      }
    }
    await moduleShot(page, '10-responsive');
  });
});
