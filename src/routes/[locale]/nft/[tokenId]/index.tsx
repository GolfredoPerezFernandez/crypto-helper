import { component$, useSignal, useTask$, $, useComputed$, useVisibleTask$, useContext } from '@builder.io/qwik';
import { LeafletMap } from '~/components/leaflet-map';
import type { LocationsProps } from '~/models/location';
import { useLocation } from '@builder.io/qwik-city';
import {
  LuInfo,
  LuShoppingCart,
  LuCheck,
  LuAlertTriangle,
  LuExternalLink,
  LuCopy,
  LuDownload,
  LuEye,
  LuEyeOff,
  LuLoader,
  LuWallet,
} from '@qwikest/icons/lucide';
import { useMarketplaceContracts } from '~/hooks/useMarketplaceContracts';
import { DemoModeContext } from '~/contexts/demo';
import { inlineTranslate, useSpeak } from 'qwik-speak';

// ---------- Local UI types ----------
interface NftMetadataKV {
  trait_type: string;
  value: string | number | boolean;
}
interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<NftMetadataKV>;
  created_at?: string;
  [k: string]: any;
}

// ---------- Utils ----------
function safeString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return String(v);
  } catch {
    return '';
  }
}

/** Format KNRT (already human units) trimming trailing zeros */
function prettyAmount(knrtStr: string, maxDecimals = 6): string {
  if (!knrtStr) return '0';

  // Detect if it might be raw WEI (e.g., 10^18)
  // If no decimal point AND length > 12, it's very likely WEI
  if (!knrtStr.includes('.') && knrtStr.length > 12) {
    try {
      const len = knrtStr.length;
      if (len <= 18) {
        knrtStr = '0.' + '0'.repeat(18 - len) + knrtStr;
      } else {
        knrtStr = knrtStr.slice(0, len - 18) + '.' + knrtStr.slice(len - 18);
      }
    } catch (e) {
      // fallback
    }
  }

  const [w, f = ''] = knrtStr.split('.');
  let frac = f.slice(0, maxDecimals).replace(/0+$/, '');
  const whole = w.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${whole}.${frac}` : whole;
}

/** ipfs://CID[/path] -> https://CID.ipfs.<host>/<path> */
const STORACHA_GATEWAY_HOST =
  (import.meta as any).env?.PUBLIC_STORACHA_GATEWAY_HOST || 'storacha.link';
function ipfsToHttp(uri: string, host = STORACHA_GATEWAY_HOST) {
  if (!uri) return '';
  if (!uri.startsWith('ipfs://')) return uri;
  const without = uri.slice('ipfs://'.length);
  const [cid, ...rest] = without.split('/');
  if (!cid) return '';
  const path = rest.join('/');
  return path ? `https://${cid}.ipfs.${host}/${path}` : `https://${cid}.ipfs.${host}`;
}

// helpers for retry/backoff and throttling loads
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function retry<T>(fn: () => Promise<T>, attempts = 2, baseDelay = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (i < attempts) await sleep(baseDelay * (i + 1));
    }
  }
  throw lastErr;
}

// ===== PDF / QR / Basescan helpers =====
function getBasescanHostByChainId(chainId?: number | string | null): string {
  const id = Number(chainId || 0);
  if (id === 8453) return 'basescan.org';
  if (id === 84532) return 'sepolia.basescan.org';
  return 'basescan.org';
}
function buildBasescanNFTUrl(
  chainId: number | string | null | undefined,
  contract?: string,
  tokenId?: string,
) {
  if (!contract || !tokenId) return '';
  const host = getBasescanHostByChainId(chainId);
  return `https://${host}/nft/${contract}/${tokenId}`;
}
async function urlToDataURL(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
// ===== Duration conversion helpers =====
function durationToSeconds(amount: string, unit: 'hours' | 'days' | 'months'): number {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 0;
  switch (unit) {
    case 'hours': return num * 3600;
    case 'days': return num * 86400;
    case 'months': return num * 2592000; // 30 days
    default: return 0;
  }
}

function validateDuration(amount: string, unit: 'hours' | 'days' | 'months'): { valid: boolean; error: string } {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'nftDetails.messages.invalidAmount' };
  }
  const seconds = durationToSeconds(amount, unit);
  const minSeconds = 86400; // 24 hours
  if (seconds < minSeconds) {
    return { valid: false, error: 'nftDetails.messages.min24h' };
  }
  return { valid: true, error: '' };
}

function formatDuration(seconds: number | string, t: any): string {
  const sec = Number(seconds);
  if (isNaN(sec) || sec <= 0) return `0 ${t('nftDetails.units.seconds')}`;

  const months = Math.floor(sec / 2592000);
  const days = Math.floor((sec % 2592000) / 86400);
  const hours = Math.floor((sec % 86400) / 3600);

  const parts: string[] = [];
  if (months > 0)
    parts.push(`${months} ${t(months > 1 ? 'nftDetails.units.months' : 'nftDetails.units.month')}`);
  if (days > 0)
    parts.push(`${days} ${t(days > 1 ? 'nftDetails.units.days' : 'nftDetails.units.day')}`);
  if (hours > 0)
    parts.push(`${hours} ${t(hours > 1 ? 'nftDetails.units.hours' : 'nftDetails.units.hour')}`);

  return parts.length > 0
    ? parts.join(', ')
    : `${sec} ${t(sec > 1 ? 'nftDetails.units.seconds' : 'nftDetails.units.second')}`;
}

function attributesToRows(attrs: Array<NftMetadataKV>, t: any): Array<[string, string]> {
  return (attrs || []).map((a) => {
    const rawTrait = safeString(a.trait_type);
    const cleanKey = rawTrait.split(' (')[0].replace(/\s+/g, '');
    const translatedTrait = t(`nftDetails.attributes.${cleanKey}`, {}, rawTrait);
    return [translatedTrait, safeString((a as any).value)];
  });
}

// ===== MAP VIEW HELPERS =====
type MapGridSelectedCell = { id: string };

function parseMapFromMetadata(md: any) {
  const attrs: Array<{ trait_type?: string; value?: any }> = Array.isArray(md?.attributes)
    ? md.attributes
    : [];

  const mg = md?.mapGrid;
  let rows = Number(mg?.rows || 0);
  let cols = Number(mg?.cols || 0);
  const selectedSet = new Set<string>();

  // Prefer the direct structure: metadata.mapGrid.cells
  if (Array.isArray(mg?.cells)) {
    mg.cells.forEach((c: any) => {
      if (c && typeof c.id === 'string' && c.status === 'available') {
        selectedSet.add(c.id);
      }
    });
  }

  // Fallback: trait "Grid Definition" with format "RxC" (e.g. "10x12")
  const gridDefAttr = attrs.find((a) => a?.trait_type === 'Grid Definition');
  if ((!rows || !cols) && gridDefAttr?.value) {
    const [r, c] = String(gridDefAttr.value).split('x').map((n) => Number(n));
    if (r && c) {
      rows = r;
      cols = c;
    }
  }

  // Fallback: trait "Available Cell IDs" as "R1C1,R1C2,..."
  const availIdsAttr = attrs.find((a) => a?.trait_type === 'Available Cell IDs');
  if (availIdsAttr?.value) {
    const ids = String(availIdsAttr.value).split(',').map((s) => s.trim());
    ids.forEach((id) => id && selectedSet.add(id));
  }

  return { rows, cols, selectedSet };
}

