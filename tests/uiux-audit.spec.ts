import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.describe('UI/UX Audit - Lenticular Studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
  });

  // ─── 1. INITIAL LOAD & FIRST IMPRESSIONS ───
  test('1. Full page screenshot - default state', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-load.png`, fullPage: true });
  });

  // ─── 2. VISUAL HIERARCHY & LAYOUT ───
  test('2. Header inspection', async ({ page }) => {
    const header = page.locator('header').first();
    await header.screenshot({ path: `${SCREENSHOT_DIR}/02-header.png` });

    // Check header has logo/branding
    const headerText = await header.textContent();
    console.log('Header content:', headerText);

    // Check all header buttons are visible and have reasonable size
    const buttons = header.locator('button');
    const btnCount = await buttons.count();
    console.log(`Header buttons: ${btnCount}`);
    for (let i = 0; i < btnCount; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        console.log(`  Button ${i}: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
        // Minimum touch target 32x32
        if (box.width < 32 || box.height < 32) {
          console.warn(`  ⚠ Button ${i} is too small for touch: ${box.width}x${box.height}`);
        }
      }
    }
  });

  test('3. Sidebar inspection', async ({ page }) => {
    const sidebar = page.locator('.sidebar, [class*="sidebar"], aside').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: `${SCREENSHOT_DIR}/03-sidebar.png` });
      const box = await sidebar.boundingBox();
      console.log(`Sidebar dimensions: ${box?.width}x${box?.height}`);
    } else {
      console.log('No sidebar visible (may be mobile view)');
    }
  });

  test('4. Main canvas area', async ({ page }) => {
    const main = page.locator('.main-area, main, [class*="canvas-wrap"], [class*="main"]').first();
    if (await main.isVisible()) {
      await main.screenshot({ path: `${SCREENSHOT_DIR}/04-main-area.png` });
      const box = await main.boundingBox();
      console.log(`Main area: ${box?.width}x${box?.height}`);
    }
  });

  test('5. Status bar', async ({ page }) => {
    const statusbar = page.locator('.status-bar, [class*="status"], footer').first();
    if (await statusbar.isVisible()) {
      await statusbar.screenshot({ path: `${SCREENSHOT_DIR}/05-statusbar.png` });
      const text = await statusbar.textContent();
      console.log('Status bar:', text?.trim());
    }
  });

  // ─── 3. INTERACTIVE ELEMENTS ───
  test('6. All clickable elements - hover states', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    console.log(`Total buttons on page: ${count}`);

    const issues: string[] = [];

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute('aria-label');
        const title = await btn.getAttribute('title');

        // Check accessibility
        if (!text?.trim() && !ariaLabel && !title) {
          issues.push(`Button ${i} has no accessible label`);
        }

        // Check touch target size
        if (box && (box.width < 44 || box.height < 44)) {
          issues.push(`Button ${i} ("${text?.trim() || ariaLabel || 'unnamed'}") below 44px touch target: ${Math.round(box.width)}x${Math.round(box.height)}`);
        }

        // Check cursor
        const cursor = await btn.evaluate(el => getComputedStyle(el).cursor);
        if (cursor !== 'pointer') {
          issues.push(`Button ${i} has cursor: ${cursor} instead of pointer`);
        }
      }
    }

    console.log('\n=== INTERACTIVE ELEMENT ISSUES ===');
    issues.forEach(i => console.log(`  ⚠ ${i}`));
    if (issues.length === 0) console.log('  ✓ No issues found');
  });

  // ─── 4. COLOR CONTRAST & ACCESSIBILITY ───
  test('7. Color contrast check', async ({ page }) => {
    const results = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');

      function getLuminance(r: number, g: number, b: number) {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function getContrastRatio(l1: number, l2: number) {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function parseColor(color: string): [number, number, number] | null {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        return null;
      }

      const checked = new Set<string>();
      elements.forEach(el => {
        const style = getComputedStyle(el);
        const text = (el as HTMLElement).innerText?.trim();
        if (!text || text.length > 50) return;

        const key = `${style.color}-${style.backgroundColor}-${text.slice(0, 20)}`;
        if (checked.has(key)) return;
        checked.add(key);

        const fg = parseColor(style.color);
        const bg = parseColor(style.backgroundColor);
        if (fg && bg) {
          const fgL = getLuminance(...fg);
          const bgL = getLuminance(...bg);
          const ratio = getContrastRatio(fgL, bgL);
          const fontSize = parseFloat(style.fontSize);
          const isLarge = fontSize >= 18 || (fontSize >= 14 && style.fontWeight >= '700');
          const minRatio = isLarge ? 3 : 4.5;

          if (ratio < minRatio) {
            issues.push(`Low contrast (${ratio.toFixed(2)}:1) on "${text.slice(0, 30)}" - fg:${style.color} bg:${style.backgroundColor}`);
          }
        }
      });
      return issues;
    });

    console.log('\n=== COLOR CONTRAST ISSUES ===');
    results.forEach(r => console.log(`  ⚠ ${r}`));
    if (results.length === 0) console.log('  ✓ All contrast ratios pass WCAG AA');
  });

  // ─── 5. SPACING & ALIGNMENT ───
  test('8. Spacing consistency check', async ({ page }) => {
    const results = await page.evaluate(() => {
      const gaps = new Set<string>();
      const paddings = new Set<string>();
      const margins = new Set<string>();

      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        if (style.gap && style.gap !== 'normal') gaps.add(style.gap);
        if (style.padding && style.padding !== '0px') paddings.add(style.padding);
      });

      return {
        uniqueGaps: [...gaps],
        uniquePaddingCount: paddings.size,
      };
    });

    console.log('\n=== SPACING ANALYSIS ===');
    console.log(`Unique gap values: ${results.uniqueGaps.join(', ')}`);
    console.log(`Unique padding variations: ${results.uniquePaddingCount}`);
    if (results.uniqueGaps.length > 8) {
      console.warn('  ⚠ Too many different gap values - consider a spacing scale');
    }
  });

  // ─── 6. TYPOGRAPHY ───
  test('9. Typography audit', async ({ page }) => {
    const results = await page.evaluate(() => {
      const fonts = new Set<string>();
      const fontSizes = new Set<string>();
      const fontWeights = new Set<string>();
      const lineHeights = new Set<string>();

      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        const text = (el as HTMLElement).innerText?.trim();
        if (!text) return;

        fonts.add(style.fontFamily.split(',')[0].trim().replace(/['"]/g, ''));
        fontSizes.add(style.fontSize);
        fontWeights.add(style.fontWeight);
        lineHeights.add(style.lineHeight);
      });

      return {
        fonts: [...fonts],
        fontSizes: [...fontSizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
        fontWeights: [...fontWeights],
        lineHeights: [...lineHeights].filter(lh => lh !== 'normal'),
      };
    });

    console.log('\n=== TYPOGRAPHY AUDIT ===');
    console.log(`Font families: ${results.fonts.join(', ')}`);
    console.log(`Font sizes: ${results.fontSizes.join(', ')}`);
    console.log(`Font weights: ${results.fontWeights.join(', ')}`);
    console.log(`Line heights: ${results.lineHeights.join(', ')}`);

    if (results.fonts.length > 3) {
      console.warn('  ⚠ Too many font families - consider consolidating');
    }
    if (results.fontSizes.length > 8) {
      console.warn('  ⚠ Too many font sizes - consider a type scale');
    }
  });

  // ─── 7. RESPONSIVE - TABLET ───
  test('10. Tablet view (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-tablet-768.png`, fullPage: true });

    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasOverflow) console.warn('  ⚠ Horizontal overflow detected at 768px');
  });

  // ─── 8. RESPONSIVE - MOBILE ───
  test('11. Mobile view (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-mobile-375.png`, fullPage: true });

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasOverflow) console.warn('  ⚠ Horizontal overflow detected at 375px');

    // Check if mobile tabs are visible
    const mobileTabs = page.locator('[class*="mobile-tabs"]');
    if (await mobileTabs.isVisible()) {
      console.log('  ✓ Mobile tabs visible');
      await mobileTabs.screenshot({ path: `${SCREENSHOT_DIR}/11b-mobile-tabs.png` });
    }
  });

  // ─── 9. DARK/LIGHT THEME ───
  test('12. Theme toggle', async ({ page }) => {
    // Screenshot dark (default)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12a-dark-theme.png`, fullPage: true });

    // Find and click theme toggle
    const themeBtn = page.locator('button').filter({ hasText: /☀|🌙|theme|sun|moon/i }).first()
      .or(page.locator('[class*="theme"]').first())
      .or(page.locator('[aria-label*="theme" i]').first());

    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12b-light-theme.png`, fullPage: true });
      console.log('  ✓ Theme toggled successfully');
    } else {
      console.log('  Could not find theme toggle button');
    }
  });

  // ─── 10. EMPTY STATES ───
  test('13. Empty state - no images', async ({ page }) => {
    // Check dropzone visibility
    const dropzone = page.locator('[class*="drop"], [class*="upload"]').first();
    if (await dropzone.isVisible()) {
      await dropzone.screenshot({ path: `${SCREENSHOT_DIR}/13-empty-dropzone.png` });
      console.log('  ✓ Empty state/dropzone visible');
    }

    // Check canvas empty state
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      await canvas.screenshot({ path: `${SCREENSHOT_DIR}/13b-empty-canvas.png` });
    }
  });

  // ─── 11. OVERFLOW & SCROLLING ───
  test('14. Overflow and scroll check', async ({ page }) => {
    const results = await page.evaluate(() => {
      const issues: string[] = [];

      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const className = (el as HTMLElement).className;

        // Check for content overflowing viewport
        if (rect.right > window.innerWidth + 5) {
          issues.push(`Element "${className}" extends ${Math.round(rect.right - window.innerWidth)}px past viewport right`);
        }

        // Check for text overflow without ellipsis
        if (el.scrollWidth > el.clientWidth + 5 && style.overflow === 'visible' && style.textOverflow !== 'ellipsis') {
          const text = (el as HTMLElement).innerText?.trim().slice(0, 30);
          if (text) {
            issues.push(`Text overflow without ellipsis: "${text}..." in .${className}`);
          }
        }
      });

      return issues.slice(0, 20);
    });

    console.log('\n=== OVERFLOW ISSUES ===');
    results.forEach(r => console.log(`  ⚠ ${r}`));
    if (results.length === 0) console.log('  ✓ No overflow issues');
  });

  // ─── 12. FOCUS/KEYBOARD NAVIGATION ───
  test('15. Keyboard navigation', async ({ page }) => {
    const focusableElements: string[] = [];

    // Tab through the page
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const tag = el.tagName.toLowerCase();
        const className = (el as HTMLElement).className?.toString().slice(0, 30);
        const text = (el as HTMLElement).textContent?.trim().slice(0, 20);

        // Check for visible focus indicator
        const style = getComputedStyle(el);
        const outline = style.outline;
        const boxShadow = style.boxShadow;
        const hasFocusIndicator = (outline && outline !== 'none' && !outline.includes('0px'))
          || (boxShadow && boxShadow !== 'none');

        return {
          element: `${tag}.${className} "${text}"`,
          hasFocusIndicator,
        };
      });

      if (focused) {
        focusableElements.push(
          `${focused.hasFocusIndicator ? '✓' : '⚠ NO FOCUS INDICATOR'} ${focused.element}`
        );
      }
    }

    console.log('\n=== KEYBOARD NAVIGATION (Tab order) ===');
    focusableElements.forEach((el, i) => console.log(`  ${i + 1}. ${el}`));
  });

  // ─── 13. Z-INDEX STACKING ───
  test('16. Z-index audit', async ({ page }) => {
    const results = await page.evaluate(() => {
      const zElements: { zIndex: string; tag: string; className: string }[] = [];

      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        if (style.zIndex !== 'auto' && parseInt(style.zIndex) > 0) {
          zElements.push({
            zIndex: style.zIndex,
            tag: el.tagName.toLowerCase(),
            className: (el as HTMLElement).className?.toString().slice(0, 40) || '',
          });
        }
      });

      return zElements.sort((a, b) => parseInt(b.zIndex) - parseInt(a.zIndex));
    });

    console.log('\n=== Z-INDEX STACKING ORDER ===');
    results.forEach(r => console.log(`  z-${r.zIndex}: <${r.tag}> .${r.className}`));
    if (results.some(r => parseInt(r.zIndex) > 9999)) {
      console.warn('  ⚠ Excessively high z-index values detected');
    }
  });

  // ─── 14. ANIMATION/TRANSITION CHECK ───
  test('17. CSS transitions and animations', async ({ page }) => {
    const results = await page.evaluate(() => {
      const transitions = new Set<string>();
      const animations = new Set<string>();

      document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        if (style.transition && style.transition !== 'all 0s ease 0s' && style.transition !== 'none') {
          transitions.add(style.transition.slice(0, 80));
        }
        if (style.animationName && style.animationName !== 'none') {
          animations.add(style.animationName);
        }
      });

      return { transitions: [...transitions], animations: [...animations] };
    });

    console.log('\n=== TRANSITIONS & ANIMATIONS ===');
    console.log('Transitions:');
    results.transitions.forEach(t => console.log(`  ${t}`));
    console.log('Animations:');
    results.animations.forEach(a => console.log(`  ${a}`));
  });

  // ─── 15. WIDE DESKTOP ───
  test('18. Wide desktop (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/18-desktop-1920.png`, fullPage: true });
  });

  // ─── 16. SMALL DESKTOP ───
  test('19. Small desktop (1024px)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/19-desktop-1024.png`, fullPage: true });
  });
});
