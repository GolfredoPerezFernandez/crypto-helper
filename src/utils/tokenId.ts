/**
 * Utilidades para generar y manejar IDs de tokens NFT
 */

/**
 * Genera un ID único para un token NFT
 * Utiliza timestamp actual + número aleatorio para mayor unicidad
 * @returns string - ID único como string (para usar con BigInt en contratos)
 */
export function generateUniqueTokenId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${timestamp}${random}`;
}

/**
 * Valida que un tokenId sea válido para usar en contratos
 * @param tokenId - ID del token a validar
 * @returns boolean - true si es válido
 */
export function isValidTokenId(tokenId: string): boolean {
  try {
    const num = BigInt(tokenId);
    return num > 0n;
  } catch {
    return false;
  }
}

/**
 * Convierte un tokenId a formato BigInt para contratos
 * @param tokenId - ID del token como string o number
 * @returns string - Formato para usar con ethers
 */
export function formatTokenIdForContract(tokenId: string | number): string {
  return BigInt(tokenId).toString();
}

/**
 * Extrae tokenId de eventos de Transfer del contrato NFT
 * Útil para obtener el tokenId después de un mint
 * @param receipt - Receipt de la transacción
 * @param nftContractAddress - Dirección del contrato NFT
 * @returns string | null - TokenId extraído o null si no se encuentra
 */
export function extractTokenIdFromTransferEvent(
  receipt: any, 
  nftContractAddress: string
): string | null {
  try {
    // Buscar eventos Transfer del contrato NFT
    const transferEvents = receipt.logs?.filter((log: any) => 
      log.address.toLowerCase() === nftContractAddress.toLowerCase() &&
      log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    );

    if (transferEvents && transferEvents.length > 0) {
      // El tokenId está en el tercer topic (índice 2)
      const tokenIdHex = transferEvents[0].topics[2];
      return BigInt(tokenIdHex).toString();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting tokenId from transfer event:', error);
    return null;
  }
}