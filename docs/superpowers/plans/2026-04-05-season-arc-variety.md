# Season Arc and Weekly Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat identical weekly loop with season arc phases, adaptive weekly choices with real stakes, and a midseason crisis system.

**Architecture:** Three new modules (`season_arc.ts`, `weekly_choices.ts`, `crisis.ts`) plus JSON data files. The weekly engine gains arc-phase awareness and calls the new modules instead of the old static activity system. Background goals are kept. The existing activity system is replaced by adaptive choices.

**Tech Stack:** TypeScript, JSON data files, existing game UI popup system (`ctx.waitForInteraction`)

---

### File map

**New files:**
- `src/season_arc.ts` - arc phase enum, phase transitions, phase detection from week number
- `src/weekly_choices.ts` - adaptive choice generation, context evaluation, outcome resolution
- `src/crisis.ts` - crisis types, weighting, scheduling, multi-week tracking, resolution
- `src/data/choices/preseason.json` - choice pool for preseason phase
- `src/data/choices/opening.json` - choice pool for opening weeks
- `src/data/choices/midseason.json` - choice pool for midseason weeks
- `src/data/choices/stretch.json` - choice pool for stretch run
- `src/data/choices/postseason.json` - choice pool for offseason
- `src/data/crises.json` - crisis definitions with responses and resolutions

**Modified files:**
- `src/weekly/weekly_engine.ts` - replace `applyGoalAndAdvance` flow with arc-aware choice flow
- `src/player.ts` - add `activeCrisis` and `arcPhase` fields to Player state

**Unchanged:**
- `src/week_sim.ts` - `applySeasonGoal()` stays (background goals kept)
- `src/activities.ts` - kept for reference but no longer called from weekly engine
- `src/simulator/` - no changes
- Phase handlers (hs_frosh_soph.ts, college_phase.ts, nfl_phase.ts) - no changes

---

### Task 1: Season arc phase module

**Files:**
- Create: `src/season_arc.ts`

- [ ] **Step 1: Create the arc phase types and detection logic**

