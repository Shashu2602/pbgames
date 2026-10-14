/**
 * PRICE HUNTER catalogue. Every item, person and value here is FICTIONAL.
 * Values are simulated game valuations in INR — not real market prices.
 */
export type Category = 'watch' | 'coin' | 'card' | 'comic' | 'sports' | 'sneakers' | 'toy' | 'historical';
export type Factor = 'RARITY' | 'CONDITION' | 'AUTHENTICITY' | 'DEMAND' | 'LIQUIDITY';
export type ArtId =
  | 'golden-chrono'
  | 'ocean-diver'
  | 'peacock-rupee'
  | 'double-strike'
  | 'thunder-lion'
  | 'captain-monsoon'
  | 'signed-bat'
  | 'neon-comet'
  | 'rocket-rex'
  | 'inverted-airmail'
  | 'brass-compass'
  | 'retro-cartridge';

export const CATEGORY_LABEL: Record<Category, string> = {
  watch: 'Rare watch',
  coin: 'Vintage coin',
  card: 'Trading card',
  comic: 'Comic book',
  sports: 'Signed sports memorabilia',
  sneakers: 'Limited-edition sneakers',
  toy: 'Vintage toy',
  historical: 'Historical collectible',
};

/** Slider ranges are per category and are never centred on any item's value. */
export const CATEGORY_RANGE: Record<Category, [number, number]> = {
  watch: [10_000, 50_00_000],
  coin: [500, 10_00_000],
  card: [500, 20_00_000],
  comic: [200, 10_00_000],
  sports: [2_000, 50_00_000],
  sneakers: [2_000, 5_00_000],
  toy: [500, 5_00_000],
  historical: [1_000, 50_00_000],
};

export const FACTOR_TEXT: Record<Factor, string> = {
  RARITY: 'Items produced in small quantities may attract collectors, but rarity alone does not guarantee demand.',
  CONDITION: 'Two identical objects can have very different values if one is damaged.',
  AUTHENTICITY: 'Provenance and independent authentication can affect both buyer confidence and value.',
  DEMAND: 'A rare object may still have little resale value if few collectors want it.',
  LIQUIDITY: 'Collectibles can be difficult to sell quickly at an expected price.',
};

export const FACTOR_CLUE: Record<Factor, string> = {
  RARITY: 'Clue: how many were made? Rarity can matter.',
  CONDITION: 'Clue: look closely — this item’s condition affects its value.',
  AUTHENTICITY: 'Clue: is there independent proof that it is genuine?',
  DEMAND: 'Clue: how many collectors actually want one?',
  LIQUIDITY: 'Clue: specialist items can be slow to sell.',
};

export interface Collectible {
  id: ArtId;
  name: string;
  category: Category;
  condition: string;
  rarity: string;
  age: string;
  production: string;
  notes: string[];
  /** Simulated reference value in INR (fictional). */
  value: number;
  factor: Factor;
  factorNote: string;
}

