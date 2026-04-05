// autoplay.mjs - Playwright script to play Gridiron Life from start to finish
//
// Navigates the entire game automatically by clicking buttons.
// Uses a simple strategy: always pick the first choice, use Age Up to skip
// through seasons quickly when available.
//
// Usage:
//   node tests/autoplay.mjs [--headed] [--slow]
//
// Requires: python3 -m http.server 8000 running in the repo root
// Requires: npx tsc to have been run first (compiles src/ to dist/)

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCREENSHOT_DIR = path.join(REPO_ROOT, "game_screenshots", "autoplay");

// Parse CLI flags
const args = process.argv.slice(2);
const headed = args.includes("--headed");
const slow = args.includes("--slow");

// How long to wait for any single UI action (ms)
const ACTION_TIMEOUT = 3000;
// Max total game time before we give up (ms)
const MAX_GAME_TIME = 5 * 60 * 1000;

//============================================
// Helper: take a screenshot with a descriptive name
async function screenshot(page, name) {
	const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
	await page.screenshot({ path: filePath, fullPage: false });
	console.log(`  screenshot: ${name}.png`);
}

//============================================
// Helper: check if the modal is visible and has clickable buttons
async function isModalVisible(page) {
	const modal = page.locator("#game-modal");
	const hasHidden = await modal.evaluate(
		(el) => el.classList.contains("hidden")
	);
	if (hasHidden) {
		return false;
	}
	// Modal overlay exists but may have no buttons (stale state)
	const buttons = page.locator("#modal-options .choice-button");
	const count = await buttons.count();
	return count > 0;
}

//============================================
// Helper: dismiss modal overlay if it has no buttons (stale modal)
async function dismissStaleModal(page) {
	const modal = page.locator("#game-modal");
	const hasHidden = await modal.evaluate(
		(el) => el.classList.contains("hidden")
	);
	if (hasHidden) {
		return false;
	}
	const buttons = page.locator("#modal-options .choice-button");
	const count = await buttons.count();
	if (count === 0) {
		// Force-hide the stale modal overlay
		await modal.evaluate((el) => el.classList.add("hidden"));
		return true;
	}
	return false;
}

//============================================
// Helper: click the first button in the modal options
async function clickModalButton(page) {
	const buttons = page.locator("#modal-options .choice-button");
	const count = await buttons.count();
	if (count > 0) {
		const text = await buttons.first().textContent();
		await buttons.first().click();
		return text;
	}
	return null;
}

//============================================
// Helper: click a choice button in #choices-panel
async function clickChoiceButton(page) {
	try {
		// Prefer primary buttons, fall back to any choice button
		const primary = page.locator("#choices-panel .choice-button.primary");
		if ((await primary.count()) > 0) {
			const text = await primary.first().textContent();
			await primary.first().click({ timeout: 2000 });
			return text;
		}
		const any = page.locator("#choices-panel .choice-button");
		if ((await any.count()) > 0) {
			const text = await any.first().textContent();
			await any.first().click({ timeout: 2000 });
			return text;
		}
	} catch {
		return null;
	}
	return null;
}

//============================================
// Helper: click #btn-next-week if enabled
async function clickNextWeek(page) {
	const btn = page.locator("#btn-next-week");
	const visible = await btn.isVisible();
	if (!visible) {
		return false;
	}
	const disabled = await btn.isDisabled();
	if (disabled) {
		return false;
	}
	const text = await btn.textContent();
	try {
		await btn.click({ timeout: 2000 });
	} catch {
		// Modal overlay may be intercepting - caller will handle
		return false;
	}
	return text;
}

//============================================
// Helper: click #btn-age-up if visible and enabled
async function clickAgeUp(page) {
	const btn = page.locator("#btn-age-up");
	const visible = await btn.isVisible();
	if (!visible) {
		return false;
	}
	const disabled = await btn.isDisabled();
	if (disabled) {
		return false;
	}
	try {
		await btn.click({ timeout: 2000 });
	} catch {
		return false;
	}
	return true;
}

//============================================
// Helper: get current player age from header
async function getPlayerAge(page) {
	const ageEl = page.locator("#player-age");
	const text = await ageEl.textContent();
	if (!text) {
		return -1;
	}
	// Text like "Age 14" or "Age: 14"
	const match = text.match(/(\d+)/);
	return match ? parseInt(match[1], 10) : -1;
}

