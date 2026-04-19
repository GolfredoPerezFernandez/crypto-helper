KoolinArt — NFT Marketplace (Qwik + Viem + Base)
=================================================

Badges
- Qwik 1.12.0
- TypeScript 5.3.3
- Vite 5.0.0
- Tailwind CSS 4.0.0

KoolinArt is a high‑performance NFT marketplace built with Qwik (SSR + Resumability). It lets you create, buy, sell, and rent NFTs for digital properties, including temporary rights delegation and IPFS storage (Storacha). All market logic runs on‑chain using Viem on the Base network (Chain ID 8453).

The marketplace features 8 innovative minting templates ranging from map cell tokenization to premium memberships, enabling revolutionary use cases in real estate, agriculture, gaming, IoT, and more.


───────────────────────────────────────────────────────────────────────────────
QUICK START
───────────────────────────────────────────────────────────────────────────────

Prerequisites
- Node.js >= 20.19.0
- Yarn >= 1.22.x

Install Yarn (if you don’t have it)
- npm (bundled with Node):   npm install -g yarn
- Windows (installer):       https://classic.yarnpkg.com/en/docs/install/#windows-stable
- macOS (Homebrew):          brew install yarn
- Linux (official guide):    https://classic.yarnpkg.com/en/docs/install
- Verify:                    yarn --version  # 1.22.x or newer

Install
1) yarn install
2) cp .env.example .env   # edit .env with your credentials or keep placeholders
3) yarn dev               # starts SSR at http://localhost:3000

Essential Commands
- yarn dev            # SSR development
- yarn start          # dev + open browser
- yarn build          # production build
- npx tsc             # type-check


───────────────────────────────────────────────────────────────────────────────
MINIMUM ENVIRONMENT VARIABLES (development)
───────────────────────────────────────────────────────────────────────────────

# ================================
# BLOCKCHAIN CONFIGURATION
# ================================
PUBLIC_CHAIN_ID=8453
PUBLIC_CHAIN_NAME=Base
PUBLIC_RPC_URL=https://base.gateway.tenderly.co
PUBLIC_FALLBACK_RPC_URL=https://mainnet.base.org
PUBLIC_EXPLORER_URL=https://basescan.org

# Main NFT contract (RentalNFT)
PUBLIC_NFT_ADDRESS=0xFEf125b97a402DE608d9092b0A349F5a85e58A08

# Marketplace contracts
PUBLIC_SALE_MARKET_ADDRESS=0xc0Cafd4ca83726100EAf1af0c4C521a96A0e21CF
PUBLIC_RENTAL_MARKET_ADDRESS=0x464edb2D2314F340cbd33bf6C81A194a2b33fBF5
PUBLIC_RIGHTS_MARKET_ADDRESS=0xf7a73ECe1552AfED7D4f53c59BCe509EFF88d19B

# ERC‑20 payment token (KNRT)
PUBLIC_KNRT_TOKEN_ADDRESS=0x54de10FADF4Ea2fbAD10Ebfc96979D0885dd36fA