```typescript
// season_arc.ts - season arc phase tracking
//
// Each season progresses through 5 phases that change the weekly tone,
// available choices, and narrative framing.

export type ArcPhase = 'preseason' | 'opening' | 'midseason' | 'stretch' | 'postseason';

//============================================
// Determine arc phase from current week and season length
export function getArcPhase(currentWeek: number, seasonLength: number): ArcPhase {
	if (currentWeek <= 0) {
		return 'preseason';
	}
	// Opening: first ~25% of season
	const openingEnd = Math.max(2, Math.floor(seasonLength * 0.25));
	if (currentWeek <= openingEnd) {
		return 'opening';
	}
	// Stretch run: last ~30% of season
	const stretchStart = Math.ceil(seasonLength * 0.7);
	if (currentWeek >= stretchStart) {
		return 'stretch';
	}
	// Midseason: everything in between
	return 'midseason';
}

//============================================
// Get display name for the arc phase (for UI headers)
export function getArcPhaseLabel(phase: ArcPhase): string {
	switch (phase) {
		case 'preseason': return 'Preseason';
		case 'opening': return 'Early Season';
		case 'midseason': return 'Midseason';
		case 'stretch': return 'Stretch Run';
		case 'postseason': return 'Postseason';
	}
}

//============================================
// Get narrative flavor for the phase transition
export function getPhaseTransitionText(phase: ArcPhase): string {
	switch (phase) {
		case 'preseason': return 'A new season begins. Time to set the tone.';
		case 'opening': return 'The season is underway. Every game matters.';
		case 'midseason': return 'Deep into the season now. The grind is real.';
		case 'stretch': return 'The final stretch. Everything is on the line.';
		case 'postseason': return 'The season is over. Time to reflect and decide.';
	}
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

---

### Task 2: Weekly choices data files

**Files:**
- Create: `src/data/choices/preseason.json`
- Create: `src/data/choices/opening.json`
- Create: `src/data/choices/midseason.json`
- Create: `src/data/choices/stretch.json`
- Create: `src/data/choices/postseason.json`

- [ ] **Step 1: Create choice data directory**

Run: `mkdir -p src/data/choices`

- [ ] **Step 2: Create preseason.json**

```json
[
  {
    "id": "preseason_compete",
    "category": "compete",
    "text": "Challenge for the starting spot",
    "description": "Go all-out in practice to prove you deserve to start.",
    "risk": "Could impress coaches or look desperate.",
    "conditions": { "depthChart": ["backup", "bench"] },
    "outcomes": {
      "success": { "probability": 0.4, "effects": { "confidence": 3, "technique": 2 }, "narrative": "Coaches noticed your intensity. You moved up on the depth chart discussion." },
      "failure": { "probability": 0.6, "effects": { "confidence": -2, "health": -1 }, "narrative": "You pushed too hard and pulled something. Coaches told you to dial it back." }
    }
  },
  {
    "id": "preseason_bond",
    "category": "social",
    "text": "Build chemistry with teammates",
    "description": "Spend extra time in the locker room and at team dinners.",
    "risk": "Good for morale but won't improve your game directly.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.8, "effects": { "confidence": 2 }, "narrative": "The team feels closer. Guys have your back." },
      "failure": { "probability": 0.2, "effects": { "confidence": -1 }, "narrative": "You tried but some veterans don't take to newcomers easily." }
    }
  },
  {
    "id": "preseason_study",
    "category": "train",
    "text": "Study the playbook hard",
    "description": "Lock yourself in with the playbook every night.",
    "risk": "Great prep, but burns energy before the season starts.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.7, "effects": { "footballIq": 3, "technique": 1, "health": -1 }, "narrative": "You know the playbook cold. Coaches trust you with more complex packages." },
      "failure": { "probability": 0.3, "effects": { "footballIq": 1, "health": -2 }, "narrative": "You overdid it. Mentally sharp but physically drained heading into week 1." }
    }
  },
  {
    "id": "preseason_rest",
    "category": "train",
    "text": "Take it easy, stay fresh",
    "description": "Light workouts, good sleep, mental prep.",
    "risk": "Safe but you won't stand out.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.9, "effects": { "health": 3, "confidence": 1 }, "narrative": "You feel rested and ready. No nagging pains heading into the season." },
      "failure": { "probability": 0.1, "effects": { "health": 1, "discipline": -1 }, "narrative": "Maybe too relaxed. Coaches wonder if you're taking this seriously." }
    }
  }
]
```

- [ ] **Step 3: Create opening.json**

```json
[
  {
    "id": "opening_push",
    "category": "train",
    "text": "Push through the pain",
    "description": "Your body hurts from the early games. Train anyway.",
    "risk": "Could make you tougher or break you down.",
    "conditions": { "healthBelow": 60 },
    "outcomes": {
      "success": { "probability": 0.5, "effects": { "technique": 2, "athleticism": 1, "health": -2 }, "narrative": "You pushed through and came out stronger. Teammates respect the toughness." },
      "failure": { "probability": 0.5, "effects": { "health": -5, "confidence": -1 }, "narrative": "Your body gave out. Trainer says you need to take it easy or risk a real injury." }
    }
  },
  {
    "id": "opening_film",
    "category": "train",
    "text": "Extra film study on next opponent",
    "description": "Watch tape of the upcoming opponent's tendencies.",
    "risk": "Time well spent, but skipping recovery.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.75, "effects": { "footballIq": 2, "technique": 1 }, "narrative": "You spotted a tendency in their defense. Shared it with the coaches." },
      "failure": { "probability": 0.25, "effects": { "footballIq": 1, "health": -1 }, "narrative": "Watched film until 2am. Smart move, but you are dragging today." }
    }
  },
  {
    "id": "opening_mentor",
    "category": "social",
    "text": "Help a younger teammate",
    "description": "A freshman is struggling. Spend time showing them the ropes.",
    "risk": "Great for team culture. Costs your own development time.",
    "conditions": { "depthChart": ["starter"] },
    "outcomes": {
      "success": { "probability": 0.8, "effects": { "confidence": 2, "discipline": 1 }, "narrative": "The kid looked up to you. Coaches noticed your leadership." },
      "failure": { "probability": 0.2, "effects": { "confidence": -1 }, "narrative": "You tried but the kid wasn't receptive. Frustrating." }
    }
  },
  {
    "id": "opening_recovery",
    "category": "train",
    "text": "Full recovery day",
    "description": "Ice baths, stretching, sleep. Let your body heal.",
    "risk": "No skill growth this week.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.9, "effects": { "health": 4 }, "narrative": "Body feels great. Ready to go for the next game." },
      "failure": { "probability": 0.1, "effects": { "health": 2, "confidence": -1 }, "narrative": "Recovery day felt lazy. Hope you are not losing your edge." }
    }
  }
]
```

- [ ] **Step 4: Create midseason.json**

```json
[
  {
    "id": "mid_intensity",
    "category": "train",
    "text": "Crank up the intensity",
    "description": "Go harder than everyone else in practice.",
    "risk": "High reward, high injury risk.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.45, "effects": { "technique": 3, "athleticism": 1, "health": -1 }, "narrative": "You were the best player on the practice field. Everyone noticed." },
      "failure": { "probability": 0.55, "effects": { "health": -4, "confidence": -1 }, "narrative": "You went too hard and tweaked something. Trainer is concerned." }
    }
  },
  {
    "id": "mid_confront",
    "category": "social",
    "text": "Confront a teammate about effort",
    "description": "Someone has been slacking. Call them out.",
    "risk": "Could rally the team or create a rift.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.5, "effects": { "confidence": 3, "discipline": 1 }, "narrative": "They took it well. The whole unit picked up their effort." },
      "failure": { "probability": 0.5, "effects": { "confidence": -2, "discipline": -1 }, "narrative": "It got heated. Now there is tension in the locker room." }
    }
  },
  {
    "id": "mid_position",
    "category": "risk",
    "text": "Ask to try a new position",
    "description": "You think you could contribute more somewhere else.",
    "risk": "Bold move. Could open doors or close them.",
    "conditions": { "depthChart": ["backup", "bench"] },
    "outcomes": {
      "success": { "probability": 0.35, "effects": { "technique": 2, "confidence": 3 }, "narrative": "Coach liked the initiative. You are getting reps at the new spot." },
      "failure": { "probability": 0.65, "effects": { "confidence": -3 }, "narrative": "Coach shut it down. 'Know your role.' Ouch." }
    }
  },
  {
    "id": "mid_steady",
    "category": "train",
    "text": "Stay the course",
    "description": "Keep doing what you have been doing. Consistent effort.",
    "risk": "Safe. Won't wow anyone but won't hurt either.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.85, "effects": { "technique": 1, "discipline": 1 }, "narrative": "Quiet week. Solid work. Coaches appreciate the reliability." },
      "failure": { "probability": 0.15, "effects": { "confidence": -1 }, "narrative": "Nothing went wrong, but nothing stood out either. Are you coasting?" }
    }
  }
]
```

- [ ] **Step 5: Create stretch.json**

```json
[
  {
    "id": "stretch_film_rival",
    "category": "prepare",
    "text": "Study film on this week's opponent",
    "description": "Break down their tendencies for the big game.",
    "risk": "Smart prep at the cost of rest.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.8, "effects": { "footballIq": 2, "technique": 1 }, "narrative": "You found a weakness in their scheme. Shared it with coaches." },
      "failure": { "probability": 0.2, "effects": { "footballIq": 1, "health": -1 }, "narrative": "Good film work but you stayed up too late. Feeling it in your legs." }
    }
  },
  {
    "id": "stretch_trash_talk",
    "category": "risk",
    "text": "Talk trash to the media",
    "description": "Tell reporters exactly what you think about the opponent.",
    "risk": "Fire up your team or give them bulletin board material.",
    "conditions": { "depthChart": ["starter"] },
    "outcomes": {
      "success": { "probability": 0.4, "effects": { "confidence": 4 }, "narrative": "Your teammates loved it. The locker room is fired up." },
      "failure": { "probability": 0.6, "effects": { "confidence": -2, "discipline": -2 }, "narrative": "Your words are posted in the opponent's locker room. Coach is not happy." }
    }
  },
  {
    "id": "stretch_rest_big",
    "category": "prepare",
    "text": "Rest and get your body right",
    "description": "Big game coming. Make sure you are 100%.",
    "risk": "No growth but maximum availability.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.9, "effects": { "health": 4, "confidence": 1 }, "narrative": "Fresh legs, clear head. Ready for the biggest game of the year." },
      "failure": { "probability": 0.1, "effects": { "health": 2 }, "narrative": "Rested but restless. Hard to sit still when the game is this big." }
    }
  },
  {
    "id": "stretch_rally",
    "category": "social",
    "text": "Rally the team",
    "description": "Give a speech in the locker room. Set the tone.",
    "risk": "Inspire them or fall flat.",
    "conditions": { "depthChart": ["starter"] },
    "outcomes": {
      "success": { "probability": 0.6, "effects": { "confidence": 3, "discipline": 1 }, "narrative": "The room went silent. Then they erupted. This team is ready." },
      "failure": { "probability": 0.4, "effects": { "confidence": -2 }, "narrative": "Awkward silence. Veterans don't take speeches from everyone." }
    }
  }
]
```

- [ ] **Step 6: Create postseason.json**

```json
[
  {
    "id": "post_reflect",
    "category": "reflect",
    "text": "Reflect on the season",
    "description": "Think about what went right and what went wrong.",
    "risk": "No risk. Just honest self-assessment.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 1.0, "effects": { "footballIq": 2, "discipline": 1 }, "narrative": "You know exactly what you need to work on. Clear eyes for next year." },
      "failure": { "probability": 0.0, "effects": {}, "narrative": "" }
    }
  },
  {
    "id": "post_train_hard",
    "category": "train",
    "text": "Hit the offseason workouts hard",
    "description": "No breaks. Start building for next season immediately.",
    "risk": "Great for growth but risk burnout.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.6, "effects": { "athleticism": 3, "technique": 2, "health": -2 }, "narrative": "You came back from the offseason visibly stronger and faster." },
      "failure": { "probability": 0.4, "effects": { "athleticism": 1, "health": -3, "confidence": -1 }, "narrative": "Pushed too hard over the break. Starting next season already banged up." }
    }
  },
  {
    "id": "post_enjoy",
    "category": "social",
    "text": "Take a break and enjoy life",
    "description": "Hang out, travel, recharge mentally.",
    "risk": "Great for mental health. Could lose your edge.",
    "conditions": {},
    "outcomes": {
      "success": { "probability": 0.8, "effects": { "health": 4, "confidence": 2 }, "narrative": "Best offseason ever. Recharged and motivated." },
      "failure": { "probability": 0.2, "effects": { "health": 2, "discipline": -2 }, "narrative": "Maybe too much fun. Took a while to get back into football shape." }
    }
  }
]
```

- [ ] **Step 7: Commit**

---

### Task 3: Weekly choices module

**Files:**
- Create: `src/weekly_choices.ts`

- [ ] **Step 1: Create the choice loading and selection logic**

```typescript
// weekly_choices.ts - adaptive weekly choice generation
//
// Replaces static activity selection with context-sensitive choices
// that have real stakes and uncertain outcomes.

