// ─────────────────────────────────────────────────────────────
// "Numbers in the news" band — Index page.
//
// Hand-curated weekly. Edit this file each Monday to refresh the
// four figures that are being publicly argued about. Each entry is
// a number that has appeared in the BBC / Guardian / Times / GB News
// over the last week, paired with a one-line clarification grounded
// in the data globals.
//
// Schema:
//   updated  — ISO date the band was last refreshed (shown in the UI)
//   fallback — true if no claims trended this week and we're showing
//              evergreen denominators instead (changes the kicker)
//   items[]  — 3 to 4 entries
//     .kicker  — short topic label, all-caps in render
//     .number  — the figure to display, formatted as a string
//     .context — one-sentence clarification, ~25 words
//     .source  — source-code style: "Asy_D03 · 31 Dec 2025"
//     .route   — { name, id? } passed to setRoute() on click
// ─────────────────────────────────────────────────────────────
window.NEWS_BAND = {
  updated: '2026-04-26',
  fallback: false,
  items: [
    {
      kicker: 'Backlog',
      number: '48.7k',
      context: 'Cited as "halved since 2022" in this week’s coverage. Year-end snapshot only — interim peaks were higher; the cleared cases skewed easy.',
      source: 'Asy_D03 · 31 Dec 2025',
      route: { name: 'dashboard' },
      glossTerm: 'backlog',
    },
    {
      kicker: 'Per 1,000 residents',
      number: '≈1.2',
      context: 'UK asylum applications per 1,000 residents in 2025. Roughly half the EU peer-group average; below France, well below Germany.',
      source: 'Asy_D01 · ONS pop · 2025',
      route: { name: 'dashboard' },
      glossTerm: 'main applicants',
    },
    {
      kicker: 'Top nationality grant rate',
      number: '≉86%',
      context: 'Eritrean claims are still granted at very high rates; Pakistani claims, second by volume in 2025, are granted at well under half that.',
      source: 'Asy_D02 · 2025',
      route: { name: 'dashboard' },
      glossTerm: 'grant rate',
    },
    {
      kicker: 'Channel · this week',
      number: '941',
      context: 'Migrants on the latest weekly ODS — down 28% on the same week in 2025 but up against the five-year average.',
      source: 'SB_01 · wk ending 19 Apr',
      route: { name: 'dashboard' },
      glossTerm: 'small-boat arrivals',
    },
  ],
};
