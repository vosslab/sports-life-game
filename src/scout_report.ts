// scout_report.ts - NFL draft scout reports for college players
//
// Generates specific, actionable feedback about what scouts think.
// Shows after each college season and during pre-draft events.
// Makes the invisible draftStock number into a narrative the player can act on.

import { Player, clampStat } from './player.js';

//============================================
// Draft projection tiers
export type DraftProjection =
	| 'undrafted'
	| 'late_round'
	| 'mid_round'
	| 'day_two'
	| 'first_round'
	| 'top_ten'
	| 'top_five';

//============================================
// A single scout observation
export interface ScoutNote {
	category: 'strength' | 'weakness' | 'buzz' | 'concern';
	text: string;
}

//============================================
// Full scout report
export interface ScoutReport {
	projection: DraftProjection;
	projectionLabel: string;
	draftStock: number;
	previousDraftStock: number | null;
	trend: 'rising' | 'falling' | 'steady';
	notes: ScoutNote[];
	summary: string;
}

//============================================
// Get draft projection from stock number
function getProjection(stock: number): DraftProjection {
	if (stock >= 90) {
		return 'top_five';
	}
	if (stock >= 80) {
		return 'top_ten';
	}
	if (stock >= 70) {
		return 'first_round';
	}
	if (stock >= 55) {
		return 'day_two';
	}
	if (stock >= 40) {
		return 'mid_round';
	}
	if (stock >= 25) {
		return 'late_round';
	}
	return 'undrafted';
}

//============================================
// Human-readable projection label
function getProjectionLabel(proj: DraftProjection): string {
	switch (proj) {
		case 'top_five': return 'Projected Top 5 Pick';
		case 'top_ten': return 'Projected Top 10 Pick';
		case 'first_round': return 'Projected 1st Round';
		case 'day_two': return 'Projected Day 2 (Rounds 2-3)';
		case 'mid_round': return 'Projected Mid-Round Pick';
		case 'late_round': return 'Late Round / Priority Free Agent';
		case 'undrafted': return 'Unlikely to be Drafted';
	}
}

//============================================
// Generate scout notes based on player stats
function generateNotes(player: Player): ScoutNote[] {
	const notes: ScoutNote[] = [];
	const core = player.core;

	// Strengths (stats >= 70)
	if (core.athleticism >= 75) {
		notes.push({ category: 'strength', text: 'Elite athletic tools. Tested off the charts in combine projections.' });
	} else if (core.athleticism >= 65) {
		notes.push({ category: 'strength', text: 'Good athlete. Can compete at the next level physically.' });
	}

	if (core.technique >= 75) {
		notes.push({ category: 'strength', text: 'Polished technique. Pro-ready skill set.' });
	} else if (core.technique >= 65) {
		notes.push({ category: 'strength', text: 'Solid fundamentals. Coachable player.' });
	}

	if (core.footballIq >= 75) {
		notes.push({ category: 'strength', text: 'High football IQ. Processes the game fast.' });
	} else if (core.footballIq >= 65) {
		notes.push({ category: 'strength', text: 'Understands the playbook. Makes smart decisions.' });
	}

	if (core.discipline >= 75) {
		notes.push({ category: 'strength', text: 'Great character. Team-first mentality. Zero off-field concerns.' });
	}

	// Weaknesses (stats < 45)
	if (core.athleticism < 40) {
		notes.push({ category: 'weakness', text: 'Limited athletic upside. May struggle against NFL speed.' });
	} else if (core.athleticism < 50) {
		notes.push({ category: 'weakness', text: 'Average athlete. Needs to compensate with technique.' });
	}

	if (core.technique < 40) {
		notes.push({ category: 'weakness', text: 'Raw technique. Needs significant development at the next level.' });
	} else if (core.technique < 50) {
		notes.push({ category: 'weakness', text: 'Technique is inconsistent. Flashes ability but disappears at times.' });
	}

	if (core.footballIq < 40) {
		notes.push({ category: 'weakness', text: 'Questionable processing speed. Gets confused by complex schemes.' });
	}

	if (core.discipline < 40) {
		notes.push({ category: 'concern', text: 'Character concerns. Teams are doing extra homework on this player.' });
	} else if (core.discipline < 50) {
		notes.push({ category: 'concern', text: 'Some maturity questions. Needs the right coaching staff.' });
	}

	if (core.health < 50) {
		notes.push({ category: 'concern', text: 'Injury history is a red flag. Durability concerns at the next level.' });
	}

	if (core.confidence < 40) {
		notes.push({ category: 'concern', text: 'Seems to shrink in big moments. Mental toughness is a question mark.' });
	}

	// Buzz notes (based on hidden stats and career)
	if (player.hidden.leadership >= 70) {
		notes.push({ category: 'buzz', text: 'Teammates rave about his leadership. Captains love him.' });
	}

	if (player.career.popularity >= 70) {
		notes.push({ category: 'buzz', text: 'Big media presence. Marketing teams are already interested.' });
	}

	if (player.careerGamesPlayed >= 40) {
		notes.push({ category: 'strength', text: 'Experienced. Has started in big games and high-pressure situations.' });
	}

	// Position-specific notes
	if (player.positionBucket === 'passer') {
		if (core.technique >= 70 && core.footballIq >= 65) {
			notes.push({ category: 'buzz', text: 'Franchise QB potential. Teams are moving up boards to get him.' });
		} else if (core.athleticism >= 70 && core.technique < 55) {
			notes.push({ category: 'buzz', text: 'Dual-threat upside but needs work in the pocket. Developmental pick.' });
		}
	}

	if (player.positionBucket === 'runner_receiver') {
		if (core.athleticism >= 75) {
			notes.push({ category: 'buzz', text: 'Explosive playmaker. Could be a game-changer on day one.' });
		}
	}

	if (player.positionBucket === 'defender') {
		if (core.athleticism >= 70 && core.footballIq >= 65) {
			notes.push({ category: 'buzz', text: 'Instinctive defender. Ball hawk who creates turnovers.' });
		}
	}

	// Limit to 4-5 notes for readability
	return notes.slice(0, 5);
}