import { Player, modifyStat, clampStat, randomInRange } from './player.js';
import { ArcPhase } from './season_arc.js';

//============================================
// Choice data loaded from JSON
export interface ChoiceOutcome {
	probability: number;
	effects: Record<string, number>;
	narrative: string;
}

export interface WeeklyChoice {
	id: string;
	category: string;
	text: string;
	description: string;
	risk: string;
	conditions: Record<string, unknown>;
	outcomes: {
		success: ChoiceOutcome;
		failure: ChoiceOutcome;
	};
}

//============================================
// Result of resolving a choice
export interface ChoiceResult {
	choiceId: string;
	succeeded: boolean;
	narrative: string;
	effects: Record<string, number>;
}

//============================================
// Choice pools loaded from JSON (populated by loadChoicePools)
const choicePools: Record<ArcPhase, WeeklyChoice[]> = {
	preseason: [],
	opening: [],
	midseason: [],
	stretch: [],
	postseason: [],
};

//============================================
// Load choice pools from imported JSON data
export function loadChoicePools(data: Record<ArcPhase, WeeklyChoice[]>): void {
	for (const phase of Object.keys(data) as ArcPhase[]) {
		choicePools[phase] = data[phase];
	}
}

//============================================
// Get available choices for this week based on context
export function getWeeklyChoices(
	player: Player,
	arcPhase: ArcPhase,
	recentWins: number,
	recentLosses: number,
	hasCrisis: boolean,
): WeeklyChoice[] {
	// During a crisis, choices come from the crisis system, not here
	if (hasCrisis) {
		return [];
	}

	const pool = choicePools[arcPhase];
	if (pool.length === 0) {
		return [];
	}

	// Filter by conditions
	const eligible = pool.filter(choice => meetsConditions(choice, player));

	// Pick 3 choices (or fewer if pool is small): aim for variety in category
	const selected: WeeklyChoice[] = [];
	const usedCategories = new Set<string>();

	// First pass: one per category
	for (const choice of eligible) {
		if (selected.length >= 3) {
			break;
		}
		if (!usedCategories.has(choice.category)) {
			selected.push(choice);
			usedCategories.add(choice.category);
		}
	}

	// Second pass: fill remaining slots
	for (const choice of eligible) {
		if (selected.length >= 3) {
			break;
		}
		if (!selected.includes(choice)) {
			selected.push(choice);
		}
	}

	return selected;
}

