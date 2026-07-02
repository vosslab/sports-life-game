// ui_utils.ts - Shared UI helper functions
//
// Exports utility functions used across multiple UI widgets:
// - formatMoney: format currency amounts with M/K abbreviations
// - getPhaseLabel: convert career phase enum to readable string

import type { CareerPhase } from "../player/identity.js";

//============================================
// Format money amount with M/K abbreviations
export function formatMoney(amount: number): string {
  if (amount >= 1000000) {
    const millions = (amount / 1000000).toFixed(1);
    return `$${millions}M`;
  }
  if (amount >= 1000) {
    const thousands = (amount / 1000).toFixed(0);
    return `$${thousands}K`;
  }
  return `$${amount}`;
}

//============================================
// Convert career phase to readable label
export function getPhaseLabel(phase: CareerPhase): string {
  const labels: Record<CareerPhase, string> = {
    childhood: "Childhood",
    youth: "Youth",
    high_school: "High School",
    college: "College",
    nfl: "NFL",
    legacy: "Legacy",
  };
  return labels[phase];
}
