// Design tokens: spec.md §16, DESIGN.md. Components use these roles, never raw hex.

export const colors = {
  primary: '#2350D9',
  primaryStrong: '#16348F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DBE4FF',
  onPrimaryContainer: '#0E2266',
  background: '#EEF2FF', // "Mist", the page ground
  surface: '#FFFFFF',
  surfaceTint: '#E6ECFF',
  ink: '#10183A',
  inkSoft: '#46507A',
  inkMuted: '#5C668C',
  hairline: '#D9E0F7',
  scrim: 'rgba(10,20,60,0.42)',
  dialScrim: 'rgba(14,24,44,0.78)', // navy, behind the + speed dial (phase1 B3 mockup)
  rings: '#CAD5F8', // primary mixed 18% into the ground
  // Web (spec §18.3, design/web.html): table heads and the dashed paste box, the WhatsApp sender name on the front page
  surfaceSoft: '#F7F9FF',
  dashed: '#B9C6EE',
  chatName: '#1F8A5B',
  // Fixed verdict colours (never decorative)
  good: '#17703E',
  goodWash: '#DDF2E4',
  okayish: '#845300',
  okayishWash: '#FBEFD2',
  bad: '#A8301F',
  badWash: '#FADFDB',
  // Import (D8): the original message bubble and the amber "Please check this" outline (phase2 mockup)
  quote: '#E5F5DA',
  onQuote: '#1F2D1A',
  check: '#E2A417',
  // Map
  mapLand: '#EEF1FB',
  mapWater: '#BCCBF5',
  mapPark: '#D3EBD6',
  mapRoad: '#FFFFFF',
  mapRoadEdge: '#D8DEF0',
} as const;

// Initials-avatar tints (DESIGN.md "Avatars and Source Marks")
export const avatarTints = ['#CB4A27', '#4D76B0', '#567F43', '#A05F8E', '#9A6B16'] as const;

export const radii = {
  chip: 10,
  thumb: 14,
  field: 16,
  fab: 18,
  card: 20,
  panel: 24,
  surface: 26,
  sheet: 28,
  hero: 30,
  pill: 999,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 14,
  gutter: 18,
  sheet: 22,
} as const;

export const size = {
  touch: 48,
  button: 52,
  buttonSmall: 40,
  field: 54,
  chip: 34,
  pill: 26,
  avatar: 40,
  topBar: 56,
  navBar: 78,
  navAdd: 52,
  dialCircle: 62,
} as const;

// CSS box-shadow strings (React Native New Architecture supports `boxShadow`).
export const shadows = {
  card: '0px 1px 2px rgba(20,30,50,0.05), 0px 6px 18px -12px rgba(20,30,50,0.22)',
  iconButton: '0px 1px 2px rgba(20,30,50,0.08)',
  panel: '0px 10px 30px -18px rgba(20,30,50,0.4)',
  search: '0px 1px 2px rgba(20,30,50,0.06), 0px 8px 20px -14px rgba(20,30,50,0.3)',
  sheet: '0px -10px 30px -10px rgba(10,20,40,0.25)',
  addButton: '0px 6px 14px -6px #2350D9',
  pin: '0px 4px 12px -4px rgba(10,20,40,0.35)',
  dialCircle: '0px 10px 24px -8px rgba(0,0,0,0.45)',
  dialLabel: '0px 6px 14px -8px rgba(0,0,0,0.5)',
  segment: '0px 1px 3px rgba(20,30,50,0.12)',
} as const;

// Inset strokes (so shapes never shift on state change)
export const strokes = {
  hairline: `inset 0px 0px 0px 1px ${colors.hairline}`,
  field: `inset 0px 0px 0px 1.5px ${colors.hairline}`,
  focus: `inset 0px 0px 0px 2px ${colors.primary}`,
  error: `inset 0px 0px 0px 2px ${colors.bad}`,
} as const;
