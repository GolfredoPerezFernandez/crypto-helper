// ...existing imports...
import { routeAction$ } from '@builder.io/qwik-city';
import {
  component$,
  useSignal,
  $,
  useVisibleTask$,
  noSerialize,
  type NoSerialize,
  useComputed$,
  useStyles$,
  useContext,
} from '@builder.io/qwik';
import { useNavigate, useLocation } from '@builder.io/qwik-city';
import {
  LuInfo,
  LuWallet,
  LuFilePlus,
  LuX,
  LuCheck,
  LuTrash2,
  LuSparkles,
  LuMap,
  LuMapPin,
  LuGrid3X3,
  LuImage,
  LuBuilding2,
  LuLayers,
  LuCpu,
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
} from '@qwikest/icons/lucide';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { Input } from '~/components/ui/input/input';
import { Alert } from '~/components/ui/alert/alert';
import { useMarketplaceContracts } from '~/hooks/useMarketplaceContracts';
import { useWallet } from '~/hooks/useWallet';
import { DemoModeContext } from '~/contexts/demo';
import { mintDemoNft } from '~/server/demo-actions';

/* ---------------- Leaflet (real map) ---------------- */
import * as L from 'leaflet';
import leafletStyles from 'leaflet/dist/leaflet.css?inline';
// @ts-ignore
import { inlineTranslate, useSpeak } from 'qwik-speak';

/* ------------------------------------------------------------------ */
/* Types & Templates                                                   */
/* ------------------------------------------------------------------ */
type Attr = { trait_type: string; value: string };
type AttrTemplate = { id: string; name: string; description?: string; attributes: Attr[] };
type TemplateIconKey =
  | 'sparkles'
  | 'iot'
  | 'image'
  | 'map'
  | 'basic-realestate'
  | 'premium-realestate';
type TemplateMeta = {
  tag: string;
  accentFrom: string;
  accentTo: string;
  glow: string;
  icon: TemplateIconKey;
  highlight: string;
};

// Templates will be defined inside the component using useComputed$ to support translations

const TEMPLATE_ICONS: Record<TemplateIconKey, any> = {
  sparkles: LuSparkles,
  iot: LuCpu,
  image: LuImage,
  map: LuMap,
  'basic-realestate': LuBuilding2,
  'premium-realestate': LuLayers,
};

// TEMPLATE_META will be defined inside the component using useComputed$


/* ------------------------------------------------------------------ */
/* Helpers puros (fuera del componente)                                */
/* ------------------------------------------------------------------ */
const MAX_ATTRS = 20;
const normalizeKey = (s: string) => s.trim().toLowerCase();

/**
 * Parses string coordinate to decimal degrees.
 * Supports:
 * 1. Decimal: -12.345
 * 2. DMS: 40°42'51"N or 40 42 51 S or 40° 42' 51"
 */
const parseCoordinate = (str: string): number | null => {
  const s = str.trim().toUpperCase();
  if (!s) return null;

  // Try decimal first (only if it's strictly a number with optional minus and dot)
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const dec = parseFloat(s);
    if (!isNaN(dec)) return dec;
  }

  // DMS parsing
  // Extract all numeric parts
  const numbers = s.match(/(\d+(\.\d+)?)/g);
  if (!numbers || numbers.length === 0) return null;

  // Extract direction letter
  const directionMatch = s.match(/[NSEWO]/); // O for Oeste (Spanish)
  const dir = directionMatch ? directionMatch[0] : '';

  const deg = parseFloat(numbers[0]) || 0;
  const min = parseFloat(numbers[1]) || 0;
  const sec = parseFloat(numbers[2]) || 0;

  let result = deg + min / 60 + sec / 3600;

  // Handle direction
  if (dir === 'S' || dir === 'W' || dir === 'O') {
    result = -result;
  } else if (s.startsWith('-')) {
    // Handle explicit minus sign if no S/W/O letter is present
    result = -Math.abs(result);
  }

  return result;
};

/**
 * Tries to parse a string as a coordinate pair (lat, lng).
 * Returns [lat, lng] if successful, null otherwise.
 */
const parseCoordinatePair = (str: string): [number, number] | null => {
  const s = str.trim();
  if (!s) return null;

  // Split by common separators: comma, semicolon, or double/triple spaces
  // Also handle cases like "40°N 70°W" where there might be just one space if the symbols are clear
  let parts: string[] = [];

  if (s.includes(',')) {
    parts = s.split(',').map(p => p.trim());
  } else if (s.includes(';')) {
    parts = s.split(';').map(p => p.trim());
  } else if (s.includes('  ')) {
    // Split by multiple spaces
    parts = s.split(/\s{2,}/).map(p => p.trim());
  } else {
    // Try to split by space if there are obvious DMS parts
    // This is riskier but handles "40N 70W"
    const spaceParts = s.split(/\s+/).map(p => p.trim());
    if (spaceParts.length === 2) {
      parts = spaceParts;
    }
  }

  if (parts.length < 2) return null;

  const lat = parseCoordinate(parts[0]);
  const lng = parseCoordinate(parts[1]);

  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return [lat, lng];
  }

  return null;
};

/**
 * Converts decimal degrees to DMS parts.
 */
const decimalToDMS = (dec: number, isLat: boolean) => {
  const absolute = Math.abs(dec);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = parseFloat(((minutesNotTruncated - minutes) * 60).toFixed(3));

  let direction = "";
  if (isLat) {
    direction = dec >= 0 ? "N" : "S";
  } else {
    direction = dec >= 0 ? "E" : "W"; // Could be O for Oeste in Spanish if preferred
  }

  return { degrees, minutes, seconds, direction };
};

/**
 * Converts DMS parts to decimal degrees.
 */
const dmsToDecimal = (deg: number, min: number, sec: number, dir: string) => {
  let res = deg + min / 60 + sec / 3600;
  if (dir === 'S' || dir === 'W' || dir === 'O') {
    res = -res;
  }
  return parseFloat(res.toFixed(8));
};

const dedupeMerge = (current: Attr[], incoming: Attr[]): Attr[] => {
  const seen = new Set(current.map((a) => normalizeKey(a.trait_type)));
  const merged = [...current];
  for (const a of incoming) {
    const key = normalizeKey(a.trait_type);
    if (!seen.has(key)) {
      merged.push({ trait_type: a.trait_type, value: a.value });
      seen.add(key);
    }
    if (merged.length >= MAX_ATTRS) break;
  }
  return merged;
};

type NaturalSize = { w: number; h: number } | null;
type CellKey = `${number}-${number}`;

