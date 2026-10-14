/**
 * Educational freeze-frame content. Short, plain-language, and careful:
 * no promised returns, no "safe" investments, no recommendations.
 */
export type EduVisual =
  | 'ownership'
  | 'seed'
  | 'risk'
  | 'growth'
  | 'exit'
  | 'crypto'
  | 'chain'
  | 'scam'
  | 'mystery'
  | 'volatility'
  | 'collect'
  | 'proof'
  | 'long'
  | 'short'
  | 'hedge'
  | 'pe'
  | 'value'
  | 'debt';

export interface EduContent {
  title: string;
  body: string;
  /** Layer 2: ties the idea to what the player is doing right now. */
  context?: string;
  visual?: EduVisual;
}

export const EDU = {
  // ── Venture capital ──
  'vc-what': {
    title: 'WHAT IS VENTURE CAPITAL?',
    body: 'Venture capital is money invested into young businesses with high growth potential, in exchange for ownership.',
    context: "You're helping an early-stage business grow from a garage idea.",
    visual: 'ownership',
  },
  'vc-seed': {
    title: 'SEED FUNDING',
    body: 'Early investors help a startup build and test its first product.',
    context: 'Collect seed money to unlock the next part of the city.',
    visual: 'seed',
  },
  'vc-risk': {
    title: 'STARTUP RISK!',
    body: 'Many startups fail. Investors study the business because funding a good idea never guarantees success.',
    context: 'No customers, buggy products and cash burn are real startup dangers.',
    visual: 'risk',
  },
  'vc-growth': {
    title: 'GROWTH FUNDING',
    body: 'Successful startups may raise more funding to hire people, expand, and reach new markets.',
    context: 'The city gets bigger — and so do the challenges.',
    visual: 'growth',
  },
  'vc-exit': {
    title: 'EXIT REACHED!',
    body: 'Venture capital investors generally aim to earn returns when the startup is acquired, goes public, or otherwise provides an opportunity to sell their ownership.',
    context: 'Many real startups never reach an exit like this one.',
    visual: 'exit',
  },

  // ── Cryptocurrency ──
  'cr-what': {
    title: 'WHAT IS CRYPTOCURRENCY?',
    body: 'Cryptocurrencies are digital assets that use blockchain-based networks. Their prices can change dramatically.',
    context: 'BTC and ETH are established networks — slice them.',
    visual: 'crypto',
  },
  'cr-chain': {
    title: 'WHAT IS BLOCKCHAIN?',
    body: 'Think of it as a shared digital record that many computers help verify.',
    context: 'Established networks have been running publicly for years.',
    visual: 'chain',
  },
  'cr-scam': {
    title: 'WATCH FOR SCAMS!',
    body: 'Promises of guaranteed returns are a major warning sign. Even genuine cryptocurrencies can lose value.',
    context: 'This token promises guaranteed returns. That is a warning sign — do not slice it.',
    visual: 'scam',
  },
  'cr-mystery': {
    title: 'MYSTERY TOKEN',
    body: 'No team, no information, no track record? You cannot judge it in a split second.',
    context: 'Let "?" tokens pass. Not rushing in is the smart move.',
    visual: 'mystery',
  },
  'cr-vol': {
    title: 'VOLATILITY!',
    body: 'Crypto prices may rise or fall sharply. Popularity does not remove risk.',
    context: 'Final round: fast tokens and tricky look-alikes. Stay alert.',
    visual: 'volatility',
  },

  // ── Collectibles ──
  'co-what': {
    title: 'WHAT ARE COLLECTIBLES?',
    body: 'Objects bought for their rarity, history, condition or appeal. Their value depends on what other collectors will pay.',
    context: 'Study each clue — then guess the simulated value.',
    visual: 'collect',
  },
  'co-auth': {
    title: 'PROOF MATTERS',
    body: 'Fakes exist. Independent authentication and a clear ownership history (provenance) can affect both buyer confidence and value.',
    context: 'Two similar lots. Only one has reliable proof.',
    visual: 'proof',
  },

  // ── Hedge funds ──
  'hf-long': {
    title: 'GOING LONG',
    body: "A long position generally benefits if the asset's value rises.",
    context: 'Rally ahead! Long tiles capture gains from the green arrows.',
    visual: 'long',
  },
  'hf-short': {
    title: 'GOING SHORT',
    body: 'Some strategies seek to profit from falling prices, but they can produce serious losses if prices rise.',
    context: 'Downturn ahead! Your short position reacts differently from your long position.',
    visual: 'short',
  },
  'hf-why': {
    title: 'WHY HEDGE?',
    body: "Hedge funds pool investors' money and may use different investment strategies, including hedging, short selling, and leverage. They can still lose substantial amounts.",
    context: 'Mixed markets: no single tile works everywhere. Spread your strategies.',
    visual: 'hedge',
  },

  // ── Private equity ──
  'pe-what': {
    title: 'WHAT IS PRIVATE EQUITY?',
    body: 'Private equity involves investing in businesses that are not publicly traded, often with the aim of improving them and eventually selling the investment.',
    context: 'First, choose an established company to buy.',
    visual: 'pe',
  },
  'pe-value': {
    title: 'VALUE CREATION',
    body: 'Private equity investors may try to improve operations, expand the business, or strengthen its management.',
    context: 'Your operational improvements may increase business value.',
    visual: 'value',
  },
  'pe-debt': {
    title: 'DEBT MATTERS!',
    body: 'Borrowing can help finance an acquisition, but too much debt makes a business more vulnerable.',
    context: 'Borrowed money can increase both potential gains and losses.',
    visual: 'debt',
  },
} satisfies Record<string, EduContent>;

export type EduId = keyof typeof EDU;
