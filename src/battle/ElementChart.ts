import { ELEMENT_CHART } from '../constants/elements.js';
import type { Element } from '../constants/elements.js';

export function getElementMultiplier(attackElement: Element, defenseElement: Element): number {
  return ELEMENT_CHART[attackElement][defenseElement];
}