//============================================
// Helper: get player phase from page context
async function getPlayerPhase(page) {
	const nameEl = page.locator("#player-name");
	const text = await nameEl.textContent();
	const posEl = page.locator("#player-position");
	const pos = await posEl.textContent();
	const teamEl = page.locator("#player-team");
	const team = await teamEl.textContent();
	return { name: text, position: pos, team: team };
}

//============================================
// Helper: small delay for UI to settle
async function settle(page) {
	const ms = slow ? 500 : 100;
	await page.waitForTimeout(ms);
}

//============================================
// MAIN
//============================================
async function main() {
	console.log("Gridiron Life Autoplay Script");
	console.log(`  headed: ${headed}, slow: ${slow}`);
	console.log(`  screenshots: ${SCREENSHOT_DIR}`);
	console.log("");

	const browser = await chromium.launch({ headless: !headed });
	const context = await browser.newContext({
		viewport: { width: 430, height: 932 },
	});
	context.setDefaultTimeout(ACTION_TIMEOUT);
	const page = await context.newPage();

	// Clear localStorage to start fresh
	await page.goto("http://localhost:8000/index.html");
	await page.evaluate(() => localStorage.clear());
	await page.reload();
	await page.waitForLoadState("networkidle");
	console.log("Game loaded.");

	await screenshot(page, "00_start");

	const startTime = Date.now();
	let lastAge = -1;
	let lastPhaseLog = "";
	let stepCount = 0;
	let stuckCount = 0;

	// Main game loop
	while (Date.now() - startTime < MAX_GAME_TIME) {
		stepCount++;

		// Safety: detect stuck state
		if (stuckCount > 20) {
			console.log("ERROR: Stuck for 20 iterations, taking debug screenshot.");
			await screenshot(page, "stuck_debug");
			break;
		}

		// Check for end conditions
		const age = await getPlayerAge(page);
		const storyText = await page.locator("#story-log").textContent();

		// Log phase transitions
		if (age !== lastAge && age >= 0) {
			const info = await getPlayerPhase(page);
			const phaseLog = `Age ${age} | ${info.position} | ${info.team}`;
			if (phaseLog !== lastPhaseLog) {
				console.log(`  ${phaseLog}`);
				lastPhaseLog = phaseLog;
				// Screenshot at key ages
				if ([0, 4, 14, 18, 22, 30, 35].includes(age)) {
					await screenshot(page, `age_${age.toString().padStart(2, "0")}`);
				}
			}
			lastAge = age;
		}

		// End condition: legacy phase or very old
		if (age > 45) {
			console.log("Player age > 45, ending.");
			break;
		}
		if (storyText && storyText.includes("Hall of Fame")) {
			console.log("Hall of Fame detected, ending.");
			break;
		}
		if (storyText && storyText.includes("retired")) {
			console.log("Retirement detected, ending.");
			break;
		}

		let acted = false;

		// Priority 1: Modal is showing - click first button
		if (await isModalVisible(page)) {
			const clicked = await clickModalButton(page);
			if (clicked) {
				acted = true;
				if (slow) {
					console.log(`    modal: "${clicked.trim()}"`);
				}
			}
		}

		// Priority 2: Choice buttons in the choices panel
		if (!acted) {
			const clicked = await clickChoiceButton(page);
			if (clicked) {
				acted = true;
				if (slow) {
					console.log(`    choice: "${clicked.trim()}"`);
				}
			}
		}

		// Priority 2.5: Dismiss stale modal overlay blocking clicks
		if (!acted) {
			const dismissed = await dismissStaleModal(page);
			if (dismissed) {
				acted = true;
				if (slow) {
					console.log("    (dismissed stale modal overlay)");
				}
			}
		}

		// Priority 3: Next Week / main action button
		if (!acted) {
			const result = await clickNextWeek(page);
			if (result) {
				acted = true;
				if (slow) {
					console.log(`    next: "${result.trim()}"`);
				}
			}
		}

		// Track stuck state
		if (acted) {
			stuckCount = 0;
		} else {
			stuckCount++;
			// Try Age Up as escape hatch when stuck
			if (stuckCount > 3) {
				const ageUp = await clickAgeUp(page);
				if (ageUp) {
					console.log("    (used Age Up to unstick)");
					stuckCount = 0;
					acted = true;
				}
			}
		}

		await settle(page);
	}

	// Final screenshot and summary
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	const finalAge = await getPlayerAge(page);
	await screenshot(page, "final");

	console.log("");
	console.log(`Done. ${stepCount} steps in ${elapsed}s. Final age: ${finalAge}.`);

	await browser.close();
}

main().catch((err) => {
	console.error("Autoplay failed:", err);
	process.exit(1);
});
