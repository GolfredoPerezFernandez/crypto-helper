import { parseEther, formatEther, parseUnits, formatUnits, isAddress, getAddress } from 'viem';

// ================================
// CONSTANTS & TYPES
// ================================

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface NetworkConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface ContractAddresses {
  realEstateMarketplace: `0x${string}`;
  propertyNft: `0x${string}`;
  powerTransferMarketplace: `0x${string}`;
  propertyRentalManager: `0x${string}`;
  knrtToken?: `0x${string}`;  // Optional ERC20 token for payments
}

// ================================
// NETWORK CONFIGURATION
// ================================

export const BASE_MAINNET: NetworkConfig = {
  id: 8453,
  name: 'Base',
  rpcUrl: 'https://site1.moralis-nodes.com/base/5107f5253d394715bf6e3c835dddf084',
  explorerUrl: 'https://basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
};

export const BASE_SEPOLIA: NetworkConfig = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
};

// Get network config from environment
export function getNetworkConfig(): NetworkConfig {
  const chainId = parseInt(import.meta.env.PUBLIC_CHAIN_ID || '8453');
  
  switch (chainId) {
    case 8453:
      return BASE_MAINNET;
    case 84532:
      return BASE_SEPOLIA;
    default:
      return BASE_MAINNET; // fallback to mainnet
  }
}

// ================================
// CONTRACT ADDRESSES
// ================================

export function getContractAddresses(): ContractAddresses {
  return {
    realEstateMarketplace: (import.meta.env.PUBLIC_REALESTATE_MARKETPLACE_ADDRESS || ZERO_ADDRESS) as `0x${string}`,
    propertyNft: (import.meta.env.PUBLIC_PROPERTY_NFT_ADDRESS || ZERO_ADDRESS) as `0x${string}`,
    powerTransferMarketplace: (import.meta.env.PUBLIC_POWER_TRANSFER_MARKETPLACE_ADDRESS || ZERO_ADDRESS) as `0x${string}`,
    propertyRentalManager: (import.meta.env.PUBLIC_PROPERTY_RENTAL_MANAGER_ADDRESS || ZERO_ADDRESS) as `0x${string}`,
    knrtToken: import.meta.env.PUBLIC_KNRT_TOKEN_ADDRESS as `0x${string}` | undefined,
  };
}

// ================================
// ADDRESS UTILITIES
// ================================

/**
 * Validates if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Returns checksummed address or throws error
 */
export function getChecksumAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return getAddress(address);
}

/**
 * Shortens an address for display (0x1234...5678)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!isValidAddress(address)) return address;
  const checksummed = getAddress(address);
  return `${checksummed.slice(0, chars + 2)}...${checksummed.slice(-chars)}`;
}

/**
 * Compares two addresses (case insensitive)
 */
export function addressesEqual(a: string, b: string): boolean {
  if (!isValidAddress(a) || !isValidAddress(b)) return false;
  return getAddress(a) === getAddress(b);
}

// ================================
// TOKEN/ETH FORMATTING
// ================================

/**
 * Format Wei to ETH string
 */
export function formatEthValue(value: bigint | string | number, decimals = 4): string {
  try {
    const formatted = formatEther(BigInt(value));
    const num = parseFloat(formatted);
    return num.toFixed(decimals);
  } catch (error) {
    console.error('Error formatting ETH value:', error);
    return '0.0000';
  }
}

/**
 * Parse ETH string to Wei
 */
export function parseEthValue(value: string): bigint {
  try {
    return parseEther(value);
  } catch (error) {
    console.error('Error parsing ETH value:', error);
    return BigInt(0);
  }
}

/**
 * Format tokens with custom decimals
 */
export function formatTokenValue(
  value: bigint | string | number, 
  decimals: number, 
  displayDecimals = 2
): string {
  try {
    const formatted = formatUnits(BigInt(value), decimals);
    const num = parseFloat(formatted);
    return num.toFixed(displayDecimals);
  } catch (error) {
    console.error('Error formatting token value:', error);
    return '0.00';
  }
}