# ================================
# STORACHA / IPFS
# (NEVER commit real keys to repos)
# ================================
STORACHA_KEY=MgCanQggcAsHCaRKJE4Y/rStgnIeCluVDZUc8eA/f2Qg9vO0BPFzSZoExyq/UIW7U9ykgnvhrU8rmrTrfjHGsCL+8J70=
STORACHA_PROOF=mAYIEAOoOOqJlcm9vdHOB2CpYJQABcRIgvtV0NvLu7wDaTRgwQ2dMUTHI39f0FxTSPfK8Sg2jjttndmVyc2lvbgHGAgFxEiAAR3MeJFZYbyl/Kv5/vwFkjLaK0pCRWALDTNxPdgvOb6hhc1hE7aEDQHBxi5MjSXXE7FIF6kiJ+gxMx5qfC3NvPTo9NX4gQvXpj1PK9t6V/Edx96x6RasMKbSsjjVE9Z54ljMPOK2TNAhhdmUwLjkuMWNhdHSBomNjYW5hKmR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc2NhdWRYHp0abWFpbHRvOmdtYWlsLmNvbTpnb2xmcmVkby5wZmNleHD2Y2ZjdIGhZXNwYWNlomRuYW1laUtvb2xpbmFydGZhY2Nlc3OhZHR5cGVmcHVibGljY2lzc1gi7QH3nkdRriV+rzIju8RipVYuZls6X9Ngl0cF/8F3pSsmWmNwcmaAwQIBcRIgdtXJK5MkGtFkhjKLCdUSKrgEggpRE7XZh51+RrEduF6oYXNEgKADAGF2ZTAuOS4xY2F0dIGiY2NhbmEqZHdpdGhmdWNhbjoqY2F1ZFgi7QFxL5WfEhkPWJDbWsGCXFgUSogu8YBGVADkTpy8DmlB1WNleHD2Y2ZjdIGibmFjY2Vzcy9jb25maXJt2CpYJQABcRIgTujLglc4TWtii4DFYbnIYEllSKNEP9L+3vemje62ewVuYWNjZXNzL3JlcXVlc3TYKlglAAFxEiAyEBBZ5LRGIG6mdBE0lUS9INwnDf5XKWeaqwHaU6UbrWNpc3NYHp0abWFpbHRvOmdtYWlsLmNvbTpnb2xmcmVkby5wZmNwcmaB2CpYJQABcRIgAEdzHiRWWG8pfyr+f78BZIy2itKQkVgCw0zcT3YLzm+nAwFxEiB6sA4YvC0ryN3soXq9G1ukxfn6vHRP6RfpgPJnRLXjgahhc1hE7aEDQAVd1ZHJlwe9vatmPvRCNEwsT3+2YZmlIdSntbaS4o4DYqHcAMpum4/Zg17BgNrE6zIsSLyyObwaDJQHlvnJkAdhdmUwLjkuMWNhdHSBo2JuYqFlcHJvb2bYKlglAAFxEiB21ckrkyQa0WSGMosJ1RIquASCClETtdmHnX5GsR24XmNjYW5rdWNhbi9hdHRlc3Rkd2l0aHgbZGlkOndlYjp1cC5zdG9yYWNoYS5uZXR3b3JrY2F1ZFgi7QFxL5WfEhkPWJDbWsGCXFgUSogu8YBGVADkTpy8DmlB1WNleHD2Y2ZjdIGibmFjY2Vzcy9jb25maXJt2CpYJQABcRIgTujLglc4TWtii4DFYbnIYEllSKNEP9L+3vemje62ewVuYWNjZXNzL3JlcXVlc3TYKlglAAFxEiAyEBBZ5LRGIG6mdBE0lUS9INwnDf5XKWeaqwHaU6UbrWNpc3NYGZ0ad2ViOnVwLnN0b3JhY2hhLm5ldHdvcmtjcHJmgJ8FAXESILhJT5kvd5E2VdgbeprC24ozGXQYxRH9afL/peF4w9xKqGFzWETtoQNAXzZzVBigciOkdpmzT2LURTXg3qKJedMhL1cwHXPSDUo/vov1AZr0zcS0bAdTrHJXmhmrlgE+qfSLqoDaiCzFDmF2ZTAuOS4xY2F0dISiY2Nhbm5zcGFjZS9ibG9iL2FkZGR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc6JjY2Fub3NwYWNlL2luZGV4L2FkZGR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc6JjY2FuanVwbG9hZC9hZGRkd2l0aHg4ZGlkOmtleTp6Nk1rdzdyakZMM3doYVVnN2RiS3hDeFNMd0F3d0Nzbk5XYVU5ekRnaENXSE5vTXOiY2Nhbm5maWxlY29pbi9vZmZlcmR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc2NhdWRYIu0BPFzSZoExyq/UIW7U9ykgnvhrU8rmrTrfjHGsCL+8J71jZXhw9mNmY3SBoWVzcGFjZaJkbmFtZWlLb29saW5hcnRmYWNjZXNzoWR0eXBlZnB1YmxpY2Npc3NYIu0BcS+VnxIZD1iQ21rBglxYFEqILvGARlQA5E6cvA5pQdVjcHJmgtgqWCUAAXESIHbVySuTJBrRZIYyiwnVEiq4BIIKURO12YedfkaxHbhe2CpYJQABcRIgerAOGLwtK8jd7KF6vRtbpMX5+rx0T+kX6YDyZ0S144FZAXESIL7VdDby7u8A2k0YMENnTFExyN/X9BcU0j3yvEoNo47boWp1Y2FuQDAuOS4x2CpYJQABcRIguElPmS93kTZV2Bt6msLbijMZdBjFEf1p8v+l4XjD3Eo
PUBLIC_STORACHA_GATEWAY_HOST=storacha.link