export default component$(() => {
  useSpeak({ runtimeAssets: ['nftDetails'] });
  const t = inlineTranslate();
  const location = useLocation();
  const tokenIdStr = location.params.tokenId || '';
  const demoMode = useContext(DemoModeContext);

  // Contracts hook (viem) - MUST BE DECLARED BEFORE TASKS
  const marketplaceHook = useMarketplaceContracts();
  const { contracts, actions, connect, isConnected, userAddress, chainId, error } = marketplaceHook;

  // ---------- STATE ----------
  const isDemoNft = useSignal(tokenIdStr.startsWith('DEMO-') || demoMode.enabled.value);
  const demoLoadError = useSignal<string>('');

  // NFT
  const nftExists = useSignal<boolean>(false);
  const nftOwner = useSignal<string>('');
  const nftError = useSignal<string>('');
  const isMinting = useSignal<boolean>(tokenIdStr === 'PENDING');
  const metadataLoading = useSignal<boolean>(tokenIdStr.startsWith('DEMO-') || tokenIdStr === 'PENDING');

  // tokenURI & metadata (raw/pretty)
  const tokenUriRaw = useSignal<string>('');
  const tokenUriHttp = useSignal<string>('');
  const metadataJsonRaw = useSignal<NftMetadata | null>(null);
  const metadataText = useSignal<string>('');
  const imageUrl = useSignal<string>('');

  // Main UI
  const nftName = useSignal<string>('');
  const nftDescription = useSignal<string>('No description.');
  const nftAttributes = useSignal<Array<NftMetadataKV>>([]);

  // Metadata visibility
  const metadataIsPublic = useSignal<boolean | null>(null); // null = loading, true/false = actual state
  const metadataVisibilityLoading = useSignal<boolean>(false);

  // NEW: metadata access state (owner / renter with access)
  const hasMetaAccess = useSignal<boolean | null>(null);

  const pdfKeys = {
    tech: t('nftDetails.info.pdf.tech'),
    tokenId: t('nftDetails.info.pdf.tokenId'),
    contract: t('nftDetails.info.pdf.contract'),
    chainId: t('nftDetails.info.pdf.chainId'),
    techUri: t('nftDetails.info.pdf.techUri'),
    gateway: t('nftDetails.info.pdf.gateway'),
    footer: t('nftDetails.info.pdf.footer'),
    fileName: t('nftDetails.info.pdf.fileName'),
  };

  // Demo handling (fetch from DB via actions instead of localStorage)
  useVisibleTask$(({ track }) => {
    track(() => tokenIdStr);
    const demoEnabled = track(() => demoMode.enabled.value);
    const connected = track(() => isConnected.value);

    // Update isDemoNft reactively when demo mode changes
    isDemoNft.value = tokenIdStr.startsWith('DEMO-') || demoEnabled;

    if (!isDemoNft.value) return;

    // If disconnected, don't try to load, just reset state
    // This allows the UI to show the "Connect Wallet" state instead of "Not Found"
    if (!connected) {
      nftExists.value = false;
      metadataLoading.value = false;
      return;
    }

    const loadDemoData = async () => {
      metadataLoading.value = true;
      nftExists.value = false;
      demoLoadError.value = '';

      try {
        // Fetch from backend via hook actions (use live actions for demo mode reactivity)
        const act = contracts.value.actions || actions;
        const uri = await act.getNFTTokenURI(tokenIdStr);
        const owner = await act.getNFTOwner(tokenIdStr);

        if (!uri) throw new Error('Demo NFT not found in DB');

        // Parse Data URI
        let parsed: any = {};
        if (uri.startsWith('data:application/json;base64,')) {
          try {
            const base64 = uri.split(',')[1];
            const jsonStr = atob(base64);
            parsed = JSON.parse(jsonStr);
          } catch (e) {
            console.error('Error parsing Demo metadata', e);
          }
        }

        nftExists.value = true;
        nftOwner.value = owner || 'Demo user';
        nftName.value = parsed.name || tokenIdStr;
        nftDescription.value = parsed.description || 'Demo description';
        nftAttributes.value = parsed.attributes || [];
        imageUrl.value = parsed.image || '';

        metadataJsonRaw.value = parsed;
        metadataText.value = JSON.stringify(parsed, null, 2);

        tokenUriRaw.value = uri;
        tokenUriHttp.value = uri; // It's data URI

        metadataIsPublic.value = true;
        hasMetaAccess.value = true;
      } catch (err: any) {
        demoLoadError.value = err?.message || 'Demo NFT not found';
        nftExists.value = false;
      } finally {
        metadataLoading.value = false;
      }
    };

    loadDemoData();
  });
  const checkAccess = $(
    async () => {
      try {
        // FIRST: Is it public?
        const isPublic = await actions.isMetadataPublic(tokenIdStr);
        metadataIsPublic.value = isPublic;

        if (isPublic) {
          hasMetaAccess.value = true;
          return;
        }

        // SECOND: If private, does user have access?
        if (isConnected.value && userAddress.value) {
          hasMetaAccess.value = await actions.hasAccessToNFT(tokenIdStr, userAddress.value);
        } else {
          hasMetaAccess.value = false;
        }
      } catch {
        hasMetaAccess.value = false;
      }
    },
  );

  // Load metadata visibility state
  const loadMetadataVisibility = $(async () => {
    try {
      const isPublic = await actions.isMetadataPublic(tokenIdStr);
      metadataIsPublic.value = isPublic;
    } catch (e) {
      console.error('Error loading metadata visibility:', e);
      metadataIsPublic.value = true; // Default to public on error
    }
  });

  // Toggle metadata visibility (only owner can change)
  const toggleMetadataVisibility = $(async () => {
    if (!isConnected.value || !userAddress.value) {
      alert('Connect wallet to change visibility');
      return;
    }

    // Check if user is owner
    if (!isOwner.value) {
      alert('Only the owner can change metadata visibility');
      return;
    }

    try {
      metadataVisibilityLoading.value = true;
      const newVisibility = !metadataIsPublic.value;
      await actions.setMetadataVisibility(tokenIdStr, newVisibility);
      metadataIsPublic.value = newVisibility;
    } catch (e: any) {
      console.error('Error changing visibility:', e);
      alert(e?.message || 'Failed to change visibility');
    } finally {
      metadataVisibilityLoading.value = false;
    }
  });

  // Load metadata visibility when NFT is loaded
  useVisibleTask$(({ track }) => {
    track(() => nftExists.value);
    track(() => contracts.value.nft?.address);

    if (nftExists.value && contracts.value.nft?.address) {
      loadMetadataVisibility();
    }
  });

  // ======== MARKET STATES (declared BEFORE PDF generator) ========
  // SALE
  const saleChecking = useSignal<boolean>(false);
  const saleListed = useSignal<boolean | null>(null);
  const saleListing = useSignal<{ seller: string; price: string; isActive: boolean } | null>(null);
  const salePriceInput = useSignal<string>('');
  const saleMsg = useSignal<string>('');
  const saleListLoading = useSignal<boolean>(false);
  const saleCancelLoading = useSignal<boolean>(false);
  const saleBuyLoading = useSignal<boolean>(false);

  // RENTAL
  const rentalChecking = useSignal<boolean>(false);
  const rentalListed = useSignal<boolean>(false);
  const rentalListing = useSignal<{
    owner: string;
    basePrice: string;
    duration: string;
    isActive: boolean;
  } | null>(null);
  const rentalBasePrice = useSignal<string>(''); // KNRT
  const rentalDurationSec = useSignal<string>('3600');
  const rentalDurationAmount = useSignal<string>('1'); // user-friendly input
  const rentalDurationUnit = useSignal<'hours' | 'days' | 'months'>('days'); // user-friendly unit
  const rentalOfferPct = useSignal<string>(''); // 1-100
  const rentalOffers = useSignal<any[]>([]);
  const rentalRenters = useSignal<string[]>([]);
  const rentalMsg = useSignal<string>('');
  const iAmRenter = useSignal<boolean>(false);
  const rentalListLoading = useSignal<boolean>(false);
  const rentalCancelLoading = useSignal<boolean>(false);
  const rentalOfferLoading = useSignal<boolean>(false);
  const rentalEndLoading = useSignal<boolean>(false);
  const rentalWithdrawIdx = useSignal<number | null>(null);
  const rentalAcceptIdx = useSignal<number | null>(null);

  // POWER
  const powerChecking = useSignal<boolean>(false);
  const powerListed = useSignal<boolean>(false);
  const powerListing = useSignal<{
    owner: string;
    basePrice: string;
    duration: string;
    isActive: boolean;
    payUpfront: boolean;
  } | null>(null);
  const powerOffers = useSignal<any[]>([]);
  const powerRenters = useSignal<string[]>([]);
  const powerBasePrice = useSignal<string>(''); // KNRT
  const powerDurationSec = useSignal<string>('86400');
  const powerDurationAmount = useSignal<string>('1'); // user-friendly input
  const powerDurationUnit = useSignal<'hours' | 'days' | 'months'>('days'); // user-friendly unit
  const powerOfferPct = useSignal<string>(''); // 1-100
  const powerMsg = useSignal<string>('');
  const myPowerAccessUntil = useSignal<bigint>(BigInt(0));
  const powerListLoading = useSignal<boolean>(false);
  const powerCancelLoading = useSignal<boolean>(false);
  const powerOfferLoading = useSignal<boolean>(false);
  const powerWithdrawIdx = useSignal<number | null>(null);
  const powerAcceptIdx = useSignal<number | null>(null);
  const powerPayUpfront = useSignal<boolean>(false);

  // Centralized ownership check (smartly handles Sale Market ownership)
  const isOwner = useComputed$(() => {
    if (!isConnected.value || !userAddress.value) return false;

    // If listed for sale, the "effective owner" is the seller
    const seller = saleListed.value && saleListing.value?.seller;
    const realOwner = seller || nftOwner.value;

    return realOwner ? userAddress.value.toLowerCase() === realOwner.toLowerCase() : false;
  });

  // ===== Chat state =====
  const chatMessages = useSignal<Array<any>>([]);
  const chatPendingMessage = useSignal<any | null>(null); // Message being sent
  const chatPartners = useSignal<string[]>([]); // List of addresses user can chat with
  const selectedChatPartner = useSignal<string | null>(null); // Currently selected conversation
  const chatLoading = useSignal<boolean>(false);
  const chatError = useSignal<string>('');
  const chatInput = useSignal<string>('');
  const chatMessagesContainerRef = useSignal<Element>(); // Reference to messages container for auto-scroll
  const chatMarket = useComputed$<'rental' | 'power' | null>(() => {
    // Show chat for rental if there's an active rental listing
    if (rentalListed.value && rentalListing.value?.isActive) {
      return 'rental';
    }
    // Show chat for power if there's an active power listing
    if (powerListed.value && powerListing.value?.isActive) {
      return 'power';
    }
    return null; // no active rental/power listings
  });

  // Auto-scroll to bottom when messages change or pending message appears
  // Only scrolls if user is already near the bottom (within 100px)
  useVisibleTask$(({ track }) => {
    // Track changes to chatMessages and chatPendingMessage
    track(() => chatMessages.value.length);
    track(() => chatPendingMessage.value);

    // Scroll to bottom with a small delay to ensure DOM is updated
    setTimeout(() => {
      if (chatMessagesContainerRef.value) {
        const container = chatMessagesContainerRef.value;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        // Only auto-scroll if user is already at/near the bottom
        if (isNearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }, 50);
  });

  // Load list of conversation partners
  const loadChatPartners = $(async () => {
    if (!chatMarket.value || !isConnected.value || !userAddress.value) return;
    chatLoading.value = true;
    chatError.value = '';
    try {
      const res = await fetch(
        `/api/chat/${encodeURIComponent(tokenIdStr)}/${chatMarket.value}?myAddress=${encodeURIComponent(userAddress.value)}`
      );
      if (!res.ok) throw new Error(`Failed loading partners (${res.status})`);
      const data = await res.json();
      const partners = Array.isArray(data.partners) ? data.partners : [];

      // If I'm not the owner, add owner to partners list if not already there
      if (!isOwner.value && nftOwner.value && !partners.includes(nftOwner.value.toLowerCase())) {
        partners.unshift(nftOwner.value.toLowerCase());
      }

      // If I'm the owner, add all offerors from the current market
      if (isOwner.value && chatMarket.value) {
        const offers = chatMarket.value === 'rental' ? rentalOffers.value : powerOffers.value;
        for (const offer of offers) {
          const addr = (offer.renter || offer.offerer || '').toLowerCase();
          if (addr && !partners.includes(addr)) {
            partners.push(addr);
          }
        }
      }

      chatPartners.value = partners;

      // Auto-select first partner or owner if available
      if (chatPartners.value.length > 0 && !selectedChatPartner.value) {
        selectedChatPartner.value = chatPartners.value[0];
      }
    } catch (e: any) {
      chatError.value = e?.message || 'Error loading chat partners';
    } finally {
      chatLoading.value = false;
    }
  });

  // Load messages with selected partner
  const loadChatMessages = $(async () => {
    if (!chatMarket.value || !isConnected.value || !userAddress.value || !selectedChatPartner.value) return;
    chatLoading.value = true;
    chatError.value = '';
    try {
      const res = await fetch(
        `/api/chat/${encodeURIComponent(tokenIdStr)}/${chatMarket.value}?myAddress=${encodeURIComponent(userAddress.value)}&withAddress=${encodeURIComponent(selectedChatPartner.value)}`
      );
      if (!res.ok) throw new Error(`Failed loading messages (${res.status})`);
      const data = await res.json();
      chatMessages.value = Array.isArray(data.messages) ? data.messages : [];
    } catch (e: any) {
      chatError.value = e?.message || 'Error loading messages';
    } finally {
      chatLoading.value = false;
    }
  });

  const sendChatMessage = $(async () => {
    console.log('🚀 [CHAT] sendChatMessage called');

    // Validate all conditions
    if (!chatMarket.value || !selectedChatPartner.value) {
      console.log('❌ [CHAT] No chat market or partner');
      chatError.value = 'No chat partner selected.';
      return;
    }

    const body = chatInput.value.trim();
    if (!body) {
      console.log('❌ [CHAT] Empty message body');
      return;
    }

    if (!isConnected.value || !userAddress.value) {
      console.log('❌ [CHAT] Not connected or no address');
      chatError.value = 'Connect wallet to send messages.';
      return;
    }

    console.log('✅ [CHAT] All validations passed');

    // Clear previous errors
    chatError.value = '';

    // Save message body and clear input immediately for better UX
    const messageBody = chatInput.value.trim();
    chatInput.value = '';
    console.log('📝 [CHAT] Input cleared, message body:', messageBody);

    // Create pending message and store it separately
    const pendingMsg = {
      from_address: userAddress.value,
      to_address: selectedChatPartner.value,
      body: messageBody,
      created_at: Math.floor(Date.now() / 1000),
      id: Date.now(),
      isPending: true, // Mark as pending
    };

    console.log('⏳ [CHAT] Setting pending message:', pendingMsg.id);
    chatPendingMessage.value = pendingMsg;
    console.log('� [CHAT] NOT modifying chatMessages to avoid re-render');

    // Send to server in background (fire and forget)
    console.log('🌐 [CHAT] Starting fetch to server...');
    fetch(`/api/chat/${encodeURIComponent(tokenIdStr)}/${chatMarket.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userAddress.value,
        to: selectedChatPartner.value,
        body: messageBody
      })
    }).then(async (res) => {
      console.log('📥 [CHAT] Fetch response received:', res.status, res.ok);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.log('❌ [CHAT] Server error:', errorData);
        // Clear pending message on error
        chatPendingMessage.value = null;
        chatError.value = errorData.error || `Failed sending message (${res.status})`;
        // Restore the input so user can try again
        chatInput.value = messageBody;
      } else {
        console.log('✅ [CHAT] Message sent successfully - adding to messages array now');
        // Now add to actual messages array
        chatMessages.value = [...chatMessages.value, pendingMsg];
        // Clear pending
        chatPendingMessage.value = null;
      }
    }).catch((e: any) => {
      console.log('💥 [CHAT] Fetch error caught:', e);
      // Clear pending message on error
      chatPendingMessage.value = null;
      chatError.value = e?.message || 'Error sending message';
      console.error('Chat send error:', e);
      // Restore the input so user can try again
      chatInput.value = messageBody;
    });

    console.log('🏁 [CHAT] sendChatMessage function completed (fetch running in background)');
  });

  // ======= PDF GENERATION (with Basescan) =======
  type MarketSnapshot = {
    sale?: { listed: boolean | null; listing: { price: string } | null };
    rental?: { listed: boolean; listing: { basePrice: string; duration: string } | null };
    power?: { listed: boolean; listing: { basePrice: string; duration: string; payUpfront: boolean } | null };
  };

  const generateCertificatePdf$ = $(
    async (snap?: MarketSnapshot) => {
      const tLocal = inlineTranslate();
      if (!hasMetaAccess.value || !metadataJsonRaw.value) return;

      const [{ jsPDF }, autoTableMod, QRCode] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('qrcode'),
      ]);
      const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 48;
      const contentW = pageW - marginX * 2;
      const lineH = 16;

      // --- Build URLs ---
      const contractAddr = contracts?.value?.nft?.address || '';
      const basescanUrl = buildBasescanNFTUrl(chainId.value, contractAddr, tokenIdStr);
      const isDemo = !contractAddr || contractAddr === '0xDemoNFT';
      const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://marketplace.knrt.io';
      const locale = typeof window !== 'undefined' ? (window.location.pathname.split('/')[1] || 'en') : 'en';
      const appNftUrl = `${appBaseUrl}/${locale}/nft/${tokenIdStr}`;

      // --- Helper: strip emojis for PDF (prevents weird symbols) ---
      const stripEmojis = (str: string) => {
        if (!str) return '';
        // Basic emoji/symbol strip for jsPDF standard fonts
        return str.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u26FF\u2700}-\u27BF]/gu, (m) => '');
      };

      // --- Generate QR codes ---
      const qrSize = 70;
      let qrBasescanData: string | null = null;
      let qrAppData: string | null = null;
      try {
        if (basescanUrl) {
          qrBasescanData = await QRCode.toDataURL(basescanUrl, {
            width: 200, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' },
          });
        }
        qrAppData = await QRCode.toDataURL(appNftUrl, {
          width: 200, margin: 1, color: { dark: '#c1272d', light: '#ffffff' },
        });
      } catch { /* QR generation failed silently */ }

      // ===================== PAGE 1 =====================

      // --- Header gradient band ---
      const headerH = 110;
      for (let i = 0; i < headerH; i++) {
        const ratio = i / headerH;
        doc.setFillColor(
          Math.round(193 - ratio * 30),
          Math.round(39 - ratio * 10),
          Math.round(45 - ratio * 10),
        );
        doc.rect(0, i, pageW, 1.5, 'F');
      }

      // Header badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9); // Slightly smaller
      doc.setTextColor(255, 255, 255);
      doc.text(isDemo ? 'DEMO CERTIFICATE' : 'OWNERSHIP CERTIFICATE', marginX, 28);

      // NFT image in header
      const imgData = await urlToDataURL(imageUrl.value);
      const imgSize = 60;
      if (imgData) {
        doc.addImage(imgData, 'PNG', marginX, 38, imgSize, imgSize, '', 'FAST');
      }

      // Title block
      const titleX = marginX + (imgData ? imgSize + 16 : 0);
      doc.setFont('helvetica', 'bold');
      const cleanName = stripEmojis(nftName.value || `NFT #${tokenIdStr}`);
      const fontSize = cleanName.length > 30 ? 16 : 20; // Dynamic font size
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      doc.text(cleanName, titleX, 58);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Token ID: ${tokenIdStr}`, titleX, 76);
      if (chainId.value) {
        const networkName = Number(chainId.value) === 8453 ? 'Base Mainnet' : Number(chainId.value) === 84532 ? 'Base Sepolia' : `Chain ${chainId.value}`;
        doc.text(`Network: ${networkName}`, titleX, 90);
      }

      // Date stamp on the right
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(dateStr, pageW - marginX, 28, { align: 'right' });

      // --- Helper: ensure space and return current Y ---
      const checkSpace = (needed: number) => {
        if (y + needed > pageH - 60) {
          doc.addPage();
          y = 50;
          return true;
        }
        return false;
      };

      // --- Main body ---
      let y = headerH + 30;
      doc.setTextColor(30, 30, 30);

      // Owner section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('On-Chain Owner', marginX, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(nftOwner.value || (isDemo ? '0xDemoUser' : 'Unknown'), marginX, y);
      y += 6;

      // Contract address
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Contract: ${contractAddr || 'N/A'}`, marginX, y + 10);
      y += 25;

      // Separator
      doc.setDrawColor(230, 230, 230);
      doc.line(marginX, y, pageW - marginX, y);
      y += 20;

      // Description
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text('Description', marginX, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const desc = stripEmojis(nftDescription.value || 'No description provided.');
      const descLines = doc.splitTextToSize(desc, contentW);
      doc.text(descLines, marginX, y);
      y += lineH * Math.max(1, descLines.length) + 15;

      // Marketplace Status Section 
      checkSpace(80);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text('Marketplace Status', marginX, y);
      y += 14;

      const statusRows: string[][] = [];
      if (snap?.sale) {
        statusRows.push([
          'Sale',
          snap.sale.listed ? `Listed - ${prettyAmount(snap.sale.listing?.price || '0')} KNRT` : 'Not listed',
        ]);
      }
      if (snap?.rental) {
        const dur = snap.rental.listing?.duration ? formatDuration(snap.rental.listing.duration, tLocal) : '';
        statusRows.push([
          'Rental',
          snap.rental.listed ? `Listed - ${prettyAmount(snap.rental.listing?.basePrice || '0')} KNRT | ${dur}` : 'Not listed',
        ]);
      }
      if (snap?.power) {
        const dur = snap.power.listing?.duration ? formatDuration(snap.power.listing.duration, tLocal) : '';
        statusRows.push([
          'Rights',
          snap.power.listed ? `Listed - ${prettyAmount(snap.power.listing?.basePrice || '0')} KNRT | ${dur}${snap.power.listing?.payUpfront ? ' (upfront)' : ''}` : 'Not listed',
        ]);
      }

      if (statusRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Market', 'Status']],
          body: statusRows,
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [60, 60, 80], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 248, 250] },
          margin: { left: marginX, right: marginX },
        });
        // @ts-ignore
        y = (doc as any).lastAutoTable?.finalY ?? y + 50;
        y += 20;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text('No marketplace activity.', marginX, y);
        y += 25;
      }

      // Attributes Table
      const attrRowsRaw = attributesToRows(nftAttributes.value, t);
      if (attrRowsRaw.length > 0) {
        checkSpace(100);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(t('nftDetails.info.attrs@@Attributes'), marginX, y);
        y += 10;

        // Truncate values that are too long (like Available Cell IDs)
        const attrRows = attrRowsRaw.map(r => {
          let val = String(r[1]);
          if (val.length > 200) val = val.slice(0, 197) + '...';
          return [stripEmojis(r[0]), stripEmojis(val)];
        });

        autoTable(doc, {
          startY: y,
          head: [[t('nftDetails.pdf.trait@@Trait'), t('nftDetails.pdf.value@@Value')]],
          body: attrRows,
          styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
          headStyles: { fillColor: [193, 39, 45], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [252, 248, 248] },
          margin: { left: marginX, right: marginX },
          columnStyles: {
            0: { cellWidth: 120 }, // Fix width for Trait column
            1: { cellWidth: 'auto' }
          }
        });
        // @ts-ignore
        y = (doc as any).lastAutoTable?.finalY ?? y + 30;
        y += 20;
      }

      // Technical Details
      checkSpace(120);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(pdfKeys.tech, marginX, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);

      const techFields: [string, string][] = [
        [pdfKeys.tokenId, tokenIdStr],
        [pdfKeys.contract, contractAddr || 'N/A'],
        [pdfKeys.chainId, String(chainId.value || 'N/A')],
      ];

      // Omit if it's a giant base64 or too long
      if (tokenUriHttp.value && !tokenUriHttp.value.startsWith('data:')) {
        techFields.push([pdfKeys.gateway, tokenUriHttp.value]);
      }

      techFields.forEach(([label, value]) => {
        const fullLine = `${label}: ${value}`;
        const wrapped = doc.splitTextToSize(fullLine, contentW);
        doc.text(wrapped, marginX, y);
        y += lineH * Math.max(1, wrapped.length);
      });

      y += 10;

      // Verification Links & QR
      checkSpace(200);
      doc.setDrawColor(230, 230, 230);
      doc.line(marginX, y, pageW - marginX, y);
      y += 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text('Verification Links', marginX, y);
      y += 16;

      const host = getBasescanHostByChainId(chainId.value);
      const contractUrl = `https://${host}/address/${contractAddr}`;

      const drawLinkLabel = (label: string, url: string, targetY: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(193, 39, 45);
        doc.text(label, marginX, targetY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 80, 180);
        doc.textWithLink(url, marginX + 60, targetY, { url });
      };

      drawLinkLabel('NFT Asset:', basescanUrl, y); y += 14;
      drawLinkLabel('Contract:', contractUrl, y); y += 14;
      drawLinkLabel('App View:', appNftUrl, y); y += 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Verification QR Codes', marginX, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Scan to verify this NFT on the blockchain or view it in the marketplace.', marginX, y);
      y += 20;

      const qrY = y;
      const qrSpacing = 160;

      // QR 1: Basescan
      if (qrBasescanData) {
        doc.addImage(qrBasescanData, 'PNG', marginX, qrY, qrSize, qrSize);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);
        doc.text('Basescan', marginX, qrY + qrSize + 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Blockchain Verification', marginX, qrY + qrSize + 22);
      }

      // QR 2: App
      if (qrAppData) {
        const qr2X = qrBasescanData ? marginX + qrSpacing : marginX;
        doc.addImage(qrAppData, 'PNG', qr2X, qrY, qrSize, qrSize);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);
        doc.text('KNRT Marketplace', qr2X, qrY + qrSize + 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('View NFT Details', qr2X, qrY + qrSize + 22);
      }

      // --- Footer ---
      doc.setFillColor(193, 39, 45);
      doc.rect(0, pageH - 28, pageW, 28, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(pdfKeys.footer, marginX, pageH - 12);
      doc.text(dateStr, pageW - marginX, pageH - 12, { align: 'right' });

      // Save
      const fileName = `${pdfKeys.fileName}_${(nftName.value || tokenIdStr)
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 80)}_certificate.pdf`;
      doc.save(fileName);
    },
  );

  // ---------- REACTIVE ----------
  const hasSale = useComputed$(() => !!contracts.value?.sale?.address);
  const hasRental = useComputed$(() => !!contracts.value?.rental?.address);
  const hasPower = useComputed$(() => !!contracts.value?.power?.address);

  const activeMarket = useComputed$<'sale' | 'rental' | 'power' | 'none'>(() => {
    if (saleListed.value) return 'sale';
    if (rentalListed.value) return 'rental';
    if (powerListed.value) return 'power';
    return 'none';
  });

  const newListingTab = useSignal<'sale' | 'rental' | 'power'>('sale');

  // Derived UI
  const rentalOpenOffers = useComputed$(() =>
    (rentalOffers.value || []).filter(
      (o: any) => !o.accepted && BigInt(o.amountPaidWei || '0') > 0n,
    ),
  );
  const rentalWithdrawnOffers = useComputed$(() => {
    const arr = (rentalOffers.value || []).filter(
      (o: any) => o.accepted || BigInt(o.amountPaidWei || '0') === 0n,
    );
    return arr.sort((a: any, b: any) => Number(b.offerTime || 0) - Number(a.offerTime || 0));
  });

  const powerOpenOffers = useComputed$(() =>
    (powerOffers.value || []).filter(
      (o: any) => !o.accepted && BigInt(o.amountPaidWei || '0') > 0n,
    ),
  );
  const powerWithdrawnOffers = useComputed$(() => {
    const arr = (powerOffers.value || []).filter(
      (o: any) => o.accepted || BigInt(o.amountPaidWei || '0') === 0n,
    );
    return arr.sort((a: any, b: any) => Number(b.offerTime || 0) - Number(a.offerTime || 0));
  });

  // ---------- Helpers ----------
  const copyToClipboard = $((text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => { });
    }
  });

  const parseMetadataFromAny = $(
    async (uri: string): Promise<NftMetadata | null> => {
      try {
        if (!uri) return null;

        if (uri.startsWith('ipfs://') || uri.startsWith('http')) {
          const url = ipfsToHttp(uri);
          const res = await fetch(url);
          if (!res.ok) return null;
          return (await res.json()) as NftMetadata;
        }

        if (uri.startsWith('data:application/json;base64,')) {
          const base64Data = uri.replace('data:application/json;base64,', '');
          const jsonString =
            typeof atob === 'function'
              ? atob(base64Data)
              : typeof Buffer !== 'undefined'
                ? Buffer.from(base64Data, 'base64').toString('utf-8')
                : '';
          if (!jsonString) return null;
          return JSON.parse(jsonString) as NftMetadata;
        }

        return null;
      } catch {
        return null;
      }
    },
  );

  // ---------- Loaders ----------
  const loadNFTData = $(
    async () => {
      metadataLoading.value = true;
      nftError.value = '';
      nftExists.value = false;
      nftOwner.value = '';
      tokenUriRaw.value = '';
      tokenUriHttp.value = '';
      metadataJsonRaw.value = null;
      metadataText.value = '';
      imageUrl.value = '';
      nftName.value = '';
      nftDescription.value = 'No description.';
      nftAttributes.value = [];
      hasMetaAccess.value = null;

      try {
        if (!tokenIdStr || tokenIdStr === 'PENDING') {
          isMinting.value = tokenIdStr === 'PENDING';
          metadataLoading.value = tokenIdStr === 'PENDING';
          return;
        }
        isMinting.value = false;
        if (!contracts?.value?.nft?.address) throw new Error('Waiting for contracts initialization...');

        // exists?
        let exists = false;
        try {
          exists = await actions.getNFTExists(tokenIdStr);
        } catch (error: any) {
          if (error?.message?.includes('ERC721NonexistentToken')) exists = false;
          else throw error;
        }
        if (!exists) throw new Error('This NFT does not exist or was burned');
        nftExists.value = true;

        // Owner
        try {
          const owner = await actions.getNFTOwner(tokenIdStr);
          nftOwner.value = owner || '';
        } catch {
          nftOwner.value = '';
        }

        // --- “READABLE” first (private-first, with connected account) ---
        let uri = '';
        let md: NftMetadata | null = null;

        const hasReadable =
          'getReadableTokenURI' in actions &&
          typeof (actions as any).getReadableTokenURI === 'function';
        const hasFetchReadable =
          'fetchReadableJson' in actions &&
          typeof (actions as any).fetchReadableJson === 'function';

        if (hasReadable && hasFetchReadable && isConnected.value) {
          try {
            uri = await (actions as any).getReadableTokenURI(tokenIdStr);
          } catch {
            /* ignore */
          }
          try {
            md = await (actions as any).fetchReadableJson(tokenIdStr);
          } catch {
            /* ignore */
          }
        }

        // Fallback if no helpers or no account
        if (!uri) {
          try {
            uri = await actions.getPrivateTokenURI(tokenIdStr);
          } catch { }
          if (!uri) {
            try {
              uri = await actions.getNFTTokenURI(tokenIdStr);
            } catch { }
          }
        }
        if (!md && uri) {
          try {
            md = await parseMetadataFromAny(uri);
          } catch { }
        }

        if (uri) {
          tokenUriRaw.value = uri;
          tokenUriHttp.value = ipfsToHttp(uri);
        }

        if (md) {
          metadataJsonRaw.value = md;
          metadataText.value = JSON.stringify(md, null, 2);

          nftName.value = md.name || `NFT #${tokenIdStr}`;
          // UX: clarify reason when wallet is not connected
          nftDescription.value =
            md.description ||
            (isConnected.value
              ? 'Could not load NFT metadata (possible lack of access).'
              : 'Connect your wallet to attempt reading private metadata.');

          const img = safeString(md.image);
          imageUrl.value = ipfsToHttp(img);

          const arr = Array.isArray(md.attributes) ? md.attributes : [];
          nftAttributes.value = arr.map((a) => ({
            trait_type: safeString(a.trait_type),
            value: (a as any).value,
          }));
        } else {
          // No access or metadata unavailable
          nftName.value = `NFT #${tokenIdStr}`;
          nftDescription.value = isConnected.value
            ? '🔒 Metadata locked. You should rent or buy to unlock.'
            : 'Connect your wallet to attempt reading private metadata.';
          imageUrl.value = `https://placehold.co/500x500/1a1a1a/c1272d?text=NFT+${encodeURIComponent(
            tokenIdStr,
          )}`;
        }

        // NEW: verify access
        await checkAccess();
      } catch (e: any) {
        nftExists.value = false;
        nftError.value = e?.message || 'Error loading NFT';
        imageUrl.value = `https://placehold.co/500x500/1a1a1a/c1272d?text=Error`;
      } finally {
        metadataLoading.value = false;
      }
    },
  );

  const loadSaleData = $(
    async () => {
      if (!hasSale.value || !tokenIdStr) return;
      saleChecking.value = true;
      try {
        const listing = await retry(() => contracts.value.actions!.getSaleListing(tokenIdStr));
        saleListing.value = listing;
        saleListed.value = !!(listing && listing.isActive);
        saleMsg.value = '';
      } catch (e: any) {
        saleMsg.value = e?.message || 'Error loading sale data';
        saleListing.value = {
          seller: '0x0000000000000000000000000000000000000000',
          price: '0',
          isActive: false,
        };
        saleListed.value = false;
      } finally {
        saleChecking.value = false;
      }
    },
  );

  const loadRentalData = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasRental.value || !tokenIdStr) return;
      try {
        // Wait slightly to ensure local storage persistence (if needed by browser quirks)
        await new Promise(r => setTimeout(r, 50));
        const listing = await retry(() => contracts.value.actions!.getRentalListing(tokenIdStr));
        console.log('[Demo] loadRentalData listing:', listing);
        rentalListing.value = listing ? { ...listing, duration: String(listing.duration) } : null;
        rentalListed.value = !!listing?.isActive;

        const offers = await retry(() => contracts.value.actions!.getRentalOffers(tokenIdStr));
        rentalOffers.value = Array.isArray(offers) ? offers : [];

        const renters = await retry(() => contracts.value.actions!.getActiveRenters(tokenIdStr));
        rentalRenters.value = Array.isArray(renters) ? renters : [];

        if (userAddress.value) {
          // Check access
          const access = await retry(() => contracts.value.actions!.getActiveRental(tokenIdStr, userAddress.value!));
        }
      } catch (e) {
        rentalMsg.value = tLocal('nftDetails.messages.loadError');
      } finally {
        rentalChecking.value = false;
      }
    },
  );

  const loadPowerData = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasPower.value || !tokenIdStr) return;
      try {
        // Wait slightly
        await new Promise(r => setTimeout(r, 50));
        const listing = await retry(() => contracts.value.actions!.getPowerListing(tokenIdStr));
        console.log('[Demo] loadPowerData listing:', listing);
        powerListing.value = listing ? { ...listing, duration: String(listing.duration) } : null;
        powerListed.value = !!listing?.isActive;

        if (listing && listing.isActive) {
          powerBasePrice.value = safeString(listing.basePrice);
          powerDurationSec.value = String(listing.duration);
        }

        const offers = await retry(() => contracts.value.actions!.getPowerOffers(tokenIdStr));
        powerOffers.value = Array.isArray(offers) ? offers : [];

        const renters = await retry(() => contracts.value.actions!.getActivePowerRenters(tokenIdStr));
        powerRenters.value = Array.isArray(renters) ? renters : [];

        if (userAddress.value) {
          const grant = await retry(() => contracts.value.actions!.getPowerGrant(tokenIdStr, userAddress.value!));
          myPowerAccessUntil.value = BigInt(grant?.expiresAt || '0');
        }
      } catch (e: any) {
        powerMsg.value = `DEBUG_ERR: ${e?.message || e}`;
        console.error('loadPowerData error:', e);
      } finally {
        powerChecking.value = false;
      }
    },
  );

  // Throttling
  const lastLoadTs = useSignal<number>(0);
  const LOAD_MIN_INTERVAL = 3500; // ms
  const loadAll = $(async () => {
    await Promise.all([loadNFTData(), loadSaleData(), loadRentalData(), loadPowerData()]);
  });
  const loadAllThrottled = $(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastLoadTs.value < LOAD_MIN_INTERVAL) return;
      lastLoadTs.value = now;
      await loadAll();
    },
  );

  // Initial
  useTask$(async () => {
    if (contracts.value?.nft?.address && isConnected.value) {
      await loadAllThrottled(true);
      return;
    }
    await new Promise((r) => setTimeout(r, 300));
    if (!isConnected.value && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) await connect();
      } catch { }
    }
  });

  // Reactive reloads
  useTask$(async ({ track }) => {
    const tokenId = track(() => tokenIdStr);
    const nftContract = track(() => contracts?.value?.nft?.address);
    track(() => chainId.value);
    track(() => isConnected.value);
    track(() => contracts?.value?.sale?.address);
    track(() => contracts?.value?.rental?.address);
    track(() => contracts?.value?.power?.address);

    if (tokenId === 'PENDING') {
      isMinting.value = true;
      metadataLoading.value = true;
      return;
    }

    if (tokenId && nftContract) {
      isMinting.value = false;
      await loadAllThrottled(true);
    } else if (tokenId && !nftContract) {
      metadataLoading.value = true;
      nftError.value = 'nftDetails.fallbacks.initContracts';
    }
  });

  // When wallet connects / account changes, refresh and re-check access
  useTask$(async ({ track }) => {
    track(() => isConnected.value);
    track(() => userAddress.value);
    if (tokenIdStr && contracts?.value?.nft?.address && isConnected.value && userAddress.value) {
      await Promise.all([loadRentalData(), loadPowerData(), loadNFTData()]);
    } else {
      hasMetaAccess.value = null;
    }
  });

  // Load chat partners when market becomes available
  useTask$(async ({ track }) => {
    track(() => chatMarket.value);
    track(() => isConnected.value);
    track(() => userAddress.value);
    if (chatMarket.value && isConnected.value && userAddress.value) {
      await loadChatPartners();
    }
  });

  // Load messages when partner is selected
  useTask$(async ({ track }) => {
    track(() => selectedChatPartner.value);
    if (selectedChatPartner.value) {
      await loadChatMessages();
    }
  });

  // ---------- Handlers (markets) ----------
  const onListForSale$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasSale.value) return;
      saleMsg.value = '';
      const price = salePriceInput.value.trim();
      if (!price || Number(price) <= 0) {
        saleMsg.value = tLocal('nftDetails.messages.invalidPrice');
        return;
      }
      try {
        saleListLoading.value = true;
        console.log('[UI] onListForSale calling listForSale', { tokenIdStr, price });
        await contracts.value.actions!.listForSale(tokenIdStr, price);
        console.log('[UI] onListForSale success, refreshing...');
        saleMsg.value = tLocal('nftDetails.messages.listSuccess');
        await loadSaleData();
      } catch (e: any) {
        saleMsg.value = e?.message || 'Error listing for sale.';
      } finally {
        saleListLoading.value = false;
      }
    },
  );

  const onCancelSale$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasSale.value) return;
      saleMsg.value = '';
      try {
        saleCancelLoading.value = true;
        await contracts.value.actions!.cancelSale(tokenIdStr);
        saleMsg.value = tLocal('nftDetails.messages.cancelSuccess');
        await loadSaleData();
      } catch (e: any) {
        saleMsg.value = e?.message || 'Error canceling sale.';
      } finally {
        saleCancelLoading.value = false;
      }
    },
  );

  const onBuyNow$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasSale.value || !saleListing.value) return;
      saleMsg.value = '';
      try {
        saleBuyLoading.value = true;
        await contracts.value.actions!.buyNFT(tokenIdStr);
        saleMsg.value = tLocal('nftDetails.messages.buySuccess');
        await Promise.all([loadNFTData(), loadSaleData()]);
      } catch (e: any) {
        saleMsg.value = e?.message || 'Error buying.';
      } finally {
        saleBuyLoading.value = false;
      }
    },
  );

  const onListRental$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasRental.value) return;
      rentalMsg.value = '';
      const price = rentalBasePrice.value.trim();

      // Validate duration
      const validation = validateDuration(rentalDurationAmount.value, rentalDurationUnit.value);
      if (!validation.valid) {
        rentalMsg.value = validation.error;
        return;
      }

      const dur = durationToSeconds(rentalDurationAmount.value, rentalDurationUnit.value);

      if (!price || Number(price) <= 0) {
        rentalMsg.value = tLocal('nftDetails.messages.invalidPrice');
        return;
      }

      try {
        rentalListLoading.value = true;
        console.log('[UI] onListForRental calling action', { tokenIdStr, price, dur });
        await contracts.value.actions!.listForRental(tokenIdStr, price, dur);
        console.log('[UI] onListForRental success, refreshing...');
        rentalMsg.value = tLocal('nftDetails.messages.rentalListSuccess');
        await loadRentalData();
      } catch (e: any) {
        rentalMsg.value = e?.message || 'Error listing for rent.';
      } finally {
        rentalListLoading.value = false;
      }
    },
  );

  const onCancelRental$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasRental.value) return;
      rentalMsg.value = '';
      try {
        rentalCancelLoading.value = true;
        await contracts.value.actions!.cancelRentalListing(tokenIdStr);
        rentalMsg.value = tLocal('nftDetails.messages.rentalCancelSuccess');
        await loadRentalData();
      } catch (e: any) {
        rentalMsg.value = e?.message || 'Error canceling.';
      } finally {
        rentalCancelLoading.value = false;
      }
    },
  );

  const onMakeRentalOffer$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasRental.value) return;
      rentalMsg.value = '';
      const pct = Number(rentalOfferPct.value || '0');
      if (!pct || pct <= 0 || pct > 100) {
        rentalMsg.value = tLocal('nftDetails.messages.invalidPct');
        return;
      }
      try {
        rentalOfferLoading.value = true;
        const basePrice = rentalListing.value?.basePrice || '0';
        const needed = ((Number(basePrice) * pct) / 100).toString();
        if (contracts.value && contracts.value.paymentToken && contracts.value.rental) {
          await contracts.value.actions!.ensureAllowance(userAddress.value!, contracts.value.rental.address, needed);
        }
        await contracts.value.actions!.createRentalOffer(tokenIdStr, pct);
        rentalMsg.value = tLocal('nftDetails.messages.rentalOfferSuccess');
        rentalOfferPct.value = '';
        await loadRentalData();
      } catch (e: any) {
        rentalMsg.value = e?.message || 'Error making offer.';
      } finally {
        rentalOfferLoading.value = false;
      }
    },
  );

  const onWithdrawRentalOffer$ = $(
    async (origIdx: number) => {
      const tLocal = inlineTranslate();
      if (!hasRental.value) return;
      rentalMsg.value = '';
      try {
        rentalWithdrawIdx.value = origIdx;
        if (
          'withdrawRentalOfferTx' in actions &&
          typeof (actions as any).withdrawRentalOfferTx === 'function'
        ) {
          const { wait } = await (actions as any).withdrawRentalOfferTx(tokenIdStr, origIdx);
          await wait?.();
        } else {
          await actions.withdrawRentalOffer(tokenIdStr, origIdx);
        }
        rentalMsg.value = tLocal('nftDetails.messages.rentalWithdrawSuccess');
        await loadRentalData();
      } catch (e: any) {
        rentalMsg.value = e?.message || 'Error withdrawing offer.';
      } finally {
        rentalWithdrawIdx.value = null;
      }
    },
  );

  const onAcceptRentalOffer$ = $(
    async (idx: number) => {
      const tLocal = inlineTranslate();
      if (!hasRental.value) return;
      rentalMsg.value = '';
      try {
        rentalAcceptIdx.value = idx;
        await actions.acceptRentalOffer(tokenIdStr, idx);
        rentalMsg.value = tLocal('nftDetails.messages.rentalAcceptSuccess');
        await loadRentalData();
      } catch (e: any) {
        rentalMsg.value = e?.message || 'Error accepting offer.';
      } finally {
        rentalAcceptIdx.value = null;
      }
    },
  );

  const onEndRental$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasRental.value) return;
      rentalMsg.value = '';
      try {
        rentalEndLoading.value = true;
        await actions.endRental(tokenIdStr);
        rentalMsg.value = tLocal('nftDetails.messages.rentalEndSuccess');
        await loadRentalData();
      } catch (e: any) {
        rentalMsg.value = e?.message || 'Error ending rental.';
      } finally {
        rentalEndLoading.value = false;
      }
    },
  );

  const onListPower$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasPower.value) return;
      powerMsg.value = '';
      const basePrice = powerBasePrice.value.trim();

      // Validate duration
      const validation = validateDuration(powerDurationAmount.value, powerDurationUnit.value);
      if (!validation.valid) {
        powerMsg.value = validation.error;
        return;
      }

      const dur = durationToSeconds(powerDurationAmount.value, powerDurationUnit.value);

      if (!basePrice || Number(basePrice) <= 0) {
        powerMsg.value = 'nftDetails.messages.invalidPrice';
        return;
      }

      try {
        powerListLoading.value = true;
        console.log('[UI] onListPower calling action', { tokenIdStr, basePrice, dur, payUpfront: powerPayUpfront.value });
        await contracts.value.actions!.listForPower(tokenIdStr, basePrice, dur, powerPayUpfront.value);
        console.log('[UI] onListPower success, refreshing...');
        powerMsg.value = tLocal('nftDetails.messages.powerListSuccess');
        await loadPowerData();
      } catch (e: any) {
        powerMsg.value = e?.message || 'Error listing Power.';
      } finally {
        powerListLoading.value = false;
      }
    },
  );

  const onCancelPower$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasPower.value) return;
      powerMsg.value = '';
      try {
        powerCancelLoading.value = true;
        await contracts.value.actions!.cancelPowerListing(tokenIdStr);
        powerMsg.value = tLocal('nftDetails.messages.powerCancelSuccess');
        await loadPowerData();
      } catch (e: any) {
        powerMsg.value = e?.message || 'Error canceling.';
      } finally {
        powerCancelLoading.value = false;
      }
    },
  );

  const onWithdrawPowerOffer$ = $(
    async (origIdx: number) => {
      const tLocal = inlineTranslate();
      if (!hasPower.value) return;
      powerMsg.value = '';
      try {
        powerWithdrawIdx.value = origIdx;

        if (
          'withdrawPowerOfferTx' in actions &&
          typeof (actions as any).withdrawPowerOfferTx === 'function'
        ) {
          const { wait } = await (actions as any).withdrawPowerOfferTx(tokenIdStr, origIdx);
          await wait?.();
        } else {
          await contracts.value.actions!.withdrawPowerOffer(tokenIdStr, origIdx);
        }

        powerMsg.value = tLocal('nftDetails.messages.powerWithdrawSuccess');
        await loadPowerData();
      } catch (e: any) {
        powerMsg.value = e?.message || 'Error withdrawing offer.';
      } finally {
        powerWithdrawIdx.value = null;
      }
    },
  );

  const onMakePowerOffer$ = $(
    async () => {
      const tLocal = inlineTranslate();
      if (!hasPower.value) return;
      powerMsg.value = '';
      const pct = Number(powerOfferPct.value || '0');
      if (!pct || pct <= 0 || pct > 100) {
        powerMsg.value = tLocal('nftDetails.messages.invalidPct');
        return;
      }
      try {
        powerOfferLoading.value = true;
        const basePrice = powerListing.value?.basePrice || '0';
        const needed = ((Number(basePrice) * pct) / 100).toString();
        if (contracts.value && contracts.value.paymentToken && contracts.value.power) {
          await contracts.value.actions!.ensureAllowance(userAddress.value!, contracts.value.power.address, needed);
        }
        await contracts.value.actions!.createPowerOffer(tokenIdStr, pct);
        powerMsg.value = tLocal('nftDetails.messages.powerOfferSuccess');
        powerOfferPct.value = '';
        await loadPowerData();
      } catch (e: any) {
        powerMsg.value = e?.message || 'Error making offer.';
      } finally {
        powerOfferLoading.value = false;
      }
    },
  );

  const onAcceptPowerOffer$ = $(
    async (idx: number) => {
      const tLocal = inlineTranslate();
      if (!hasPower.value) return;
      powerMsg.value = '';
      try {
        powerAcceptIdx.value = idx;
        await contracts.value.actions!.acceptPowerOffer(tokenIdStr, idx);
        powerMsg.value = tLocal('nftDetails.messages.powerAcceptSuccess');
        await loadPowerData();
      } catch (e: any) {
        powerMsg.value = e?.message || 'Error accepting offer.';
      } finally {
        powerAcceptIdx.value = null;
      }
    },
  );

  // ---------- Data for UI ----------
  const effectiveOwner =
    (saleListed.value && saleListing.value?.seller) || nftOwner.value || '';


  // --- Map derived from metadata ---

  // Detect if it's a Leaflet NFT
  const isLeafletNFT = useComputed$(() => {
    const md = metadataJsonRaw.value;
    if (md?.mapSource === 'leaflet') return true;
    const attrs = md?.attributes || [];
    return attrs.some(
      (a: any) => a?.trait_type === 'Map Provider' && String(a.value).toLowerCase().includes('leaflet')
    );
  });

  // Extract location data for Leaflet
  const leafletLocation = useComputed$<LocationsProps | null>(() => {
    if (!isLeafletNFT.value) return null;
    const md = metadataJsonRaw.value;
    const attrs = md?.attributes || [];

    // Map Center: "lat,lng"
    const centerAttr = attrs.find((a: any) => a?.trait_type === 'Map Center');
    let point: [number, number] = [43.214, -2.411];
    if (centerAttr && typeof centerAttr.value === 'string') {
      const parts = centerAttr.value.split(',').map(Number);
      if (parts.length === 2 && parts.every((n) => !isNaN(n))) point = [parts[0], parts[1]];
    } else if (md?.mapLeaflet?.center) {
      point = md.mapLeaflet.center;
    }

    const zoomAttr = attrs.find((a: any) => a?.trait_type === 'Map Zoom');
    const zoom = zoomAttr ? Number(zoomAttr.value) || 14 : (md?.mapLeaflet?.zoom || 14);

    return {
      name: md?.name || '',
      point,
      zoom,
      marker: true,
      boundaryBox: '',
    };
  });

  const nftMapStyle = useComputed$(() => {
    const attrs = metadataJsonRaw.value?.attributes || [];
    const styleAttr = attrs.find((a: any) => a?.trait_type === 'Map Style');
    return (styleAttr?.value as 'standard' | 'satellite') || metadataJsonRaw.value?.mapLeaflet?.style || 'standard';
  });

  const nftGridLineColor = useComputed$(() => {
    const attrs = metadataJsonRaw.value?.attributes || [];
    const colorAttr = attrs.find((a: any) => a?.trait_type === 'Grid Line Color');
    return (colorAttr?.value as string) || 'rgba(255,255,255,0.35)';
  });

  const mapParsed = useComputed$(() => {
    const md = metadataJsonRaw.value;
    if (!md) return { rows: 0, cols: 0, selectedSet: new Set<string>() };
    return parseMapFromMetadata(md);
  });

  const isMapNFT = useComputed$(() => {
    const { rows, cols } = mapParsed.value;
    return rows > 0 && cols > 0;
  });

  const showGridOverlay = useSignal<boolean>(true);
  const showImageModal = useSignal<boolean>(false);
  const gridCellColor = useSignal<string>('rgba(16,185,129,0.45)'); // default verde

  const gridLineColor = useSignal<string>('rgba(255,255,255,0.35)');

  useTask$(({ track }) => {
    track(() => nftGridLineColor.value);
    gridLineColor.value = nftGridLineColor.value;
  });
  const gridColorPresets = [
    { name: t('nftDetails.colors.green') || 'Green', value: 'rgba(16,185,129,0.45)' },
    { name: t('nftDetails.colors.red') || 'Red', value: 'rgba(239,68,68,0.45)' },
    { name: t('nftDetails.colors.blue') || 'Blue', value: 'rgba(59,130,246,0.45)' },
    { name: t('nftDetails.colors.yellow') || 'Yellow', value: 'rgba(234,179,8,0.45)' },
    { name: t('nftDetails.colors.gray') || 'Gray', value: 'rgba(107,114,128,0.45)' },
  ];
  const gridLinePresets = [
    { name: t('nftDetails.colors.white') || 'White', value: 'rgba(255,255,255,0.35)' },
    { name: t('nftDetails.colors.black') || 'Black', value: 'rgba(0,0,0,0.35)' },
    { name: t('nftDetails.colors.red') || 'Red', value: 'rgba(239,68,68,0.5)' },
    { name: t('nftDetails.colors.green') || 'Green', value: 'rgba(16,185,129,0.5)' },
    { name: t('nftDetails.colors.blue') || 'Blue', value: 'rgba(59,130,246,0.5)' },
    { name: t('nftDetails.colors.yellow') || 'Yellow', value: 'rgba(234,179,8,0.5)' },
    { name: t('nftDetails.colors.gray') || 'Gray', value: 'rgba(107,114,128,0.5)' },
  ];
  return (
    <div class="bg-gray-50 text-gray-900 antialiased min-h-screen">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {/* Header - Visible if NFT exists or metadata public */}
        {(nftExists.value || metadataIsPublic.value || isMinting.value) && (
          <div class="text-center mb-10">
            <h1 class="text-4xl sm:text-6xl font-bold tracking-tight flex flex-col items-center gap-2">
              {nftName.value || `NFT #${tokenIdStr}`}
              {activeMarket.value !== 'none' && (
                <span class="inline-block mt-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  {activeMarket.value === 'sale'
                    ? t('nftDetails.header.sale')
                    : activeMarket.value === 'rental'
                      ? t('nftDetails.header.rent')
                      : t('nftDetails.header.power')}
                </span>
              )}
            </h1>
            <p class="mt-3 text-lg text-gray-900 max-w-3xl mx-auto">{nftDescription.value || t('nftDetails.info.noAttrs')}</p>

            {/* Explicit Error Display for Demo Mode */}
            {isConnected.value && demoLoadError.value && (
              <div class="mt-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded max-w-lg mx-auto">
                <p class="font-bold">{t('nftDetails.alerts.demoError')}</p>
                <p class="font-mono text-sm">{t(demoLoadError.value)}</p>
              </div>
            )}

            {/* Minting in progress alert */}
            {isMinting.value && (
              <div class="mt-4 p-6 bg-[#c1272d]/10 border border-[#c1272d]/30 text-[#c1272d] rounded-2xl max-w-lg mx-auto flex flex-col items-center gap-3">
                <LuLoader class="w-8 h-8 animate-spin" />
                <div class="text-center">
                  <p class="font-bold text-lg">{t('nftDetails.alerts.mintingTitle@@Minting in Progress')}</p>
                  <p class="text-sm opacity-80">{t('nftDetails.alerts.mintingDesc@@Please wait while we confirm your transaction on the blockchain...')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Guard: Show content if Public OR Connected OR Loading. If Private and Disconnected, show Connect Wallet. */}
        {(!isConnected.value && metadataIsPublic.value === false) ? (
          <div class="mt-12 flex justify-center">
            <div class="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md text-center">
              <div class="p-4 bg-red-50 rounded-full">
                <LuWallet class="w-12 h-12 text-[#c1272d]" />
              </div>
              <div class="space-y-2">
                <h2 class="text-2xl font-bold text-gray-900">{t('nftDetails.alerts.connectBtn')}</h2>
                <p class="text-gray-500">
                  {t('nftDetails.alerts.connect')}
                </p>
              </div>
              <button
                class="px-6 py-3 rounded-xl bg-[#c1272d] hover:bg-[#a91f23] text-white font-medium transition-colors shadow-lg shadow-red-200"
                onClick$={connect}
              >
                {t('nftDetails.alerts.connectBtn')}
              </button>
            </div>
          </div>
        ) : (nftExists.value || metadataLoading.value || metadataIsPublic.value === true) ? (
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* LEFT */}
            <div class="lg:col-span-2 space-y-8">
              {/* Image */}

              {/* Leaflet Map (if applicable) */}
              {isLeafletNFT.value && leafletLocation.value && (
                <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden max-w-md mx-auto relative mb-6 shadow-sm" style={{ height: '400px', minHeight: '400px' }}>
                  {/* Leaflet Map */}
                  <div class="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                    <LeafletMap location={leafletLocation as any} style={nftMapStyle.value} height={400} interactive={false} />
                  </div>
                  {/* Cell overlay on the map, same as in mint */}
                  {isMapNFT.value && showGridOverlay.value && (
                    <div
                      class="absolute inset-0 pointer-events-none grid"
                      style={{
                        gridTemplateRows: `repeat(${mapParsed.value.rows}, 1fr)`,
                        gridTemplateColumns: `repeat(${mapParsed.value.cols}, 1fr)`,
                        zIndex: 10,
                      }}
                    >
                      {Array.from({ length: mapParsed.value.rows }).flatMap((_, r) =>
                        Array.from({ length: mapParsed.value.cols }).map((__, c) => {
                          const cellId = `R${r + 1}C${c + 1}`;
                          const isSelected = mapParsed.value.selectedSet.has(cellId);
                          return (
                            <div
                              key={cellId}
                              class="transition-colors"
                              style={{
                                border: `1px solid ${gridLineColor.value}`,
                                backgroundColor: isSelected
                                  ? gridCellColor.value // Use full opacity as in mint
                                  : 'rgba(239,68,68,0.35)', // match minting view
                                boxShadow: isSelected ? '0 0 2px 0 rgba(0,0,0,0.1)' : undefined,
                              }}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Main Image (Always visible if it exists, or as fallback) */}
              {(!isLeafletNFT.value || (imageUrl.value && !imageUrl.value.includes('placehold.co'))) && (
                <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden max-w-md mx-auto relative shadow-sm">
                  <img
                    src={
                      imageUrl.value ||
                      `https://placehold.co/500x500/1a1a1a/c1272d?text=NFT+${encodeURIComponent(
                        tokenIdStr,
                      )}`
                    }
                    alt={nftName.value || `NFT #${tokenIdStr}`}
                    width={400}
                    height={400}
                    class="w-full h-auto object-cover cursor-zoom-in"
                    onClick$={() => (showImageModal.value = true)}
                    onError$={() => {
                      imageUrl.value = `https://placehold.co/500x500/1a1a1a/c1272d?text=NFT+${encodeURIComponent(
                        tokenIdStr,
                      )}`;
                    }}
                  />
                  {/* Grid overlay on image if it's an image map and NOT a leaflet map (to avoid double grid if showing both) */}
                  {isMapNFT.value && showGridOverlay.value && !isLeafletNFT.value && (
                    <>
                      {/* Cells */}
                      <div
                        class="absolute inset-0 pointer-events-none grid"
                        style={{
                          gridTemplateRows: `repeat(${mapParsed.value.rows}, 1fr)`,
                          gridTemplateColumns: `repeat(${mapParsed.value.cols}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: mapParsed.value.rows }).flatMap((_, r) =>
                          Array.from({ length: mapParsed.value.cols }).map((__, c) => {
                            const cellId = `R${r + 1}C${c + 1}`;
                            const isSelected = mapParsed.value.selectedSet.has(cellId);
                            return (
                              <div
                                key={cellId}
                                class="transition-colors"
                                style={{
                                  border: `1px solid ${gridLineColor.value}`,
                                  backgroundColor: isSelected
                                    ? gridCellColor.value   // color seleccionable
                                    : 'rgba(239,68,68,0.45)',   // rojo = no disponible
                                }}
                              />
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}


              {isMapNFT.value && (
                <div class="flex flex-wrap gap-2 justify-center mt-2 items-center">
                  <button
                    onClick$={() => (showGridOverlay.value = !showGridOverlay.value)}
                    class="px-3 py-1 text-xs rounded bg-gray-50 border border-gray-200 hover:bg-gray-200"
                  >
                    {showGridOverlay.value ? t('nftDetails.map.hideGrid') : t('nftDetails.map.showGrid')}
                  </button>
                  <button
                    onClick$={() => (showImageModal.value = true)}
                    class="px-3 py-1 text-xs rounded bg-gray-50 border border-gray-200 hover:bg-gray-200"
                  >
                    {t('nftDetails.map.viewFullscreen')}
                  </button>
                  <label class="text-xs ml-2">{t('nftDetails.map.cellColor')}</label>
                  <select
                    class="px-2 py-1 text-xs rounded bg-gray-50 border border-gray-200"
                    value={gridCellColor.value}
                    onChange$={(_, el) => (gridCellColor.value = (el as HTMLSelectElement).value)}
                  >
                    {gridColorPresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>{preset.name}</option>
                    ))}
                  </select>
                  <label class="text-xs ml-2">{t('nftDetails.map.lineColor')}</label>
                  <select
                    class="px-2 py-1 text-xs rounded bg-gray-50 border border-gray-200"
                    value={gridLineColor.value}
                    onChange$={(_, el) => (gridLineColor.value = (el as HTMLSelectElement).value)}
                  >
                    {gridLinePresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>{preset.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fullscreen modal for image with grid */}
              {showImageModal.value && (
                <div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" style={{ backdropFilter: 'blur(2px)' }}>
                  <div class="relative max-w-full max-h-full flex items-center justify-center">
                    <img
                      src={
                        imageUrl.value ||
                        `https://placehold.co/1200x1200/1a1a1a/c1272d?text=NFT+${encodeURIComponent(tokenIdStr)}`
                      }
                      alt={nftName.value || `NFT #${tokenIdStr}`}
                      class="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
                    />
                    {/* Grid overlay and dividing lines */}
                    {isMapNFT.value && showGridOverlay.value && (
                      <>
                        <div
                          class="absolute inset-0 pointer-events-none grid"
                          style={{
                            gridTemplateRows: `repeat(${mapParsed.value.rows}, 1fr)`,
                            gridTemplateColumns: `repeat(${mapParsed.value.cols}, 1fr)`,
                          }}
                        >
                          {Array.from({ length: mapParsed.value.rows }).flatMap((_, r) =>
                            Array.from({ length: mapParsed.value.cols }).map((__, c) => {
                              const cellId = `R${r + 1}C${c + 1}`;
                              const isSelected = mapParsed.value.selectedSet.has(cellId);
                              return (
                                <div
                                  key={cellId}
                                  class="transition-colors"
                                  style={{
                                    backgroundColor: isSelected
                                      ? gridCellColor.value
                                      : 'rgba(239,68,68,0.45)',
                                  }}
                                />
                              );
                            })
                          )}
                        </div>
                        <svg
                          class="absolute inset-0 w-full h-full pointer-events-none"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          {/* Horizontal lines */}
                          {Array.from({ length: mapParsed.value.rows - 1 }).map((_, i) => {
                            const y = ((i + 1) * 100) / mapParsed.value.rows;
                            return (
                              <line
                                key={`h-modal-${i}`}
                                x1="0" y1={y} x2="100" y2={y}
                                stroke={gridLineColor.value}
                                stroke-width="0.7"
                              />
                            );
                          })}
                          {/* Vertical lines */}
                          {Array.from({ length: mapParsed.value.cols - 1 }).map((_, i) => {
                            const x = ((i + 1) * 100) / mapParsed.value.cols;
                            return (
                              <line
                                key={`v-modal-${i}`}
                                x1={x} y1="0" x2={x} y2="100"
                                stroke={gridLineColor.value}
                                stroke-width="0.7"
                              />
                            );
                          })}
                        </svg>
                      </>
                    )}
                  </div>
                  <button
                    onClick$={() => (showImageModal.value = false)}
                    class="absolute top-6 right-8 px-4 py-2 text-lg rounded bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
                  >
                    {t('nftDetails.map.close')}
                  </button>
                </div>
              )}

              {/* Details + Attributes */}
              <div class="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 class="text-xl mb-3 flex items-center gap-2">
                  <LuInfo /> {t('nftDetails.info.title')}
                </h3>

                {/* tokenURI panel */}
                <div class="space-y-2 mb-3">
                  <div class="text-xs text-gray-600">{t('nftDetails.info.tokenUri')}</div>
                  <div class="bg-gray-100 rounded p-2 font-mono text-xs break-all max-h-24 overflow-y-auto">
                    {tokenUriRaw.value?.startsWith('data:')
                      ? tokenUriRaw.value.slice(0, 100) + `... (${t('nftDetails.info.truncated') || 'truncated data URI'})`
                      : tokenUriRaw.value || '—'}
                  </div>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      class="px-2 py-1 text-xs rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 inline-flex items-center gap-1"
                      onClick$={() => copyToClipboard(tokenUriRaw.value)}
                      disabled={!tokenUriRaw.value}
                    >
                      <LuCopy class="w-3 h-3" /> {t('nftDetails.info.copy')}
                    </button>
                    {tokenUriHttp.value && (
                      <a
                        href={tokenUriHttp.value}
                        target="_blank"
                        rel="noreferrer"
                        class="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-1"
                      >
                        <LuExternalLink class="w-3 h-3" /> {t('nftDetails.info.gateway')}
                      </a>
                    )}

                    {/* NEW: Download PDF (only with access) */}
                    {hasMetaAccess.value && metadataJsonRaw.value && (
                      <button
                        class="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-1"
                        onClick$={() =>
                          generateCertificatePdf$({
                            sale: { listed: !!saleListed.value, listing: saleListing.value && { price: saleListing.value.price } },
                            rental: {
                              listed: !!rentalListed.value,
                              listing: rentalListing.value && {
                                basePrice: rentalListing.value.basePrice,
                                duration: rentalListing.value.duration,
                              },
                            },
                            power: {
                              listed: !!powerListed.value,
                              listing: powerListing.value && {
                                basePrice: powerListing.value.basePrice,
                                duration: powerListing.value.duration,
                                payUpfront: powerListing.value.payUpfront,
                              },
                            },
                          })
                        }
                      >
                        <LuDownload class="w-3 h-3" /> {t('nftDetails.info.cert')}
                      </button>
                    )}
                  </div>

                  {/* NEW: access state */}
                  {hasMetaAccess.value !== null && (
                    <div class="text-xs pt-1">
                      {t('nftDetails.info.access')}{' '}
                      <span class={hasMetaAccess.value ? 'text-green-600 font-bold' : 'text-red-400 font-bold'}>
                        {metadataIsPublic.value
                          ? (t('nftDetails.info.public') || 'Public Access')
                          : hasMetaAccess.value
                            ? t('nftDetails.info.granted')
                            : t('nftDetails.info.denied')}
                      </span>
                    </div>
                  )}

                  {/* NEW: Metadata Visibility Toggle (Only for Owner) */}
                  {nftExists.value && isConnected.value && userAddress.value &&
                    nftOwner.value.toLowerCase() === userAddress.value.toLowerCase() && (
                      <div class="mt-3 p-3 rounded-lg border border-white/10 bg-white">
                        <div class="flex items-center justify-between gap-3">
                          <div class="flex-1">
                            <div class="text-xs font-medium text-[#c1272d] mb-1">{t('nftDetails.info.visibility')}</div>
                            <div class="text-xs text-gray-600">
                              {metadataIsPublic.value === null
                                ? t('nftDetails.info.loading')
                                : metadataIsPublic.value
                                  ? t('nftDetails.info.public')
                                  : t('nftDetails.info.private')}
                            </div>
                          </div>
                          <button
                            onClick$={async () => {
                              if (metadataIsPublic.value === null) {
                                await loadMetadataVisibility();
                              }
                              await toggleMetadataVisibility();
                            }}
                            disabled={metadataVisibilityLoading.value || metadataIsPublic.value === null}
                            class="px-3 py-1.5 rounded-lg bg-[#c1272d] hover:bg-[#a91f23] text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                          >
                            {metadataVisibilityLoading.value ? (
                              <>
                                <LuLoader class="w-3 h-3 animate-spin" />
                                {t('nftDetails.info.changing')}
                              </>
                            ) : metadataIsPublic.value === null ? (
                              t('nftDetails.info.loading')
                            ) : metadataIsPublic.value ? (
                              <>
                                <LuEyeOff class="w-3 h-3" />
                                {t('nftDetails.info.makePrivate')}
                              </>
                            ) : (
                              <>
                                <LuEye class="w-3 h-3" />
                                {t('nftDetails.info.makePublic')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                </div>

                {/* Metadata JSON */}
                <div class="space-y-2 mb-5">
                  <div class="text-xs text-gray-600">{t('nftDetails.info.json')}</div>
                  <pre class="bg-black/40 border border-white/10 rounded p-3 text-xs overflow-auto max-h-80">
                    {metadataText.value || t('nftDetails.info.locked')}
                  </pre>
                  {!metadataJsonRaw.value && (
                    <button
                      class="px-2 py-1 text-xs rounded bg-gray-50 border border-gray-200 hover:bg-gray-200"
                      onClick$={() => loadNFTData()}
                    >
                      {t('nftDetails.info.retry')}
                    </button>
                  )}
                </div>

                {/* Contract + Owner */}
                <div class="mb-4 p-3 bg-gray-100 rounded-lg">
                  <div class="text-xs text-gray-600 mb-1">{t('nftDetails.info.contract')}</div>
                  <div class="font-mono text-sm text-gray-900" title={contracts?.value?.nft?.address}>
                    {contracts?.value?.nft?.address || t('nftDetails.info.notConfigured')}
                  </div>
                </div>

                <h4 class="text-lg mb-2">{t('nftDetails.info.attrs')}</h4>
                {nftAttributes.value.length ? (
                  <div class="grid grid-cols-2 gap-3">
                    {nftAttributes.value.map((attr, i) => {
                      const rawTrait = attr.trait_type || '';
                      const cleanKey = rawTrait.split(' (')[0].replace(/\s+/g, '');
                      return (
                        <div key={i} class="bg-white border border-white/10 rounded-lg p-3 text-center break-words">
                          <p class="text-xs text-gray-600 uppercase tracking-wider break-words truncate">
                            {t(`nftDetails.attributes.${cleanKey}`, {}, rawTrait)}
                          </p>
                          <p class="font-semibold text-base break-words max-h-24 overflow-y-auto" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{String(attr.value)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div class="text-sm text-gray-600">{t('nftDetails.info.noAttrs')}</div>
                )}

                <div class="mt-5 text-xs text-gray-600">{t('nftDetails.info.effectiveOwner')}</div>
                <div class="font-mono text-sm truncate">
                  {metadataLoading.value ? (
                    <span class="text-gray-900">{t('nftDetails.info.loading')}</span>
                  ) : nftError.value ? (
                    <span class="text-red-400">{nftError.value}</span>
                  ) : effectiveOwner ? (
                    <span class="text-gray-900">
                      {effectiveOwner.toLowerCase() === '0xdemo_user' ? t('nftDetails.info.demoUser') : (
                        isOwner.value ? (
                          <span class="flex items-center gap-1.5">
                            <span class="bg-[#c1272d]/10 text-[#c1272d] px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              {t('nftDetails.info.you')}
                            </span>
                            {effectiveOwner}
                          </span>
                        ) : effectiveOwner
                      )}
                    </span>
                  ) : (
                    <span class="text-gray-900">{t('nftDetails.info.unavailable')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT (Markets) */}
            <div class="lg:col-span-3 space-y-8">
              {/* ===== Sale ===== */}
              {activeMarket.value === 'sale' && (
                <div class="bg-white border border-gray-200 rounded-2xl p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl flex items-center gap-2">
                      <LuShoppingCart /> {t('nftDetails.market.sale.title')}
                    </h3>
                    <div
                      class="text-xs text-gray-900 font-mono truncate max-w-[200px]"
                      title={contracts?.value?.sale?.address}
                    >
                      {contracts?.value?.sale?.address
                        ? `${contracts.value.sale!.address.slice(0, 6)}...${contracts.value.sale!.address.slice(
                          -4,
                        )}`
                        : t('nftDetails.info.notConfigured')}
                    </div>
                  </div>

                  {saleChecking.value ? (
                    <div class="flex flex-col items-center gap-2 text-gray-600 py-8">
                      <span class="animate-spin text-3xl">⏳</span>
                      <span class="font-semibold text-lg">{t('nftDetails.market.sale.checking')}</span>
                    </div>
                  ) : (
                    <>
                      {saleListed.value && isOwner.value && saleListing.value && (
                        <div class="space-y-4">
                          <div class="p-3 rounded border border-green-200 bg-green-50 text-green-700">
                            <div class="flex items-center gap-2 font-semibold">
                              <LuCheck /> {t('nftDetails.market.sale.listedOwner')}
                            </div>
                            <div class="text-sm mt-1">
                              {t('nftDetails.market.sale.price')} {prettyAmount(safeString(saleListing.value.price))} KNRT
                            </div>
                          </div>

                          {saleMsg.value && (
                            <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                              {saleMsg.value}
                            </div>
                          )}

                          <button
                            class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 disabled:opacity-60"
                            disabled={saleCancelLoading.value}
                            onClick$={onCancelSale$}
                          >
                            {saleCancelLoading.value ? t('nftDetails.market.sale.canceling') : t('nftDetails.market.sale.cancel')}
                          </button>
                        </div>
                      )}

                      {/* Disconnected: Show price and Connect Wallet */}
                      {saleListed.value && saleListing.value && !isConnected.value && (
                        <div class="space-y-3">
                          <div class="text-center py-4">
                            <div class="text-sm text-gray-600 mb-2">{t('nftDetails.market.sale.priceLabel')}</div>
                            <div class="flex items-baseline justify-center gap-2">
                              <span class="text-4xl font-bold text-gray-900">
                                {prettyAmount(safeString(saleListing.value.price))}
                              </span>
                              <span class="text-xl text-[#c1272d] font-medium">KNRT</span>
                            </div>
                          </div>
                          <button
                            class="w-full px-3 py-2 rounded bg-[#c1272d] hover:bg-[#a91f23] text-white flex items-center justify-center gap-2"
                            onClick$={connect}
                          >
                            <LuWallet class="w-4 h-4" />
                            {t('nftDetails.market.sale.connectToBuy') || 'Connect to Buy'}
                          </button>
                        </div>
                      )}

                      {saleListed.value && saleListing.value && isConnected.value && !isOwner.value && (
                        <div class="space-y-3">
                          <div class="text-center py-4">
                            <div class="text-sm text-gray-600 mb-2">{t('nftDetails.market.sale.priceLabel')}</div>
                            <div class="flex items-baseline justify-center gap-2">
                              <span class="text-4xl font-bold text-gray-900">
                                {prettyAmount(safeString(saleListing.value.price))}
                              </span>
                              <span class="text-xl text-[#c1272d] font-medium">KNRT</span>
                            </div>
                          </div>

                          {saleMsg.value && (
                            <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                              {saleMsg.value}
                            </div>
                          )}

                          <button
                            class="w-full px-3 py-2 rounded bg-[#c1272d] hover:bg-[#a91f23] text-white disabled:opacity-60"
                            disabled={saleBuyLoading.value}
                            onClick$={onBuyNow$}
                          >
                            {saleBuyLoading.value ? t('nftDetails.market.sale.buying') : t('nftDetails.market.sale.buy')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ===== Rental ===== */}
              {activeMarket.value === 'rental' && (
                <>
                  <div class="bg-white border border-gray-200 rounded-2xl p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-xl">{t('nftDetails.market.rental.title')}</h3>
                      <div
                        class="text-xs text-gray-900 font-mono truncate max-w-[200px]"
                        title={contracts?.value?.rental?.address}
                      >
                        {contracts?.value?.rental?.address
                          ? `${contracts.value.rental!.address.slice(0, 6)}...${contracts.value.rental!.address.slice(
                            -4,
                          )}`
                          : t('nftDetails.info.notConfigured')}
                      </div>
                    </div>

                    {/* Listing Info (Public) */}
                    {rentalListed.value && rentalListing.value && (
                      <div class="space-y-3 mb-4">
                        <div class={`p-3 rounded border ${isOwner.value ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                          {isOwner.value && (
                            <div class="flex items-center gap-2 font-semibold mb-2">
                              <LuCheck /> {t('nftDetails.market.rental.listedOwner')}
                            </div>
                          )}
                          <div class="flex items-center gap-6">
                            <div>
                              <div class="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{t('nftDetails.market.rental.base')}</div>
                              <div class="text-xl font-bold flex items-baseline gap-1">
                                {prettyAmount(safeString(rentalListing.value.basePrice))}
                                <span class="text-xs font-medium uppercase">KNRT</span>
                              </div>
                            </div>
                            <div class="w-px h-8 bg-current opacity-20" />
                            <div>
                              <div class="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{t('nftDetails.market.rental.duration')}</div>
                              <div class="text-xl font-bold">
                                {formatDuration(rentalListing.value.duration, t)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isOwner.value && (
                          <div class="space-y-3">
                            {rentalMsg.value && (
                              <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                                {rentalMsg.value}
                              </div>
                            )}
                            <button
                              class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 disabled:opacity-60 text-sm"
                              disabled={rentalCancelLoading.value}
                              onClick$={onCancelRental$}
                            >
                              {rentalCancelLoading.value ? t('nftDetails.market.rental.canceling') : t('nftDetails.market.rental.cancel')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Not owner: make offer */}
                    {/* Not owner: make offer */}
                    {!isOwner.value && isConnected.value && hasRental.value && (
                      <div class="mt-3 grid grid-cols-3 gap-3">
                        <div class="col-span-2">
                          <label class="text-sm text-gray-900">{t('nftDetails.market.rental.yourOffer')}</label>
                          <input
                            type="number"
                            placeholder="1–100"
                            class="mt-1 w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                            value={rentalOfferPct.value}
                            onInput$={(_, el) =>
                              (rentalOfferPct.value = (el as HTMLInputElement).value)
                            }
                          />
                        </div>
                        <div class="flex items-end">
                          <button
                            class="w-full px-3 py-2 rounded bg-[#c1272d] hover:bg-[#a91f23] text-white disabled:opacity-60"
                            disabled={rentalOfferLoading.value}
                            onClick$={onMakeRentalOffer$}
                          >
                            {rentalOfferLoading.value ? t('nftDetails.market.rental.sending') : t('nftDetails.market.rental.makeOffer')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Disconnected Rental */}
                    {!isConnected.value && rentalListed.value && (
                      <div class="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50 text-center">
                        <p class="text-sm text-gray-600 mb-3">{t('nftDetails.market.rental.connectMessage') || 'Connect wallet to make a rental offer'}</p>
                        <button
                          onClick$={connect}
                          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c1272d] text-white text-sm font-medium hover:bg-[#a91f23] transition-colors"
                        >
                          <LuWallet class="w-4 h-4" />
                          {t('nftDetails.alerts.connectBtn')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Open offers */}
                  <div class="p-3 rounded border border-gray-200 bg-white mb-4">
                    <div class="text-sm font-semibold mb-2">{t('nftDetails.market.rental.offersTitle')}</div>
                    {rentalOpenOffers.value.length ? (
                      <div class="space-y-2">
                        {rentalOpenOffers.value.map((o: any, idx: number) => {
                          const realIdx = rentalOffers.value.findIndex(
                            (x: any) =>
                              x.renter === o.renter &&
                              Number(x.percentage) === Number(o.percentage) &&
                              String(x.offerTime) === String(o.offerTime),
                          );
                          const canWithdraw =
                            isConnected.value &&
                            !o.accepted &&
                            BigInt(o.amountPaidWei || '0') > 0n &&
                            userAddress.value?.toLowerCase() === String(o.renter).toLowerCase();

                          return (
                            <div
                              key={`${o.renter}-${o.offerTime}-${idx}`}
                              class="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
                            >
                              <div class="truncate">
                                <div>
                                  {t('nftDetails.market.rental.renterLabel')}: <span class="font-mono">{o.renter}</span>
                                </div>
                                <div>{t('nftDetails.market.rental.pctLabel')}: {String(o.percentage)}%</div>
                                <div class="text-xs text-gray-600">
                                  {t('nftDetails.market.rental.escrowLabel')}: {prettyAmount(o.amountPaid)} KNRT
                                </div>
                              </div>
                              <div class="flex gap-2">
                                {isOwner.value && !o.accepted && (
                                  <button
                                    class="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                                    disabled={rentalAcceptIdx.value === realIdx}
                                    onClick$={() => onAcceptRentalOffer$(realIdx)}
                                  >
                                    {rentalAcceptIdx.value === realIdx ? t('nftDetails.market.rental.accepting') : t('nftDetails.market.rental.acceptBtn')}
                                  </button>
                                )}
                                {canWithdraw && (
                                  <button
                                    class="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-50 disabled:opacity-60"
                                    disabled={rentalWithdrawIdx.value === realIdx}
                                    onClick$={() => onWithdrawRentalOffer$(realIdx)}
                                  >
                                    {rentalWithdrawIdx.value === realIdx ? t('nftDetails.market.rental.withdrawing') : t('nftDetails.market.rental.withdraw')}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div class="text-xs text-gray-600">{t('nftDetails.market.rental.noOffers')}</div>
                    )}
                  </div>

                  {/* History: withdrawn/paid */}
                  <div class="p-3 rounded border border-gray-200 bg-white">
                    <div class="text-sm font-semibold mb-2">{t('nftDetails.market.rental.history')}</div>
                    {rentalWithdrawnOffers.value.length ? (
                      <div class="space-y-2">
                        {rentalWithdrawnOffers.value.map((o: any, idx: number) => (
                          <div
                            key={`hist-${o.renter}-${o.offerTime}-${idx}`}
                            class="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
                          >
                            <div class="truncate">
                              <div>
                                {t('nftDetails.market.rental.renterLabel')}: <span class="font-mono">{o.renter}</span>
                              </div>
                              <div>{t('nftDetails.market.rental.pctLabel')}: {String(o.percentage)}%</div>
                              <div class="text-xs text-gray-600">
                                {t('nftDetails.market.rental.escrowLabel')}: 0 KNRT · {t('nftDetails.market.rental.withdrawnNote')}
                              </div>
                            </div>
                            <div class="text-xs text-gray-600">
                              {o.accepted ? t('nftDetails.market.rental.acceptedStatus') : t('nftDetails.market.rental.withdrawnStatus')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div class="text-xs text-gray-600">{t('nftDetails.market.rental.noHistory')}</div>
                    )}
                  </div>

                  <div class="bg-white border border-gray-200 rounded-2xl p-4">
                    <div class="text-sm font-semibold mb-2">{t('nftDetails.market.rental.activeRenters')}</div>
                    {rentalRenters.value.length ? (
                      <ul class="text-xs space-y-1">
                        {rentalRenters.value.map((r) => (
                          <li key={r} class="font-mono truncate">
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div class="text-xs text-gray-600">{t('nftDetails.market.rental.none')}</div>
                    )}

                    {iAmRenter.value && (
                      <div class="mt-3">
                        <button
                          class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 disabled:opacity-60"
                          disabled={rentalEndLoading.value}
                          onClick$={onEndRental$}
                        >
                          {rentalEndLoading.value ? t('nftDetails.market.rental.ending') : t('nftDetails.market.rental.endRental')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ===== Power ===== */}
              {activeMarket.value === 'power' && (
                <>
                  <div class="bg-white border border-gray-200 rounded-2xl p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-xl">{t('nftDetails.market.power.title')}</h3>
                      <div
                        class="text-xs text-gray-900 font-mono truncate max-w-[200px]"
                        title={contracts?.value?.power?.address}
                      >
                        {contracts?.value?.power?.address
                          ? `${contracts.value.power!.address.slice(0, 6)}...${contracts.value.power!.address.slice(
                            -4,
                          )}`
                          : t('nftDetails.info.notConfigured')}
                      </div>
                    </div>

                    {/* Listing Info (Public) */}
                    {powerListed.value && powerListing.value && (
                      <div class="space-y-3 mb-4">
                        <div class={`p-3 rounded border ${isOwner.value ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                          <div class="flex items-center gap-2 font-semibold mb-2">
                            {isOwner.value ? <LuCheck /> : <LuInfo class="w-4 h-4" />}
                            {isOwner.value ? t('nftDetails.market.power.active') : t('nftDetails.market.power.title')}
                          </div>
                          <div class="flex items-center gap-6">
                            <div>
                              <div class="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{t('nftDetails.market.power.base')}</div>
                              <div class="text-xl font-bold flex items-baseline gap-1">
                                {prettyAmount(safeString(powerListing.value.basePrice))}
                                <span class="text-xs font-medium uppercase">KNRT</span>
                              </div>
                            </div>
                            <div class="w-px h-8 bg-current opacity-20" />
                            <div>
                              <div class="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{t('nftDetails.market.power.duration')}</div>
                              <div class="text-xl font-bold">
                                {formatDuration(powerListing.value.duration, t)}
                              </div>
                            </div>
                            {powerListing.value.payUpfront && (
                              <>
                                <div class="w-px h-8 bg-current opacity-20" />
                                <div>
                                  <div class="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{t('nftDetails.market.power.upfrontLabel')}</div>
                                  <div class="text-xs font-semibold">{t('nftDetails.market.power.active')}</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {isOwner.value && (
                          <div class="space-y-3">
                            {powerMsg.value && (
                              <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                                {powerMsg.value}
                              </div>
                            )}
                            <button
                              class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 disabled:opacity-60 text-sm"
                              disabled={powerCancelLoading.value}
                              onClick$={onCancelPower$}
                            >
                              {powerCancelLoading.value ? t('nftDetails.market.power.canceling') : t('nftDetails.market.power.cancel')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Not owner: make offer */}
                    {/* Not owner: make offer */}
                    {!isOwner.value && isConnected.value && hasPower.value && (
                      <div class="mt-3 grid grid-cols-3 gap-3">
                        <div class="col-span-2">
                          <label class="text-sm text-gray-900">{t('nftDetails.market.power.yourOffer')}</label>
                          <input
                            type="number"
                            placeholder="1–100"
                            class="mt-1 w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                            value={powerOfferPct.value}
                            onInput$={(_, el) =>
                              (powerOfferPct.value = (el as HTMLInputElement).value)
                            }
                          />
                        </div>
                        <div class="flex items-end">
                          <button
                            class="w-full px-3 py-2 rounded bg-[#c1272d] hover:bg-[#a91f23] text-white disabled:opacity-60"
                            disabled={powerOfferLoading.value}
                            onClick$={onMakePowerOffer$}
                          >
                            {powerOfferLoading.value ? t('nftDetails.market.power.sending') : t('nftDetails.market.power.makeOffer')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Disconnected Power */}
                    {!isConnected.value && powerListed.value && (
                      <div class="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50 text-center">
                        <p class="text-sm text-gray-600 mb-3">{t('nftDetails.market.power.connectMessage') || 'Connect wallet to make a power offer'}</p>
                        <button
                          onClick$={connect}
                          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c1272d] text-white text-sm font-medium hover:bg-[#a91f23] transition-colors"
                        >
                          <LuWallet class="w-4 h-4" />
                          {t('nftDetails.alerts.connectBtn')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Open offers (same style as Rental) */}
                  <div class="p-3 rounded border border-gray-200 bg-white mb-4">
                    <div class="text-sm font-semibold mb-2">{t('nftDetails.market.power.offersTitle')}</div>
                    {powerOpenOffers.value.length ? (
                      <div class="space-y-2">
                        {powerOpenOffers.value.map((o: any, idx: number) => {
                          const realIdx = powerOffers.value.findIndex(
                            (x: any) =>
                              x.renter === o.renter &&
                              Number(x.percentage) === Number(o.percentage) &&
                              String(x.offerTime) === String(o.offerTime),
                          );
                          const canWithdraw =
                            isConnected.value &&
                            !o.accepted &&
                            BigInt(o.amountPaidWei || '0') > 0n &&
                            userAddress.value?.toLowerCase() === String(o.renter).toLowerCase();
                          return (
                            <div
                              key={`${o.renter}-${o.offerTime}-${idx}`}
                              class="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
                            >
                              <div class="truncate">
                                <div>
                                  {t('nftDetails.market.power.renterLabel')}: <span class="font-mono">{o.renter}</span>
                                </div>
                                <div>{t('nftDetails.market.power.pctLabel')}: {String(o.percentage)}%</div>
                                <div class="text-xs text-gray-600">
                                  {t('nftDetails.market.power.escrowLabel')}: {prettyAmount(o.amountPaid)} KNRT
                                </div>
                              </div>
                              <div class="flex gap-2">
                                {isOwner.value && !o.accepted && (
                                  <button
                                    class="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                                    disabled={powerAcceptIdx.value === realIdx}
                                    onClick$={() => onAcceptPowerOffer$(realIdx)}
                                  >
                                    {powerAcceptIdx.value === realIdx ? t('nftDetails.market.power.accepting') : t('nftDetails.market.power.acceptBtn')}
                                  </button>
                                )}
                                {canWithdraw && (
                                  <button
                                    class="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-50 disabled:opacity-60"
                                    disabled={powerWithdrawIdx.value === realIdx}
                                    onClick$={() => onWithdrawPowerOffer$(realIdx)}
                                  >
                                    {powerWithdrawIdx.value === realIdx ? t('nftDetails.market.power.withdrawing') : t('nftDetails.market.power.withdrawBtn')}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div class="text-xs text-gray-600">{t('nftDetails.market.power.noOffers')}</div>
                    )}
                  </div>

                  {/* Power history (most recent first) */}
                  <div class="p-3 rounded border border-gray-200 bg-white">
                    <div class="text-sm font-semibold mb-2">{t('nftDetails.market.power.history')}</div>
                    {powerWithdrawnOffers.value.length ? (
                      <div class="space-y-2">
                        {powerWithdrawnOffers.value.map((o: any, idx: number) => (
                          <div
                            key={`phist-${o.renter}-${o.offerTime}-${idx}`}
                            class="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
                          >
                            <div class="truncate">
                              <div>
                                {t('nftDetails.market.power.renterLabel')}: <span class="font-mono">{o.renter}</span>
                              </div>
                              <div>{t('nftDetails.market.power.pctLabel')}: {String(o.percentage)}%</div>
                              <div class="text-xs text-gray-600">{t('nftDetails.market.power.escrowLabel') || 'Escrow'}: 0 KNRT · {t('nftDetails.market.power.withdrawnNote') || '(already withdrawn/paid)'}</div>
                            </div>
                            <div class="text-xs text-gray-600">{o.accepted ? t('nftDetails.market.power.acceptedStatus') : t('nftDetails.market.power.withdrawnStatus')}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div class="text-xs text-gray-600">{t('nftDetails.market.power.noHistory')}</div>
                    )}
                  </div>

                  {/* Users with access (Power) */}
                  <div class="p-3 rounded border border-gray-200 bg-white">
                    <div class="text-sm font-semibold mb-2">{t('nftDetails.market.power.usersAccess')}</div>
                    {powerRenters.value.length ? (
                      <ul class="text-xs space-y-1">
                        {powerRenters.value.map((r) => (
                          <li key={r} class="font-mono truncate">
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div class="text-xs text-gray-600">{t('nftDetails.market.power.none')}</div>
                    )}
                    <div class="text-xs text-gray-600 mt-3">
                      {t('nftDetails.market.power.yourAccess')}{' '}
                      {myPowerAccessUntil.value && myPowerAccessUntil.value > BigInt(0)
                        ? t('nftDetails.market.power.validUntil') + ' ' +
                        new Date(Number(myPowerAccessUntil.value) * 1000).toLocaleString()
                        : t('nftDetails.market.power.noAccess')}
                    </div>
                  </div>
                </>
              )}

              {/* ===== Chat (only for rental or power) ===== */}
              {chatMarket.value && (
                <div class="bg-white border border-gray-200 rounded-2xl p-4">
                  <h3 class="text-xl mb-3">{t('nftDetails.chat.title')} ({chatMarket.value})</h3>

                  {chatError.value && (
                    <div class="mb-2 p-2 rounded bg-red-900/40 border border-red-800 text-xs text-red-700">
                      {chatError.value}
                    </div>
                  )}

                  {/* Conversation selector */}
                  <div class="mb-3">
                    <label class="text-sm text-gray-900 mb-2 block">{t('nftDetails.chat.with')}</label>
                    {chatPartners.value.length > 0 ? (
                      <div class="flex gap-2">
                        <select
                          class="flex-1 px-3 py-2 rounded bg-gray-50 border border-gray-200 font-mono text-sm"
                          value={selectedChatPartner.value || ''}
                          onChange$={(_, el) => {
                            selectedChatPartner.value = (el as HTMLSelectElement).value;
                            loadChatMessages();
                          }}
                        >
                          {chatPartners.value.map((addr) => {
                            const label = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                            return (
                              <option key={addr} value={addr}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          class="px-3 py-2 rounded bg-gray-50 border border-gray-200 hover:bg-gray-200 text-xs"
                          onClick$={loadChatPartners}
                          disabled={chatLoading.value}
                        >
                          {chatLoading.value ? '↻' : t('nftDetails.chat.refresh')}
                        </button>
                      </div>
                    ) : (
                      <div class="text-xs text-gray-600 p-2 bg-gray-100 rounded">
                        {isConnected.value
                          ? t('nftDetails.chat.noConvo')
                          : t('nftDetails.chat.connect')
                        }
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  {selectedChatPartner.value && (
                    <>
                      <div
                        ref={chatMessagesContainerRef}
                        class="space-y-2 max-h-80 overflow-auto mb-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700 pr-1 scroll-smooth"
                      >
                        {(chatMessages.value.length > 0 || chatPendingMessage.value) ? (
                          <>
                            {chatMessages.value.slice().reverse().map((m) => {
                              const isFromMe = userAddress.value && m.from_address &&
                                userAddress.value.toLowerCase() === String(m.from_address).toLowerCase();
                              return (
                                <div
                                  key={m.id}
                                  class={[
                                    'p-2 rounded text-xs border',
                                    isFromMe
                                      ? 'bg-red-700/30 border-red-600 ml-8'
                                      : 'bg-gray-100 border-gray-200 mr-8'
                                  ].join(' ')}
                                >
                                  <div class="font-mono truncate text-[10px] text-gray-600 mb-1">
                                    {isFromMe ? t('nftDetails.chat.you') : `${m.from_address?.slice(0, 6)}...${m.from_address?.slice(-4)}`}
                                  </div>
                                  <div class="whitespace-pre-wrap break-words text-gray-900">
                                    {m.body}
                                  </div>
                                  <div class="mt-1 text-[10px] text-gray-900 text-right">
                                    {(() => {
                                      const date = new Date((m.created_at || 0) * 1000);
                                      const now = new Date();
                                      const diffMs = now.getTime() - date.getTime();
                                      const diffMins = Math.floor(diffMs / 60000);
                                      const diffHours = Math.floor(diffMs / 3600000);
                                      const diffDays = Math.floor(diffMs / 86400000);

                                      // Show relative time for recent messages
                                      if (diffMins < 1) return t('nftDetails.chat.justNow');
                                      if (diffMins < 60) return `${diffMins}m ${t('nftDetails.chat.ago')}`;
                                      if (diffHours < 24) return `${diffHours}h ${t('nftDetails.chat.ago')}`;
                                      if (diffDays < 7) return `${diffDays}d ${t('nftDetails.chat.ago')}`;

                                      // Show date for older messages
                                      return date.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    })()}
                                  </div>
                                </div>
                              );
                            })}
                            {/* Show pending message at the bottom (most recent) */}
                            {chatPendingMessage.value && (
                              <div class="p-2 rounded text-xs border bg-red-700/20 border-red-600/50 ml-8 opacity-70">
                                <div class="font-mono truncate text-[10px] text-gray-600 mb-1 flex items-center gap-1">
                                  <span>{t('nftDetails.chat.you')}</span>
                                  <span class="text-yellow-400">(sending...)</span>
                                </div>
                                <div class="whitespace-pre-wrap break-words text-gray-900">
                                  {chatPendingMessage.value.body}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div class="text-xs text-gray-900">No messages yet. Start the conversation!</div>
                        )}
                      </div>
                      <div class="space-y-2">
                        {!isConnected.value && (
                          <div class="text-xs text-yellow-400">{t('nftDetails.chat.connectToSend')}</div>
                        )}
                        <textarea
                          class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 text-sm disabled:opacity-50"
                          rows={3}
                          placeholder={isConnected.value ? t('nftDetails.chat.placeholder') : t('nftDetails.chat.placeholderConnect')}
                          value={chatInput.value}
                          onInput$={(_, el) => (chatInput.value = (el as HTMLTextAreaElement).value)}
                          onKeyDown$={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              if (chatInput.value.trim() && isConnected.value && !chatLoading.value) {
                                sendChatMessage();
                              }
                            }
                          }}
                          disabled={!isConnected.value || chatLoading.value}
                        />
                        <button
                          type="button"
                          class="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                          disabled={!isConnected.value || chatLoading.value || !chatInput.value.trim()}
                          preventdefault:click
                          onClick$={() => {
                            sendChatMessage();
                          }}
                        >
                          {t('nftDetails.chat.send')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ===== Not listed: forms (Owner Only) ===== */}
              {activeMarket.value === 'none' && isOwner.value && (
                <div class="bg-white border border-gray-200 rounded-2xl p-4">
                  <div class="mb-3">
                    <h3 class="text-xl">{t('nftDetails.market.tabs.notListed')}</h3>
                    <p class="text-sm text-gray-600">
                      {t('nftDetails.market.tabs.choose')}
                    </p>
                  </div>

                  <div class="mb-4 inline-flex rounded-xl bg-gray-50 p-1">
                    {(['sale', 'rental', 'power'] as const).map((tab) => (
                      <button
                        key={tab}
                        class={[
                          'px-3 py-1.5 text-sm rounded-lg',
                          newListingTab.value === tab
                            ? 'bg-red-600 text-white'
                            : 'text-gray-900 hover:bg-gray-200',
                        ].join(' ')}
                        onClick$={() => (newListingTab.value = tab)}
                      >
                        {tab === 'sale' ? t('nftDetails.market.tabs.sale') : tab === 'rental' ? t('nftDetails.market.tabs.rent') : t('nftDetails.market.tabs.power')}
                      </button>
                    ))}
                  </div>

                  {/* Sale */}
                  {newListingTab.value === 'sale' && (
                    <div class="space-y-3">
                      <label class="text-sm text-gray-900">{t('nftDetails.market.sale.price')}</label>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        placeholder={t('nftDetails.market.common.placeholderPrice')}
                        class="w-full px-3 py-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-red-500"
                        value={salePriceInput.value}
                        onInput$={(_, el) => (salePriceInput.value = (el as HTMLInputElement).value)}
                      />
                      {saleMsg.value && (
                        <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                          {saleMsg.value}
                        </div>
                      )}
                      <button
                        class="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                        disabled={!hasSale.value || saleListLoading.value || !isOwner.value}
                        onClick$={onListForSale$}
                      >
                        {saleListLoading.value ? t('nftDetails.market.sale.listing') : t('nftDetails.market.sale.listBtn')}
                      </button>
                      {!hasSale.value && (
                        <div class="text-xs text-yellow-400">{t('nftDetails.market.sale.notConfigured')}</div>
                      )}
                    </div>
                  )}

                  {/* Rental */}
                  {newListingTab.value === 'rental' && (
                    <div class="space-y-3">
                      <div>
                        <label class="text-sm text-gray-900">{t('nftDetails.market.rental.base')}</label>
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder={t('nftDetails.market.common.placeholderPrice')}
                          class="mt-1 w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                          value={rentalBasePrice.value}
                          onInput$={(_, el) =>
                            (rentalBasePrice.value = (el as HTMLInputElement).value)
                          }
                        />
                      </div>
                      <div>
                        <label class="text-sm text-gray-900 mb-2 block">{t('nftDetails.market.rental.duration')}</label>
                        <div class="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            min={1}
                            step="1"
                            placeholder={t('nftDetails.market.common.placeholderAmount')}
                            class="px-3 py-2 rounded bg-gray-50 border border-gray-200"
                            value={rentalDurationAmount.value}
                            onInput$={(_, el) =>
                              (rentalDurationAmount.value = (el as HTMLInputElement).value)
                            }
                          />
                          <select
                            class="px-3 py-2 rounded bg-gray-50 border border-gray-200"
                            value={rentalDurationUnit.value}
                            onChange$={(_, el) =>
                              (rentalDurationUnit.value = (el as HTMLSelectElement).value as 'hours' | 'days' | 'months')
                            }
                          >
                            <option value="hours">{t('nftDetails.market.common.hours')}</option>
                            <option value="days">{t('nftDetails.market.common.days')}</option>
                            <option value="months">{t('nftDetails.market.common.months')}</option>
                          </select>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                          {t('nftDetails.market.common.min24h')}
                        </div>
                      </div>
                      {rentalMsg.value && (
                        <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                          {rentalMsg.value}
                        </div>
                      )}
                      <button
                        class="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                        disabled={!hasRental.value || rentalListLoading.value || !isOwner.value}
                        onClick$={onListRental$}
                      >
                        {rentalListLoading.value ? t('nftDetails.market.rental.listing') : t('nftDetails.market.rental.listBtn')}
                      </button>
                      {!hasRental.value && (
                        <div class="text-xs text-yellow-400">{t('nftDetails.market.rental.notConfigured')}</div>
                      )}
                    </div>
                  )}

                  {/* Power */}
                  {newListingTab.value === 'power' && (
                    <div class="space-y-3">
                      <div>
                        <label class="text-sm text-gray-900">{t('nftDetails.market.power.base')}</label>
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder={t('nftDetails.market.common.placeholderPrice')}
                          class="mt-1 w-full px-3 py-2 rounded bg-gray-50 border border-gray-200"
                          value={powerBasePrice.value}
                          onInput$={(_, el) =>
                            (powerBasePrice.value = (el as HTMLInputElement).value)
                          }
                        />
                      </div>
                      <div>
                        <label class="text-sm text-gray-900 mb-2 block">{t('nftDetails.market.power.duration')}</label>
                        <div class="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            min={1}
                            step="1"
                            placeholder={t('nftDetails.market.common.placeholderAmount')}
                            class="px-3 py-2 rounded bg-gray-50 border border-gray-200"
                            value={powerDurationAmount.value}
                            onInput$={(_, el) =>
                              (powerDurationAmount.value = (el as HTMLInputElement).value)
                            }
                          />
                          <select
                            class="px-3 py-2 rounded bg-gray-50 border border-gray-200"
                            value={powerDurationUnit.value}
                            onChange$={(_, el) =>
                              (powerDurationUnit.value = (el as HTMLSelectElement).value as 'hours' | 'days' | 'months')
                            }
                          >
                            <option value="hours">{t('nftDetails.market.common.hours')}</option>
                            <option value="days">{t('nftDetails.market.common.days')}</option>
                            <option value="months">{t('nftDetails.market.common.months')}</option>
                          </select>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                          {t('nftDetails.market.common.min24h')}
                        </div>
                      </div>

                      {/* Upfront payment toggle */}
                      <label class="flex items-center gap-2 text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={powerPayUpfront.value}
                          onInput$={(_, el) =>
                            (powerPayUpfront.value = (el as HTMLInputElement).checked)
                          }
                        />
                        {t('nftDetails.market.power.upfrontLabel')}
                      </label>

                      {powerMsg.value && (
                        <div class="p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                          {powerMsg.value}
                        </div>
                      )}
                      <button
                        class="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                        disabled={!hasPower.value || powerListLoading.value || !isOwner.value}
                        onClick$={onListPower$}
                      >
                        {powerListLoading.value ? t('nftDetails.market.power.listing') : t('nftDetails.market.power.listBtn')}
                      </button>
                      {!hasPower.value && (
                        <div class="text-xs text-yellow-400">{t('nftDetails.market.power.notConfigured')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NFT not found */
          <div class="bg-white border border-red-800 rounded-2xl p-12 text-center">
            <div class="flex flex-col items-center gap-4">
              <LuAlertTriangle class="text-6xl text-red-500" />
              <h2 class="text-2xl font-bold text-red-400">{t('nftDetails.alerts.notFound')}</h2>
              <p class="text-gray-900 max-w-md">
                {nftError.value
                  ? t(nftError.value)
                  : isDemoNft.value
                    ? t('nftDetails.alerts.demoNotFound')
                    : t('nftDetails.alerts.notFoundDesc', { id: tokenIdStr })}
              </p>
              <div class="mt-6 space-y-3">
                {isDemoNft.value && !isConnected.value ? (
                  <button
                    class="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                    onClick$={connect}
                  >
                    {t('nftDetails.header.connectBtn')}
                  </button>
                ) : (
                  <>
                    <button
                      class="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                      onClick$={() => (window.location.href = '/mint')}
                    >
                      {t('nftDetails.header.mintNew')}
                    </button>
                    <div>
                      <button
                        class="px-6 py-3 rounded-lg bg-gray-50 hover:bg-gray-200 text-gray-900 font-medium"
                        onClick$={() => (window.location.href = '/properties')}
                      >
                        {t('nftDetails.header.viewAvailable')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
