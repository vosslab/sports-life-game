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
const MAX_GAME_TIME = 10 * 60 * 1000;

//============================================
// Per-age tracking counters
//============================================

// Tracks clicks and choices for each age year
const ageStats = new Map();

function getAgeEntry(age) {
	if (!ageStats.has(age)) {
		ageStats.set(age, {
			totalClicks: 0,
			modalChoices: 0,
			choicePanelClicks: 0,
			nextWeekClicks: 0,
			ageUpClicks: 0,
			staleModalDismissals: 0,
		});
	}
	return ageStats.get(age);
}

// Print the per-age summary table at the end
function printAgeSummary() {
	// Sort ages numerically
	const ages = [...ageStats.keys()].sort((a, b) => a - b);

	console.log("");
	console.log("Per-age click summary:");
	console.log(
		"  Age  | Total | Choices | Activities | Next/Continue | Age Up | Stale"
	);
	console.log(
		"  -----|-------|---------|------------|---------------|--------|------"
	);

	let grandTotal = 0;
	let grandChoices = 0;
	for (const age of ages) {
		const s = ageStats.get(age);
		grandTotal += s.totalClicks;
		grandChoices += s.modalChoices;
		const ageStr = String(age).padStart(4);
		const totalStr = String(s.totalClicks).padStart(5);
		const modalStr = String(s.modalChoices).padStart(7);
		const choiceStr = String(s.choicePanelClicks).padStart(10);
		const nextStr = String(s.nextWeekClicks).padStart(13);
		const ageUpStr = String(s.ageUpClicks).padStart(6);
		const staleStr = String(s.staleModalDismissals).padStart(5);
		console.log(
			`  ${ageStr} | ${totalStr} | ${modalStr} | ${choiceStr} | ${nextStr} | ${ageUpStr} | ${staleStr}`
		);
	}

	console.log(
		"  -----|-------|---------|------------|---------------|--------|------"
	);
	console.log(`  Total clicks: ${grandTotal}, Total modal choices: ${grandChoices}`);
}

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
	const ms = slow ? 500 : 150;
	await page.waitForTimeout(ms);
}

//============================================
// Helper: get a fingerprint of current page state for stuck detection
async function getPageFingerprint(page) {
	const age = await page.locator("#player-age").textContent();
	const week = await page.locator("#player-week").textContent();
	const storyLen = await page.locator("#story-log").evaluate(
		(el) => el.textContent.length
	);
	return `${age}|${week}|${storyLen}`;
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

	// Capture console errors
	let consoleErrorCount = 0;
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			consoleErrorCount++;
			// Only log first occurrence of each unique error
			if (consoleErrorCount <= 5) {
				console.log(`  [CONSOLE ERROR] ${msg.text()}`);
			}
		}
	});
	page.on("pageerror", (err) => {
		console.log(`  [PAGE ERROR] ${err.message}`);
	});

	await screenshot(page, "00_start");

	const startTime = Date.now();
	let lastAge = -1;
	let lastPhaseLog = "";
	let stepCount = 0;
	let stuckCount = 0;
	let lastFingerprint = "";
	let sameStateCount = 0;
	let currentAge = -1;

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
		currentAge = age;
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
		const entry = getAgeEntry(currentAge);

		// Priority 1: Modal is showing - click first button
		if (await isModalVisible(page)) {
			const clicked = await clickModalButton(page);
			if (clicked) {
				acted = true;
				entry.totalClicks++;
				entry.modalChoices++;
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
				entry.totalClicks++;
				entry.choicePanelClicks++;
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
				entry.staleModalDismissals++;
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
				entry.totalClicks++;
				entry.nextWeekClicks++;
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
					entry.totalClicks++;
					entry.ageUpClicks++;
					stuckCount = 0;
					acted = true;
				}
			}
		}

		await settle(page);

		// After acting, wait briefly for UI to update before next iteration
		if (acted) {
			// Extra wait after clicks to let game state transitions complete
			await page.waitForTimeout(slow ? 300 : 50);
		}

		// Detect when clicks aren't changing game state
		const fp = await getPageFingerprint(page);
		if (fp === lastFingerprint) {
			sameStateCount++;
			if (sameStateCount > 10) {
				// Wait longer for async game processing
				await page.waitForTimeout(2000);
				sameStateCount = 0;
				console.log("    (waiting for state change...)");
			}
		} else {
			sameStateCount = 0;
			lastFingerprint = fp;
		}
	}

	// Final screenshot and summary
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	const finalAge = await getPlayerAge(page);
	await screenshot(page, "final");

	console.log("");
	console.log(`Done. ${stepCount} steps in ${elapsed}s. Final age: ${finalAge}.`);
	if (consoleErrorCount > 0) {
		console.log(`Console errors: ${consoleErrorCount}`);
	}

	// Print the per-age summary
	printAgeSummary();

	await browser.close();
}

main().catch((err) => {
	console.error("Autoplay failed:", err);
	process.exit(1);
});
