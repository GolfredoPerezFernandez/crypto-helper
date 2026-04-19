// Interface básica de ERC20 con los métodos requeridos
export const ERC20Abi = [
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  }
];

// ABI con los métodos del contrato RentalNFT que necesitamos
export const KNRT_NFT_ABI = [
  // ERC721
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Custom methods from RentalNFT.sol
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserOwnedNow", 
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllTokenIds",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserUnlistedOwned",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Sales Market ABI con los métodos que necesitamos
export const SALE_MARKET_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserSaleListed",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Rental Market ABI con los métodos que necesitamos
export const RENTAL_MARKET_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserRentalListed",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Power Market ABI con los métodos que necesitamos
export const POWER_MARKET_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserPowerListed",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];