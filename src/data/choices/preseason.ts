import type { WeeklyChoice } from '../../weekly_choices.js';

const choices: WeeklyChoice[] = [
	{
		id: "preseason_compete",
		category: "compete",
		text: "Challenge for the starting spot",
		description: "Go all-out in practice to prove you deserve to start.",
		risk: "Could impress coaches or look desperate.",
		conditions: { depthChart: ["backup", "bench"] },
		outcomes: {
			success: { probability: 0.4, effects: { confidence: 3, technique: 2 }, narrative: "Coaches noticed your intensity. You moved up on the depth chart discussion." },
			failure: { probability: 0.6, effects: { confidence: -2, health: -1 }, narrative: "You pushed too hard and pulled something. Coaches told you to dial it back." }
		}
	},
	{
		id: "preseason_bond",
		category: "social",
		text: "Build chemistry with teammates",
		description: "Spend extra time in the locker room and at team dinners.",
		risk: "Good for morale but won't improve your game directly.",
		conditions: {},
		outcomes: {
			success: { probability: 0.8, effects: { confidence: 2 }, narrative: "The team feels closer. Guys have your back." },
			failure: { probability: 0.2, effects: { confidence: -1 }, narrative: "You tried but some veterans don't take to newcomers easily." }
		}
	},
	{
		id: "preseason_study",
		category: "train",
		text: "Study the playbook hard",
		description: "Lock yourself in with the playbook every night.",
		risk: "Great prep, but burns energy before the season starts.",
		conditions: {},
		outcomes: {
			success: { probability: 0.7, effects: { footballIq: 3, technique: 1, health: -1 }, narrative: "You know the playbook cold. Coaches trust you with more complex packages." },
			failure: { probability: 0.3, effects: { footballIq: 1, health: -2 }, narrative: "You overdid it. Mentally sharp but physically drained heading into week 1." }
		}
	},
	{
		id: "preseason_rest",
		category: "train",
		text: "Take it easy, stay fresh",
		description: "Light workouts, good sleep, mental prep.",
		risk: "Safe but you won't stand out.",
		conditions: {},
		outcomes: {
			success: { probability: 0.9, effects: { health: 3, confidence: 1 }, narrative: "You feel rested and ready. No nagging pains heading into the season." },
			failure: { probability: 0.1, effects: { health: 1, discipline: -1 }, narrative: "Maybe too relaxed. Coaches wonder if you're taking this seriously." }
		}
	}
];

export default choices;
