import { Price, Token } from '@uniswap/sdk-core';
import { priceToClosestTick, tickToPrice, nearestUsableTick } from '@uniswap/v3-sdk';

export function getTickFromPrice(
  priceStr: string,
  token0: Token,
  token1: Token,
  tickSpacing: number
): number {
  try {
    const val = parseFloat(priceStr);
    if (isNaN(val) || val === 0) return 0;

    // Parse string to numerator/denominator to avoid float precision issues
    const [whole, fraction = ''] = priceStr.split('.');
    const power = fraction.length;
    const numeratorInt = BigInt(whole + fraction);
    const denominatorInt = BigInt(10) ** BigInt(power);
    
    // Adjust for decimals:
    // Price object expects raw amounts.
    // If we have 1 unit of Token0 (10^dec0), we want X units of Token1 (X * 10^dec1).
    // The user input 'priceStr' is the number of Token1 per 1 Token0.
    // So: 1 * 10^dec0 (Token0) -> priceStr * 10^dec1 (Token1)
    // Numerator (Token1 amount) = numeratorInt * 10^dec1
    // Denominator (Token0 amount) = denominatorInt * 10^dec0
    
    const numerator = numeratorInt * (BigInt(10) ** BigInt(token1.decimals));
    const denominator = denominatorInt * (BigInt(10) ** BigInt(token0.decimals));
    
    const price = new Price(token0, token1, denominator.toString(), numerator.toString());
    
    const tick = priceToClosestTick(price);
    return nearestUsableTick(tick, tickSpacing);
    
  } catch (e) {
    console.error('Error calculating tick:', e);
    return 0;
  }
}

export function getPriceFromTick(
  tick: number,
  token0: Token,
  token1: Token
): string {
  try {
    const price = tickToPrice(token0, token1, tick);
    return price.toSignificant(6);
  } catch (e) {
    console.error('Error calculating price from tick:', e);
    return '0';
  }
}
