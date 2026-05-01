export const CONTRACT_ADDRESSES = {
  BASE: {
    LIQUIDITY_MANAGER: '0x38E26D5926Fd9cc12605C5B47587cC7479626778',
    SWAP_ROUTER_V3: '0x2626664c2603336E57B271c5C0b26F421741e481',
    QUOTER_V2: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
    SWAP_TOKEN_CONTRACT: '0x80384d77a9f85edf9e998C5Eb06E4a26d3770670',
    POOL_FACTORY_ADDRESS: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  }
};

export const TOKENS = {
  KNRT: {
    symbol: 'KNRT',
    name: 'Koolinart Token',
    address: import.meta.env.PUBLIC_KNRT_TOKEN_ADDRESS || '0x54de10fadf4ea2fbad10ebfc96979d0885dd36fa',
    decimals: 18,
    icon: '🔺'
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    icon: '🟣'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    icon: '💠'
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    icon: '🟡'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
    icon: '🟢'
  },
  cbETH: {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    decimals: 18,
    icon: '🔵'
  }
};
// Hardcoded admin wallets for override
export const ADMIN_WALLETS = [
  '0xf6657F7019E481204D26882D6b1BED1da1541896'
];

/** Synthetic emails for wallet-only accounts before the user adds a real address. */
const WALLET_PLACEHOLDER_EMAIL_SUFFIXES = [
  '@crypto-helper.internal',
  '@cryptohelper.internal',
  '@crypto-ghost.internal',
] as const;

export function isWalletPlaceholderEmail(email: string | undefined | null): boolean {
  if (email == null || String(email).trim() === '') return false;
  const e = String(email).toLowerCase().trim();
  return WALLET_PLACEHOLDER_EMAIL_SUFFIXES.some((suf) => e.endsWith(suf));
}
