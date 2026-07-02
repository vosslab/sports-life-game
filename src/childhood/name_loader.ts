// name_loader.ts - Load player name lists from CSV files with fallbacks

import firstNamesCsv from "../data/first_names.csv";
import lastNamesCsv from "../data/last_names.csv";

export const DEFAULT_FIRST_NAMES = [
  "Marcus",
  "Jaylen",
  "DeShawn",
  "Tyler",
  "Caleb",
  "Jamal",
  "Austin",
  "Brandon",
  "Malik",
  "Trevon",
  "Darius",
  "Xavier",
  "Jordan",
  "Cameron",
  "Isaiah",
  "Devin",
  "Andre",
  "Lamar",
  "Patrick",
  "Justin",
  "Kyler",
  "Jalen",
  "Micah",
  "Trevor",
  "Bryce",
  "Derek",
  "Travis",
  "Zach",
  "Chris",
  "Antonio",
  "Mike",
  "Aaron",
  "DJ",
  "CJ",
  "TJ",
  "Sarah",
  "Maya",
  "Jasmine",
  "Taylor",
  "Morgan",
  "Alex",
  "Sam",
];

export const DEFAULT_LAST_NAMES = [
  "Williams",
  "Johnson",
  "Smith",
  "Brown",
  "Jackson",
  "Davis",
  "Wilson",
  "Thomas",
  "Robinson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Garcia",
  "Martinez",
  "Anderson",
  "Taylor",
  "Moore",
  "Jones",
  "Lee",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Adams",
  "Baker",
  "Hill",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Roberts",
];

// Parse a CSV blob into a list of non-empty trimmed lines
function parseNameCsv(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines;
}

// eslint-disable-next-line @typescript-eslint/require-await -- M5 loader contract: callers await; body is sync because csv text is bundled at build time
export async function loadNameLists(): Promise<{
  firstNames: string[];
  lastNames: string[];
}> {
  const parsedFirst = parseNameCsv(firstNamesCsv);
  const parsedLast = parseNameCsv(lastNamesCsv);

  const firstNames = parsedFirst.length > 0 ? parsedFirst : DEFAULT_FIRST_NAMES;
  const lastNames = parsedLast.length > 0 ? parsedLast : DEFAULT_LAST_NAMES;

  return { firstNames, lastNames };
}