//============================================
// Generate the full scout report
export function generateScoutReport(
	player: Player,
	previousDraftStock: number | null,
): ScoutReport {
	const stock = player.draftStock;
	const projection = getProjection(stock);
	const projectionLabel = getProjectionLabel(projection);

	// Determine trend
	let trend: 'rising' | 'falling' | 'steady' = 'steady';
	if (previousDraftStock !== null) {
		const diff = stock - previousDraftStock;
		if (diff >= 5) {
			trend = 'rising';
		} else if (diff <= -5) {
			trend = 'falling';
		}
	}

	const notes = generateNotes(player);

	// Build summary sentence
	let summary = `${player.firstName} ${player.lastName} is currently ${projectionLabel.toLowerCase()}.`;
	if (trend === 'rising') {
		summary += ' Stock is rising after a strong season.';
	} else if (trend === 'falling') {
		summary += ' Stock has dropped. Scouts are concerned.';
	}

	return {
		projection,
		projectionLabel,
		draftStock: stock,
		previousDraftStock,
		trend,
		notes,
		summary,
	};
}

//============================================
// Format scout report as displayable text
export function formatScoutReport(report: ScoutReport): string {
	let output = `NFL Scout Report: ${report.projectionLabel}`;
	output += ` (${report.draftStock}/100)`;

	if (report.trend === 'rising') {
		output += ' [RISING]';
	} else if (report.trend === 'falling') {
		output += ' [FALLING]';
	}

	output += '\n';
	output += report.summary + '\n';

	// Group notes by category
	const strengths = report.notes.filter(n => n.category === 'strength');
	const weaknesses = report.notes.filter(n => n.category === 'weakness');
	const concerns = report.notes.filter(n => n.category === 'concern');
	const buzz = report.notes.filter(n => n.category === 'buzz');

	if (strengths.length > 0) {
		output += '\nStrengths:\n';
		for (const note of strengths) {
			output += `  + ${note.text}\n`;
		}
	}
	if (weaknesses.length > 0) {
		output += '\nWeaknesses:\n';
		for (const note of weaknesses) {
			output += `  - ${note.text}\n`;
		}
	}
	if (concerns.length > 0) {
		output += '\nConcerns:\n';
		for (const note of concerns) {
			output += `  ! ${note.text}\n`;
		}
	}
	if (buzz.length > 0) {
		output += '\nBuzz:\n';
		for (const note of buzz) {
			output += `  * ${note.text}\n`;
		}
	}

	return output;
}