/** Build mapGrid with ALL cells and status derived from "available" */
function buildGridMeta(
  rows: number,
  cols: number,
  nat: NaturalSize,
  available: Set<CellKey>
) {
  // Allow nat=null (real map) -> store size 0x0
  const ns = nat ?? { w: 0, h: 0 };
  const cw = 1 / cols;
  const ch = 1 / rows;

  const cells: Array<{
    r: number;
    c: number;
    id: string;
    status: 'available' | 'null';
    bboxRel: { x: number; y: number; w: number; h: number };
  }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${r}-${c}` as CellKey;
      const status = available.has(k) ? 'available' : 'null';
      cells.push({
        r,
        c,
        id: `R${r + 1}C${c + 1}`,
        status,
        bboxRel: { x: c * cw, y: r * ch, w: cw, h: ch },
      });
    }
  }

  return {
    rows,
    cols,
    cellCount: rows * cols,
    imageSize: ns,
    cells,
  };
}

/** Derived attributes: works with or without an image */
function deriveGridAttrs(
  isMap: boolean,
  rows: number,
  cols: number,
  nat: NaturalSize,
  available: Set<CellKey>
): Attr[] {
  if (!isMap) return [];

  const rel = `${(1 / cols).toFixed(4)}x${(1 / rows).toFixed(4)}`;

  const availIds = Array.from(available)
    .map((k) => {
      const [r, c] = k.split('-').map(Number);
      return `R${r + 1}C${c + 1}`;
    })
    .sort((a, b) => (a > b ? 1 : -1));

  const nullCount = rows * cols - availIds.length;

  const idsStr = availIds.join(', ');
  const out: Attr[] = [
    { trait_type: 'Grid Definition', value: `${rows}x${cols}` },
    { trait_type: 'Cell Size Rel', value: rel },
    { trait_type: 'Available Cells', value: String(availIds.length) },
    { trait_type: 'Null Cells', value: String(nullCount) },
    { trait_type: 'Available Cell IDs', value: idsStr || '-' },
  ];

  if (nat) {
    out.splice(1, 0, { trait_type: 'Image Size', value: `${nat.w}x${nat.h}` });
  }

  return out;
}

/* -------- friendly errors -------- */
type UiError = { title: string; message: string; details?: string };
const pick = (err: any, ...keys: string[]) =>
  keys
    .map((k) => (typeof err?.[k] === 'string' ? err[k] : ''))
    .filter(Boolean)
    .join(' | ');
const normalizeEvmError = (e: any): { title: string; message: string } => {
  const raw = String(e?.message || e || '');
  const lower = raw.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('denied') || e?.code === 4001)
    return { title: 'mint.errors.cancelled', message: 'mint.errors.cancelledDesc' };
  if (lower.includes('insufficient funds') || lower.includes('intrinsic gas'))
    return { title: 'mint.errors.insufficientFunds', message: 'mint.errors.insufficientFundsDesc' };
  if (lower.includes('wrong network') || lower.includes('chain id') || lower.includes('chain disconnected'))
    return { title: 'mint.errors.wrongNetwork', message: 'mint.errors.wrongNetworkDesc' };
  if (raw.includes('0xe450d38c'))
    return { title: 'mint.errors.paymentRevert', message: 'mint.errors.paymentRevertDesc' };
  if (lower.includes('rpc') || lower.includes('json-rpc') || lower.includes('network error'))
    return { title: 'mint.errors.rpcError', message: 'mint.errors.rpcErrorDesc' };

  // For unknown errors, we can't easily translate dynamic content from chain
  const compact = pick(e, 'shortMessage', 'reason', 'details') || raw.split('\n')[0].slice(0, 200);
  return { title: 'mint.errors.txFailed', message: compact || 'mint.errors.unknown' };
};

/* ------------------------------------------------------------------ */
/* Action: /api/nft/upload                                            */
/* ------------------------------------------------------------------ */
export const useMintNftAction = routeAction$(async (data, ev) => {
  const { metadata } = data as any;
  if (!metadata || typeof metadata !== 'object') {
    return ev.fail(400, { message: 'metadata must be an object' });
  }
  const payload: any = { metadata };

  if (Array.isArray((data as any).imageBytesArr)) {
    payload.image = {
      bytes: (data as any).imageBytesArr as number[],
      name: (data as any).imageName || 'image.bin',
      type: (data as any).imageType || 'application/octet-stream',
    };
  }

  const apiUrl = new URL('/api/nft/upload', ev.url).toString();
  const r = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const ct = r.headers.get('content-type') || '';
  const text = await r.text();
  if (!ct.includes('application/json')) {
    return ev.fail(500, { message: `Endpoint did not return JSON: ${text.slice(0, 200)}` });
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return ev.fail(500, { message: `Invalid JSON response: ${text.slice(0, 200)}` });
  }

  if (!r.ok || !json?.ok || !json?.tokenURI) {
    return ev.fail(500, { message: json?.error || `API error: ${text.slice(0, 200)}` });
  }

  return { tokenURI: json.tokenURI, imageCid: json.imageCid, metadataCid: json.tokenCid };
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default component$(() => {
  useSpeak({ runtimeAssets: ['mint'] });
  const t = inlineTranslate();
  const hideGridSignal = useSignal(false);
  useStyles$(leafletStyles); // estilos Leaflet
  const mintNftAction = useMintNftAction();
  const nav = useNavigate();
  const location = useLocation();
  const locale = location.params.locale || 'en-US';

  // Form
  const nftName = useSignal('');
  const nftDescription = useSignal('');
  const customAttributes = useSignal<Attr[]>([]);
  const newTraitType = useSignal('');
  const newTraitValue = useSignal('');

  // Templates
  const selectedTemplateId = useSignal<string>('');

  // Templates & Meta (Localized)
  const attributeTemplates = useComputed$<AttrTemplate[]>(() => {
    const t = inlineTranslate();
    return [
      {
        id: 'iot-sensor',
        name: t('mint.templates.items.iotSensor.name'),
        description: t('mint.templates.items.iotSensor.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.sensorId@@Sensor ID'), value: 'soil-23A7' },
          { trait_type: t('mint.templates.attributes.sensorType@@Sensor Type'), value: 'Soil Moisture' },
          { trait_type: t('mint.templates.attributes.unit@@Unit'), value: '%' },
          { trait_type: t('mint.templates.attributes.lastReading@@Last Reading'), value: '28.4' },
          { trait_type: t('mint.templates.attributes.readingTimestamp@@Reading Timestamp'), value: '2025-10-29T11:32:00Z' },
          { trait_type: t('mint.templates.attributes.status@@Status'), value: 'ok' },
          { trait_type: t('mint.templates.attributes.plot@@Plot'), value: 'North-Lot-03' },
          { trait_type: t('mint.templates.attributes.provider@@Provider'), value: 'AcmeAgro S200' },
          { trait_type: t('mint.templates.attributes.samplingFrequency@@Sampling Frequency'), value: '5 min' },
          { trait_type: t('mint.templates.attributes.battery@@Battery'), value: '76%' },
          { trait_type: t('mint.templates.attributes.rssi@@RSSI'), value: '-92 dBm' },
          { trait_type: t('mint.templates.attributes.firmware@@Firmware'), value: 'v1.4.2' },
          { trait_type: t('mint.templates.attributes.gatewayId@@Gateway ID'), value: 'gw-ica-01' },
          { trait_type: t('mint.templates.attributes.network@@Network'), value: 'LoRaWAN' },
          { trait_type: t('mint.templates.attributes.crop@@Crop'), value: 'Grape' },
          { trait_type: t('mint.templates.attributes.minThreshold@@Min Threshold'), value: '20' },
          { trait_type: t('mint.templates.attributes.maxThreshold@@Max Threshold'), value: '40' },
          { trait_type: t('mint.templates.attributes.sla@@SLA'), value: '99.5%' },
          { trait_type: t('mint.templates.attributes.dataLicense@@Data License'), value: 'Private' },
          { trait_type: t('mint.templates.attributes.locationPrivacy@@Location Privacy'), value: 'Approximate (geohash 6)' },
        ],
      },
      {
        id: 'map-cells',
        name: t('mint.templates.items.mapImage.name'),
        description: t('mint.templates.items.mapImage.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.assetType@@Asset Type'), value: 'Vineyard' },
          { trait_type: t('mint.templates.attributes.area@@Tokenized Area (m²)'), value: '2500' },
          { trait_type: t('mint.templates.attributes.yield@@Estimated Yield'), value: '3200 kg tomato/month' },
          { trait_type: t('mint.templates.attributes.year@@Year'), value: '2024' },
          { trait_type: t('mint.templates.attributes.status@@Tokenization Status'), value: 'Tokenized/In process/Available' },
          { trait_type: t('mint.templates.attributes.location@@Location'), value: 'Coordinates or reference' },
        ],
      },
      {
        id: 'map-google',
        name: t('mint.templates.items.liveMap.name'),
        description: t('mint.templates.items.liveMap.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.provider@@Map Provider'), value: 'Leaflet + OSM' },
          { trait_type: t('mint.templates.attributes.style@@Map Style'), value: 'satellite' },
          { trait_type: t('mint.templates.attributes.assetType@@Asset Type'), value: 'Vineyard' },
          { trait_type: t('mint.templates.attributes.country@@Country'), value: 'Peru' },
          { trait_type: t('mint.templates.attributes.region@@Region'), value: 'Ica' },
          { trait_type: t('mint.templates.attributes.area@@Tokenized Area (m²)'), value: '2500' },
          { trait_type: t('mint.templates.attributes.yield@@Estimated Yield'), value: '3200 kg/month' },
          { trait_type: t('mint.templates.attributes.year@@Year'), value: '2025' },
          { trait_type: t('mint.templates.attributes.status@@Tokenization Status'), value: 'Tokenized/In process/Available' },
        ],
      },
      {
        id: 'realestate-basic',
        name: t('mint.templates.items.realEstate.name'),
        description: t('mint.templates.items.realEstate.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.type@@Type'), value: 'Apartment' },
          { trait_type: t('mint.templates.attributes.city@@City'), value: 'Lima' },
          { trait_type: t('mint.templates.attributes.bedrooms@@Bedrooms'), value: '2' },
          { trait_type: t('mint.templates.attributes.bathrooms@@Bathrooms'), value: '2' },
          { trait_type: t('mint.templates.attributes.area@@Area (m²)'), value: '70' },
        ],
      },
      {
        id: 'realestate-premium',
        name: t('mint.templates.items.realEstatePremium.name'),
        description: t('mint.templates.items.realEstatePremium.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.type@@Type'), value: 'House' },
          { trait_type: t('mint.templates.attributes.city@@City'), value: 'Bogotá' },
          { trait_type: t('mint.templates.attributes.year@@Year'), value: '2022' },
          { trait_type: t('mint.templates.attributes.furnished@@Furnished'), value: 'Yes' },
          { trait_type: t('mint.templates.attributes.parking@@Parking'), value: '1' },
          { trait_type: t('mint.templates.attributes.area@@Area (m²)'), value: '120' },
        ],
      },
      {
        id: 'membership',
        name: t('mint.templates.items.membership.name'),
        description: t('mint.templates.items.membership.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.tier@@Tier'), value: 'Gold' },
          { trait_type: t('mint.templates.attributes.benefits@@Benefits'), value: 'Lounge + Discounts' },
          { trait_type: t('mint.templates.attributes.expires@@Expires'), value: '2026-12-31' },
        ],
      },
      {
        id: 'artwork',
        name: t('mint.templates.items.artwork.name'),
        description: t('mint.templates.items.artwork.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.edition@@Edition'), value: '1/100' },
          { trait_type: t('mint.templates.attributes.author@@Author'), value: 'Anonymous' },
          { trait_type: t('mint.templates.attributes.collection@@Collection'), value: 'KNRT Art' },
        ],
      },
      {
        id: 'gaming',
        name: t('mint.templates.items.character.name'),
        description: t('mint.templates.items.character.desc'),
        attributes: [
          { trait_type: t('mint.templates.attributes.class@@Class'), value: 'Mage' },
          { trait_type: t('mint.templates.attributes.rarity@@Rarity'), value: 'Epic' },
          { trait_type: t('mint.templates.attributes.power@@Power'), value: '87' },
        ],
      },
    ];
  });

  const templateMeta = useComputed$<Record<string, TemplateMeta>>(() => {
    const t = inlineTranslate();
    return {
      default: {
        tag: t('mint.templates.tags.general'),
        accentFrom: '#f97316',
        accentTo: '#fb7185',
        glow: 'shadow-[#f97316]/15',
        icon: 'sparkles',
        highlight: t('mint.templates.highlights.general'),
      },
      'iot-sensor': {
        tag: t('mint.templates.tags.iot'),
        accentFrom: '#0ea5e9',
        accentTo: '#2563eb',
        glow: 'shadow-sky-200',
        icon: 'iot',
        highlight: t('mint.templates.highlights.iot'),
      },
      'map-cells': {
        tag: t('mint.templates.tags.mapImage'),
        accentFrom: '#ec4899',
        accentTo: '#db2777',
        glow: 'shadow-pink-200',
        icon: 'image',
        highlight: t('mint.templates.highlights.mapImage'),
      },
      'map-google': {
        tag: t('mint.templates.tags.liveMap'),
        accentFrom: '#10b981',
        accentTo: '#059669',
        glow: 'shadow-emerald-200',
        icon: 'map',
        highlight: t('mint.templates.highlights.liveMap'),
      },
      'realestate-basic': {
        tag: t('mint.templates.tags.realEstate'),
        accentFrom: '#a855f7',
        accentTo: '#7c3aed',
        glow: 'shadow-purple-200',
        icon: 'basic-realestate',
        highlight: t('mint.templates.highlights.realEstate'),
      },
      'realestate-premium': {
        tag: t('mint.templates.tags.premium'),
        accentFrom: '#facc15',
        accentTo: '#f97316',
        glow: 'shadow-amber-200',
        icon: 'premium-realestate',
        highlight: t('mint.templates.highlights.premium'),
      },
    };
  });

  const selectedTemplate = useComputed$<AttrTemplate | null>(() =>
    attributeTemplates.value.find((t) => t.id === selectedTemplateId.value) ?? null
  );

  const activeTemplateMeta = useComputed$<TemplateMeta>(() => {
    return templateMeta.value[selectedTemplateId.value] || templateMeta.value.default;
  });

  const isImageMapTemplate = useComputed$(() => selectedTemplateId.value === 'map-cells');
  const isLeafletMapTemplate = useComputed$(() => selectedTemplateId.value === 'map-google');
  const isMapTemplate = useComputed$(() => isImageMapTemplate.value || isLeafletMapTemplate.value);

  // Duplicates
  const dupIndexes = useComputed$(() => {
    const map: Record<string, number[]> = {};
    customAttributes.value.forEach((a, i) => {
      const k = normalizeKey(a.trait_type || '');
      if (!k) return;
      map[k] = map[k] || [];
      map[k].push(i);
    });
    const dups = new Set<number>();
    Object.values(map).forEach((arr) => {
      if (arr.length > 1) arr.forEach((i) => dups.add(i));
    });
    return dups;
  });

  // Image
  const imagePreview = useSignal('');
  const imageFile = useSignal<File | NoSerialize<File> | null>(null);
  const imgNatural = useSignal<{ w: number; h: number } | null>(null);

  // Grid
  const gridRows = useSignal(8);
  const gridCols = useSignal(12);

  /** SINGLE editable state: available cells */
  const availableCells = useSignal<Set<CellKey>>(new Set());

  /** To force recomputation of autoAttrs when changes occur */
  const cellsVersion = useSignal(0);

  const showGridEditor = useSignal(false);
  const dragging = useSignal(false);
  const dragAction = useSignal<'add' | 'remove' | null>(null);

  // Grid line color
  const gridLineColor = useSignal<string>('rgba(255,255,255,0.2)');
  const linePresets = [
    { name: 'White', value: 'rgba(255,255,255,0.2)' },
    { name: 'Red', value: 'rgba(193,39,45,0.5)' },
    { name: 'Green', value: 'rgba(16,185,129,0.5)' },
    { name: 'Blue', value: 'rgba(59,130,246,0.5)' },
    { name: 'Yellow', value: 'rgba(234,179,8,0.6)' },
  ];

  // Metadata visibility
  const metadataIsPublic = useSignal(true);

  // Steps / UI
  const formErrors = useSignal<Record<string, string>>({});
  const formValid = useSignal(false);
  const mintedTokenId = useSignal<string | null>(null);
  const isProcessing = useSignal(false);
  const success = useSignal(false);
  const navigating = useSignal(false);
  const uiError = useSignal<UiError | null>(null);

  const { contracts, actions, connect, isLoading } = useMarketplaceContracts();
  const { wallet } = useWallet();
  const demo = useContext(DemoModeContext);

  // Wizard state
  const currentStep = useSignal(1);
  const totalSteps = useComputed$(() => isMapTemplate.value ? 4 : 3);

  const nextStep = $(() => {
    if (currentStep.value < totalSteps.value) {
      currentStep.value++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  const prevStep = $(() => {
    if (currentStep.value > 1) {
      currentStep.value--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ---------------- Validation ------------------- */
  useVisibleTask$(({ track }) => {
    track(() => [nftName.value, nftDescription.value]);
    const errs: Record<string, string> = {};
    if (!nftName.value.trim()) errs.nftName = 'Name is required';
    if (!nftDescription.value.trim()) errs.nftDescription = 'Description is required';
    formErrors.value = errs;
    formValid.value = Object.keys(errs).length === 0;
  });

  const mapReady = useComputed$(() => {
    if (!isMapTemplate.value) return true;
    if (isImageMapTemplate.value) {
      return !!imageFile.value && availableCells.value.size > 0;
    }
    if (isLeafletMapTemplate.value) {
      return availableCells.value.size > 0; // no requiere imagen
    }
    return true;
  });

  /* ---------------- helpers: map attrs ---------------- */
  const getAttr = $((key: string) => {
    const k = normalizeKey(key);
    const all = [
      ...(selectedTemplate.value?.attributes ?? []),
      ...customAttributes.value,
    ];
    const found = all.find((a) => normalizeKey(a.trait_type) === k);
    return found?.value ?? '';
  });

  const parseCenter = $(async (): Promise<[number, number]> => {
    const raw = await getAttr('Center (lat,lng)');
    const [latS, lngS] = (raw || '').split(',').map((s: string) => s.trim());
    const lat = Number(latS ?? '');
    const lng = Number(lngS ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    // Try to get user geolocation (browser)
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      return await new Promise<[number, number]>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve([pos.coords.latitude, pos.coords.longitude]);
          },
          () => {
            resolve([40.4637, -3.7492]); // fallback Spain
          },
          { timeout: 3000 }
        );
      });
    }
    // Fallback Spain
    return [40.4637, -3.7492];
  });

  // âœ… QRL and async (avoids serialization errors and allows await)
  const parseZoom = $(async () => {
    const raw = await getAttr('Zoom');
    const z = Number(raw || '6');
    return Number.isFinite(z) ? z : 6;
  });

  // Leaflet map refs
  const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const leafletMap = useSignal<NoSerialize<L.Map> | null>(null);
  const mapStyle = useSignal<'standard' | 'satellite'>('standard');
  const activeTileLayer = useSignal<NoSerialize<L.TileLayer> | null>(null);
  const mapContainerId = 'leaflet-grid-map';

  const leafletInfo = useSignal<{
    center: [number, number];
    zoom: number;
    bounds: [[number, number], [number, number]] | null;
    minZoom: number;
    maxZoom: number;
    tileUrl: string;
    provider: string;
    style: string;
    crs: string;
    size: [number, number];
  } | null>(null);

  const updateLeafletInfo = $(() => {
    const m = leafletMap.value;
    if (!m) return;
    const c = m.getCenter();
    const z = m.getZoom();
    const b = m.getBounds();
    const s = m.getSize();
    leafletInfo.value = {
      center: [c.lat, c.lng],
      zoom: z,
      bounds: [
        [b.getSouthWest().lat, b.getSouthWest().lng],
        [b.getNorthEast().lat, b.getNorthEast().lng],
      ],
      minZoom: m.getMinZoom?.() ?? 0,
      maxZoom: m.getMaxZoom?.() ?? 20,
      tileUrl: mapStyle.value === 'satellite' ? TILE_SATELLITE_URL : TILE_URL,
      provider: mapStyle.value === 'satellite' ? 'Esri' : 'Leaflet + OSM',
      style: mapStyle.value,
      crs: 'EPSG:3857',
      size: [s.x, s.y],
    };
  });

  // Center map on user geolocation
  const centerOnUserLocation = $(async () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator && leafletMap.value) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          leafletMap.value!.setView([pos.coords.latitude, pos.coords.longitude], leafletMap.value!.getZoom());
        },
        () => {
          // Optionally show error or fallback
        },
        { timeout: 3000 }
      );
    }
  });

  // Address search
  const searchQuery = useSignal('');
  const isSearching = useSignal(false);
  const searchError = useSignal('');
  const handleSearch = $(async (ev?: Event) => {
    if (ev) ev.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;

    const t = inlineTranslate();

    // 1. Try to parse as coordinates first
    const pair = parseCoordinatePair(query);
    if (pair) {
      if (leafletMap.value) {
        leafletMap.value.setView(pair as [number, number], Math.max(leafletMap.value.getZoom(), 16));
        updateLeafletInfo();
        return;
      }
    }

    // 2. Fallback to Nominatim address search
    isSearching.value = true;
    searchError.value = '';
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (leafletMap.value) {
          leafletMap.value.setView([lat, lon], Math.max(leafletMap.value.getZoom(), 16));
          updateLeafletInfo();
        }
      } else {
        searchError.value = t('mint.errors.addressNotFound@@Address not found.');
      }
    } catch (err) {
      searchError.value = t('mint.errors.searchError@@Error searching address.');
    }
    isSearching.value = false;
  });

  // Direct coordinate input (Decimal Degrees - GD)
  const coordLat = useSignal('');
  const coordLng = useSignal('');

  // GMS (DMS) individual signals
  const latDeg = useSignal(0);
  const latMin = useSignal(0);
  const latSec = useSignal(0);
  const latDir = useSignal('N');

  const lngDeg = useSignal(0);
  const lngMin = useSignal(0);
  const lngSec = useSignal(0);
  const lngDir = useSignal('E');

  // Sync GMS from GD changes
  const updateGMSFromGD = $((lat: number, lng: number) => {
    const latParts = decimalToDMS(lat, true);
    latDeg.value = latParts.degrees;
    latMin.value = latParts.minutes;
    latSec.value = latParts.seconds;
    latDir.value = latParts.direction;

    const lngParts = decimalToDMS(lng, false);
    lngDeg.value = lngParts.degrees;
    lngMin.value = lngParts.minutes;
    lngSec.value = lngParts.seconds;
    lngDir.value = lngParts.direction;
  });

  // Sync GD from GMS changes
  const updateGDFromGMS = $(() => {
    const lat = dmsToDecimal(latDeg.value, latMin.value, latSec.value, latDir.value);
    const lng = dmsToDecimal(lngDeg.value, lngMin.value, lngSec.value, lngDir.value);
    coordLat.value = String(lat);
    coordLng.value = String(lng);
    return [lat, lng];
  });

  const goToCoords = $(() => {
    // If user pasted a pair into Latitude field, try to separate it
    const pair = parseCoordinatePair(coordLat.value);
    if (pair) {
      const [lat, lng] = pair;
      if (leafletMap.value) {
        leafletMap.value.setView([lat, lng], Math.max(leafletMap.value.getZoom(), 16));
        coordLat.value = String(lat);
        coordLng.value = String(lng);
        updateGMSFromGD(lat, lng);
        updateLeafletInfo();
        return;
      }
    }

    const lat = parseCoordinate(coordLat.value);
    const lng = parseCoordinate(coordLng.value);
    if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      updateGMSFromGD(lat, lng);
      if (leafletMap.value) {
        leafletMap.value.setView([lat, lng], Math.max(leafletMap.value.getZoom(), 16));
        updateLeafletInfo();
      }
    }
  });

  // Special "Go" for GMS
  const goToGmsCoords = $(async () => {
    const [lat, lng] = await updateGDFromGMS();
    if (leafletMap.value) {
      leafletMap.value.setView([lat, lng] as [number, number], Math.max(leafletMap.value.getZoom(), 16));
      updateLeafletInfo();
    }
  });

  const zoomIn = $(() => {
    const m = leafletMap.value;
    if (!m) return;
    m.scrollWheelZoom.enable();
    m.setZoom(Math.min((m.getMaxZoom?.() ?? 20), m.getZoom() + 1));
    m.scrollWheelZoom.disable();
  });
  const zoomOut = $(() => {
    const m = leafletMap.value;
    if (!m) return;
    m.scrollWheelZoom.enable();
    m.setZoom(Math.max((m.getMinZoom?.() ?? 1), m.getZoom() - 1));
    m.scrollWheelZoom.disable();
  });

  /* ---------------- Image â†’ preview + natural size ------------------- */
  const handleImageChange = $((e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      imageFile.value = noSerialize(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = (ev.target?.result as string) || '';
        imagePreview.value = dataUrl;
        const probe = new Image();
        probe.onload = () => (imgNatural.value = { w: probe.naturalWidth, h: probe.naturalHeight });
        probe.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else {
      imageFile.value = null;
      imagePreview.value = '';
      imgNatural.value = null;
      availableCells.value = new Set();
      cellsVersion.value++;
    }
  });

  /* ---------------- Grid interactions ------------------------ */
  const setCell = $((r: number, c: number, on: boolean) => {
    const k = `${r}-${c}` as CellKey;
    const next = new Set(availableCells.value);
    if (on) next.add(k);
    else next.delete(k);
    availableCells.value = next;
    cellsVersion.value++;
  });

  const handleDown = $((r: number, c: number, ev?: PointerEvent) => {
    ev?.preventDefault();
    const k = `${r}-${c}` as CellKey;
    const isActive = availableCells.value.has(k);
    dragging.value = true;
    dragAction.value = isActive ? 'remove' : 'add';
    setCell(r, c, !isActive);
  });

  const handleEnter = $((r: number, c: number, ev?: PointerEvent) => {
    if (!dragging.value || !dragAction.value) return;
    if (ev && ev.buttons !== 1) return;
    setCell(r, c, dragAction.value === 'add');
  });

  const handleUp = $(() => {
    dragging.value = false;
    dragAction.value = null;
  });

  const clearGrid = $(() => {
    availableCells.value = new Set();
    cellsVersion.value++;
  });

  const selectAll = $(() => {
    const next = new Set<CellKey>();
    for (let r = 0; r < gridRows.value; r++) {
      for (let c = 0; c < gridCols.value; c++) {
        next.add(`${r}-${c}` as CellKey);
      }
    }
    availableCells.value = next;
    cellsVersion.value++;
  });

  const setRows = $((n: number) => {
    gridRows.value = n;
    cellsVersion.value++;
  });
  const setCols = $((n: number) => {
    gridCols.value = n;
    cellsVersion.value++;
  });

  /* ---------------- Auto attributes ------------------------ */
  const autoAttrs = useComputed$(() => {
    const gridAttrs = deriveGridAttrs(
      isMapTemplate.value,
      gridRows.value,
      gridCols.value,
      isImageMapTemplate.value ? imgNatural.value : null,
      availableCells.value
    );
    // If Leaflet, add automatic map attributes
    if (isLeafletMapTemplate.value && leafletInfo.value) {
      const lat = leafletInfo.value.center[0];
      const lng = leafletInfo.value.center[1];
      const t = inlineTranslate();
      const leafletAttrs = [
        { trait_type: 'Map Center', value: `${lat.toFixed(6)},${lng.toFixed(6)}` },
        { trait_type: 'Map Latitude', value: lat.toFixed(8) },
        { trait_type: 'Map Longitude', value: lng.toFixed(8) },
        { trait_type: 'Map Zoom', value: String(leafletInfo.value.zoom) },
        { trait_type: 'Map Bounds', value: leafletInfo.value.bounds ? `${leafletInfo.value.bounds[0][0].toFixed(6)},${leafletInfo.value.bounds[0][1].toFixed(6)} | ${leafletInfo.value.bounds[1][0].toFixed(6)},${leafletInfo.value.bounds[1][1].toFixed(6)}` : '-' },
        { trait_type: 'Map MinZoom', value: String(leafletInfo.value.minZoom) },
        { trait_type: 'Map MaxZoom', value: String(leafletInfo.value.maxZoom) },
        { trait_type: 'Map Tile URL', value: leafletInfo.value.tileUrl },
        { trait_type: 'Map Provider', value: leafletInfo.value.provider },
        { trait_type: 'Map Style', value: leafletInfo.value.style },
        { trait_type: 'Map CRS', value: leafletInfo.value.crs },
        { trait_type: 'Map Size', value: `${leafletInfo.value.size[0]}x${leafletInfo.value.size[1]}` },
      ];
      return [...leafletAttrs, ...gridAttrs];
    }
    return gridAttrs;
  });
  const hasAutoAttrs = useComputed$(() => autoAttrs.value.length > 0);
  const readiness = useComputed$(() => {
    const t = inlineTranslate();
    const checklist = [
      { label: t('mint.checklist.name@@NFT Name'), done: !!nftName.value.trim() },
      { label: t('mint.checklist.description@@Description'), done: !!nftDescription.value.trim() },
      { label: t('mint.checklist.template@@Template selected'), done: !!selectedTemplateId.value },
      {
        label: t('mint.checklist.attributes@@Custom attributes ready'),
        done: customAttributes.value.length > 0 || !!selectedTemplate.value,
      },
    ];

    if (isMapTemplate.value) {
      checklist.push({
        label: t('mint.checklist.map@@Map/Image configured'),
        done: mapReady.value,
      });
    }

    const done = checklist.filter((item) => item.done).length;
    const score = Math.round((done / checklist.length) * 100);
    return { checklist, score };
  });
  const previewAttributes = useComputed$(() => {
    if (customAttributes.value.length > 0) {
      return customAttributes.value.slice(0, 4);
    }
    return selectedTemplate.value?.attributes.slice(0, 4) ?? [];
  });
  const summaryDescription = useComputed$(() => {
    const description = nftDescription.value.trim();
    if (description) return description;
    if (selectedTemplate.value?.description) return selectedTemplate.value.description;
    const t = inlineTranslate();
    return t('mint.summary.sidebar.description@@Describe your NFT so others understand what they\'re tokenizing.');
  });
  const templateShowcase = useComputed$(() =>
    attributeTemplates.value.map((template) => ({
      template,
      meta: templateMeta.value[template.id] || templateMeta.value.default,
      attrCount: template.attributes.length,
    }))
  );
  const journeyStatus = useComputed$(() => {
    const t = inlineTranslate();
    return [
      {
        label: t('mint.steps.details.label'),
        hint: formValid.value ? t('mint.steps.details.ready') : t('mint.steps.details.notReady'),
        done: formValid.value,
      },
      {
        label: t('mint.steps.template.label'),
        hint: selectedTemplate.value ? selectedTemplate.value.name : t('mint.steps.template.notSelected'),
        done: !!selectedTemplate.value,
      },
      {
        label: t('mint.steps.attributes.label'),
        hint:
          customAttributes.value.length > 0
            ? `${customAttributes.value.length} ${t('mint.steps.attributes.custom')}`
            : t('mint.steps.attributes.hint'),
        done: customAttributes.value.length > 0,
      },
    ];
  });

  /* ---------------- Template ops ------------------------ */
  const applyTemplateReplace = $(() => {
    if (!selectedTemplate.value) return;
    customAttributes.value = selectedTemplate.value.attributes.map((a: Attr) => ({ ...a })).slice(0, MAX_ATTRS);
  });
  const applyTemplateMerge = $(() => {
    if (!selectedTemplate.value) return;
    customAttributes.value = dedupeMerge(customAttributes.value, selectedTemplate.value.attributes).slice(
      0,
      MAX_ATTRS
    );
  });

  const selectTemplate = $((templateId: string) => {
    const isFirstTime = !selectedTemplateId.value;
    selectedTemplateId.value = templateId;
    if (isFirstTime || customAttributes.value.length === 0) {
      const template = attributeTemplates.value.find((t) => t.id === templateId);
      if (template) {
        customAttributes.value = template.attributes.map((a: Attr) => ({ ...a })).slice(0, MAX_ATTRS);
      }
    }

    // Auto-scroll to the "Next Step" button for better UX
    setTimeout(() => {
      document.getElementById('next-step-button')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  });

  /* ---------------- NavegaciÃ³n ------------------- */

  // Config error (suppress when demo mode is active — no real contracts needed)
  useVisibleTask$(({ track }) => {
    track(() => [contracts.value.error, contracts.value.isConnected]);
    const demoEnabled = track(() => demo?.enabled.value);
    const tLocal = inlineTranslate();
    if (demoEnabled) {
      uiError.value = null; // Demo mode doesn't need real contracts
    } else {
      uiError.value = contracts.value.error ? { title: tLocal('mint.errors.configTitle@@Configuration'), message: contracts.value.error } : null;
    }
  });

  /* ------ Inicializar Leaflet cuando paso 3 está activo (map-google) ----- */
  useVisibleTask$(({ track }) => {
    track(() => [currentStep.value, isLeafletMapTemplate.value]);
    if (currentStep.value !== 3 || !isLeafletMapTemplate.value) {
      if (leafletMap.value) {
        leafletMap.value.remove();
        leafletMap.value = null;
      }
      return;
    }

    queueMicrotask(async () => {
      const el = document.getElementById(mapContainerId);
      if (!el) return;

      const center = await parseCenter();
      const zoom = await parseZoom();

      if (leafletMap.value) {
        leafletMap.value.remove();
        leafletMap.value = null;
      }

      const map = L.map(el, { zoomControl: false }).setView(center, zoom);

      const currentTileUrl = mapStyle.value === 'satellite' ? TILE_SATELLITE_URL : TILE_URL;
      const tiles = L.tileLayer(currentTileUrl, {
        maxZoom: 20,
        attribution: mapStyle.value === 'satellite'
          ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
          : '&copy; OpenStreetMap contributors',
      }).addTo(map);

      activeTileLayer.value = noSerialize(tiles);
      leafletMap.value = noSerialize(map);
      updateLeafletInfo();

      map.on('zoomend', () => updateLeafletInfo());
      map.on('moveend', () => updateLeafletInfo());
      map.on('resize', () => updateLeafletInfo());

      // Double click to pick coordinates
      map.on('dblclick', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        coordLat.value = lat.toFixed(8);
        coordLng.value = lng.toFixed(8);
        updateGMSFromGD(lat, lng);
        updateLeafletInfo();
      });

      // Enable map dragging and keyboard
      map.dragging.enable();
      map.keyboard.enable();
      // El zoom solo por botones
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();

      setTimeout(() => map.invalidateSize(), 50);
    });
  });

  // Effect to swap tile layers when mapStyle changes
  useVisibleTask$(({ track }) => {
    track(() => mapStyle.value);
    const map = leafletMap.value;
    if (!map) return;

    if (activeTileLayer.value) {
      map.removeLayer(activeTileLayer.value);
    }

    const nextUrl = mapStyle.value === 'satellite' ? TILE_SATELLITE_URL : TILE_URL;
    const nextTiles = L.tileLayer(nextUrl, {
      maxZoom: 20,
      attribution: mapStyle.value === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
        : '&copy; OpenStreetMap contributors',
    }).addTo(map);

    activeTileLayer.value = noSerialize(nextTiles);
    updateLeafletInfo();
  });

  /* ---- Block map interaction while grid is editing --- */
  useVisibleTask$(({ track }) => {
    track(() => [currentStep.value, isLeafletMapTemplate.value, leafletMap.value, hideGridSignal.value]);
    const m = leafletMap.value;
    if (!m) return;

    // Si el grid estÃ¡ oculto, habilitar toda la interacciÃ³n
    if (hideGridSignal.value) {
      m.dragging.enable();
      m.scrollWheelZoom.enable();
      m.doubleClickZoom.enable();
      m.boxZoom.enable();
      m.keyboard.enable();
    } else if (currentStep.value === 3 && isLeafletMapTemplate.value) {
      m.dragging.disable();
      m.scrollWheelZoom.disable();
      m.doubleClickZoom.disable();
      m.boxZoom.disable();
      m.keyboard.disable();
    } else {
      m.dragging.enable();
      m.scrollWheelZoom.enable();
      m.doubleClickZoom.enable();
      m.boxZoom.enable();
      m.keyboard.enable();
    }
  });

  /* ---------------- Mint ------------------- */
  const mintNFT = $(async () => {
    uiError.value = null;

    try {
      if (isMapTemplate.value) {
        if (isImageMapTemplate.value && !imageFile.value) throw new Error('Image is required for map template');
        if (availableCells.value.size === 0) throw new Error('Select at least 1 available cell');
      }

      isProcessing.value = true;

      // Demo mode short-circuit (no blockchain interaction)
      if (demo?.enabled.value) {
        const tokenId = `DEMO-${Date.now()}`;

        // Build demo metadata snapshot
        let demoMapGrid: any = null;
        let demoGridAttrs: Attr[] = [];
        if (isMapTemplate.value) {
          demoMapGrid = buildGridMeta(
            gridRows.value,
            gridCols.value,
            isImageMapTemplate.value ? imgNatural.value : null,
            availableCells.value
          );
          demoGridAttrs = deriveGridAttrs(
            true,
            gridRows.value,
            gridCols.value,
            isImageMapTemplate.value ? imgNatural.value : null,
            availableCells.value
          );
        }

        const demoMeta: any = {
          name: nftName.value.trim() || 'Demo NFT',
          description: nftDescription.value.trim() || 'Demo description',
          attributes: [
            ...customAttributes.value,
            ...demoGridAttrs,
            { trait_type: 'Grid Line Color', value: gridLineColor.value },
          ],
          image: imagePreview.value || '',
          created_at: new Date().toISOString(),
        };

        if (isLeafletMapTemplate.value && leafletInfo.value) {
          const lat = leafletInfo.value.center[0];
          const lng = leafletInfo.value.center[1];
          const autoAttrs = [
            { trait_type: 'Map Center', value: `${lat.toFixed(6)},${lng.toFixed(6)}` },
            { trait_type: 'Map Latitude', value: lat.toFixed(8) },
            { trait_type: 'Map Longitude', value: lng.toFixed(8) },
            { trait_type: 'Map Zoom', value: leafletInfo.value.zoom },
            { trait_type: 'Map Provider', value: leafletInfo.value.provider },
            { trait_type: 'Map Style', value: leafletInfo.value.style },
          ];
          demoMeta.attributes = [...autoAttrs, ...demoMeta.attributes];
        }

        // Add mapGrid for cell display in NFT detail
        if (demoMapGrid) {
          demoMeta.mapGrid = demoMapGrid;
          demoMeta.mapSource = isImageMapTemplate.value ? 'image' : 'leaflet';
        }

        // Save to DB (Turso) via server action
        const owner = contracts.value.address || '0xDEMO_USER';

        try {
          console.log('[MINT] Calling mintDemoNft for', tokenId);
          await mintDemoNft(tokenId, owner, demoMeta);
          console.log('[MINT] mintDemoNft success');
        } catch (serverErr: any) {
          console.error('[MINT] Server action failed:', serverErr);
          throw new Error(`Server save failed: ${serverErr.message || serverErr}`);
        }

        try {
          localStorage.setItem(`knrt_demo_nft_${tokenId}`, JSON.stringify(demoMeta));
        } catch (e) {
          console.warn('Unable to persist demo NFT locally', e);
        }

        success.value = true;
        mintedTokenId.value = tokenId;
        isProcessing.value = false;
        alert('Success! Your demo transaction was simulated and the NFT was created.');
        setTimeout(() => {
          navigating.value = true;
          nav(`/${locale}/nft/${tokenId}`);
        }, 500);
        return;
      }

      if (!contracts.value.isConnected || !contracts.value.address) {
        await connect();
        await new Promise((r) => setTimeout(r, 300));
        if (!contracts.value.isConnected) throw new Error('Connect your wallet to mint.');
      }

      // manual
      const attrsBase = customAttributes.value
        .map((a) => ({ trait_type: (a.trait_type || '').trim(), value: (a.value || '').trim() }))
        .filter((a) => a.trait_type && a.value);

      // auto + mapGrid
      let attrsExtra: Attr[] = [];
      let mapGrid: any = null;

      if (isMapTemplate.value) {
        mapGrid = buildGridMeta(
          gridRows.value,
          gridCols.value,
          isImageMapTemplate.value ? imgNatural.value : null,
          availableCells.value
        );
        attrsExtra = deriveGridAttrs(
          true,
          gridRows.value,
          gridCols.value,
          isImageMapTemplate.value ? imgNatural.value : null,
          availableCells.value
        );
      }

      const attributes: Attr[] = [...autoAttrs.value, ...attrsBase].slice(0, MAX_ATTRS);

      // ✅ Precalcular valores async (evita meter Promises/QRLs en la metadata)
      // centerVal, zoomVal, etc. se usan como fallback si Leaflet no está listo
      let centerVal: [number, number] | undefined;
      let zoomVal: number | undefined;
      let providerVal: string | undefined;
      let styleVal: string | undefined;

      let leafletMeta: any = undefined;
      if (isLeafletMapTemplate.value) {
        centerVal = await parseCenter();
        zoomVal = await parseZoom();
        providerVal = (await getAttr('Map Provider')) || 'Leaflet + OSM';
        styleVal = (await getAttr('Map Style')) || 'satellite';
        // Capture the current map info
        if (leafletInfo.value) {
          leafletMeta = { ...leafletInfo.value };
        }
      }

      const baseMeta: any = {
        name: nftName.value.trim() || 'NFT',
        description: nftDescription.value.trim() || 'Description',
        attributes,
      };

      if (isMapTemplate.value) {
        baseMeta.mapGrid = mapGrid;
        baseMeta.mapSource = isImageMapTemplate.value ? 'image' : 'leaflet';
        if (isLeafletMapTemplate.value) {
          baseMeta.mapLeaflet = leafletMeta || {
            center: centerVal!,
            zoom: zoomVal!,
            provider: providerVal!,
            style: styleVal!,
          };
        }
        if (isImageMapTemplate.value) {
          baseMeta.mapImage = { originalSize: imgNatural.value || null };
        }
      }

      const payload: any = { metadata: baseMeta };
      if (imageFile.value) {
        const f = imageFile.value as File;
        const ab = await f.arrayBuffer();
        const bytes = new Uint8Array(ab);
        payload.imageBytesArr = Array.from(bytes);
        payload.imageName = f.name || 'image.bin';
        payload.imageType = f.type || 'application/octet-stream';
      }

      const res = await mintNftAction.submit(payload);
      if (!res?.value?.tokenURI) {
        throw new Error(res?.value?.message || 'Failed to upload metadata/image to IPFS');
      }
      const tokenURI = res.value.tokenURI as string;

      if (isImageMapTemplate.value && baseMeta.mapImage) {
        baseMeta.mapImage.cid = res.value.imageCid || null;
        baseMeta.mapImage.metadataCid = res.value.metadataCid || null;
      }

      const { wait } = await actions.mint(tokenURI, metadataIsPublic.value);
      const receipt = await wait();
      const realTokenId = receipt.tokenId || '0';

      success.value = true;
      mintedTokenId.value = realTokenId;
      setTimeout(() => {
        navigating.value = true;
        nav(`/${locale}/nft/${realTokenId}`);
      }, 900);
    } catch (err: any) {
      console.error('[mintNFT] Error:', err);
      uiError.value = normalizeEvmError(err);
    } finally {
      isProcessing.value = false;
    }
  });

  return (
    <div class="relative isolate px-4 py-12 sm:px-8">
      {demo?.enabled.value && (
        <div class="mb-6 flex items-start gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 text-emerald-800 shadow-sm backdrop-blur-sm">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <LuCpu class="h-6 w-6" />
          </div>
          <div>
            <div class="text-base font-bold">{t('mint.demo.enabled@@Demo Mode Activated')}</div>
            <div class="text-sm text-emerald-700 leading-relaxed">
              {t('mint.demo.message@@Actions on this page are simulated—no wallet or blockchain transactions are sent. It\'s completely free for testing.')}
            </div>
          </div>
        </div>
      )}
      <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div class="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#04E6E6]/15 blur-[150px]" />
        <div class="absolute bottom-12 right-6 h-[360px] w-[360px] rounded-full bg-[#d13238]/10 blur-[150px]" />
      </div>

      <div class="relative mx-auto flex max-w-6xl flex-col gap-10">



        {/* Wizard Progress Header */}
        {wallet.connected && (
          <section id="minting-steps-container" class="rounded-3xl border border-white/40 bg-[#000d0e]/80 text-[#04E6E6] border-[#043234]">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.35em] text-[#04E6E6]">
                  {t('mint.steps.guidedFlow@@Guided Creation Flow')}
                </p>
                <h2 class="text-lg font-semibold text-white">
                  {t('mint.steps.currentStep@@Step {{current}} of {{total}}', { current: currentStep.value, total: totalSteps.value })}
                </h2>
              </div>
              <div class="flex items-center gap-2">
                {Array.from({ length: totalSteps.value }, (_, i) => i + 1).map((step) => (
                  <div
                    key={step}
                    class={`h-2.5 rounded-full transition-all duration-300 ${step === currentStep.value
                      ? 'w-10 bg-[#04E6E6]'
                      : step < currentStep.value
                        ? 'w-6 bg-emerald-400'
                        : 'w-6 bg-gray-200'
                      }`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <section class={`grid gap-8 ${wallet.connected ? 'lg:grid-cols-[minmax(0,2.15fr)_minmax(280px,1fr)]' : 'grid-cols-1'}`}>
          <div class="space-y-6">
            {!wallet.connected ? (
              <Card.Root class="bg-[#000d0e] border-[#043234] rounded-2xl">
                <Card.Content class="p-10 flex flex-col items-center justify-center">
                  <LuWallet class="w-16 h-16 text-[#04E6E6] mb-4 mt-8" />
                  <h2 class="text-2xl font-bold mb-2">{t('mint.connectCard.title')}</h2>
                  <p class="text-white mb-6 text-center max-w-md">
                    {t('mint.connectCard.desc')}
                  </p>
                  <Button
                    onClick$={connect}
                    disabled={isLoading.value}
                    class="bg-gradient-to-r from-[#04E6E6] to-[#06b6d4] hover:brightness-110 text-white"
                  >
                    <LuWallet class="mr-2 h-4 w-4" />
                    {isLoading.value ? t('mint.connectCard.connecting') : t('mint.connectCard.button')}
                  </Button>
                </Card.Content>
              </Card.Root>
            ) : !contracts.value.isConnected && !contracts.value.error ? (
              /* Wallet connected but contracts initializing or not ready */
              <Card.Root class="bg-white border border-yellow-200 rounded-2xl">
                <Card.Content class="p-10 flex flex-col items-center justify-center text-center">
                  <div class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#c1272d]"></div>
                  <h2 class="text-xl font-bold mb-2">Initializing Contracts...</h2>
                  <p class="text-slate-400">Please wait while we connect to the marketplace.</p>
                </Card.Content>
              </Card.Root>
            ) : contracts.value.error ? (
              /* Wallet connected but contracts ERROR */
              <Card.Root class="bg-white border border-red-200 rounded-2xl">
                <Card.Content class="p-10 flex flex-col items-center justify-center text-center">
                  <LuX class="w-12 h-12 text-red-500 mb-4" />
                  <h2 class="text-xl font-bold mb-2 text-red-700">Connection Error</h2>
                  <p class="text-slate-400 mb-4 max-w-md">{contracts.value.error}</p>
                  <Button onClick$={() => window.location.reload()} variant="outline">
                    Retry
                  </Button>
                </Card.Content>
              </Card.Root>
            ) : (
              <Card.Root class="overflow-hidden bg-[#000d0e] border-[#043234] rounded-2xl">
                <Card.Content class="p-0">
                  {/* STEP 1: Details */}
                  <div class={currentStep.value === 1 ? 'block' : 'hidden'}>
                    <div class="space-y-8 bg-gradient-to-b from-white via-white to-gray-50/70 p-8">
                      <div class="rounded-2xl border border-gray-100 bg-[#001214] border-[#043234]">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div class="flex items-center gap-2 text-[#04E6E6]">
                            <span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#04E6E6]/10">
                              <LuInfo class="h-5 w-5" />
                            </span>
                            <div>
                              <h2 class="text-2xl font-bold text-white">{t('mint.form.detailsTitle')}</h2>
                              <p class="text-sm text-slate-400">
                                {t('mint.form.detailsDesc')}
                              </p>
                            </div>
                          </div>
                          <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {t('mint.form.block1')}
                          </span>
                        </div>
                      </div>

                      <div class="rounded-2xl border border-gray-100 bg-[#001214] border-[#043234] space-y-6">
                        <div>
                          <label class="block text-sm font-medium text-slate-300">{t('mint.form.name')}</label>
                          <Input
                            value={nftName.value}
                            onInput$={(e) => (nftName.value = (e.target as HTMLInputElement).value)}
                            placeholder={t('mint.form.namePlaceholder')}
                            class={`mt-1 w-full ${formErrors.value.nftName ? 'border-[#c1272d]' : ''}`}
                          />
                          {formErrors.value.nftName && (
                            <span class="text-xs text-[#04E6E6]">{t('mint.form.errorName')}</span>
                          )}
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-slate-300">{t('mint.form.description')}</label>
                          <textarea
                            value={nftDescription.value}
                            onInput$={(e) => (nftDescription.value = (e.target as HTMLTextAreaElement).value)}
                            placeholder={t('mint.form.descriptionPlaceholder')}
                            class={`mt-1 w-full rounded-xl border bg-[#000d0e] border-[#043234] px-3 py-3 text-sm text-white shadow-inner focus:outline-none focus:ring-2 ${formErrors.value.nftDescription ? 'border-[#04E6E6]' : 'border-[#043234] focus:ring-[#04E6E6]'
                              } min-h-[110px]`}
                          />
                          {formErrors.value.nftDescription && (
                            <span class="text-xs text-[#04E6E6]">{t('mint.form.errorDesc')}</span>
                          )}
                        </div>

                        <div class="rounded-2xl border border-dashed border-[#043234] bg-[#000d0e] p-4">
                          <label class="block text-sm font-medium text-slate-300">{t('mint.form.image')}</label>
                          <p class="text-xs text-slate-400">{t('mint.form.imageHint')}</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange$={handleImageChange}
                            class="mt-3 block w-full text-sm text-white file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-gradient-to-r file:from-[#c1272d] file:to-[#d13238] file:px-5 file:py-2 file:font-semibold file:text-white hover:file:bg-[#a91f23]"
                          />
                          {imagePreview.value && (
                            <img
                              src={imagePreview.value}
                              alt="Preview"
                              class="mt-4 w-full max-h-64 rounded-2xl border border-[#c1272d]/20 object-cover shadow-lg"
                            />
                          )}
                        </div>
                      </div>

                      <div class="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white/90 px-4 py-3 text-sm text-slate-400">
                        <LuCheck class={`h-4 w-4 ${formValid.value ? 'text-emerald-500' : 'text-gray-300'}`} />
                        {formValid.value
                          ? t('mint.form.statusReady')
                          : t('mint.form.statusNotReady')}
                      </div>

                      {/* Step Navigation */}
                      <div class="mt-6 flex justify-end">
                        <Button
                          onClick$={nextStep}
                          disabled={!formValid.value}
                          class="bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white"
                        >
                          {t('mint.steps.next@@Next Step')} <LuChevronRight class="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: Template & Configuration */}
                  <div class={currentStep.value === 2 ? 'block' : 'hidden'}>
                    <div class="space-y-8 bg-gradient-to-b from-white via-white to-gray-50/70 p-8">
                      <div class="rounded-2xl border border-gray-100 bg-[#001214] border-[#043234]">
                        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div class="flex items-center gap-2 text-[#04E6E6]">
                            <span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#04E6E6]/10">
                              <LuFilePlus class="h-5 w-5" />
                            </span>
                            <div>
                              <h2 class="text-2xl font-bold text-white">{t('mint.templateSection.title')}</h2>
                              <p class="text-sm text-slate-400">
                                {t('mint.templateSection.desc')}
                              </p>
                            </div>
                          </div>
                          <div class="flex items-center gap-3 text-xs font-semibold text-slate-400">
                            <span class="uppercase tracking-wide">{t('mint.templateSection.block2')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Template gallery */}
                    <div class="space-y-5">
                      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#04E6E6]/80">
                            {t('mint.templateSection.galleryTitle')}
                          </p>
                          <p class="text-sm text-slate-400">
                            {t('mint.templateSection.galleryDesc')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          class="text-xs text-slate-400 hover:text-[#04E6E6]"
                          disabled={!selectedTemplateId.value}
                          onClick$={() => (selectedTemplateId.value = '')}
                        >
                          {t('mint.templateSection.clear')}
                        </Button>
                      </div>
                      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {templateShowcase.value.map(({ template, meta, attrCount }) => {
                          const Icon = TEMPLATE_ICONS[meta.icon] ?? LuSparkles;
                          const isActive = selectedTemplateId.value === template.id;
                          return (
                            <button
                              key={template.id}
                              type="button"
                              aria-pressed={isActive}
                              onClick$={() => selectTemplate(template.id)}
                              class={`group relative overflow-hidden rounded-3xl border px-5 py-5 text-left transition-all ${isActive
                                ? 'border-transparent bg-gradient-to-br from-white via-white to-rose-50 shadow-xl shadow-[#c1272d]/20 ring-2 ring-[#c1272d]'
                                : 'border-gray-200 bg-white hover:border-[#c1272d]/40 hover:shadow-lg'
                                }`}
                            >
                              <div class="flex items-start justify-between gap-3">
                                <span
                                  class="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm"
                                  style={{
                                    background: `linear-gradient(135deg, ${meta.accentFrom}, ${meta.accentTo})`,
                                  }}
                                >
                                  <Icon class="h-5 w-5 text-white" />
                                </span>
                                <span class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                                  {t(`mint.templates.tags.${meta.tag === 'IoT + Data' ? 'iot' : meta.tag === 'Map + Image' ? 'mapImage' : meta.tag === 'Live Map' ? 'liveMap' : meta.tag === 'Real Estate' ? 'realEstate' : meta.tag === 'Premium' ? 'premium' : 'general'}`) || meta.tag}
                                </span>
                              </div>
                              <p class="mt-4 text-base font-semibold text-white">{t(`mint.templates.items.${template.id === 'iot-sensor' ? 'iotSensor' : template.id === 'map-cells' ? 'mapImage' : template.id === 'map-google' ? 'liveMap' : template.id === 'realestate-basic' ? 'realEstate' : template.id === 'realestate-premium' ? 'realEstatePremium' : template.id === 'gaming' ? 'character' : template.id}.name`) || template.name}</p>
                              <p class="mt-2 text-sm text-slate-400">
                                {t(`mint.templates.items.${template.id === 'iot-sensor' ? 'iotSensor' : template.id === 'map-cells' ? 'mapImage' : template.id === 'map-google' ? 'liveMap' : template.id === 'realestate-basic' ? 'realEstate' : template.id === 'realestate-premium' ? 'realEstatePremium' : template.id === 'gaming' ? 'character' : template.id}.desc`) || template.description}
                              </p>
                              <div class="mt-4 flex items-center justify-between text-xs">
                                <span class="font-semibold text-white">{attrCount} {t('mint.templateSection.attrs')}</span>
                                <span class="text-[#04E6E6]">{t('mint.templateSection.select')}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div class="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-inner">
                        {selectedTemplate.value ? (
                          <div class="flex items-center gap-3">
                            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c1272d] to-[#d13238] shadow-md">
                              <LuSparkles class="h-5 w-5 text-white" />
                            </span>
                            <div>
                              <p class="text-xs uppercase tracking-wide text-slate-400">{t('mint.templateSection.selectedTitle')}</p>
                              <h3 class="font-semibold text-white">{selectedTemplate.value.name}</h3>
                            </div>
                          </div>
                        ) : (
                          <div class="flex flex-col items-center gap-3 text-center text-sm text-slate-400">
                            <LuSparkles class="h-6 w-6 text-[#04E6E6]" />
                            <p>{t('mint.templateSection.emptyHint')}</p>
                          </div>
                        )}
                      </div>
                      <div class="mt-6 flex justify-between">
                        <Button
                          onClick$={prevStep}
                          variant="outline"
                          class="border-gray-200 text-slate-300 hover:bg-gray-50"
                        >
                          <LuChevronLeft class="mr-2 w-4 h-4" /> {t('mint.steps.back@@Back')}
                        </Button>
                        <Button
                          id="next-step-button"
                          onClick$={nextStep}
                          disabled={!selectedTemplateId.value}
                          class="bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white"
                        >
                          {t('mint.steps.next@@Next Step')} <LuChevronRight class="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3 (Conditional): Map & Cells (If applicable) */}
                  {isMapTemplate.value && (
                    <div class={currentStep.value === 3 ? 'block' : 'hidden'}>
                      <div class="space-y-8 bg-gradient-to-b from-white via-white to-gray-50/70 p-8">
                        <div class="rounded-2xl border border-gray-100 bg-[#001214] border-[#043234]">
                          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div class="flex items-center gap-2 text-[#04E6E6]">
                              <span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#04E6E6]/10">
                                <LuMap class="h-5 w-5" />
                              </span>
                              <div>
                                <h2 class="text-2xl font-bold text-white">{t('mint.mapSection.defineCells')}</h2>
                                <p class="text-sm text-slate-400">
                                  {isImageMapTemplate.value
                                    ? t('mint.mapSection.imageUploaded')
                                    : t('mint.mapSection.leafletReady')}
                                </p>
                              </div>
                            </div>
                            <div class="flex items-center gap-3 text-xs font-semibold text-slate-400">
                              <span class="rounded-full bg-gray-100 px-3 py-1 text-slate-300">
                                {availableCells.value.size} {t('mint.mapSection.available')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div class="w-full bg-white border border-gray-100 rounded-2xl shadow-sm mt-8 flex flex-col overflow-hidden">
                          {/* Top Toolbar */}
                          <div class="flex flex-col px-4 py-3 border-b border-gray-100 bg-gray-50/80">

                            {/* Row 1: Grid Settings */}
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                              {/* Left: Title & Grid Inputs */}
                              <div class="flex items-center gap-4">
                                <h3 class="text-sm font-semibold text-white hidden md:block">{t('mint.mapSection.cellEditor')}</h3>

                                <div class="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-2">{t('mint.mapSection.rows')}</label>
                                  <input
                                    type="number"
                                    min={1} max={50}
                                    value={gridRows.value}
                                    onInput$={(e) => setRows(Math.max(1, Math.min(50, Number((e.target as HTMLInputElement).value))))}
                                    class="w-10 bg-transparent border-none py-0.5 text-center text-sm font-bold text-gray-800 focus:ring-0 outline-none"
                                  />
                                  <div class="w-[1px] h-4 bg-gray-200"></div>
                                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-2">{t('mint.mapSection.cols')}</label>
                                  <input
                                    type="number"
                                    min={1} max={80}
                                    value={gridCols.value}
                                    onInput$={(e) => setCols(Math.max(1, Math.min(80, Number((e.target as HTMLInputElement).value))))}
                                    class="w-10 bg-transparent border-none py-0.5 text-center text-sm font-bold text-gray-800 focus:ring-0 outline-none"
                                  />
                                </div>
                              </div>

                              {/* Right: Quick Actions */}
                              <div class="flex flex-wrap items-center gap-2 sm:gap-4">
                                {/* Color Picker */}
                                <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm" title="Grid Line Color">
                                  <div class="w-3.5 h-3.5 rounded-full shadow-inner ring-1 ring-black/5" style={{ backgroundColor: gridLineColor.value }}></div>
                                  <select
                                    class="bg-transparent border-none text-[10px] uppercase font-bold text-slate-300 focus:ring-0 outline-none cursor-pointer p-0"
                                    value={gridLineColor.value}
                                    onChange$={(e) => gridLineColor.value = (e.target as HTMLSelectElement).value}
                                  >
                                    {linePresets.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Row 2: Map Controls */}
                            <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200/60">
                              <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-widest hidden sm:block">Map Tools</h4>
                              <div class="flex items-center gap-4">
                                {/* Map Controls */}
                                <div class="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick$={() => (hideGridSignal.value = !hideGridSignal.value)}
                                    class={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${hideGridSignal.value
                                      ? 'bg-rose-50 text-[#04E6E6] border-2 border-[#c1272d]/40 shadow-inner'
                                      : 'bg-white text-[#04E6E6] border-2 border-[#c1272d]/80 hover:bg-[#04E6E6]/5 shadow-sm'
                                      }`}
                                  >
                                    <span class={`flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border-[1.5px] transition-colors ${hideGridSignal.value ? 'bg-transparent border-[#c1272d]' : 'bg-[#04E6E6] border-[#c1272d]'}`}>
                                      {!hideGridSignal.value && <LuCheck class="h-3 w-3 text-white stroke-[3]" />}
                                    </span>
                                    <span class="text-[11px] uppercase tracking-wide">
                                      {hideGridSignal.value
                                        ? t('mint.mapSection.showGrid@@Show grid to edit cells')
                                        : t('mint.mapSection.hideGrid@@Hide grid to move map')}
                                    </span>
                                  </button>

                                  <div class="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <button type="button" onClick$={zoomOut} class="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white border-r border-gray-100 hover:bg-gray-50 font-bold">-</button>
                                    <button type="button" onClick$={zoomIn} class="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-gray-50 font-bold">+</button>
                                  </div>
                                </div>

                                <div class="h-4 w-[1px] bg-gray-200 hidden sm:block"></div>

                                {/* View Toggle */}
                                <div class="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                  <button
                                    type="button"
                                    onClick$={() => (mapStyle.value = 'standard')}
                                    class={`px-4 py-1 text-[11px] font-bold rounded-md transition-all ${mapStyle.value === 'standard' ? 'bg-white shadow-sm text-white' : 'text-slate-400 hover:text-slate-300'}`}
                                  >
                                    {t('mint.mapSection.mapView')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick$={() => (mapStyle.value = 'satellite')}
                                    class={`px-4 py-1 text-[11px] font-bold rounded-md transition-all ${mapStyle.value === 'satellite' ? 'bg-white shadow-sm text-white' : 'text-slate-400 hover:text-slate-300'}`}
                                  >
                                    {t('mint.mapSection.satelliteView')}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Row 3: Search & Location */}
                            {isLeafletMapTemplate.value && (
                              <div class="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200/60">
                                <form preventdefault:submit onSubmit$={handleSearch} class="flex items-center relative flex-1 min-w-[200px] max-w-sm">
                                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <LuMap class="w-4 h-4" />
                                  </div>
                                  <input
                                    type="text"
                                    class="w-full bg-white border border-gray-200 text-white rounded-l-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#c1272d]/20 focus:border-[#c1272d] text-sm transition-all shadow-sm"
                                    placeholder={t('mint.mapSection.searchPlaceholder')}
                                    bind:value={searchQuery}
                                    disabled={isSearching.value}
                                    autoComplete="off"
                                  />
                                  <button
                                    type="submit"
                                    class="bg-gray-100 hover:bg-rose-50 border border-l-0 border-gray-200 text-slate-300 hover:text-[#04E6E6] hover:border-[#c1272d]/30 px-4 py-2 rounded-r-xl text-sm font-bold shrink-0 transition-all shadow-sm"
                                    disabled={isSearching.value}
                                  >
                                    {t('mint.mapSection.search')}
                                  </button>
                                </form>

                                <div class="hidden sm:block w-[1px] h-6 bg-gray-200"></div>

                                <button
                                  type="button"
                                  onClick$={centerOnUserLocation}
                                  class="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:bg-rose-50 hover:border-[#c1272d]/30 text-slate-300 hover:text-[#04E6E6] rounded-xl shadow-sm transition-all shrink-0 font-bold text-sm"
                                  title={t('mint.mapSection.locateMe')}
                                >
                                  <LuMapPin class="w-4 h-4 text-[#04E6E6] mr-2" />
                                  <span>{t('mint.mapSection.locateMe@@Locate me')}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div class="p-3 bg-white flex flex-col gap-3">
                            {/* BASE MAP CONTAINER */}
                            <div
                              class="relative w-full rounded-xl overflow-hidden border border-gray-200/70 shadow-[inset_0_2px_10px_rgba(0,0,0,0.06)]"
                              style={{
                                backgroundImage: isImageMapTemplate.value ? `url(${imagePreview.value})` : 'none',
                                backgroundSize: isImageMapTemplate.value ? 'contain' : 'auto',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                height: '55vh',
                                minHeight: '400px',
                                touchAction: 'none',
                              }}
                            >
                              {isLeafletMapTemplate.value && <div id={mapContainerId} class="absolute inset-0" style={{ zIndex: 0 }} />}

                              {!hideGridSignal.value && (
                                <div
                                  class="absolute inset-0 grid select-none"
                                  style={{
                                    gridTemplateRows: `repeat(${gridRows.value}, 1fr)`,
                                    gridTemplateColumns: `repeat(${gridCols.value}, 1fr)`,
                                    pointerEvents: 'auto',
                                    zIndex: 10,
                                  }}
                                >
                                  {Array.from({ length: gridRows.value }).map((_, r) =>
                                    Array.from({ length: gridCols.value }).map((__, c) => {
                                      const k = `${r}-${c}` as CellKey;
                                      const isAvail = availableCells.value.has(k);
                                      const bg = isAvail ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.35)';

                                      return (
                                        <div
                                          key={k}
                                          onPointerDown$={(e) => handleDown(r, c, e as any)}
                                          onPointerEnter$={(e) => handleEnter(r, c, e as any)}
                                          class="transition-colors"
                                          style={{ border: `1px solid ${gridLineColor.value}`, background: bg, userSelect: 'none' }}
                                          title={`${t('mint.mapSection.row@@Row')} ${r + 1} · ${t('mint.mapSection.col@@Col')} ${c + 1}`}
                                        />
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>

                            {/* BOTTOM UNIFIED TOOLBAR & STATS */}
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50 border border-gray-100 p-3 rounded-xl">
                              {/* Left: Stats and Quick Actions */}
                              <div class="flex flex-wrap items-center gap-3 px-2">
                                <div class="flex items-center gap-2">
                                  <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                  <span class="text-xs text-slate-300 font-medium whitespace-nowrap">
                                    {t('mint.mapSection.available@@Available')}: <span class="font-bold text-white">{availableCells.value.size}</span>
                                  </span>
                                </div>
                                <div class="hidden sm:block w-[1px] h-4 bg-gray-300"></div>
                                <span class="text-xs text-slate-400 mr-2 whitespace-nowrap">
                                  {t('mint.mapSection.null@@Null')}: <span class="font-bold">{gridRows.value * gridCols.value - availableCells.value.size}</span>
                                  <span class="opacity-50 mx-1">/</span>
                                  {gridRows.value * gridCols.value}
                                </span>

                                {/* Quick Actions */}
                                <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                                  <button type="button" onClick$={selectAll} class="text-[11px] font-bold h-7 px-3 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors flex items-center">{t('mint.mapSection.selectAll')}</button>
                                  <div class="w-[1px] h-4 bg-gray-200"></div>
                                  <button type="button" onClick$={clearGrid} class="text-[11px] font-bold h-7 px-3 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center">{t('mint.mapSection.clear')}</button>
                                </div>
                              </div>

                            </div>

                            {/* ADVANCED COORDINATES PANEL */}
                            {isLeafletMapTemplate.value && (
                              <div class="mt-2 rounded-xl border border-gray-200/60 bg-white shadow-sm overflow-hidden">
                                <div class="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                  <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <LuMapPin class="w-3.5 h-3.5" />
                                    Advanced Coordinates Setup
                                  </h4>
                                </div>
                                <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                                  {/* Decimal Degrees */}
                                  <div class="flex flex-col gap-2">
                                    <div class="flex items-center justify-between">
                                      <span class="text-[10px] font-bold text-gray-400">{t('mint.mapSection.decimal')}</span>
                                      <button type="button" onClick$={goToCoords} class="text-[10px] uppercase font-bold text-[#04E6E6] hover:text-[#a91f23]">{t('mint.mapSection.syncGo')}</button>
                                    </div>
                                    <div class="flex gap-2">
                                      <div class="relative flex-1">
                                        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">LAT</span>
                                        <input
                                          type="text" class="w-full bg-gray-50 border border-gray-200 text-white rounded-md pl-9 pr-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-xs font-mono"
                                          placeholder="0.0000" value={coordLat.value}
                                          onInput$={(e) => {
                                            coordLat.value = (e.target as HTMLInputElement).value;
                                            const lat = parseCoordinate(coordLat.value); const lng = parseCoordinate(coordLng.value);
                                            if (lat !== null && lng !== null) updateGMSFromGD(lat, lng);
                                          }}
                                        />
                                      </div>
                                      <div class="relative flex-1">
                                        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">LNG</span>
                                        <input
                                          type="text" class="w-full bg-gray-50 border border-gray-200 text-white rounded-md pl-9 pr-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-xs font-mono"
                                          placeholder="0.0000" value={coordLng.value}
                                          onInput$={(e) => {
                                            coordLng.value = (e.target as HTMLInputElement).value;
                                            const lat = parseCoordinate(coordLat.value); const lng = parseCoordinate(coordLng.value);
                                            if (lat !== null && lng !== null) updateGMSFromGD(lat, lng);
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* DMS */}
                                  <div class="flex flex-col gap-2 relative">
                                    <div class="hidden md:block absolute -left-2.5 top-1 bottom-1 w-[1px] bg-gray-100"></div>
                                    <div class="flex items-center justify-between md:pl-3">
                                      <span class="text-[10px] font-bold text-gray-400">{t('mint.mapSection.dms')}</span>
                                      <button type="button" onClick$={goToGmsCoords} class="text-[10px] uppercase font-bold text-[#04E6E6] hover:text-[#a91f23]">{t('mint.mapSection.syncGo')}</button>
                                    </div>
                                    <div class="space-y-1.5 md:pl-3">
                                      <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md p-1">
                                        <span class="text-[9px] font-bold text-gray-400 w-5 text-center">LAT</span>
                                        <input type="number" class="w-9 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-center font-mono" value={latDeg.value} onInput$={(e) => { latDeg.value = Number((e.target as HTMLInputElement).value); updateGDFromGMS(); }} />
                                        <span class="text-gray-400 text-[9px]">°</span>
                                        <input type="number" class="w-9 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-center font-mono" value={latMin.value} onInput$={(e) => { latMin.value = Number((e.target as HTMLInputElement).value); updateGDFromGMS(); }} />
                                        <span class="text-gray-400 text-[9px]">'</span>
                                        <input type="number" step="0.001" class="w-12 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-center font-mono flex-1" value={latSec.value} onInput$={(e) => { latSec.value = Number((e.target as HTMLInputElement).value); updateGDFromGMS(); }} />
                                        <span class="text-gray-400 text-[9px]">''</span>
                                        <select class="w-8 bg-white border border-gray-200 rounded px-0 py-1 text-[10px] font-bold font-mono text-center appearance-none" value={latDir.value} onChange$={(e) => { latDir.value = (e.target as HTMLSelectElement).value; updateGDFromGMS(); }}>
                                          <option value="N">N</option><option value="S">S</option>
                                        </select>
                                      </div>
                                      <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md p-1">
                                        <span class="text-[9px] font-bold text-gray-400 w-5 text-center">LNG</span>
                                        <input type="number" class="w-9 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-center font-mono" value={lngDeg.value} onInput$={(e) => { lngDeg.value = Number((e.target as HTMLInputElement).value); updateGDFromGMS(); }} />
                                        <span class="text-gray-400 text-[9px]">°</span>
                                        <input type="number" class="w-9 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-center font-mono" value={lngMin.value} onInput$={(e) => { lngMin.value = Number((e.target as HTMLInputElement).value); updateGDFromGMS(); }} />
                                        <span class="text-gray-400 text-[9px]">'</span>
                                        <input type="number" step="0.001" class="w-12 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-center font-mono flex-1" value={lngSec.value} onInput$={(e) => { lngSec.value = Number((e.target as HTMLInputElement).value); updateGDFromGMS(); }} />
                                        <span class="text-gray-400 text-[9px]">''</span>
                                        <select class="w-8 bg-white border border-gray-200 rounded px-0 py-1 text-[10px] font-bold font-mono text-center appearance-none" value={lngDir.value} onChange$={(e) => { lngDir.value = (e.target as HTMLSelectElement).value; updateGDFromGMS(); }}>
                                          <option value="E">E</option><option value="W">W</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {searchError.value && (
                                  <div class="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-bold text-center border-t border-red-100">
                                    {searchError.value}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step Navigation */}
                        <div class="mt-6 flex justify-between">
                          <Button
                            onClick$={prevStep}
                            variant="outline"
                            class="border-gray-200 text-slate-300 hover:bg-gray-50"
                          >
                            <LuChevronLeft class="mr-2 w-4 h-4" /> {t('mint.steps.back@@Back')}
                          </Button>
                          <Button
                            onClick$={nextStep}
                            disabled={!mapReady.value}
                            class="bg-gradient-to-r from-[#c1272d] to-[#d13238] text-white"
                          >
                            {t('mint.steps.next@@Next Step')} <LuChevronRight class="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FINAL STEP: Review & Mint */}
                  <div class={currentStep.value === totalSteps.value ? 'block' : 'hidden'}>
                    <div class="space-y-8 bg-gradient-to-b from-white via-white to-gray-50/70 p-8">
                      {/* Attributes & Selected Template */}
                      <div class="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-sm">
                        {selectedTemplate.value ? (
                          <>
                            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p class="text-xs uppercase tracking-wide text-slate-400">{t('mint.templateSection.selectedTitle')}</p>
                                <h3 class="text-xl font-semibold text-white">
                                  {selectedTemplate.value.name}
                                </h3>
                                <p class="text-sm text-slate-400">
                                  {selectedTemplate.value.description || activeTemplateMeta.value.highlight}
                                </p>
                              </div>
                            </div>


                            <div class="mt-6 border-t border-gray-100 pt-6">
                              <h4 class="text-sm font-semibold text-white mb-3">{t('mint.templateSection.allAttributes@@All Attributes')} ({customAttributes.value.length})</h4>
                              <div class="space-y-3">
                                {customAttributes.value.map((a: Attr, i: number) => (
                                  <div
                                    key={`custom-attr-${i}`}
                                    class="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-2"
                                  >
                                    <input
                                      type="text"
                                      placeholder={t('mint.steps.attributes.traitTypePlaceholder@@e.g. Color')}
                                      value={a.trait_type}
                                      onInput$={(e) => {
                                        const next = [...customAttributes.value];
                                        next[i] = { ...next[i], trait_type: (e.target as HTMLInputElement).value };
                                        customAttributes.value = next;
                                      }}
                                      class="w-1/3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-white focus:border-[#c1272d] focus:outline-none focus:ring-1 focus:ring-[#c1272d]"
                                    />
                                    <input
                                      type="text"
                                      placeholder={t('mint.steps.attributes.valuePlaceholder@@e.g. Red')}
                                      value={a.value}
                                      onInput$={(e) => {
                                        const next = [...customAttributes.value];
                                        next[i] = { ...next[i], value: (e.target as HTMLInputElement).value };
                                        customAttributes.value = next;
                                      }}
                                      class="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-white focus:border-[#c1272d] focus:outline-none focus:ring-1 focus:ring-[#c1272d]"
                                    />
                                    <button
                                      type="button"
                                      title={t('mint.steps.attributes.remove@@Remove')}
                                      onClick$={() => {
                                        customAttributes.value = customAttributes.value.filter((_, idx) => idx !== i);
                                      }}
                                      class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    >
                                      <LuX class="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Automatic Map Attributes (Read-only) */}
                              {autoAttrs.value.length > 0 && (
                                <div class="mt-6 border-t border-gray-100 pt-6">
                                  <div class="flex items-center gap-2 mb-3">
                                    <h4 class="text-sm font-semibold text-white">{t('mint.templateSection.autoAttributes@@Map & Grid Attributes')}</h4>
                                    <span class="px-2 py-0.5 rounded-full bg-rose-50 text-[10px] font-bold text-[#04E6E6] uppercase tracking-wider border border-[#c1272d]/10">Auto</span>
                                  </div>
                                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {autoAttrs.value.map((a: Attr, i: number) => (
                                      <div
                                        key={`auto-attr-${i}`}
                                        class="flex flex-col gap-1 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-3 transition-colors hover:bg-gray-50"
                                      >
                                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{a.trait_type}</span>
                                        <span class="text-sm font-semibold text-slate-300 truncate" title={a.value}>{a.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {customAttributes.value.length === 0 && (
                                <p class="text-sm text-slate-400 italic mt-2">{t('mint.steps.attributes.emptyHint@@No custom attributes defined yet.')}</p>
                              )}
                              {customAttributes.value.length < MAX_ATTRS && (
                                <Button
                                  variant="outline"
                                  onClick$={() => {
                                    customAttributes.value = [...customAttributes.value, { trait_type: '', value: '' }];
                                  }}
                                  class="mt-4 border-dashed border-gray-300 text-slate-400 hover:border-[#c1272d] hover:text-[#04E6E6] hover:bg-red-50/50 w-full"
                                >
                                  <LuPlus class="mr-2 h-4 w-4" /> {t('mint.steps.attributes.addBtn@@Add Attribute')}
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div class="flex flex-col items-center gap-3 text-center text-sm text-slate-400">
                            <LuSparkles class="h-6 w-6 text-[#04E6E6]" />
                            <p>{t('mint.templateSection.emptyHint')}</p>
                          </div>
                        )}
                      </div>

                      {/* Metadata Visibility */}
                      <div class="rounded-2xl border border-gray-100 bg-[#001214] border-[#043234]">
                        <div class="flex items-center justify-between">
                          <div class="flex-1">
                            <h3 class="text-sm font-medium text-[#04E6E6] mb-1">{t('mint.mapSection.metaVisibility')}</h3>
                            <p class="text-xs text-slate-400">
                              {t('mint.mapSection.metaVisDesc')}
                            </p>
                          </div>
                          <label class="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={metadataIsPublic.value}
                              onChange$={(e) =>
                                (metadataIsPublic.value = (e.target as HTMLInputElement).checked)
                              }
                              class="sr-only peer"
                            />
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#c1272d] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#04E6E6]"></div>
                            <span class="ml-3 text-sm font-medium text-white">
                              {metadataIsPublic.value ? t('mint.mapSection.public') : t('mint.mapSection.private')}
                            </span>
                          </label>
                        </div>
                      </div>

                      <div class="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-[#001214] border-[#043234] lg:flex-row lg:items-center lg:justify-between">
                        <div class="text-sm text-slate-400">
                          {t('mint.steps.readyToMint@@You are ready to mint. Review your details in the sidebar.')}
                        </div>
                        <div class="flex flex-wrap items-center gap-3">
                          <Button
                            onClick$={prevStep}
                            variant="outline"
                            class="border-gray-200 text-slate-300 hover:bg-gray-50"
                            disabled={isProcessing.value}
                          >
                            <LuChevronLeft class="mr-2 w-4 h-4" /> {t('mint.steps.back@@Back')}
                          </Button>
                          <Button
                            onClick$={mintNFT}
                            disabled={
                              isProcessing.value ||
                              !formValid.value ||
                              (isMapTemplate.value && !mapReady.value)
                            }
                            class="bg-gradient-to-r from-[#04E6E6] to-[#06b6d4] hover:brightness-110 text-white"
                            title={
                              !formValid.value
                                ? t('mint.steps.details.notReady')
                                : isMapTemplate.value && !mapReady.value
                                  ? isImageMapTemplate.value && !imageFile.value
                                    ? t('mint.mapSection.uploadFirst')
                                    : t('mint.errors.cellsRequired')
                                  : ''
                            }
                          >
                            {isProcessing.value ? t('mint.summary.minting') : t('mint.summary.mintBtn')} <LuFilePlus class="ml-1 w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Errors */}
                      {uiError.value && (
                        <div class="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                          <div class="flex items-start gap-3">
                            <LuX class="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div class="min-w-0 flex-1">
                              {/* normalizeEvmError returns keys, so we translate them. */}
                              <p class="font-semibold text-red-700">{t(uiError.value.title)}</p>
                              <p class="text-sm text-red-600 mt-1 break-words">{t(uiError.value.message)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card.Content>
              </Card.Root>
            )}
          </div>

          {wallet.connected && (
            <aside class="space-y-5 lg:sticky lg:top-6">
              <Card.Root class="rounded-3xl border border-white/40 bg-white/95 shadow-2xl shadow-[#c1272d]/10 backdrop-blur">
                <Card.Content class="space-y-5 p-6">
                  <div class="flex items-center  mt-8 justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-wide text-slate-400">{t('mint.summary.sidebar.preview')}</p>
                      <p class="text-xl font-semibold text-white">
                        {nftName.value.trim() || t('mint.summary.sidebar.unnamed@@Unnamed NFT')}
                      </p>
                    </div>
                    <span
                      class={`rounded-full px-3 py-1 text-xs font-semibold ${metadataIsPublic.value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-slate-300'
                        }`}
                    >
                      {metadataIsPublic.value ? t('mint.summary.sidebar.public') : t('mint.summary.sidebar.private')}
                    </span>
                  </div>
                  <p class="text-sm leading-relaxed text-slate-400">{summaryDescription.value}</p>
                  <div class="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm text-slate-300">
                    <div class="flex items-center justify-between font-semibold text-white">
                      <span>{t('mint.stats.template.title')}</span>
                      <span class="text-slate-400">{selectedTemplate.value?.name ?? t('mint.stats.template.notSelected')}</span>
                    </div>
                    <div class="mt-2 flex items-center justify-between">
                      <span>{t('mint.summary.sidebar.manual@@Manual attributes')}</span>
                      <span>
                        {customAttributes.value.length}/{MAX_ATTRS}
                      </span>
                    </div>
                    {isMapTemplate.value && (
                      <div class="mt-2 flex items-center justify-between">
                        <span>{t('mint.summary.sidebar.cells@@Cells ready')}</span>
                        <span class={mapReady.value ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                          {availableCells.value.size} / {gridRows.value * gridCols.value}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-wide text-slate-400">{t('mint.summary.sidebar.featured')}</p>
                    {previewAttributes.value.length ? (
                      <ul class="mt-3 space-y-2">
                        {previewAttributes.value.map((attr: Attr, i: number) => (
                          <li
                            key={i}
                            class="flex items-center justify-between rounded-xl border border-white/50 bg-white px-3 py-2 text-sm"
                          >
                            <span class="text-slate-400">{attr.trait_type}</span>
                            <span class="font-semibold text-white">{attr.value}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p class="mt-3 text-sm text-slate-400">
                        {t('mint.mapSection.noManual')}
                      </p>
                    )}
                  </div>
                </Card.Content>
              </Card.Root>

              <Card.Root class="rounded-3xl border border-white/40 bg-white/95 shadow-xl shadow-[#c1272d]/10 backdrop-blur">
                <Card.Content class="space-y-5 p-6">
                  <div class="flex items-center justify-between">
                    <p class="text-base font-semibold text-white">{t('mint.summary.sidebar.checklist@@Checklist')}</p>
                    <span class="text-sm font-semibold text-[#04E6E6]">
                      {t('mint.summary.sidebar.percentReady@@{{score}}% ready', { score: readiness.value.score })}
                    </span>
                  </div>
                  <div class="h-2 w-full rounded-full bg-gray-100">
                    <div
                      class="h-2 rounded-full bg-gradient-to-r from-[#c1272d] via-[#d13238] to-[#f97316] transition-all"
                      style={{ width: `${readiness.value.score}%` }}
                    />
                  </div>
                  <ul class="space-y-3">
                    {readiness.value.checklist.map((item) => (
                      <li key={item.label} class="flex items-center gap-3 text-sm">
                        <span
                          class={`flex h-6 w-6 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                          {item.done ? <LuCheck class="h-3.5 w-3.5" /> : <LuX class="h-3.5 w-3.5" />}
                        </span>
                        <span class={item.done ? 'text-white' : 'text-slate-400'}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  {isMapTemplate.value && (
                    <div
                      class={`rounded-2xl border px-4 py-3 text-xs ${mapReady.value
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                    >
                      {mapReady.value
                        ? t('mint.mapSection.mapReady', { count: availableCells.value.size })
                        : t('mint.mapSection.mapNotReady')}
                    </div>
                  )}
                </Card.Content>
              </Card.Root>
            </aside>
          )}
        </section>

        {/* Quick Guide - Only visible when wallet connected */}
        {wallet.connected && (
          <div class="bg-white border border-gray-200 rounded-3xl p-6 lg:p-8 shadow-sm">
            <div class="mb-6">
              <div class="flex items-center gap-3 mb-2">
                <h2 class="text-2xl font-bold text-white">Quick guide</h2>
                {demo?.enabled.value && (
                  <span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Free Sandbox
                  </span>
                )}
              </div>
              <p class="text-lg font-medium text-[#04E6E6]">How to mint in 3 steps</p>
              <p class="text-slate-400 mt-1">
                {demo?.enabled.value
                  ? 'Test the full platform experience without spending real assets or gas.'
                  : 'Keep the same features; we just polished the visual experience.'}
              </p>
            </div>

            <div class="grid md:grid-cols-3 gap-6 relative">
              {/* Connecting line for desktop */}
              <div class="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-gray-100 via-[#c1272d]/20 to-gray-100 opacity-50 z-0"></div>

              {/* Step 1 Guide */}
              <div
                class="relative z-10 flex flex-col xl:flex-row items-center xl:items-start text-center xl:text-left gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100/80 hover:bg-white hover:shadow-md hover:border-[#c1272d]/20 transition-all group cursor-pointer"
                onClick$={() => {
                  currentStep.value = 1;
                  document.getElementById('minting-steps-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <div class="shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 group-hover:border-[#c1272d] flex items-center justify-center text-lg font-bold text-gray-400 group-hover:text-[#04E6E6] shadow-sm transition-colors">
                  1
                </div>
                <div>
                  <h3 class="font-bold text-white mb-1 leading-tight">Complete the details</h3>
                  <p class="text-[13px] text-slate-400 leading-relaxed">
                    Name, description and optional image. If you will use an image-based map, upload it here.
                  </p>
                </div>
              </div>

              {/* Step 2 Guide */}
              <div
                class="relative z-10 flex flex-col xl:flex-row items-center xl:items-start text-center xl:text-left gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100/80 hover:bg-white hover:shadow-md hover:border-[#c1272d]/20 transition-all group cursor-pointer"
                onClick$={() => {
                  if (!formValid.value) {
                    currentStep.value = 1;
                  } else {
                    currentStep.value = 2;
                  }
                  document.getElementById('minting-steps-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <div class="shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 group-hover:border-[#c1272d] flex items-center justify-center text-lg font-bold text-gray-400 group-hover:text-[#04E6E6] shadow-sm transition-colors">
                  2
                </div>
                <div>
                  <h3 class="font-bold text-white mb-1 leading-tight">Choose template and cells</h3>
                  <p class="text-[13px] text-slate-400 leading-relaxed">
                    Use templates to autofill, open the editor if it's a map and ensure you have at least one available cell.
                  </p>
                </div>
              </div>

              {/* Step 3 Guide */}
              <div
                class="relative z-10 flex flex-col xl:flex-row items-center xl:items-start text-center xl:text-left gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100/80 hover:bg-white hover:shadow-md hover:border-[#c1272d]/20 transition-all group cursor-pointer"
                onClick$={() => {
                  if (!formValid.value) {
                    currentStep.value = 1;
                  } else if (!selectedTemplate.value) {
                    currentStep.value = 2;
                  } else if (isMapTemplate.value && !mapReady.value) {
                    currentStep.value = 3;
                  } else {
                    currentStep.value = totalSteps.value;
                  }
                  document.getElementById('minting-steps-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <div class="shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 group-hover:border-[#c1272d] flex items-center justify-center text-lg font-bold text-gray-400 group-hover:text-[#04E6E6] shadow-sm transition-colors">
                  3
                </div>
                <div>
                  <h3 class="font-bold text-white mb-1 leading-tight">Sign on Base</h3>
                  <p class="text-[13px] text-slate-400 leading-relaxed">
                    {demo?.enabled.value
                      ? 'Simulated signature. Review the summary and press Mint. No real gas or signature required.'
                      : 'Review the summary in the sidebar, confirm visibility and press Mint. You\'ll need gas in your wallet.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* -------------------------------------------------------------- */}
      </div>
    </div>
  );
});