───────────────────────────────────────────────────────────────────────────────
TABLE OF CONTENTS
───────────────────────────────────────────────────────────────────────────────
1. Features
2. Technical Architecture (Qwik, SSR, Resumability, Vite)
3. Technologies & Stack
4. Project Structure
5. Custom Hooks (useWallet, useMarketplaceContracts)
6. Testing & Type Checking
7. Build & Analysis
8. Deployment (Fly.io, Docker, alternatives)
9. Smart Contracts (overview + Viem)
10. Routes & API (endpoints)
11. Full Environment Variables (prefixes & access)
12. Available Scripts
13. Production Best Practices
14. Support, License & Authors


───────────────────────────────────────────────────────────────────────────────
1) FEATURES
───────────────────────────────────────────────────────────────────────────────
Performance & Architecture:
- Ultra‑fast performance with Qwik (Resumability, SSR by default, PWA).
- Security: on‑chain interactions via Viem; Web3 auth by signature.
- Decentralized storage: images + metadata on IPFS (Storacha).
- No off‑chain DB: state lives in smart contracts.

8 Innovative Minting Templates:
1. [MAP] Tokenized Image Map (Cells) - Divide aerial images into NFT grid
   • Vineyards, agricultural land, solar farms, real estate developments
2. [LIVE] Interactive Map Tokenization - Uses Leaflet + OpenStreetMap
   • Property tokenization without aerial photography, delivery zones, stadiums
3. [IoT] IoT Connected Devices - Sensors and automation
   • Smart thermostats, energy meters, security systems
4. [PROPERTY] Traditional Physical Properties - Complete legal documentation
   • Houses, apartments, offices, commercial spaces
5. [PREMIUM] Exclusive Luxury Properties - Verification and premium showcases
   • Mansions, penthouses, historic properties, beach villas
6. [MEMBERSHIP] Memberships & Subscriptions - Recurring access
   • Private clubs, coworking, gyms, premium services
7. [ART] Digital Art & Collectibles - Galleries and exhibitions
   • Digital art, photography, generative works, limited collections
8. [GAMING] Gaming & Metaverse - Avatars and items with stats
   • Characters, game items, virtual lands, rare skins

Marketplace Functionality:
- Minting (Creation): 8 specialized templates with custom fields
- Buy/Sell: Sale listings with KNRT pricing, instant cancellation
- Rental System: Temporary NFT rentals with automatic returns
- Rights Delegation: Transfer temporary control without ownership transfer
- Token Swap (DEX): Instant ETH ↔ KNRT exchange
- Complete Documentation: Interactive whitepaper with PDF download


───────────────────────────────────────────────────────────────────────────────
2) DETAILED MINTING TEMPLATES
───────────────────────────────────────────────────────────────────────────────

2.1) [MAP] Tokenized Image Map (Cells)
Revolutionary system that divides aerial images into a grid of tokenizable cells.
Each cell becomes an independent NFT with unique coordinates.

Use cases:
- Vineyard parcels for fractional investment
- Agricultural land divided by crop zone
- Solar farms with individual tokenized panels
- Real estate developments with building sections or parking spaces
- Forest conservation with sponsorable quadrants
- Advertising spaces on digital billboards

