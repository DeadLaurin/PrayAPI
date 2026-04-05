import { CalculationMethod } from "adhan";

export const METHOD_SLUGS = [
  "muslim_world_league",
  "egyptian",
  "karachi",
  "umm_al_qura",
  "dubai",
  "moonsighting_committee",
  "north_america",
  "kuwait",
  "qatar",
  "singapore",
  "tehran",
  "turkey",
  "other",
] as const;

export type MethodSlug = (typeof METHOD_SLUGS)[number];

const METHOD_LABEL: Record<MethodSlug, string> = {
  muslim_world_league: "Muslim World League",
  egyptian: "Egyptian General Authority of Survey",
  karachi: "University of Islamic Sciences, Karachi",
  umm_al_qura: "Umm al-Qura University, Makkah",
  dubai: "Dubai",
  moonsighting_committee: "Moonsighting Committee",
  north_america: "ISNA (North America)",
  kuwait: "Kuwait",
  qatar: "Qatar",
  singapore: "Singapore",
  tehran: "Institute of Geophysics, Tehran",
  turkey: "Diyanet (Turkey)",
  other: "Custom angles (library default)",
};

export function listMethods(): { id: MethodSlug; name: string }[] {
  return METHOD_SLUGS.map((id) => ({ id, name: METHOD_LABEL[id] }));
}

export function getCalculationParams(slug: string) {
  const s = slug.toLowerCase().replace(/-/g, "_") as MethodSlug;
  const map: Record<MethodSlug, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
    muslim_world_league: CalculationMethod.MuslimWorldLeague,
    egyptian: CalculationMethod.Egyptian,
    karachi: CalculationMethod.Karachi,
    umm_al_qura: CalculationMethod.UmmAlQura,
    dubai: CalculationMethod.Dubai,
    moonsighting_committee: CalculationMethod.MoonsightingCommittee,
    north_america: CalculationMethod.NorthAmerica,
    kuwait: CalculationMethod.Kuwait,
    qatar: CalculationMethod.Qatar,
    singapore: CalculationMethod.Singapore,
    tehran: CalculationMethod.Tehran,
    turkey: CalculationMethod.Turkey,
    other: CalculationMethod.Other,
  };
  const fn = map[s];
  if (!fn) return null;
  return fn();
}

export function isValidMethodSlug(s: string): s is MethodSlug {
  return (METHOD_SLUGS as readonly string[]).includes(s);
}