/**
 * Parse token string to units
 */
export function parseTokenValue(value: string, decimals: number): bigint {
  try {
    return parseUnits(value, decimals);
  } catch (error) {
    console.error('Error parsing token value:', error);
    return BigInt(0);
  }
}

// ================================
// GAS UTILITIES
// ================================

/**
 * Get default gas settings from environment
 */
export function getDefaultGasSettings() {
  return {
    gasLimit: BigInt(import.meta.env.PUBLIC_DEFAULT_GAS_LIMIT || '500000'),
    gasPrice: BigInt(import.meta.env.PUBLIC_DEFAULT_GAS_PRICE || '1000000000'), // 1 gwei
  };
}

/**
 * Format gas price to Gwei
 */
export function formatGasPrice(gasPrice: bigint): string {
  return formatUnits(gasPrice, 9); // 9 decimals for Gwei
}

/**
 * Calculate transaction cost
 */
export function calculateTxCost(gasUsed: bigint, gasPrice: bigint): string {
  const cost = gasUsed * gasPrice;
  return formatEther(cost);
}

// ================================
// TRANSACTION UTILITIES
// ================================

/**
 * Generate explorer URL for transaction
 */
export function getTxUrl(txHash: string): string {
  const network = getNetworkConfig();
  return `${network.explorerUrl}/tx/${txHash}`;
}

/**
 * Generate explorer URL for address
 */
export function getAddressUrl(address: string): string {
  const network = getNetworkConfig();
  return `${network.explorerUrl}/address/${address}`;
}

/**
 * Generate explorer URL for token
 */
export function getTokenUrl(tokenAddress: string, tokenId?: string | number): string {
  const network = getNetworkConfig();
  const baseUrl = `${network.explorerUrl}/token/${tokenAddress}`;
  return tokenId ? `${baseUrl}?a=${tokenId}` : baseUrl;
}

// ================================
// TIME UTILITIES
// ================================

/**
 * Convert Unix timestamp to readable date
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Get time remaining from timestamp
 */
export function getTimeRemaining(timestamp: number | bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const target = Number(timestamp);
  const diff = target - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ================================
// ERROR HANDLING
// ================================

/**
 * Parse common contract errors
 */
export function parseContractError(error: any): string {
  if (!error) return 'Unknown error';

  const message = error.message || error.toString();

  // Common error patterns
  if (message.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }
  if (message.includes('user rejected')) {
    return 'Transaction rejected by user';
  }
  if (message.includes('nonce too low')) {
    return 'Transaction nonce too low, please try again';
  }
  if (message.includes('gas')) {
    return 'Gas estimation failed, please try with higher gas limit';
  }
  if (message.includes('revert')) {
    // Try to extract revert reason
    const revertMatch = message.match(/revert (.+)/);
    if (revertMatch) {
      return `Transaction reverted: ${revertMatch[1]}`;
    }
    return 'Transaction reverted';
  }

  return message.length > 100 ? message.substring(0, 100) + '...' : message;
}

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate contract address from environment
 */
export function validateContractAddress(address: string, contractName: string): void {
  if (!address || address === ZERO_ADDRESS) {
    throw new Error(`${contractName} contract address not configured`);
  }
  if (!isValidAddress(address)) {
    throw new Error(`Invalid ${contractName} contract address: ${address}`);
  }
}

/**
 * Validate all contract addresses
 */
export function validateContractAddresses(): void {
  const addresses = getContractAddresses();
  
  validateContractAddress(addresses.realEstateMarketplace, 'RealEstateMarketplace');
  validateContractAddress(addresses.propertyNft, 'PropertyNFT');
  validateContractAddress(addresses.powerTransferMarketplace, 'PowerTransferMarketplace');
  validateContractAddress(addresses.propertyRentalManager, 'PropertyRentalManager');
  
  if (addresses.knrtToken) {
    validateContractAddress(addresses.knrtToken, 'KNRTToken');
  }
}

// ================================
// FORMATTING UTILITIES
// ================================

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
  return (value * 100).toFixed(decimals) + '%';
}