2.2) [LIVE] Interactive Map Tokenization
No image upload needed. Uses Leaflet + OpenStreetMap to select and tokenize
geographic areas with live satellite imagery.

Advanced features:
- Global address search
- Satellite/street map layers
- Tokenization boundary drawing
- Automatic coordinate capture
- Real-time area calculation
- Geolocation privacy controls

Perfect for:
- Property tokenization without aerial photography
- Dynamic location-based services
- Delivery zones and service areas
- Stadium and concert hall sections
- Geofenced exclusive content
- Territorial rights for franchises

2.3) Other 6 Templates
- [IoT]: Connected devices with real-time telemetry
- [PROPERTY]: Traditional properties with legal documentation
- [PREMIUM]: Luxury properties with verification and showcases
- [MEMBERSHIP]: Subscriptions and recurring access
- [ART]: Digital art with galleries and exhibitions
- [GAMING]: Game items with classes, rarity, and power stats

───────────────────────────────────────────────────────────────────────────────
3) TECHNICAL ARCHITECTURE
───────────────────────────────────────────────────────────────────────────────
Qwik & Resumability
- SSR state is serialized into HTML and the client “resumes” with no full re‑hydrate.
- Granular lazy‑loading: only loads code when the user interacts.
- Minimal example:
  export default component$(() => {
    const count = useSignal(0);
    return <button onClick$={() => count.value++}>Clicks: {count.value}</button>;
  });

SSR (production)
- Flow: Client → Express → Qwik City → SSR Render → Serialize state → HTML.
- Key entries: src/entry.ssr.tsx, src/entry.express.tsx, server/entry.express.js.

Data loaders & actions (server)
- routeLoader$: reads (e.g., fetch NFTs via Viem).
- routeAction$: mutations/actions (e.g., upload to IPFS).

Vite
- vite.config.ts: plugins (qwikCity, qwikVite, PWA, Tailwind), server:3000.
- build: tuned rollupOptions; optimizeDeps.exclude for server‑only libs.


───────────────────────────────────────────────────────────────────────────────
3) TECHNOLOGIES & STACK
───────────────────────────────────────────────────────────────────────────────
- Qwik 1.12.0 + Qwik City, Qwik UI Headless.
- Vite 5, TypeScript 5.3.3, ESLint, Prettier, Tailwind 4.
- Viem 2.x (Ethereum / Base 8453).
- Storacha (IPFS/Filecoin).
- Express 4, Fly.io, Docker.
- Extras: Chart.js, jsPDF, QRCode, (optional) LangChain + OpenAI.


───────────────────────────────────────────────────────────────────────────────
4) PROJECT STRUCTURE
───────────────────────────────────────────────────────────────────────────────
Root
- package.json, tsconfig.json, vite.config.ts, tailwind.config.js
- dockerfile, fly.toml

src/
- entry.*.tsx (SSR/dev/preview), root.tsx, global.css
- routes/ (file‑based routing)
  - layout.tsx, index.tsx (dashboard)
  - all-nfts/, my-nfts/, mint/, nft/[tokenId]/
  - api/nft/upload/ (POST: upload to IPFS)
  - service-worker.ts
- components/: header, footer, nft-card, wallet-connect, etc.
- hooks/: useWallet.tsx, useMarketplaceContracts.ts
- lib/: contracts (ABIs, helpers), ipfs/ (Storacha client)
- types/: nft.ts, user.ts, contracts.ts
- utils/: format.ts, validation.ts

public/
- favicon.svg, manifest.json, robots.txt, _headers, _redirects, fonts/

server/ (SSR build), adapters/express/vite.config.ts

contracts/
- abi/: ERC20.ts, PowerMarket.ts, RentalMarket.ts, RentalNFT.ts, SaleMarket.ts
- markets/: Power.sol, Rental.sol, RentalNFT.sol, Sale.sol

Hardhat/
- hardhat.config.ts, contracts/, scripts/, test/, artifacts/

Conventions
- Routes: index.tsx / layout.tsx / [param]/
- Components in PascalCase; routes in kebab‑case; utils in camelCase.


