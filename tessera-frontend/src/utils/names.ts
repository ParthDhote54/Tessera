const ADJECTIVES = [
  'Indigo', 'Amber', 'Violet', 'Copper', 'Sky', 'Teal',
  'Crimson', 'Jade', 'Lunar', 'Solar', 'Onyx', 'Ivory',
  'Azure', 'Coral', 'Slate', 'Mauve', 'Dusk', 'Dawn',
];

const NOUNS = [
  'Fox', 'Heron', 'Lynx', 'Otter', 'Falcon', 'Raven',
  'Wolf', 'Hawk', 'Crane', 'Viper', 'Mink', 'Eagle',
  'Drake', 'Swift', 'Kite', 'Ibis', 'Stag', 'Finch',
];

export function randomDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
