"use strict";
// team.ts - team state management and generation
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpponentName = generateOpponentName;
exports.generateConference = generateConference;
exports.simulateConferenceWeek = simulateConferenceWeek;
exports.getStandings = getStandings;
exports.formatStandings = formatStandings;
exports.generateHighSchoolTeam = generateHighSchoolTeam;
var player_js_1 = require("./player.js");
//============================================
// Pool of team name prefixes
var TEAM_PREFIXES = [
    'North', 'South', 'East', 'West',
    'Central', 'Valley', 'Mountain', 'Riverside',
    'New', 'Pine', 'Oak', 'Cedar',
    'Spring', 'Clear', 'Sunnybrook', 'Westfield',
    'Lakeside', 'Highland', 'Meadow', 'Crest',
    'Lincoln', 'Washington', 'Jefferson', 'Madison',
    'Jackson', 'Franklin', 'Monroe', 'Adams',
];
//============================================
// Pool of team mascots - silly minor-league style
// 50% animals, 25% food, 15% plants, 10% weird
var TEAM_MASCOTS = [
    // Animals (most common)
    'Alpacas', 'Bison', 'Bumblebees', 'Bunnies', 'Cobras',
    'Cranes', 'Crickets', 'Dingos', 'Doves', 'Ferrets',
    'Foxes', 'Frogs', 'Geckos', 'Gophers', 'Gulls',
    'Hares', 'Honeybees', 'Hoppers', 'Iguanas', 'Jackrabbits',
    'Jellyfish', 'Lemurs', 'Lobsters', 'Macaws', 'Moles',
    'Narwhals', 'Newts', 'Parrots', 'Platypus', 'Poodles',
    'Prawns', 'Puffins', 'Quails', 'Raccoons', 'Rhinos',
    'Salmon', 'Seals', 'Shrimp', 'Squids', 'Swans',
    'Tadpoles', 'Toads', 'Trout', 'Turtles', 'Vipers',
    'Vultures', 'Wasps', 'Walruses', 'Weasels', 'Wombats',
    'Zebras',
    // Food (quirky)
    'Acorns', 'Avocados', 'Beets', 'Berries', 'Carrots',
    'Hot Peppers', 'Kumquats', 'Oreos', 'Spuds', 'Walnuts',
    // Plants (flavor)
    'Basil', 'Chives', 'Clovers', 'Dandelions', 'Ferns',
    'Marigolds',
    // Weird (rare)
    'Wyverns', 'Whalers',
];
//============================================
// Conference region names
var CONFERENCE_REGIONS = [
    'Northern', 'Southern', 'Eastern', 'Western',
    'Central', 'Pacific', 'Mountain', 'Valley',
];
//============================================
// Generate a random high school team opponent name
function generateOpponentName() {
    var prefix = TEAM_PREFIXES[(0, player_js_1.randomInRange)(0, TEAM_PREFIXES.length - 1)];
    var mascot = TEAM_MASCOTS[(0, player_js_1.randomInRange)(0, TEAM_MASCOTS.length - 1)];
    return "".concat(prefix, " ").concat(mascot);
}
//============================================
// Generate a conference with 8 teams including the player's team
function generateConference(playerTeamName, playerTeamStrength) {
    // Pick a random region for the conference name
    var region = CONFERENCE_REGIONS[(0, player_js_1.randomInRange)(0, CONFERENCE_REGIONS.length - 1)];
    var conferenceName = "".concat(region, " Conference");
    // Create the player's team as a conference team
    var playerTeam = {
        name: playerTeamName,
        strength: playerTeamStrength,
        wins: 0,
        losses: 0,
        ties: 0,
    };
    // Generate 7 opponent teams
    var teams = [playerTeam];
    for (var i = 0; i < 7; i++) {
        var opponentStrength = (0, player_js_1.randomInRange)(30, 85);
        var team = {
            name: generateOpponentName(),
            strength: opponentStrength,
            wins: 0,
            losses: 0,
            ties: 0,
        };
        teams.push(team);
    }
    var conference = {
        name: conferenceName,
        teams: teams,
    };
    return conference;
}
//============================================
// Simulate conference week for all non-player teams
function simulateConferenceWeek(conference, playerTeamName, playerWon) {
    // Update player's team
    var playerTeam = conference.teams.find(function (t) { return t.name === playerTeamName; });
    if (playerTeam) {
        if (playerWon) {
            playerTeam.wins++;
        }
        else {
            playerTeam.losses++;
        }
    }
    // Simulate games for other teams
    for (var _i = 0, _a = conference.teams; _i < _a.length; _i++) {
        var team = _a[_i];
        // Skip the player's team
        if (team.name === playerTeamName) {
            continue;
        }
        // Random opponent strength
        var opponentStrength = (0, player_js_1.randomInRange)(30, 85);
        var strengthDiff = team.strength - opponentStrength;
        var randomFactor = (0, player_js_1.randomInRange)(-15, 15);
        var winProbability = strengthDiff + randomFactor;
        // Team wins if probability is positive
        if (winProbability > 0) {
            team.wins++;
        }
        else {
            team.losses++;
        }
    }
}
//============================================
// Get standings sorted by wins/losses
function getStandings(conference) {
    // Sort by wins descending, then by losses ascending
    var sorted = __spreadArray([], conference.teams, true).sort(function (a, b) {
        if (b.wins !== a.wins) {
            return b.wins - a.wins;
        }
        return a.losses - b.losses;
    });
    return sorted;
}
//============================================
// Format standings as a readable string
function formatStandings(conference, playerTeamName) {
    var standings = getStandings(conference);
    var output = "".concat(conference.name, ":\n");
    for (var i = 0; i < standings.length; i++) {
        var team = standings[i];
        var rank = i + 1;
        var record = "".concat(team.wins, "-").concat(team.losses);
        var isPlayer = team.name === playerTeamName;
        var prefix = isPlayer ? '>>> ' : '  ';
        var rankStr = rank.toString().padStart(2, ' ');
        output += "".concat(prefix).concat(rankStr, ". ").concat(team.name.padEnd(25), " ").concat(record, "\n");
    }
    return output;
}
//============================================
// Create a new high school team
function generateHighSchoolTeam(teamName) {
    // Team strength varies by school
    var strength = (0, player_js_1.randomInRange)(40, 90);
    // Coach personality is random
    var personalityChoices = [
        'supportive', 'demanding', 'volatile',
    ];
    var coachPersonality = personalityChoices[(0, player_js_1.randomInRange)(0, 2)];
    // Generate 10-12 game schedule
    var scheduleLength = (0, player_js_1.randomInRange)(10, 12);
    var schedule = [];
    for (var week = 1; week <= scheduleLength; week++) {
        var opponentStrength = (0, player_js_1.randomInRange)(35, 95);
        var opponent = {
            opponentName: generateOpponentName(),
            opponentStrength: opponentStrength,
            week: week,
            played: false,
            teamScore: 0,
            opponentScore: 0,
        };
        schedule.push(opponent);
    }
    var team = {
        teamName: teamName,
        strength: strength,
        coachPersonality: coachPersonality,
        wins: 0,
        losses: 0,
        schedule: schedule,
    };
    return team;
}
//============================================
// Simple assertions for testing
var testTeam = generateHighSchoolTeam('Test High School');
console.assert(testTeam.teamName === 'Test High School', 'Team name should match');
console.assert(testTeam.strength >= 40 && testTeam.strength <= 90, 'Team strength should be 40-90');
console.assert(['supportive', 'demanding', 'volatile'].includes(testTeam.coachPersonality), 'Coach personality should be valid');
console.assert(testTeam.schedule.length >= 10 && testTeam.schedule.length <= 12, 'Schedule should have 10-12 games');
console.assert(testTeam.wins === 0 && testTeam.losses === 0, 'New team should have 0 wins/losses');