───────────────────────────────────────────────────────────────────────────────
5) CUSTOM HOOKS
───────────────────────────────────────────────────────────────────────────────

useWallet (src/hooks/useWallet.tsx)
- State: address, connected, chainId, balance, isCorrectNetwork, error.
- Methods: connect(), disconnect(), switchNetwork(), getBalance(), sendTransaction().
- Helpers: getBaseNetwork(), getPublicClient(), getWalletClient().

useMarketplaceContracts (src/hooks/useMarketplaceContracts.ts)
- contracts: nft, sale, rental, rights, paymentToken (KNRT).
- Reads: getNFTOwner, getNFTExists, getNFTTokenURI, getPrivateTokenURI,
         getUserNFTs, getUnlistedNFTs, getAllTokenIds, getTotalSupply, hasAccessToNFT.
- Writes: mintNFT, transferNFT, approveNFT, setApprovalForAll.
- Sale: listForSale, buyNFT, cancelSaleListing, getSaleListings, getActiveSaleListing.
- Rental: listForRental, rentNFT, cancelRentalListing, getRentalListings, getActiveRentalListing.
- Rights: listRightsTransfer, buyRights, cancelRightsListing, getRightsTransfers, getActiveRightsTransfer.
- KNRT: getKNRTBalance, approveKNRT, transferKNRT.
- Transactions: all return a hash; actions.waitForConfirmation(hash).

IPFS Integration (Storacha)
- mintNFT can upload image + metadata to IPFS and use ipfs://… as tokenURI.


───────────────────────────────────────────────────────────────────────────────
6) TESTING & TYPES
───────────────────────────────────────────────────────────────────────────────
- Type check: npx tsc --noEmit  (tsconfig.json with strict:true).
- ESLint: yarn lint
- Prettier: yarn fmt / yarn fmt.check
- Tests (future): yarn test / yarn test:e2e


───────────────────────────────────────────────────────────────────────────────
7) BUILD & ANALYSIS
───────────────────────────────────────────────────────────────────────────────
- Full build: yarn build  (client + server + manifest).
- Client: yarn build.client  → dist/
- Server: yarn build.server → server/
- Inspect bundles: ls -lh dist/build/
- Qwik outputs granular chunks (code‑splitting + tree‑shaking).


───────────────────────────────────────────────────────────────────────────────
8) DEPLOYMENT
───────────────────────────────────────────────────────────────────────────────
Fly.io (recommended)
- fly.toml: app, primary_region, http_service (port 3000), autoscaling.
- Multi‑stage Dockerfile (node:20‑alpine) → copy dist/ and server/.

Steps
1) Install CLI: curl -L https://fly.io/install.sh | sh  (Win: PowerShell script)
2) fly auth login
3) fly launch  (first time)
4) fly secrets set PRIVATE_OPENAI_API_KEY="…" PRIVATE_W3UP_KEY="…" PRIVATE_W3UP_PROOF="…"
5) fly deploy  (or yarn build && fly deploy --local-only)
6) fly logs / fly open / fly status

Alternatives
- Local Docker: docker build -t koolinart . && docker run -p 3000:3000 koolinart
- Vercel: vercel (buildCommand: yarn build, output: dist)
- Netlify: netlify deploy --prod (publish: dist)
- Cloudflare Pages: npx wrangler pages deploy dist

Health check (optional)
- GET /api/health → { status: 'healthy', timestamp }
- Qwik City endpoint at src/routes/api/health/index.ts

Docker Deployment
────────────────────────────────────────────────────────────────────────────────
The project includes an optimized multi-stage Dockerfile for production.

Dockerfile Structure:
- Stage 1 (base): Node.js 20.19.0 Alpine (lightweight image)
- Stage 2 (deps): Install dependencies with Yarn cache
- Stage 3 (build): Build the project (client + server)
- Stage 4 (final): Minimal production image with only necessary files

Build the image:
1) docker build -t koolinart:latest .
   # Build with specific tag
   docker build -t koolinart:v1.0.0 .

2) Verify created image:
   docker images | grep koolinart

