"use strict";
// player.ts - player state: stats, age, position, injuries, career history
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomInRange = randomInRange;
exports.clampStat = clampStat;
exports.generateBirthStats = generateBirthStats;
exports.createPlayer = createPlayer;
exports.modifyStat = modifyStat;
exports.getPositionBucket = getPositionBucket;
//============================================
// Random integer in range [min, max] inclusive
function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
//============================================
// Clamp a stat to 0-100
function clampStat(value) {
    return Math.max(0, Math.min(100, value));
}
//============================================
// Generate random birth stats
function generateBirthStats() {
    var core = {
        // Athleticism: higher variance, some kids are naturally gifted
        athleticism: randomInRange(20, 80),
        // Technique and Football IQ: start very low (learned skills)
        technique: randomInRange(0, 10),
        footballIq: randomInRange(0, 10),
        // Discipline: moderate range
        discipline: randomInRange(10, 50),
        // Health: generally starts high
        health: randomInRange(50, 100),
        // Confidence: moderate range
        confidence: randomInRange(20, 60),
    };
    var hidden = {
        // Size: 1-5 body frame, random genetics
        size: randomInRange(1, 5),
        // Leadership: starts low
        leadership: randomInRange(5, 25),
        // Durability: mostly high for young players
        durability: randomInRange(50, 90),
    };
    return { core: core, hidden: hidden };
}
//============================================
// Create a new player with birth stats
function createPlayer(firstName, lastName) {
    var _a = generateBirthStats(), core = _a.core, hidden = _a.hidden;
    var player = {
        firstName: firstName,
        lastName: lastName,
        age: 0,
        phase: 'childhood',
        position: null,
        positionBucket: null,
        depthChart: 'bench',
        core: core,
        career: {
            popularity: 0,
            money: 0,
        },
        hidden: hidden,
        currentSeason: 0,
        currentWeek: 0,
        seasonYear: new Date().getFullYear(),
        teamName: '',
        teamStrength: 50,
        storyFlags: {},
        storyLog: [],
        careerHistory: [],
        bigDecisions: [],
        recruitingStars: 0,
        collegeOffers: [],
        draftStock: 0,
        useRealTeamNames: true,
    };
    return player;
}
//============================================
// Modify a core stat with clamping
function modifyStat(player, stat, delta) {
    player.core[stat] = clampStat(player.core[stat] + delta);
}
//============================================
// Get the position bucket for a given position
function getPositionBucket(position) {
    switch (position) {
        case 'QB':
            return 'passer';
        case 'RB':
        case 'WR':
        case 'TE':
            return 'runner_receiver';
        case 'OL':
        case 'DL':
            return 'lineman';
        case 'LB':
        case 'CB':
        case 'S':
            return 'defender';
        case 'K':
        case 'P':
            return 'kicker';
    }
}
//============================================
// Simple assertions for testing
var testStats = generateBirthStats();
console.assert(testStats.core.athleticism >= 20 && testStats.core.athleticism <= 80, 'Athleticism should be 20-80 at birth');
console.assert(testStats.core.technique >= 0 && testStats.core.technique <= 10, 'Technique should be 0-10 at birth');
console.assert(testStats.hidden.size >= 1 && testStats.hidden.size <= 5, 'Size should be 1-5');
console.assert(clampStat(150) === 100, 'clampStat should cap at 100');
console.assert(clampStat(-10) === 0, 'clampStat should floor at 0');
console.assert(getPositionBucket('QB') === 'passer', 'QB should be passer bucket');
console.assert(getPositionBucket('WR') === 'runner_receiver', 'WR should be runner_receiver');
console.assert(getPositionBucket('LB') === 'defender', 'LB should be defender');
