import type { Chain } from "viem/chains";

/** Ask MetaMask / injected wallet to switch or add an EVM chain. */
export async function switchOrAddEthereumChain(ethereum: { request: (args: unknown) => Promise<unknown> }, chain: Chain): Promise<boolean> {
  const chainIdHex = `0x${chain.id.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code !== 4902) return false;
    const explorer = chain.blockExplorers?.default?.url;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [...chain.rpcUrls.default.http],
          blockExplorerUrls: explorer ? [explorer] : [],
        },
      ],
    });
    return true;
  }
}