Run locally:
1) Run with environment variables from file:
   docker run -p 3000:3000 --env-file .env koolinart:latest

2) Run with individual variables (example with all minimal vars):
    docker run -p 3000:3000 \
       -e PUBLIC_CHAIN_ID=8453 \
       -e PUBLIC_CHAIN_NAME=Base \
       -e PUBLIC_RPC_URL=https://base.gateway.tenderly.co \
       -e PUBLIC_FALLBACK_RPC_URL=https://mainnet.base.org \
       -e PUBLIC_EXPLORER_URL=https://basescan.org \
       -e PUBLIC_NFT_ADDRESS=0xFEf125b97a402DE608d9092b0A349F5a85e58A08 \
       -e PUBLIC_SALE_MARKET_ADDRESS=0xc0Cafd4ca83726100EAf1af0c4C521a96A0e21CF \
       -e PUBLIC_RENTAL_MARKET_ADDRESS=0x464edb2D2314F340cbd33bf6C81A194a2b33fBF5 \
       -e PUBLIC_RIGHTS_MARKET_ADDRESS=0xf7a73ECe1552AfED7D4f53c59BCe509EFF88d19B \
       -e PUBLIC_KNRT_TOKEN_ADDRESS=0x54de10FADF4Ea2fbAD10Ebfc96979D0885dd36fA \
       -e PUBLIC_STORACHA_GATEWAY_HOST=storacha.link \
       -e STORACHA_KEY=your_key \
       -e STORACHA_PROOF=your_proof \
       koolinart:latest

3) Run in detached mode (background):
   docker run -d -p 3000:3000 --name koolinart-app --env-file .env koolinart:latest

4) View container logs:
   docker logs -f koolinart-app

5) Stop and remove container:
   docker stop koolinart-app
   docker rm koolinart-app

Docker Compose (optional):
Create docker-compose.yml:

version: '3.8'
services:
  koolinart:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

Docker Compose Commands:
- docker-compose up -d          # Start in background
- docker-compose logs -f        # View logs in real-time
- docker-compose down           # Stop and remove
- docker-compose restart        # Restart services
- docker-compose ps             # View service status

Cloud Platform Deployment with Docker:

1) AWS ECS/Fargate:
   - Upload image to Amazon ECR
   - Create task definition with image
   - Configure service in ECS cluster
   - Define environment variables in task definition

2) Google Cloud Run:
   gcloud builds submit --tag gcr.io/PROJECT_ID/koolinart
   gcloud run deploy koolinart \
     --image gcr.io/PROJECT_ID/koolinart \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars PUBLIC_CHAIN_ID=8453,PUBLIC_RPC_URL=https://base.gateway.tenderly.co

3) Azure Container Instances:
   az container create \
     --resource-group myResourceGroup \
     --name koolinart \
     --image koolinart:latest \
     --dns-name-label koolinart-unique \
     --ports 3000 \
     --environment-variables PUBLIC_CHAIN_ID=8453

4) DigitalOcean App Platform:
   - Connect GitHub repository
   - Automatically detects Dockerfile
   - Configure environment variables in dashboard
   - Automatic deploy on each push

5) Railway:
   railway login
   railway init
   railway up  # Automatically detects Dockerfile
   railway variables set PUBLIC_CHAIN_ID=8453 STORACHA_KEY=your_key

6) Render:
   - Connect repository
   - Type: "Docker"
   - Render detects and uses Dockerfile
   - Configure environment variables in dashboard

Docker Optimizations:
- Final image ~150MB (Node Alpine + app)
- Multi-stage build minimizes size
- Dependency caching speeds up rebuilds
- Non-root user for security
- Health checks for monitoring

Production:
- Use secrets management for STORACHA_KEY and STORACHA_PROOF
- Configure correct ORIGIN for your domain
- Enable centralized logging
- Implement auto-scaling based on load
- Monitor metrics with Prometheus/Grafana

