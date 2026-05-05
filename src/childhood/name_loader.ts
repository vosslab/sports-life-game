// name_loader.ts - Load player name lists from CSV files with fallbacks

export const DEFAULT_FIRST_NAMES = [
	'Marcus', 'Jaylen', 'DeShawn', 'Tyler', 'Caleb', 'Jamal', 'Austin',
	'Brandon', 'Malik', 'Trevon', 'Darius', 'Xavier', 'Jordan', 'Cameron',
	'Isaiah', 'Devin', 'Andre', 'Lamar', 'Patrick', 'Justin', 'Kyler',
	'Jalen', 'Micah', 'Trevor', 'Bryce', 'Derek', 'Travis', 'Zach',
	'Chris', 'Antonio', 'Mike', 'Aaron', 'DJ', 'CJ', 'TJ',
	'Sarah', 'Maya', 'Jasmine', 'Taylor', 'Morgan', 'Alex', 'Sam',
];

export const DEFAULT_LAST_NAMES = [
	'Williams', 'Johnson', 'Smith', 'Brown', 'Jackson', 'Davis', 'Wilson',
	'Thomas', 'Robinson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia',
	'Martinez', 'Anderson', 'Taylor', 'Moore', 'Jones', 'Lee', 'Walker',
	'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green',
	'Adams', 'Baker', 'Hill', 'Rivera', 'Campbell', 'Mitchell', 'Roberts',
];

export async function loadNameLists(): Promise<{
	firstNames: string[];
	lastNames: string[];
}> {
	let firstNames = DEFAULT_FIRST_NAMES;
	let lastNames = DEFAULT_LAST_NAMES;

	try {
		const fr = await fetch('src/data/first_names.csv');
		if (fr.ok) {
			const text = await fr.text();
			const parsed = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
			if (parsed.length > 0) firstNames = parsed;
		}
	} catch { }

	try {
		const lr = await fetch('src/data/last_names.csv');
		if (lr.ok) {
			const text = await lr.text();
			const parsed = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
			if (parsed.length > 0) lastNames = parsed;
		}
	} catch { }

	return { firstNames, lastNames };
}
