// recruiting_profile.ts - recruiting state types and profile management
//
// Pure type definitions and helper functions for the multi-year
// college recruiting system. No UI or interaction logic here.
// Store schoolId strings (not full NCAASchool objects) to keep
// save data lean and avoid stale references.

import { NCAASchool } from './ncaa.js';

//============================================
// Offer progression states (per design doc section 9)
// Allowed transitions enforced by advanceOfferState()
export type OfferState =
	| 'watchlist'
	| 'interest'
	| 'soft_offer'
	| 'verbal_offer'
	| 'committable_offer'
	| 'committed'
	| 'signed'
	| 'offer_pulled';

//============================================
// Valid state machine transitions
// committed -> decommit is handled separately via processDecommitment()
const VALID_TRANSITIONS: Record<string, OfferState[]> = {
	watchlist: ['interest', 'offer_pulled'],
	interest: ['soft_offer', 'offer_pulled'],
	soft_offer: ['verbal_offer', 'offer_pulled'],
	verbal_offer: ['committable_offer', 'offer_pulled'],
	committable_offer: ['committed', 'offer_pulled'],
	committed: ['signed', 'offer_pulled'],
	signed: [],
	offer_pulled: [],
};

//============================================
// Check if a state transition is valid
export function isValidTransition(from: OfferState, to: OfferState): boolean {
	const allowed = VALID_TRANSITIONS[from];
	if (!allowed) {
		return false;
	}
	return allowed.includes(to);
}

//============================================
// Advance a school's offer state, enforcing the state machine
// Returns true if transition succeeded, false if invalid
export function advanceOfferState(school: SchoolInterest, newState: OfferState): boolean {
	if (!isValidTransition(school.state, newState)) {
		console.warn(
			`Invalid offer transition: ${school.state} -> ${newState} for ${school.schoolId}`
		);
		return false;
	}
	school.state = newState;
	return true;
}

//============================================
// Visit outcome card shown to the player after visiting a school
export interface VisitImpression {
	campusVibe: 'poor' | 'okay' | 'great';
	coachTrust: 'low' | 'medium' | 'high';
	playingTimePath: 'unclear' | 'possible' | 'strong';
	familyReaction: 'negative' | 'neutral' | 'positive';
}

//============================================
// Per-school recruiting relationship
// schoolId is the school's commonName, resolved via getSchoolById()
// Simulated school season record for recruiting display
export interface SchoolRecord {
	wins: number;
	losses: number;
	conferenceRank: number;     // 1-14 within conference
	nationalRank: number;       // 0 = unranked, 1-25 = ranked
}

export interface SchoolInterest {
	schoolId: string;
	state: OfferState;
	scholarshipType: 'full' | 'partial' | 'walk-on' | 'none';
	interest: number;           // 0-100, school's interest in player
	coachRelationship: number;  // 0-100, built through contact/visits
	visitStatus: 'none' | 'unofficial' | 'official';
	isCommittable: boolean;
	visitImpression?: VisitImpression;
	schoolRecord?: SchoolRecord; // simulated last season record
}

//============================================
// Academic eligibility (design doc section 11)
export type AcademicStanding = 'at_risk' | 'solid' | 'excellent';
export type CoreProgress = 'behind' | 'on_track' | 'strong';

//============================================
// Full recruiting profile -- versioned for future migration
export interface RecruitingProfile {
	version: 1;
	phase: 'junior' | 'senior' | 'postgrad' | 'complete';

	// Exposure and reputation (persisted, player-facing)
	buzz: number;               // 0-100, overall recruiting heat
	exposure: number;           // 0-100, how widely known
	filmGrade: 'none' | 'poor' | 'serviceable' | 'strong' | 'elite';
	campReputation: number;     // 0-100, camp/combine performance history

	// Academic (persisted, gates offers)
	academicStanding: AcademicStanding;
	coreProgress: CoreProgress;
	eligibilityRegistered: boolean;

	// Recruiting activity (persisted, narrative state)
	campAttended: boolean;
	showcaseAttended: boolean;
	unofficialVisits: string[];  // school IDs visited
	officialVisits: string[];    // school IDs (max 5)

	// School relationships (persisted, decision state)
	schools: SchoolInterest[];

	// Commitment state (persisted)
	verbalCommit: string | null; // school ID if committed
	signed: boolean;

	// Post-grad flags
	isJuco: boolean;
	isPrepSchool: boolean;
}

//============================================
// Resolve a school object from its ID (commonName)
export function getSchoolById(
	schoolId: string,
	ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] },
): NCAASchool | undefined {
	const all = [...ncaaSchools.fbs, ...ncaaSchools.fcs];
	const found = all.find(s => s.commonName === schoolId);
	return found;
}

//============================================
// Create a fresh recruiting profile at the start of junior year
export function createRecruitingProfile(): RecruitingProfile {
	const profile: RecruitingProfile = {
		version: 1,
		phase: 'junior',
		buzz: 0,
		exposure: 0,
		filmGrade: 'none',
		campReputation: 0,
		academicStanding: 'solid',
		coreProgress: 'on_track',
		eligibilityRegistered: false,
		campAttended: false,
		showcaseAttended: false,
		unofficialVisits: [],
		officialVisits: [],
		schools: [],
		verbalCommit: null,
		signed: false,
		isJuco: false,
		isPrepSchool: false,
	};
	return profile;
}

//============================================
// Get all schools at or above a given offer state
export function getSchoolsAtState(
	profile: RecruitingProfile,
	minState: OfferState,
): SchoolInterest[] {
	// State ordering for comparison
	const stateOrder: OfferState[] = [
		'watchlist', 'interest', 'soft_offer', 'verbal_offer',
		'committable_offer', 'committed', 'signed',
	];
	const minIndex = stateOrder.indexOf(minState);
	if (minIndex < 0) {
		return [];
	}
	const result = profile.schools.filter(s => {
		const sIndex = stateOrder.indexOf(s.state);
		return sIndex >= minIndex;
	});
	return result;
}

//============================================
// Get the committed school, if any
export function getCommittedSchool(
	profile: RecruitingProfile,
): SchoolInterest | undefined {
	const found = profile.schools.find(s => s.state === 'committed' || s.state === 'signed');
	return found;
}

//============================================
// Count schools that have extended offers (soft_offer and above)
export function countOffers(profile: RecruitingProfile): number {
	const offerStates: OfferState[] = [
		'soft_offer', 'verbal_offer', 'committable_offer', 'committed', 'signed',
	];
	const count = profile.schools.filter(s => offerStates.includes(s.state)).length;
	return count;
}