export const COLLECTIBLES: Collectible[] = [
  {
    id: 'golden-chrono',
    name: 'The Golden Chronograph',
    category: 'watch',
    condition: 'Excellent',
    rarity: '1 of 250',
    age: '40 years',
    production: 'Numbered limited run of 250',
    notes: ['Original box & papers', 'Recently serviced'],
    value: 6_80_000,
    factor: 'RARITY',
    factorNote: 'Only 250 were ever made — and watch collectors still look for them.',
  },
  {
    id: 'ocean-diver',
    name: 'Ocean Master 300 Diver',
    category: 'watch',
    condition: 'Good — visible scratches',
    rarity: '1 of 3,000',
    age: '28 years',
    production: 'Made for a diving club',
    notes: ['Worn bracelet', 'No original box'],
    value: 1_15_000,
    factor: 'CONDITION',
    factorNote: 'Scratches and a missing box pull this one’s value down.',
  },
  {
    id: 'peacock-rupee',
    name: 'Silver Peacock Rupee',
    category: 'coin',
    condition: 'Very fine',
    rarity: '2,000 struck',
    age: '75 years',
    production: 'Commemorative silver issue',
    notes: ['Sharp peacock details', 'Light toning'],
    value: 38_000,
    factor: 'DEMAND',
    factorNote: 'A popular design means many coin collectors want one.',
  },
  {
    id: 'double-strike',
    name: 'Double-Struck 5-Rupee Error',
    category: 'coin',
    condition: 'Uncirculated',
    rarity: 'Mint error — very few known',
    age: '22 years',
    production: 'Accidentally struck twice',
    notes: ['Certified by a grading service'],
    value: 14_500,
    factor: 'AUTHENTICITY',
    factorNote: 'Error coins are often faked, so independent certification matters a lot.',
  },
  {
    id: 'thunder-lion',
    name: 'Thunder Lion — First Edition Holo',
    category: 'card',
    condition: 'Mint — graded 9 / 10',
    rarity: '1 of 5,000 printed',
    age: '26 years',
    production: 'First print run of a fictional card game',
    notes: ['Sealed grading case', 'Holo foil intact'],
    value: 1_60_000,
    factor: 'CONDITION',
    factorNote: 'A graded, near-perfect card can be worth many times a scratched copy.',
  },
  {
    id: 'captain-monsoon',
    name: 'Captain Monsoon #1',
    category: 'comic',
    condition: 'Fine — minor spine wear',
    rarity: 'About 3,000 known copies',
    age: '52 years',
    production: 'First appearance of the hero',
    notes: ['Small cover crease', 'All pages intact'],
    value: 62_000,
    factor: 'DEMAND',
    factorNote: 'First appearances of popular characters are what many comic collectors want.',
  },
  {
    id: 'signed-bat',
    name: 'Signed Final-Century Cricket Bat',
    category: 'sports',
    condition: 'Match-used, good',
    rarity: 'One of a kind',
    age: '30 years',
    production: 'Used to score a final-match century (fictional player)',
    notes: ['Photo of the signing', 'Certificate of authenticity'],
    value: 4_20_000,
    factor: 'AUTHENTICITY',
    factorNote: 'Proof that the bat was really used and signed adds buyer confidence.',
  },
  {
    id: 'neon-comet',
    name: 'Neon Comet High-Tops',
    category: 'sneakers',
    condition: 'Deadstock — never worn',
    rarity: '1 of 500 pairs',
    age: '6 years',
    production: 'Limited collaboration release',
    notes: ['Original box', 'Popular size'],
    value: 42_000,
    factor: 'LIQUIDITY',
    factorNote: 'Sneaker prices follow trends — selling at a good price quickly is not guaranteed.',
  },
  {
    id: 'rocket-rex',
    name: 'Rocket Rex Tin Robot',
    category: 'toy',
    condition: 'Good — some paint loss',
    rarity: 'Rare, production unknown',
    age: '62 years',
    production: 'Wind-up tin toy',
    notes: ['Still walks when wound', 'No original box'],
    value: 24_000,
    factor: 'CONDITION',
    factorNote: 'Paint loss and a missing box mean a lower value than a perfect example.',
  },
  {
    id: 'inverted-airmail',
    name: 'Inverted Airmail Stamp',
    category: 'historical',
    condition: 'Fine — small thin spot',
    rarity: 'Printing error, few known',
    age: '85 years',
    production: 'Plane printed upside down',
    notes: ['Expert certificate', 'Hinged on the back'],
    value: 3_10_000,
    factor: 'RARITY',
    factorNote: 'A printing mistake made it rare — and experts confirmed it is genuine.',
  },
  {
    id: 'brass-compass',
    name: 'Captain’s Brass Compass',
    category: 'historical',
    condition: 'Working, polished',
    rarity: 'Few survive',
    age: '120 years',
    production: 'From a trading ship (fictional record)',
    notes: ['Mentioned in a ship log', 'Glass replaced once'],
    value: 85_000,
    factor: 'LIQUIDITY',
    factorNote: 'Few buyers specialise in ship instruments, so a sale could take a long time.',
  },
  {
    id: 'retro-cartridge',
    name: 'Sealed Retro Game Cartridge',
    category: 'toy',
    condition: 'Factory sealed — dented box corner',
    rarity: '1 of 10,000',
    age: '32 years',
    production: 'Launch-edition run',
    notes: ['Seal checked by an expert', 'Box corner dented'],
    value: 55_000,
    factor: 'DEMAND',
    factorNote: 'Nostalgia drives demand — players who grew up with it now collect it.',
  },
];

export interface AuthPair {
  item: ArtId;
  title: string;
  strong: string[];
  weak: string[];
  why: string;
}

export const AUTH_PAIRS: AuthPair[] = [
  {
    item: 'signed-bat',
    title: 'Two “signed” cricket bats',
    strong: ['Certificate from an independent authenticator', 'Photos from the signing event', 'Ownership history since 1996'],
    weak: ['Seller says “trust me, it’s real”', 'No paperwork or photos', 'Signature looks slightly different'],
    why: 'Independent checks and a clear ownership history are much more reliable than a seller’s promise.',
  },
  {
    item: 'golden-chrono',
    title: 'Two “Golden Chronographs”',
    strong: ['Serial number matches the maker’s records', 'Original box and papers', 'Inspected by a certified watchmaker'],
    weak: ['Serial number scratched off', 'Box is a “replacement”', 'Price is “too good to be true”'],
    why: 'Matching records and expert inspection are strong proof. A removed serial number is a big red flag.',
  },
  {
    item: 'thunder-lion',
    title: 'Two “Thunder Lion” holo cards',
    strong: ['Sealed in a grading case', 'Certificate number checks out on the grader’s database'],
    weak: ['Loose card, never graded', 'Seller refuses close-up photos', 'Colours look slightly off'],
    why: 'A verifiable grading certificate lets any buyer check the card is genuine.',
  },
];
