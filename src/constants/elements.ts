export const ELEMENTS = ['fire', 'water', 'wind', 'earth', 'none'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_CHART: Record<Element, Record<Element, number>> = {
  fire:  { fire: 1.0, water: 0.5, wind: 1.0, earth: 2.0, none: 1.0 },
  water: { fire: 2.0, water: 1.0, wind: 0.5, earth: 1.0, none: 1.0 },
  wind:  { fire: 1.0, water: 2.0, wind: 1.0, earth: 0.5, none: 1.0 },
  earth: { fire: 0.5, water: 1.0, wind: 2.0, earth: 1.0, none: 1.0 },
  none:  { fire: 1.0, water: 1.0, wind: 1.0, earth: 1.0, none: 1.0 },
};