───────────────────────────────────────────────────────────────────────────────
9) SMART CONTRACTS (OVERVIEW) + VIEM
───────────────────────────────────────────────────────────────────────────────
- KNRT (ERC‑20): mint, burn, transfer.
- PropertyNFT (ERC‑721): mint(to, tokenURI), burn(tokenId).
- RealEstateMarketplace: createListing, buyNFT, cancelListing.
- PropertyRentalManager: createRental, rentProperty, endRental.
- RightsTransferMarketplace: transferRights, getRightsBalance, delegateControl.

Viem (client)
- getWalletClient(): uses window.ethereum (browser).
- getPublicClient(): http(PUBLIC_RPC_URL).
- readContract/writeContract for ownerOf, mint, listings, etc.


───────────────────────────────────────────────────────────────────────────────
10) ROUTES & API
───────────────────────────────────────────────────────────────────────────────
Pages
- /              (dashboard + charts)
- /all-nfts      (marketplace, filters, status: sale/rental/power)
- /my-nfts       (user’s collection, requires wallet)
- /mint          (mint form with IPFS upload)
- /nft/[tokenId] (detail, actions, QR, PDF, private metadata)

API
- POST /api/nft/upload  → upload image + metadata to Storacha/IPFS.
  Body: { image(base64), name, description, attributes[], wallet }
  Response: { cid, tokenURI, metadataUrl }
  Requires: STORACHA_KEY, STORACHA_PROOF on server.


───────────────────────────────────────────────────────────────────────────────
11) ENV VARS: PREFIXES & ACCESS
───────────────────────────────────────────────────────────────────────────────
Prefixes
- PUBLIC_: available in client & server (non‑sensitive).
- PRIVATE_: server‑only (sensitive).
- VITE_: build‑time, client & server.

Server access (routeLoader$, routeAction$, server$)
- const apiKey = ev.env.get('PRIVATE_OPENAI_API_KEY');

Client access
- const chainId = import.meta.env.PUBLIC_CHAIN_ID;
- Never attempt to read PRIVATE_* on the client.


───────────────────────────────────────────────────────────────────────────────
12) AVAILABLE SCRIPTS
───────────────────────────────────────────────────────────────────────────────
Development
- dev            → vite --mode ssr
- start          → vite --open --mode ssr
- dev.debug      → node --inspect-brk ./node_modules/vite/bin/vite.js

Build / Production
- build          → qwik build
- build.client   → vite build
- build.server   → vite build -c adapters/express/vite.config.ts
- serve          → node server/entry.express
- preview        → qwik build preview && vite preview

Deploy
- deploy         → wrangler pages publish ./dist  (Cloudflare Pages)

Utilities
- fmt            → prettier --write .
- fmt.check      → prettier --check .
- qwik           → qwik

Quick commands
- yarn dev
- npx tsc --noEmit
- yarn build && yarn serve
- fly deploy
- yarn fmt


───────────────────────────────────────────────────────────────────────────────
13) PRODUCTION BEST PRACTICES
───────────────────────────────────────────────────────────────────────────────
- Never commit real keys; use placeholders and fly secrets / env vars.
- Lock down CORS and ORIGIN in production (ORIGIN=https://your-domain).
- Enable Fly.io auto‑scaling (auto_start/auto_stop) and health checks.
- Enforce type‑checking in CI (npx tsc --noEmit) before build.
- Minify images and use subset fonts for LCP < 1.2s.
- Keep ABIs and addresses in a single module (lib/contracts/addresses.ts).
- Implement retries with RPC fallback (PUBLIC_FALLBACK_RPC_URL).
- Model transaction states: “sent”, “mined”, “error”.
- Safe logging: never print secrets; centralize server-side console.error.
- Artifact backups and IPFS pinning (consider gateway redundancy).
- Observability: fly logs, basic metrics and alerts.


───────────────────────────────────────────────────────────────────────────────
14) SUPPORT, LICENSE & AUTHORS
───────────────────────────────────────────────────────────────────────────────
- License: MIT
- Author: Golfredo Pérez Fernández (GitHub: @GolfredoPerezFernandez)
- Qwik community (Discord): https://qwik.builder.io/chat
- Contact: support@koolinart.com
