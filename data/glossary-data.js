// ─────────────────────────────────────────────────────────────
// Glossary — terms used loosely in public discussion of asylum.
//
// Hand-curated. Each entry is one paragraph, sourced. The aim is
// not to settle definitions but to pin down what a number on this
// site actually counts (and what it doesn't). Add new entries here;
// the <Gloss term="..."> component looks them up by lower-cased key.
//
// Schema:
//   { term, body, source }
// Keys are lower-cased on lookup so "Grant rate" and "grant rate"
// resolve identically.
// ─────────────────────────────────────────────────────────────
window.GLOSSARY = {
  'grant rate': {
    body: "Share of substantive initial decisions that result in refugee status or other protection. Excludes withdrawn and non-substantive cases. Appeal overturns typically lift the eventual rate by 15–20 percentage points.",
    source: "Asy_D02 · methodology",
  },
  'main applicant': {
    body: "The lead person on a claim. A claim may also cover dependants (spouse, children under 18). Unless stated otherwise, our counts refer to main applicants only.",
    source: "Asy_D01 · methodology",
  },
  'main applicants': {
    body: "The lead persons on each claim. A claim may also cover dependants (spouse, children under 18). Unless stated otherwise, our counts refer to main applicants only.",
    source: "Asy_D01 · methodology",
  },
  'refused': {
    body: "A negative decision at the initial stage. The applicant may appeal to the First-tier Tribunal (Immigration and Asylum Chamber). “Refused” is not the same as “returned”.",
    source: "Asy_D02 · methodology",
  },
  'backlog': {
    body: "Asylum applications awaiting an initial decision at the 31 December snapshot for each year. Excludes appeals pending and inadmissibility reviews. The headline number is sensitive to which sub-stages are included — see methodology.",
    source: "Asy_D03 · methodology",
  },
  'preventions': {
    body: "Crossing attempts that ended on the French side rather than with a UK arrival. The Home Office began publishing these in May 2024; the series is shorter than the arrivals series.",
    source: "SB_02 · methodology",
  },
  'small-boat arrivals': {
    body: "People recorded by Border Force as arriving at a UK port after being intercepted at sea or making landfall. Counts arrivals, not boats; the per-boat figure is derived. Excludes air, lorry, and other clandestine routes.",
    source: "SB_01 · methodology",
  },
  'asylum seeker': {
    body: "A person who has lodged a claim for asylum and is awaiting a decision. Becomes a refugee on grant of protection, or moves to refusal / appeal / withdrawal if the claim is not granted.",
    source: "1951 Refugee Convention; Home Office Asy_D01",
  },
  'refugee': {
    body: "A person granted protection — refugee status, humanitarian protection, or alternative leave. The legal definition is in the 1951 Refugee Convention. On this site the count is the granted column of initial-decision tables, plus appeal allows.",
    source: "Asy_D02; 1951 Refugee Convention",
  },
  'returned': {
    body: "A person who has left the UK following enforcement action (enforced return) or under a voluntary departure scheme. “Returned” does not equal “refused” — many refused claimants remain in the UK at any given snapshot.",
    source: "Ret_D02 · methodology",
  },
  'dispersal': {
    body: "The statutory mechanism by which destitute asylum seekers are housed across the UK while their claim is decided. Local authority placement is contracted, not chosen — the geography of dispersal is uneven.",
    source: "Asy_D11 · Section 95 / 98 / 4 · methodology",
  },
  'inadmissible': {
    body: "A claim closed without a substantive decision because the applicant could have claimed in another safe country, or has links to one. Inadmissible claims do not generate a grant or a refusal.",
    source: "Asy_D03 · methodology",
  },
  'illegal entry': {
    body: "A statistical category covering people who entered the UK without authorisation, including small-boat arrivals, lorry stowaways, and other clandestine routes. Not all enter the asylum system; not everyone claiming asylum entered illegally.",
    source: "Irr_01 · methodology",
  },
};
