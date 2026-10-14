export type GameId = 'vc' | 'crypto' | 'collect' | 'hedge' | 'pe';

export const GAME_ORDER: GameId[] = ['vc', 'crypto', 'collect', 'hedge', 'pe'];
export const MAX_PER_GAME = 500;
export const MAX_TOTAL = MAX_PER_GAME * GAME_ORDER.length;

export interface HowToItem {
  keys?: string[];
  text: string;
}

export interface GameMeta {
  id: GameId;
  number: string;
  investment: string;
  title: string;
  category: string;
  inspiration: string;
  objective: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  intro: string;
  howTo: HowToItem[];
  goal: string;
  award: string;
  learned: [string, string, string];
  takeaway: string;
}

export const GAMES: Record<GameId, GameMeta> = {
  vc: {
    id: 'vc',
    number: '01',
    investment: 'Venture Capital',
    title: 'STARTUP RUN',
    category: 'Platformer',
    inspiration: 'Inspired by classic side-scrolling platformers',
    objective: 'Guide a startup from garage idea to exit.',
    accent: '#F29A38',
    accentSoft: '#FDF0E1',
    accentDeep: '#B8641A',
    intro:
      'Venture capital is money invested into young businesses with high growth potential, in exchange for part-ownership. Help one startup travel from an idea to a possible exit.',
    howTo: [
      { keys: ['←', '→'], text: 'Move (A / D also work). Keep holding to break into a run.' },
      { keys: ['SPACE'], text: 'Jump (W / ↑ also work). Hold for a higher jump.' },
      { text: 'Stomp hazards from above, collect milestones, choose smart startups, reach the EXIT tower.' },
    ],
    goal: 'Reach the EXIT tower before your runway (the timer) runs out.',
    award: 'STARTUP SCOUT',
    learned: [
      'Venture capital funds young startups with high growth potential, in exchange for ownership.',
      'Investors hope a few big successes — through an acquisition or a public listing — make up for the startups that fail.',
      'Many startups fail, and it can take years before investors can sell their stake, if ever.',
    ],
    takeaway:
      'Venture capital finances high-growth startups. It offers potential upside, but investors may lose their money, and investments can take years to return anything.',
  },
  crypto: {
    id: 'crypto',
    number: '02',
    investment: 'Cryptocurrency',
    title: 'CRYPTO SLICE',
    category: 'Slice Arcade',
    inspiration: 'Inspired by swipe-to-slice arcade games',
    objective: 'Slice real coins, dodge the scams.',
    accent: '#F4C542',
    accentSoft: '#FDF6DC',
    accentDeep: '#A9821A',
    intro:
      'Cryptocurrencies are digital assets recorded on blockchain networks. Their prices can swing wildly — and scams often hide behind big promises.',
    howTo: [
      { keys: ['HOLD + SWIPE'], text: 'Hold the mouse button (or touch the screen) and swipe across tokens to slice them.' },
      { text: 'Slice BTC and ETH tokens. Swipe through several in one stroke for a combo.' },
      { text: 'Do NOT slice tokens that promise guaranteed profits. Let "?" mystery tokens pass.' },
    ],
    goal: 'Spot warning signs fast — accuracy matters as much as speed.',
    award: 'BLOCKCHAIN DETECTIVE',
    learned: [
      'Cryptocurrencies are digital assets that run on blockchain networks — shared records many computers verify.',
      'Some people buy them hoping prices rise, but prices can also fall sharply and quickly.',
      'Promises of guaranteed returns are a classic scam warning sign. Even genuine cryptocurrencies can lose value.',
    ],
    takeaway:
      'Cryptocurrency is a high-risk digital asset class. Recognizing a real project is different from knowing whether its price is a good investment.',
  },
  collect: {
    id: 'collect',
    number: '03',
    investment: 'Collectibles',
    title: 'PRICE HUNTER',
    category: 'Price Guessing',
    inspiration: 'Inspired by classic price-guessing game shows',
    objective: 'Guess what rare collectibles are worth.',
    accent: '#9369D0',
    accentSoft: '#F1EBFA',
    accentDeep: '#6440A3',
    intro:
      'Collectibles are objects people buy for their rarity, history, condition or appeal — watches, coins, cards, memorabilia. A collectible is only worth what someone will pay for it.',
    howTo: [
      { keys: ['DRAG'], text: 'Drag the price slider, or type an exact amount in rupees.' },
      { keys: ['ENTER'], text: 'Lock in your guess before the timer runs out.' },
      { text: 'The closer your guess, the more points — up to 100 per lot, across 5 lots.' },
    ],
    goal: 'Read the clues — rarity, condition, age and proof — to value each lot.',
    award: 'VALUE HUNTER',
    learned: [
      'Collectibles are items bought for their rarity, history, condition or appeal.',
      'Collectors hope demand grows over time, so an item can later be sold for more.',
      'Values are subjective, fakes exist, and collectibles can be hard to sell quickly.',
    ],
    takeaway:
      'Collectibles are physical or digital objects bought for their rarity, history, condition, or appeal. Their valuations can be subjective and resale can be difficult.',
  },
  hedge: {
    id: 'hedge',
    number: '04',
    investment: 'Hedge Funds',
    title: 'HEDGE DEFENSE',
    category: 'Lane Defense',
    inspiration: 'Inspired by lane-based strategy defense games',
    objective: 'Protect a portfolio from market swings.',
    accent: '#6DBD81',
    accentSoft: '#E8F5EB',
    accentDeep: '#3C8A50',
    intro:
      "A hedge fund pools investors' money and uses strategies that can gain when prices rise — or when they fall. Your job: put the right strategy in front of each market event.",
    howTo: [
      { keys: ['DRAG'], text: 'Drag a strategy tile onto the lane where a market event is heading (or press 1–4, then click a square).' },
      { text: 'RALLY ↑ → a LONG tile gains.  DOWNTURN ↓ → a SHORT tile gains.  CRASH → DIVERSIFY softens it.' },
      { text: 'Every tile also has a downside. Keep the portfolio value above 30 for three waves.' },
    ],
    goal: 'Survive three waves of market events with as much portfolio value as possible.',
    award: 'RISK MANAGER',
    learned: [
      'Hedge funds pool money and use many strategies, including long and short positions.',
      'Managers try to profit in rising and falling markets, and to limit their losses.',
      'Strategies can backfire: short positions can lose heavily, and fees and leverage add risk.',
    ],
    takeaway:
      'Hedge funds use sophisticated strategies, but they are not automatically safer investments. Fees, leverage, strategy complexity, and losses are important risks.',
  },
  pe: {
    id: 'pe',
    number: '05',
    investment: 'Private Equity',
    title: 'BUY, BUILD, EXIT',
    category: 'Block Puzzle',
    inspiration: 'Inspired by classic falling-block puzzles',
    objective: 'Buy a company, improve it, then sell it.',
    accent: '#5D91E5',
    accentSoft: '#E6EEFB',
    accentDeep: '#3463B0',
    intro:
      'Private equity investors buy established private companies, try to improve them over several years, then sell. Unlike venture capital, it usually backs mature businesses rather than young startups.',
    howTo: [
      { keys: ['←', '→'], text: 'Move the falling upgrade block.' },
      { keys: ['↑'], text: 'Rotate.  ↓ soft drop,  SPACE hard drop.' },
      { keys: ['B'], text: 'Accept a borrowing offer (optional).   P pauses.' },
    ],
    goal: 'Complete rows to improve the company, keep debt manageable, and reach the exit.',
    award: 'BUSINESS BUILDER',
    learned: [
      'Private equity buys and improves established private businesses.',
      'Investors hope to sell the improved business later for more than they paid.',
      'Too much debt, rising costs or a weak market can turn the exit into a loss.',
    ],
    takeaway:
      'Private equity invests in private businesses and often seeks to improve their value over time. These investments can be illiquid, expensive, risky, and difficult to exit.',
  },
};

export const nextUnplayed = (best: Partial<Record<GameId, number>>, current?: GameId): GameId | null => {
  const start = current ? GAME_ORDER.indexOf(current) : -1;
  for (let i = 1; i <= GAME_ORDER.length; i++) {
    const id = GAME_ORDER[(start + i + GAME_ORDER.length) % GAME_ORDER.length];
    if (id !== current && best[id] === undefined) return id;
  }
  return null;
};
