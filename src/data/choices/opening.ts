import type { WeeklyChoice } from '../../weekly_choices.js';

const choices: WeeklyChoice[] = [
	{
		id: "opening_push",
		category: "train",
		text: "Push through the pain",
		description: "Your body hurts from the early games. Train anyway.",
		risk: "Could make you tougher or break you down.",
		conditions: { healthBelow: 60 },
		outcomes: {
			success: { probability: 0.5, effects: { technique: 2, athleticism: 1, health: -2 }, narrative: "You pushed through and came out stronger. Teammates respect the toughness." },
			failure: { probability: 0.5, effects: { health: -5, confidence: -1 }, narrative: "Your body gave out. Trainer says you need to take it easy or risk a real injury." }
		}
	},
	{
		id: "opening_film",
		category: "train",
		text: "Extra film study on next opponent",
		description: "Watch tape of the upcoming opponent's tendencies.",
		risk: "Time well spent, but skipping recovery.",
		conditions: {},
		outcomes: {
			success: { probability: 0.75, effects: { footballIq: 2, technique: 1 }, narrative: "You spotted a tendency in their defense. Shared it with the coaches." },
			failure: { probability: 0.25, effects: { footballIq: 1, health: -1 }, narrative: "Watched film until 2am. Smart move, but you are dragging today." }
		}
	},
	{
		id: "opening_mentor",
		category: "social",
		text: "Help a younger teammate",
		description: "A freshman is struggling. Spend time showing them the ropes.",
		risk: "Great for team culture. Costs your own development time.",
		conditions: { depthChart: ["starter"] },
		outcomes: {
			success: { probability: 0.8, effects: { confidence: 2, discipline: 1 }, narrative: "The kid looked up to you. Coaches noticed your leadership." },
			failure: { probability: 0.2, effects: { confidence: -1 }, narrative: "You tried but the kid wasn't receptive. Frustrating." }
		}
	},
	{
		id: "opening_recovery",
		category: "train",
		text: "Full recovery day",
		description: "Ice baths, stretching, sleep. Let your body heal.",
		risk: "No skill growth this week.",
		conditions: {},
		outcomes: {
			success: { probability: 0.9, effects: { health: 4 }, narrative: "Body feels great. Ready to go for the next game." },
			failure: { probability: 0.1, effects: { health: 2, confidence: -1 }, narrative: "Recovery day felt lazy. Hope you are not losing your edge." }
		}
	}
];

export default choices;