//============================================
// Check if a choice's conditions are met
function meetsConditions(choice: WeeklyChoice, player: Player): boolean {
	const conds = choice.conditions;

	// Depth chart condition
	if (conds.depthChart) {
		const allowed = conds.depthChart as string[];
		if (!allowed.includes(player.depthChart)) {
			return false;
		}
	}

	// Health threshold condition
	if (conds.healthBelow !== undefined) {
		if (player.core.health >= (conds.healthBelow as number)) {
			return false;
		}
	}

	return true;
}

//============================================
// Resolve a player's choice: roll success/failure and apply effects
export function resolveChoice(
	player: Player,
	choice: WeeklyChoice,
): ChoiceResult {
	const roll = Math.random();
	const succeeded = roll < choice.outcomes.success.probability;

	const outcome = succeeded ? choice.outcomes.success : choice.outcomes.failure;

	// Apply stat effects
	for (const [stat, delta] of Object.entries(outcome.effects)) {
		if (stat === 'health' || stat === 'confidence' || stat === 'technique'
			|| stat === 'athleticism' || stat === 'footballIq' || stat === 'discipline') {
			modifyStat(player, stat as keyof typeof player.core, delta);
		}
	}

	return {
		choiceId: choice.id,
		succeeded,
		narrative: outcome.narrative,
		effects: outcome.effects,
	};
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

---

### Task 4: Crisis system module

**Files:**
- Create: `src/crisis.ts`
- Create: `src/data/crises.json`

- [ ] **Step 1: Create crisis data file**

```json
[
  {
    "id": "injury_setback",
    "name": "Injury Setback",
    "description": "You felt something pop during practice. The trainer wants to talk.",
    "duration": 2,
    "triggerWeight": { "base": 1.0, "healthBelow50Bonus": 1.5 },
    "responses": [
      {
        "id": "rest_full",
        "text": "Shut it down and recover fully",
        "risk": "Miss 2 games but come back 100%.",
        "effects": { "health": 8, "confidence": -2 },
        "narrative": "You sat out and watched. Frustrating but smart. Body feels great now.",
        "depthChartChange": null,
        "missGames": 2
      },
      {
        "id": "play_through",
        "text": "Play through it",
        "risk": "Keep your stats going but risk making it worse.",
        "effects": { "health": -4, "confidence": 2 },
        "narrative": "You gutted it out. Teammates respect the toughness, but you are limping.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "rehab_hard",
        "text": "Aggressive rehab, miss one game",
        "risk": "Faster recovery but not full rest.",
        "effects": { "health": 3, "technique": 1 },
        "narrative": "Rehab went well. Not 100% but functional. One game missed.",
        "depthChartChange": null,
        "missGames": 1
      }
    ]
  },
  {
    "id": "depth_chart_shakeup",
    "name": "Depth Chart Shake-Up",
    "description": "Coach pulled you aside after practice. Your spot is not guaranteed anymore.",
    "duration": 2,
    "triggerWeight": { "base": 0.5, "benchBackupBonus": 1.5 },
    "responses": [
      {
        "id": "earn_back",
        "text": "Earn it back in practice",
        "risk": "Show them what you've got. Or embarrass yourself trying.",
        "effects": { "technique": 2, "confidence": 1 },
        "narrative": "You went harder than anyone all week. Coaches took notice.",
        "depthChartChange": "promote",
        "missGames": 0
      },
      {
        "id": "confront_coach",
        "text": "Talk to the coach about it",
        "risk": "Could get answers or get shut down.",
        "effects": { "confidence": -1, "discipline": 1 },
        "narrative": "Coach was honest. You know what you need to fix. No shortcuts.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "accept_role",
        "text": "Accept the new role and be a team player",
        "risk": "Shows maturity but might cement you as a backup.",
        "effects": { "discipline": 2, "confidence": -2 },
        "narrative": "You handled it with class. Teammates respect that. But you are still on the bench.",
        "depthChartChange": null,
        "missGames": 0
      }
    ]
  },
  {
    "id": "locker_room_conflict",
    "name": "Locker Room Conflict",
    "description": "Two teammates got into it after practice. The whole team feels the tension.",
    "duration": 1,
    "triggerWeight": { "base": 1.0, "losingStreakBonus": 1.0 },
    "responses": [
      {
        "id": "mediate",
        "text": "Step in and mediate",
        "risk": "Could defuse things or make you a target.",
        "effects": { "confidence": 2, "discipline": 1 },
        "narrative": "You pulled them apart and said the right things. Team feels unified again.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "take_sides",
        "text": "Back one of them",
        "risk": "Pick a side. Win an ally, make an enemy.",
        "effects": { "confidence": 1, "discipline": -1 },
        "narrative": "You made your choice. Half the team agrees with you. The other half does not.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "stay_out",
        "text": "Stay out of it",
        "risk": "Safe but leadership opportunity missed.",
        "effects": { "discipline": 1, "confidence": -1 },
        "narrative": "You kept your head down. Drama passed eventually. No one saw you step up though.",
        "depthChartChange": null,
        "missGames": 0
      }
    ]
  },
  {
    "id": "personal_crisis",
    "name": "Personal Crisis",
    "description": "Something happened at home. It is weighing on you.",
    "duration": 2,
    "triggerWeight": { "base": 0.8 },
    "responses": [
      {
        "id": "handle_private",
        "text": "Handle it privately",
        "risk": "Keep it together. Nobody needs to know.",
        "effects": { "discipline": 2, "confidence": -1 },
        "narrative": "You dealt with it on your own. Tough week but you got through it.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "lean_on_team",
        "text": "Lean on your teammates for support",
        "risk": "Vulnerable but builds real bonds.",
        "effects": { "confidence": 3 },
        "narrative": "The guys rallied around you. This team is more than football.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "ignore_play",
        "text": "Ignore it and focus on football",
        "risk": "Might work. Might blow up later.",
        "effects": { "technique": 1, "health": -2 },
        "narrative": "You buried yourself in football. It helped on the field but the stress is still there.",
        "depthChartChange": null,
        "missGames": 0
      }
    ]
  },
  {
    "id": "rival_emergence",
    "name": "Rival Emergence",
    "description": "One player on the other side of the ball has been running his mouth about you all week.",
    "duration": 2,
    "triggerWeight": { "base": 0.7, "starterWinningBonus": 1.0 },
    "responses": [
      {
        "id": "train_for_rival",
        "text": "Train specifically to beat them",
        "risk": "Focused prep. Could pay off big on game day.",
        "effects": { "technique": 2, "footballIq": 2 },
        "narrative": "You watched every snap of their film. You know exactly how to attack.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "trash_back",
        "text": "Fire back in the media",
        "risk": "Fun but dangerous. Bulletin board material.",
        "effects": { "confidence": 3, "discipline": -2 },
        "narrative": "Social media is exploding. Your teammates are hyped. Your coaches are not.",
        "depthChartChange": null,
        "missGames": 0
      },
      {
        "id": "let_play_talk",
        "text": "Let your play do the talking",
        "risk": "Classy. But no fun.",
        "effects": { "discipline": 2, "confidence": 1 },
        "narrative": "You said nothing. Then went out and dominated. That is the best answer.",
        "depthChartChange": null,
        "missGames": 0
      }
    ]
  }
]
```

- [ ] **Step 2: Create crisis module**

```typescript
// crisis.ts - midseason crisis system
//
// 0-2 crises per season during midseason arc phase.
// Each crisis replaces the normal weekly choice for its duration.

import { Player, modifyStat, randomInRange } from './player.js';

//============================================
// Crisis data types
export interface CrisisResponse {
	id: string;
	text: string;
	risk: string;
	effects: Record<string, number>;
	narrative: string;
	depthChartChange: string | null;
	missGames: number;
}

export interface CrisisDefinition {
	id: string;
	name: string;
	description: string;
	duration: number;
	triggerWeight: Record<string, number>;
	responses: CrisisResponse[];
}

//============================================
// Active crisis state (stored on player during crisis)
export interface ActiveCrisis {
	crisisId: string;
	name: string;
	description: string;
	weeksRemaining: number;
	resolved: boolean;
	responseId: string | null;
	missGamesRemaining: number;
}

//============================================
// All crisis definitions (loaded from JSON)
let crisisDefinitions: CrisisDefinition[] = [];

export function loadCrisisDefinitions(data: CrisisDefinition[]): void {
	crisisDefinitions = data;
}

//============================================
// Decide whether to trigger a crisis this season.
// Called once at start of midseason arc phase.
// Returns 0, 1, or 2 crisis IDs to schedule.
export function scheduleCrises(
	player: Player,
	recentLosses: number,
): string[] {
	// 70% chance of 1 crisis, 20% chance of 2, 10% chance of 0
	const roll = Math.random();
	let count = 0;
	if (roll < 0.10) {
		count = 0;
	} else if (roll < 0.80) {
		count = 1;
	} else {
		count = 2;
	}

	if (count === 0 || crisisDefinitions.length === 0) {
		return [];
	}

	// Weight crises by context
	const weighted = crisisDefinitions.map(def => {
		let weight = def.triggerWeight.base ?? 1.0;
		// Injury more likely when health is low
		if (def.triggerWeight.healthBelow50Bonus && player.core.health < 50) {
			weight += def.triggerWeight.healthBelow50Bonus;
		}
		// Depth chart shakeup more likely for bench/backup
		if (def.triggerWeight.benchBackupBonus
			&& (player.depthChart === 'bench' || player.depthChart === 'backup')) {
			weight += def.triggerWeight.benchBackupBonus;
		}
		// Locker room conflict more likely on losing streak
		if (def.triggerWeight.losingStreakBonus && recentLosses >= 3) {
			weight += def.triggerWeight.losingStreakBonus;
		}
		// Rival emergence more likely for winning starters
		if (def.triggerWeight.starterWinningBonus && player.depthChart === 'starter') {
			weight += def.triggerWeight.starterWinningBonus;
		}
		return { id: def.id, weight };
	});

	// Weighted random selection
	const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
	const selected: string[] = [];
	for (let i = 0; i < count; i++) {
		let pick = Math.random() * totalWeight;
		for (const entry of weighted) {
			pick -= entry.weight;
			if (pick <= 0) {
				if (!selected.includes(entry.id)) {
					selected.push(entry.id);
				}
				break;
			}
		}
	}

	return selected;
}

//============================================
// Start a crisis for the player
export function startCrisis(crisisId: string): ActiveCrisis | null {
	const def = crisisDefinitions.find(d => d.id === crisisId);
	if (!def) {
		return null;
	}

	return {
		crisisId: def.id,
		name: def.name,
		description: def.description,
		weeksRemaining: def.duration,
		resolved: false,
		responseId: null,
		missGamesRemaining: 0,
	};
}

//============================================
// Get crisis response options for display
export function getCrisisResponses(crisisId: string): CrisisResponse[] {
	const def = crisisDefinitions.find(d => d.id === crisisId);
	if (!def) {
		return [];
	}
	return def.responses;
}

//============================================
// Resolve the player's crisis response
export function resolveCrisisResponse(
	player: Player,
	crisis: ActiveCrisis,
	responseId: string,
): string {
	const def = crisisDefinitions.find(d => d.id === crisis.crisisId);
	if (!def) {
		return "Crisis resolved.";
	}

	const response = def.responses.find(r => r.id === responseId);
	if (!response) {
		return "Crisis resolved.";
	}

	// Apply effects
	for (const [stat, delta] of Object.entries(response.effects)) {
		if (stat === 'health' || stat === 'confidence' || stat === 'technique'
			|| stat === 'athleticism' || stat === 'footballIq' || stat === 'discipline') {
			modifyStat(player, stat as keyof typeof player.core, delta);
		}
	}

	// Track response
	crisis.responseId = responseId;
	crisis.resolved = true;
	crisis.missGamesRemaining = response.missGames;

	// Depth chart change
	if (response.depthChartChange === 'promote') {
		if (player.depthChart === 'bench') {
			player.depthChart = 'backup';
		} else if (player.depthChart === 'backup') {
			player.depthChart = 'starter';
		}
	}

	return response.narrative;
}

//============================================
// Advance the crisis by one week (called each week during active crisis)
export function advanceCrisis(crisis: ActiveCrisis): boolean {
	crisis.weeksRemaining -= 1;
	if (crisis.missGamesRemaining > 0) {
		crisis.missGamesRemaining -= 1;
	}
	// Return true if crisis is now over
	return crisis.weeksRemaining <= 0;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

---

### Task 5: Add player state fields

**Files:**
- Modify: `src/player.ts`

- [ ] **Step 1: Add activeCrisis and scheduledCrises fields to Player**

Find the Player interface/type and add:

```typescript
// Season arc and crisis tracking
activeCrisis: ActiveCrisis | null;
scheduledCrises: string[];  // crisis IDs scheduled for this season
crisisTriggeredThisSeason: boolean;
```

Import `ActiveCrisis` from `'./crisis.js'`.

- [ ] **Step 2: Initialize the new fields in createPlayer or wherever Player is constructed**

Set defaults:
```typescript
activeCrisis: null,
scheduledCrises: [],
crisisTriggeredThisSeason: false,
```

- [ ] **Step 3: Reset the fields in the season reset logic**

Find where `player.seasonStats` is reset (in `weekly_engine.ts` `startSeason`) and add:
```typescript
player.activeCrisis = null;
player.scheduledCrises = [];
player.crisisTriggeredThisSeason = false;
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

---

### Task 6: Wire into weekly engine

**Files:**
- Modify: `src/weekly/weekly_engine.ts`

This is the core integration. Replace the `applyGoalAndAdvance` flow with arc-aware choice flow.

- [ ] **Step 1: Add imports**

At the top of weekly_engine.ts, add:
```typescript
import { getArcPhase, ArcPhase, getPhaseTransitionText } from '../season_arc.js';
import { getWeeklyChoices, resolveChoice, WeeklyChoice, loadChoicePools } from '../weekly_choices.js';
import {
	scheduleCrises, startCrisis, getCrisisResponses, resolveCrisisResponse,
	advanceCrisis, loadCrisisDefinitions, ActiveCrisis,
} from '../crisis.js';
```

- [ ] **Step 2: Load data at module level**

Add data loading after imports. Because this is a browser ES module, use static imports for JSON:
```typescript
import preseasonChoices from '../data/choices/preseason.json';
import openingChoices from '../data/choices/opening.json';
import midseasonChoices from '../data/choices/midseason.json';
import stretchChoices from '../data/choices/stretch.json';
import postseasonChoices from '../data/choices/postseason.json';
import crisisData from '../data/crises.json';

// Initialize choice pools and crisis definitions
loadChoicePools({
	preseason: preseasonChoices,
	opening: openingChoices,
	midseason: midseasonChoices,
	stretch: stretchChoices,
	postseason: postseasonChoices,
});
loadCrisisDefinitions(crisisData);
```

- [ ] **Step 3: Modify advanceToNextWeek to show arc phase transitions**

In `advanceToNextWeek`, after the headline `Week ${player.currentWeek}`, add arc phase detection:

```typescript
// Detect arc phase and show transition text if phase changed
const arcPhase = getArcPhase(player.currentWeek, activeEngine.config.seasonLength);
const prevArcPhase = player.currentWeek > 1
	? getArcPhase(player.currentWeek - 1, activeEngine.config.seasonLength)
	: 'preseason';
if (arcPhase !== prevArcPhase) {
	ctx.addText(getPhaseTransitionText(arcPhase));
}
```

- [ ] **Step 4: Modify applyGoalAndAdvance to use adaptive choices**

Replace the call to `applyBackgroundActivityFromGoal` and `proceedToEventCheck` with:

```typescript
function applyGoalAndAdvance(player: Player, ctx: CareerContext): void {
	// Apply the season goal's stat effects (kept - background layer)
	const goalStory = applySeasonGoal(player);
	ctx.addText(goalStory);
	ctx.updateStats(player);
	ctx.save();

	if (!activeEngine) {
		return;
	}

	// Check for active crisis first
	if (player.activeCrisis && !player.activeCrisis.resolved) {
		showCrisisResponse(player, ctx);
		return;
	}

	// Check if crisis should trigger (midseason phase, not yet triggered)
	const arcPhase = getArcPhase(player.currentWeek, activeEngine.config.seasonLength);
	if (arcPhase === 'midseason' && !player.crisisTriggeredThisSeason) {
		// Schedule crises at start of midseason
		if (player.scheduledCrises.length === 0) {
			const record = activeEngine.season.getPlayerRecord();
			player.scheduledCrises = scheduleCrises(player, record.losses);
		}
		// Trigger next scheduled crisis
		if (player.scheduledCrises.length > 0) {
			const crisisId = player.scheduledCrises.shift()!;
			const crisis = startCrisis(crisisId);
			if (crisis) {
				player.activeCrisis = crisis;
				player.crisisTriggeredThisSeason = true;
				ctx.addHeadline(crisis.name);
				ctx.addText(crisis.description);
				showCrisisResponse(player, ctx);
				return;
			}
		}
	}

	// Normal week: show adaptive choices
	showWeeklyChoices(player, ctx, arcPhase);
}
```

- [ ] **Step 5: Add showWeeklyChoices function**

```typescript
function showWeeklyChoices(player: Player, ctx: CareerContext, arcPhase: ArcPhase): void {
	if (!activeEngine) {
		return;
	}

	const record = activeEngine.season.getPlayerRecord();
	const choices = getWeeklyChoices(
		player, arcPhase, record.wins, record.losses,
		player.activeCrisis !== null,
	);

	if (choices.length === 0) {
		// No choices available, proceed directly
		activeEngine.weekState.phase = 'activity_done';
		proceedToEventCheck(player, ctx);
		return;
	}

	const choiceOptions = choices.map(choice => ({
		text: choice.text,
		description: `${choice.description} (${choice.risk})`,
		action: () => {
			const result = resolveChoice(player, choice);
			ctx.addText(result.narrative);
			ctx.updateStats(player);
			ctx.save();

			if (activeEngine) {
				activeEngine.weekState.phase = 'activity_done';
			}
			proceedToEventCheck(player, ctx);
		},
	}));

	ctx.waitForInteraction('What do you do this week?', choiceOptions, undefined, 'activity');
}
```

- [ ] **Step 6: Add showCrisisResponse function**

```typescript
function showCrisisResponse(player: Player, ctx: CareerContext): void {
	if (!player.activeCrisis) {
		return;
	}

	const responses = getCrisisResponses(player.activeCrisis.crisisId);
	if (responses.length === 0) {
		// No valid responses, resolve and move on
		player.activeCrisis.resolved = true;
		if (activeEngine) {
			activeEngine.weekState.phase = 'activity_done';
		}
		proceedToEventCheck(player, ctx);
		return;
	}

	const responseOptions = responses.map(response => ({
		text: response.text,
		description: response.risk,
		action: () => {
			const narrative = resolveCrisisResponse(player, player.activeCrisis!, response.id);
			ctx.addText(narrative);
			ctx.updateStats(player);
			ctx.save();

			// Advance crisis timer
			if (player.activeCrisis) {
				const crisisOver = advanceCrisis(player.activeCrisis);
				if (crisisOver) {
					ctx.addText("The crisis has passed. Back to football.");
					player.activeCrisis = null;
				}
			}

			if (activeEngine) {
				activeEngine.weekState.phase = 'activity_done';
			}
			proceedToEventCheck(player, ctx);
		},
	}));

	ctx.waitForInteraction('Crisis: ' + player.activeCrisis.name, responseOptions, undefined, 'narrative');
}
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

---

### Task 7: Update changelog and verify

**Files:**
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 1: Add changelog entries**

Under `### Additions and New Features`:
```markdown
- **Season arc phases and adaptive weekly choices** (`src/season_arc.ts`,
  `src/weekly_choices.ts`, `src/weekly/weekly_engine.ts`): Seasons now progress
  through 5 arc phases (preseason, opening, midseason, stretch, postseason) that
  change available choices and narrative tone. Weekly activities replaced with
  context-sensitive choices that have real stakes and uncertain outcomes. Choices
  adapt based on arc phase, depth chart status, health, and recent results. Each
  choice shows risk text and has success/failure outcomes with different stat
  effects and narrative. Background season goals (grind/healthy/popular/academic)
  kept as persistent strategy layer.
- **Midseason crisis system** (`src/crisis.ts`, `src/data/crises.json`): 0-2
  crises per season during midseason arc phase (70% chance of 1, 20% chance of 2).
  Five crisis types: injury setback, depth chart shake-up, locker room conflict,
  personal crisis, rival emergence. Crises replace normal weekly choices for 1-3
  weeks with specific response options. Crisis weighting adapts to player context
  (low health triggers injury, bench status triggers depth chart shake-up, losing
  streak triggers locker room conflict). Crisis responses affect stats, depth
  chart, and missed games.
```

- [ ] **Step 2: Full compilation check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Build and verify game loads**

Run: `npx tsc`
Expected: clean build

- [ ] **Step 4: Commit**
