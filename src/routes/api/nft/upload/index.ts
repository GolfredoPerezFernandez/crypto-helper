// src/routes/api/nft/upload/index.ts
import type { RequestHandler } from '@builder.io/qwik-city';

// Storacha SDK (server)
import * as Client from '@storacha/client';
import * as Proof from '@storacha/client/proof';
import * as Signer from '@storacha/client/principal/ed25519';
import { StoreMemory } from '@storacha/client/stores/memory';

// --- Helpers ---
const ALLOWED_IMAGE_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/octet-stream',
]);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB

const ipfsToHttp = (uri: string, host = 'storacha.link') => {
  if (!uri) return '';
  if (!uri.startsWith('ipfs://')) return uri;
  const without = uri.slice('ipfs://'.length);
  const [cid, ...rest] = without.split('/');
  if (!cid) return '';
  const path = rest.join('/');
  return path ? `https://${cid}.ipfs.${host}/${path}` : `https://${cid}.ipfs.${host}`;
};

function toRealArrayBuffer(input: Uint8Array | ArrayBuffer | ArrayBufferLike): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    const out = new ArrayBuffer(input.byteLength);
    new Uint8Array(out).set(new Uint8Array(input));
    return out;
  }
  if (input instanceof Uint8Array) {
    const out = new ArrayBuffer(input.byteLength);
    new Uint8Array(out).set(input);
    return out;
  }
  const view = new Uint8Array(input as ArrayBufferLike);
  const out = new ArrayBuffer(view.byteLength);
  new Uint8Array(out).set(view);
  return out;
}

function toFileFromBytes(
  bytes: Uint8Array | ArrayBuffer | ArrayBufferLike,
  name: string,
  type: string
): File {
  const realAB = toRealArrayBuffer(bytes);
  const blob = new Blob([realAB], { type });
  try {
    return new File([blob], name, { type });
  } catch {
    (blob as any).name = name;
    return blob as unknown as File;
  }
}

async function retry<T>(fn: () => Promise<T>, times = 2): Promise<T> {
  let last: any;
  for (let i = 0; i <= times; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

// --- API: POST /api/nft/upload ---
export const onPost: RequestHandler = async (ev) => {
  try {
    const KEY = ev.env.get('STORACHA_KEY');
    const PROOF = ev.env.get('STORACHA_PROOF');
    if (!KEY || !PROOF) {
      ev.json(500, { ok: false, error: 'Missing STORACHA_KEY/STORACHA_PROOF in server env' });
      return;
    }
    const gatewayHost = ev.env.get('PUBLIC_STORACHA_GATEWAY_HOST') || 'storacha.link';

    // Asegura content-type JSON
    const ct = ev.request.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      ev.json(400, { ok: false, error: 'Content-Type must be application/json' });
      return;
    }

    let body: any;
    try {
      body = await ev.request.json();
    } catch {
      ev.json(400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    const metaIn = body?.metadata ?? {};
    const metadata: Record<string, any> = typeof metaIn === 'object' ? { ...metaIn } : {};
    if (typeof metadata.name !== 'string' || !metadata.name.trim()) metadata.name = 'NFT';
    if (typeof metadata.description !== 'string') metadata.description = '';
    if (!Array.isArray(metadata.attributes)) metadata.attributes = [];

    // Instancia de Storacha
    const principal = Signer.parse(KEY);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    const proof = await Proof.parse(PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    // Imagen opcional
    let imageCid: string | undefined;
    const img = body?.image ?? null;

    if (img && Array.isArray(img.bytes) && img.bytes.length) {
      const bytes = new Uint8Array(img.bytes);
      if (bytes.byteLength > MAX_IMAGE_BYTES) {
        ev.json(400, { ok: false, error: `Image exceeds ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB` });
        return;
      }
      const type = img.type || 'image/png';
      if (!ALLOWED_IMAGE_TYPES.has(type)) {
        ev.json(400, { ok: false, error: `Invalid image type: ${type}` });
        return;
      }

      const fileObj = toFileFromBytes(bytes, img.name || 'image.bin', type);
      imageCid = String(await retry(() => client.uploadFile(fileObj)));
      metadata.image = `ipfs://${imageCid}`;
    }

    // metadata.json
    const enc = new TextEncoder();
    const metaBytes = enc.encode(JSON.stringify(metadata, null, 2));
    const metaFile = toFileFromBytes(metaBytes, 'metadata.json', 'application/json');
    const tokenCid = String(await retry(() => client.uploadFile(metaFile)));

    const tokenURI = `ipfs://${tokenCid}`;
    ev.json(200, {
      ok: true,
      spaceDid: space.did(),
      tokenCid,
      tokenURI,
      http: {
        token: ipfsToHttp(tokenURI, gatewayHost),
        ...(imageCid ? { image: ipfsToHttp(`ipfs://${imageCid}`, gatewayHost) } : {}),
      },
      ...(imageCid ? { imageCid } : {}),
    });
  } catch (err: any) {
    ev.json(500, { ok: false, error: err?.message || 'Server error' });
  }
};
