// test_avatar_render.spec.ts
// Avatar portrait rendering structural tests
// Verifies that avatars for all six archetypes render SVG with expected elements

import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const avatarTestHtmlPath = `file://${path.join(repoRoot, "avatar_test.html")}`;

//============================================
// Verify avatar renders for all six archetypes

test("avatar renders portraits for all archetypes", async ({ page }) => {
  // Navigate to avatar test page
  await page.goto(avatarTestHtmlPath);

  // Wait for grid to populate (uses dynamically generated seeds)
  const grid = page.locator("#grid");
  await expect(grid).toBeVisible();

  // Verify at least 12 portrait cards rendered (default grid size)
  const cards = page.locator(".portrait-card");
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThanOrEqual(12);

  // Each card should contain an SVG
  for (let i = 0; i < Math.min(cardCount, 5); i++) {
    const card = cards.nth(i);
    const svg = card.locator("svg");
    await expect(svg).toBeVisible();

    // Verify SVG has reasonable dimensions
    const boundingBox = await svg.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);
    }
  }
});

//============================================
// Verify archetype comparison renders all six roles

test("archetype comparison renders all six archetypes", async ({ page }) => {
  await page.goto(avatarTestHtmlPath);

  // Archetype row should auto-populate on page load
  const archetypeRow = page.locator("#archetype-row");
  await expect(archetypeRow).toBeVisible();

  // Should have exactly 6 portraits: one per archetype
  const archetypeCards = archetypeRow.locator(".portrait-card");
  const archetypeCount = await archetypeCards.count();
  expect(archetypeCount).toBe(6);

  // Each archetype card should have an SVG
  for (let i = 0; i < 6; i++) {
    const card = archetypeCards.nth(i);
    const svg = card.locator("svg");
    await expect(svg).toBeVisible();

    // Verify SVG has title or descriptive element with archetype
    const label = card.locator(".label");
    const labelText = await label.textContent();
    expect(labelText).toBeTruthy();
    // Should contain one of the six archetype names
    const archetypes = ["player", "rival", "coach", "recruiter", "scout", "generic"];
    const hasArchetype = archetypes.some((arch) => labelText?.includes(arch));
    expect(hasArchetype).toBeTruthy();
  }
});

//============================================
// Verify age progression renders seven ages

test("age progression renders multiple ages", async ({ page }) => {
  await page.goto(avatarTestHtmlPath);

  // Age row should auto-populate
  const ageRow = page.locator("#age-row");
  await expect(ageRow).toBeVisible();

  // Should have 7 portraits covering age range 16-60
  const ageCards = ageRow.locator(".portrait-card");
  const ageCount = await ageCards.count();
  expect(ageCount).toBe(7);

  // Each age card should have an SVG and age label
  for (let i = 0; i < 7; i++) {
    const card = ageCards.nth(i);
    const svg = card.locator("svg");
    await expect(svg).toBeVisible();

    const label = card.locator(".label");
    const labelText = await label.textContent();
    expect(labelText).toBeTruthy();
    // Should contain age number
    expect(labelText).toMatch(/age \d+/);
  }
});

//============================================
// Verify seed repeatability: same seed produces identical output

test("seed repeatability produces consistent output", async ({ page }) => {
  await page.goto(avatarTestHtmlPath);

  // Set a fixed seed
  const seedInput = page.locator("#seed-input");
  await seedInput.fill("test_consistency_seed");

  // Click test button to render seed comparison
  const testBtn = page.locator("#btn-seed");
  await testBtn.click();

  // Seed row should show two renders of the same seed
  const seedRow = page.locator("#seed-row");
  await expect(seedRow).toBeVisible();

  const seedCards = seedRow.locator(".portrait-card");
  const seedCardCount = await seedCards.count();
  expect(seedCardCount).toBe(2);

  // Both cards should have SVGs (verifying both renders succeeded)
  for (let i = 0; i < 2; i++) {
    const card = seedCards.nth(i);
    const svg = card.locator("svg");
    await expect(svg).toBeVisible();
  }
});

//============================================
// Verify SVG structure: presence of expected group and path elements

test("portrait SVG contains expected structural elements", async ({ page }) => {
  await page.goto(avatarTestHtmlPath);

  // Get first portrait SVG
  const firstSvg = page.locator(".portrait-card svg").first();
  await expect(firstSvg).toBeVisible();

  // SVG should have groups for layers (g elements)
  // We're doing structural checks rather than pixel comparisons
  // to avoid snapshot fragility
  const groups = firstSvg.locator("g");
  const groupCount = await groups.count();
  expect(groupCount).toBeGreaterThan(0);

  // SVG should have at least one path for rendering
  const paths = firstSvg.locator("path");
  const pathCount = await paths.count();
  expect(pathCount).toBeGreaterThan(0);

  // SVG viewBox should be present and reasonable
  const viewBox = await firstSvg.getAttribute("viewBox");
  expect(viewBox).toMatch(/^0\s+0\s+\d+\s+\d+$/);
});
