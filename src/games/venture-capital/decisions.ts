/** Quick investment decisions: evidence-backed startups vs. hype. Fictional companies. */
export interface StartupCard {
  name: string;
  pitch: string;
  lines: string[];
  color: string;
}

export interface StartupPair {
  good: StartupCard;
  hype: StartupCard;
  why: string;
  whyNot: string;
}

export const DECISIONS: StartupPair[] = [
  {
    good: {
      name: 'SolarSnack',
      pitch: 'Solar-powered snack machines for schools',
      lines: ['Working product in 12 schools', 'Customer orders grow every month'],
      color: '#F4C542',
    },
    hype: {
      name: 'MoonMint',
      pitch: '"The next billion-rupee company"',
      lines: ['Promises massive profits next year', 'No working product yet'],
      color: '#E3D7F2',
    },
    why: 'A working product and growing customer base are real evidence the idea works.',
    whyNot: 'Big promises without a working product are a red flag. Investors look for evidence.',
  },
  {
    good: {
      name: 'FarmLink',
      pitch: 'Connects farmers to local shops',
      lines: ['Founders worked in farming for 8 years', 'Clear plan for how the money will be spent'],
      color: '#6DBD81',
    },
    hype: {
      name: 'HypeLoop',
      pitch: '"Trust us, it will be huge"',
      lines: ['No plan for how money will be spent', '"We\'ll figure out customers later"'],
      color: '#F5D3D0',
    },
    why: 'Experienced founders with a clear plan are easier to trust with investors\' money.',
    whyNot: 'Without a plan, investors cannot tell how their money will help the business grow.',
  },
  {
    good: {
      name: 'TutorBee',
      pitch: 'Online tutoring for exam prep',
      lines: ['Most students return every month', 'Spending kept under control'],
      color: '#5D91E5',
    },
    hype: {
      name: 'GlitterGram',
      pitch: 'Viral photo-filter app',
      lines: ['Spends ₹10 to earn every ₹1', 'Most users leave after one day'],
      color: '#F6D7B8',
    },
    why: 'Loyal customers and careful spending give a startup a longer runway.',
    whyNot: 'Spending far more than you earn burns cash fast — a common reason startups fail.',
  },
  {
    good: {
      name: 'MediMap',
      pitch: 'Finds the nearest open clinic',
      lines: ['Solves a real problem people pay for', 'Small but steadily growing'],
      color: '#9369D0',
    },
    hype: {
      name: 'CopyCatz',
      pitch: 'A copy of a popular app',
      lines: ['Same features as a big competitor', 'Lots of hype, very few users'],
      color: '#D3E5F7',
    },
    why: 'Solving a real problem that people will pay for is the foundation of a business.',
    whyNot: 'Copying an existing app with no edge makes it hard to win customers.',
  },
  {
    good: {
      name: 'CleanCart',
      pitch: 'Refill-store delivery service',
      lines: ['Honest about its risks', 'Tested with 300 real users'],
      color: '#CDEBD8',
    },
    hype: {
      name: 'ZeroRisk.AI',
      pitch: '"Guaranteed success"',
      lines: ['Claims there is "zero risk"', 'Refuses to share any numbers'],
      color: '#F8E7B0',
    },
    why: 'Being open about risks and testing with real users builds trust.',
    whyNot: 'No startup is risk-free. Claims of "zero risk" and hidden numbers are warning signs.',
  },
  {
    good: {
      name: 'BuildBot',
      pitch: 'Robots that help on building sites',
      lines: ['Team with engineering and sales skills', 'First paying customers signed'],
      color: '#F29A38',
    },
    hype: {
      name: 'StarBoost',
      pitch: 'Backed by a famous celebrity',
      lines: ['Only a celebrity endorsement', 'No real team behind the product'],
      color: '#E3D7F2',
    },
    why: 'A skilled team with paying customers shows the business can actually deliver.',
    whyNot: 'Fame is not a business plan. A strong team matters more than an endorsement.',
  },
];
