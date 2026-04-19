# KoolinArt - NFT Marketplace (Qwik + Viem + Base)

Badges:
- Qwik 1.12.0
- TypeScript 5.3.3
- Vite 5.0.0    
- Tailwind CSS 4.0.0



KoolinArt es un marketplace NFT de alto rendimiento construido con Qwik (SSR + Resumability). Permite crear, comprar, vender y rentar NFTs de propiedades digitales, con delegación de derechos (rights delegation) y almacenamiento IPFS (Storacha). Toda la lógica de mercado ocurre on‑chain usando Viem en la red Base (Chain ID 8453).

El marketplace incluye 8 plantillas innovadoras de minteo que van desde tokenización de mapas por celdas hasta membresías premium, permitiendo casos de uso revolucionarios en bienes raíces, agricultura, gaming, IoT y más.

───────────────────────────────────────────────────────────────────────────────
INICIO RÁPIDO
───────────────────────────────────────────────────────────────────────────────

Prerrequisitos
- Node.js >= 20.19.0
- Yarn >= 1.22.x

Instalar Yarn (si no lo tienes)
- npm (incluido con Node):   npm install -g yarn
- Windows (instalador):      https://classic.yarnpkg.com/en/docs/install/#windows-stable
- macOS (Homebrew):          brew install yarn
- Linux (guía oficial):      https://classic.yarnpkg.com/en/docs/install
- Verificar:                 yarn --version  # 1.22.x o superior

Instalación
1) yarn install
2) cp .env.example .env   # edita .env con tus credenciales o usa existentes
3) yarn dev               # levanta SSR en http://localhost:3000

Comandos esenciales
- yarn dev            # desarrollo SSR
- yarn start          # desarrollo + abre navegador
- yarn build          # build de producción
- npx tsc             # verificación de tipos

───────────────────────────────────────────────────────────────────────────────
VARIABLES DE ENTORNO MÍNIMAS (desarrollo)
───────────────────────────────────────────────────────────────────────────────

# ================================
# BLOCKCHAIN CONFIGURATION
# ================================
PUBLIC_CHAIN_ID=8453
PUBLIC_CHAIN_NAME=Base
PUBLIC_RPC_URL=https://base.gateway.tenderly.co
PUBLIC_FALLBACK_RPC_URL=https://mainnet.base.org
PUBLIC_EXPLORER_URL=https://basescan.org

# Contrato NFT principal (RentalNFT)
PUBLIC_NFT_ADDRESS=0xFEf125b97a402DE608d9092b0A349F5a85e58A08

# Contratos de mercado
PUBLIC_SALE_MARKET_ADDRESS=0xc0Cafd4ca83726100EAf1af0c4C521a96A0e21CF
PUBLIC_RENTAL_MARKET_ADDRESS=0x464edb2D2314F340cbd33bf6C81A194a2b33fBF5
PUBLIC_RIGHTS_MARKET_ADDRESS=0xf7a73ECe1552AfED7D4f53c59BCe509EFF88d19B

# Token de pago ERC20 (KNRT)
PUBLIC_KNRT_TOKEN_ADDRESS=0x54de10FADF4Ea2fbAD10Ebfc96979D0885dd36fA

# ================================
# STORACHA / IPFS
# (NUNCA publiques claves reales en repositorios)
# ================================
STORACHA_KEY=MgCanQggcAsHCaRKJE4Y/rStgnIeCluVDZUc8eA/f2Qg9vO0BPFzSZoExyq/UIW7U9ykgnvhrU8rmrTrfjHGsCL+8J70=
STORACHA_PROOF=mAYIEAOoOOqJlcm9vdHOB2CpYJQABcRIgvtV0NvLu7wDaTRgwQ2dMUTHI39f0FxTSPfK8Sg2jjttndmVyc2lvbgHGAgFxEiAAR3MeJFZYbyl/Kv5/vwFkjLaK0pCRWALDTNxPdgvOb6hhc1hE7aEDQHBxi5MjSXXE7FIF6kiJ+gxMx5qfC3NvPTo9NX4gQvXpj1PK9t6V/Edx96x6RasMKbSsjjVE9Z54ljMPOK2TNAhhdmUwLjkuMWNhdHSBomNjYW5hKmR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc2NhdWRYHp0abWFpbHRvOmdtYWlsLmNvbTpnb2xmcmVkby5wZmNleHD2Y2ZjdIGhZXNwYWNlomRuYW1laUtvb2xpbmFydGZhY2Nlc3OhZHR5cGVmcHVibGljY2lzc1gi7QH3nkdRriV+rzIju8RipVYuZls6X9Ngl0cF/8F3pSsmWmNwcmaAwQIBcRIgdtXJK5MkGtFkhjKLCdUSKrgEggpRE7XZh51+RrEduF6oYXNEgKADAGF2ZTAuOS4xY2F0dIGiY2NhbmEqZHdpdGhmdWNhbjoqY2F1ZFgi7QFxL5WfEhkPWJDbWsGCXFgUSogu8YBGVADkTpy8DmlB1WNleHD2Y2ZjdIGibmFjY2Vzcy9jb25maXJt2CpYJQABcRIgTujLglc4TWtii4DFYbnIYEllSKNEP9L+3vemje62ewVuYWNjZXNzL3JlcXVlc3TYKlglAAFxEiAyEBBZ5LRGIG6mdBE0lUS9INwnDf5XKWeaqwHaU6UbrWNpc3NYHp0abWFpbHRvOmdtYWlsLmNvbTpnb2xmcmVkby5wZmNwcmaB2CpYJQABcRIgAEdzHiRWWG8pfyr+f78BZIy2itKQkVgCw0zcT3YLzm+nAwFxEiB6sA4YvC0ryN3soXq9G1ukxfn6vHRP6RfpgPJnRLXjgahhc1hE7aEDQAVd1ZHJlwe9vatmPvRCNEwsT3+2YZmlIdSntbaS4o4DYqHcAMpum4/Zg17BgNrE6zIsSLyyObwaDJQHlvnJkAdhdmUwLjkuMWNhdHSBo2JuYqFlcHJvb2bYKlglAAFxEiB21ckrkyQa0WSGMosJ1RIquASCClETtdmHnX5GsR24XmNjYW5rdWNhbi9hdHRlc3Rkd2l0aHgbZGlkOndlYjp1cC5zdG9yYWNoYS5uZXR3b3JrY2F1ZFgi7QFxL5WfEhkPWJDbWsGCXFgUSogu8YBGVADkTpy8DmlB1WNleHD2Y2ZjdIGibmFjY2Vzcy9jb25maXJt2CpYJQABcRIgTujLglc4TWtii4DFYbnIYEllSKNEP9L+3vemje62ewVuYWNjZXNzL3JlcXVlc3TYKlglAAFxEiAyEBBZ5LRGIG6mdBE0lUS9INwnDf5XKWeaqwHaU6UbrWNpc3NYGZ0ad2ViOnVwLnN0b3JhY2hhLm5ldHdvcmtjcHJmgJ8FAXESILhJT5kvd5E2VdgbeprC24ozGXQYxRH9afL/peF4w9xKqGFzWETtoQNAXzZzVBigciOkdpmzT2LURTXg3qKJedMhL1cwHXPSDUo/vov1AZr0zcS0bAdTrHJXmhmrlgE+qfSLqoDaiCzFDmF2ZTAuOS4xY2F0dISiY2Nhbm5zcGFjZS9ibG9iL2FkZGR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc6JjY2Fub3NwYWNlL2luZGV4L2FkZGR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc6JjY2FuanVwbG9hZC9hZGRkd2l0aHg4ZGlkOmtleTp6Nk1rdzdyakZMM3doYVVnN2RiS3hDeFNMd0F3d0Nzbk5XYVU5ekRnaENXSE5vTXOiY2Nhbm5maWxlY29pbi9vZmZlcmR3aXRoeDhkaWQ6a2V5Ono2TWt3N3JqRkwzd2hhVWc3ZGJLeEN4U0x3QXd3Q3NuTldhVTl6RGdoQ1dITm9Nc2NhdWRYIu0BPFzSZoExyq/UIW7U9ykgnvhrU8rmrTrfjHGsCL+8J71jZXhw9mNmY3SBoWVzcGFjZaJkbmFtZWlLb29saW5hcnRmYWNjZXNzoWR0eXBlZnB1YmxpY2Npc3NYIu0BcS+VnxIZD1iQ21rBglxYFEqILvGARlQA5E6cvA5pQdVjcHJmgtgqWCUAAXESIHbVySuTJBrRZIYyiwnVEiq4BIIKURO12YedfkaxHbhe2CpYJQABcRIgerAOGLwtK8jd7KF6vRtbpMX5+rx0T+kX6YDyZ0S144FZAXESIL7VdDby7u8A2k0YMENnTFExyN/X9BcU0j3yvEoNo47boWp1Y2FuQDAuOS4x2CpYJQABcRIguElPmS93kTZV2Bt6msLbijMZdBjFEf1p8v+l4XjD3Eo
PUBLIC_STORACHA_GATEWAY_HOST=storacha.link


───────────────────────────────────────────────────────────────────────────────
TABLA DE CONTENIDOS
───────────────────────────────────────────────────────────────────────────────
1. Características
2. Arquitectura técnica (Qwik, SSR, Resumability, Vite)
3. Tecnologías y stack
4. Estructura del proyecto
5. Hooks personalizados (useWallet, useMarketplaceContracts)
6. Testing y verificación de tipos
7. Build y análisis
8. Despliegue (Fly.io, Docker, alternativas)
9. Smart Contracts (visión general + Viem)
10. Rutas y API (endpoints)
11. Variables de entorno completas (prefijos y acceso)
12. Scripts disponibles
13. Mejores prácticas para producción
14. Soporte, licencia y autores

───────────────────────────────────────────────────────────────────────────────
1) CARACTERÍSTICAS
───────────────────────────────────────────────────────────────────────────────
Rendimiento y Arquitectura:
- Rendimiento ultra‑rápido con Qwik (Resumability, SSR por defecto, PWA).
- Seguridad: interacción on‑chain via Viem; autenticación Web3 por firma.
- Almacenamiento descentralizado: imágenes + metadata en IPFS (Storacha).
- Sin base de datos off‑chain: el estado vive en contratos inteligentes.

8 Plantillas de Minteo Innovadoras:
1. [MAP] Tokenización de Mapas por Celdas - Divide imágenes aéreas en grid de NFTs
   • Viñedos, terrenos agrícolas, granjas solares, desarrollos inmobiliarios
2. [LIVE] Mapas Interactivos en Tiempo Real - Usa Leaflet + OpenStreetMap
   • Tokenización de propiedades sin fotografía aérea, zonas de entrega, estadios
3. [IoT] Dispositivos IoT Conectados - Sensores y automatización
   • Termostatos inteligentes, medidores de energía, sistemas de seguridad
4. [PROPERTY] Propiedades Físicas Tradicionales - Documentación legal completa
   • Casas, apartamentos, oficinas, locales comerciales
5. [PREMIUM] Propiedades Exclusivas de Lujo - Verificación y showcases premium
   • Mansiones, penthouses, propiedades históricas, villas de playa
6. [MEMBERSHIP] Membresías y Suscripciones - Acceso recurrente
   • Clubes privados, coworking, gimnasios, servicios premium
7. [ART] Arte Digital y Coleccionables - Galerías y exhibiciones
   • Arte digital, fotografía, obras generativas, colecciones limitadas
8. [GAMING] Gaming y Metaverso - Avatares y items con stats
   • Personajes, items de juego, terrenos virtuales, skins raros

Funcionalidades del Marketplace:
- Minteo (Creación): 8 plantillas especializadas con campos personalizados
- Compra/Venta: Listados de venta con precio en KNRT, cancelación instantánea
- Sistema de Renta: Renta temporal de NFTs con retorno automático
- Delegación de Derechos: Transferir control temporal sin transferir propiedad
- Token Swap (DEX): Intercambio instantáneo ETH ↔ KNRT
- Documentación Completa: Whitepaper interactivo con descarga PDF

───────────────────────────────────────────────────────────────────────────────
2) PLANTILLAS DE MINTEO DETALLADAS
───────────────────────────────────────────────────────────────────────────────

2.1) [MAP] Tokenización de Mapas por Celdas
Revolucionario sistema que divide imágenes aéreas en un grid de celdas tokenizables.
Cada celda se convierte en un NFT independiente con coordenadas únicas.

Casos de uso:
- Parcelas de viñedos para inversión fraccionada
- Terrenos agrícolas divididos por zona de cultivo
- Granjas solares con paneles individuales tokenizados
- Desarrollos inmobiliarios con secciones de edificio o estacionamientos
- Conservación forestal con cuadrantes patrocinables
- Espacios publicitarios en vallas digitales

2.2) [LIVE] Mapas Interactivos en Tiempo Real
No requiere imagen subida. Usa Leaflet + OpenStreetMap para seleccionar y tokenizar
áreas geográficas con imágenes satelitales en vivo.

Características avanzadas:
- Búsqueda global de direcciones
- Capas de mapa satélite/calles
- Dibujo de límites de tokenización
- Captura automática de coordenadas
- Cálculo de área en tiempo real
- Controles de privacidad de geolocalización

Ideal para:
- Tokenización de propiedades sin fotografía aérea
- Servicios basados en ubicación dinámica
- Zonas de entrega y áreas de servicio
- Secciones de estadios y salas de conciertos
- Contenido exclusivo con geofencing
- Derechos territoriales para franquicias

2.3) Otras 6 Plantillas
- [IoT]: Dispositivos conectados con telemetría en tiempo real
- [PROPERTY]: Propiedades tradicionales con documentación legal
- [PREMIUM]: Propiedades de lujo con verificación y showcases
- [MEMBERSHIP]: Suscripciones y accesos recurrentes
- [ART]: Arte digital con galerías y exhibiciones
- [GAMING]: Items de juego con clases, rareza y estadísticas de poder

───────────────────────────────────────────────────────────────────────────────
3) ARQUITECTURA TÉCNICA
───────────────────────────────────────────────────────────────────────────────
Qwik y Resumability
- El estado del SSR se serializa en HTML y el cliente “resume” sin re‑hidratar.
- Carga perezosa granular: solo se descarga el código cuando el usuario interactúa.
- Ejemplo mínimo:
  export default component$(() => {
    const count = useSignal(0);
    return <button onClick$={() => count.value++}>Clicks: {count.value}</button>;
  });

SSR (producción)
- Flujo: Cliente → Express → Qwik City → Render SSR → Serializa estado → HTML.
- Entradas clave: src/entry.ssr.tsx, src/entry.express.tsx, server/entry.express.js.

Data loaders y actions (servidor)
- routeLoader$: lecturas (ej., leer NFTs desde contratos con Viem).
- routeAction$: mutaciones/acciones (ej., subir a IPFS).

Vite
- vite.config.ts: plugins (qwikCity, qwikVite, PWA, Tailwind), server:3000.
- build: rollupOptions tuned; optimizeDeps.exclude para libs solo‑servidor.

───────────────────────────────────────────────────────────────────────────────
3) TECNOLOGÍAS Y STACK
───────────────────────────────────────────────────────────────────────────────
- Qwik 1.12.0 + Qwik City, Qwik UI Headless.
- Vite 5, TypeScript 5.3.3, ESLint, Prettier, Tailwind 4.
- Viem 2.x (Ethereum / Base 8453).
- Storacha (IPFS/Filecoin).
- Express 4, Fly.io, Docker.
- Extra: Chart.js, jsPDF, QRCode, (opcional) LangChain + OpenAI.

───────────────────────────────────────────────────────────────────────────────
4) ESTRUCTURA DEL PROYECTO
───────────────────────────────────────────────────────────────────────────────
Raíz
- package.json, tsconfig.json, vite.config.ts, tailwind.config.js
- dockerfile, fly.toml

src/
- entry.*.tsx (SSR/dev/preview), root.tsx, global.css
- routes/ (file‑based routing)
  - layout.tsx, index.tsx (dashboard)
  - all-nfts/, my-nfts/, mint/, nft/[tokenId]/
  - api/nft/upload/ (POST: subir a IPFS)
  - service-worker.ts
- components/: header, footer, nft-card, wallet-connect, etc.
- hooks/: useWallet.tsx, useMarketplaceContracts.ts
- lib/: contracts (ABIs, helpers), ipfs/ (cliente Storacha)
- types/: nft.ts, user.ts, contracts.ts
- utils/: format.ts, validation.ts

public/
- favicon.svg, manifest.json, robots.txt, _headers, _redirects, fonts/

server/ (build SSR), adapters/express/vite.config.ts

contracts/
- abi/: ERC20.ts, PowerMarket.ts, RentalMarket.ts, RentalNFT.ts, SaleMarket.ts
- markets/: Power.sol, Rental.sol, RentalNFT.sol, Sale.sol

Hardhat/
- hardhat.config.ts, contracts/, scripts/, test/, artifacts/

Convenciones
- Rutas: index.tsx / layout.tsx / [param]/
- Componentes en PascalCase; rutas en kebab‑case; utils en camelCase.

───────────────────────────────────────────────────────────────────────────────
5) HOOKS PERSONALIZADOS
───────────────────────────────────────────────────────────────────────────────

useWallet (src/hooks/useWallet.tsx)
- Estado: address, connected, chainId, balance, isCorrectNetwork, error.
- Métodos: connect(), disconnect(), switchNetwork(), getBalance(), sendTransaction().
- Helpers: getBaseNetwork(), getPublicClient(), getWalletClient().

useMarketplaceContracts (src/hooks/useMarketplaceContracts.ts)
- contracts: nft, sale, rental, rights, paymentToken (KNRT).
- Lecturas: getNFTOwner, getNFTExists, getNFTTokenURI, getPrivateTokenURI,
            getUserNFTs, getUnlistedNFTs, getAllTokenIds, getTotalSupply, hasAccessToNFT.
- Escrituras: mintNFT, transferNFT, approveNFT, setApprovalForAll.
- Sale: listForSale, buyNFT, cancelSaleListing, getSaleListings, getActiveSaleListing.
- Rental: listForRental, rentNFT, cancelRentalListing, getRentalListings, getActiveRentalListing.
- Rights: listRightsTransfer, buyRights, cancelRightsListing, getRightsTransfers, getActiveRightsTransfer.
- KNRT: getKNRTBalance, approveKNRT, transferKNRT.
- Transacciones: todas devuelven hash; actions.waitForConfirmation(hash).

Integración IPFS (Storacha)
- mintNFT puede subir imagen + metadata a IPFS y usar tokenURI ipfs://…

───────────────────────────────────────────────────────────────────────────────
6) TESTING Y TIPOS
───────────────────────────────────────────────────────────────────────────────
- Type check: npx tsc --noEmit  (usa tsconfig.json con strict:true).
- ESLint: yarn lint
- Prettier: yarn fmt / yarn fmt.check
- Tests (futuro): yarn test / yarn test:e2e

───────────────────────────────────────────────────────────────────────────────
7) BUILD Y ANÁLISIS
───────────────────────────────────────────────────────────────────────────────
- Build completo: yarn build  (client + server + manifest).
- Cliente: yarn build.client  → dist/
- Servidor: yarn build.server → server/
- Ver bundles: ls -lh dist/build/
- Qwik genera chunks granulares (code‑splitting + tree‑shaking).

───────────────────────────────────────────────────────────────────────────────
8) DESPLIEGUE
───────────────────────────────────────────────────────────────────────────────
Fly.io (recomendado)
- fly.toml: app, primary_region, http_service (port 3000), autoscaling.
- Dockerfile multi‑stage (node:20‑alpine) → copia dist/ y server/.

Pasos
1) Instalar CLI: curl -L https://fly.io/install.sh | sh  (Win: script PowerShell)
2) fly auth login
3) fly launch  (primera vez)
4) fly secrets set PRIVATE_OPENAI_API_KEY="…" PRIVATE_W3UP_KEY="…" PRIVATE_W3UP_PROOF="…"
5) fly deploy  (o yarn build && fly deploy --local-only)
6) fly logs / fly open / fly status

Alternativas
- Docker local: docker build -t koolinart . && docker run -p 3000:3000 koolinart
- Vercel: vercel (buildCommand: yarn build, output: dist)
- Netlify: netlify deploy --prod (publish: dist)
- Cloudflare Pages: npx wrangler pages deploy dist

Health check (opcional)
- GET /api/health → { status: 'healthy', timestamp }
- Qwik City endpoint en src/routes/api/health/index.ts

Despliegue con Docker
────────────────────────────────────────────────────────────────────────────────
El proyecto incluye un Dockerfile multi-stage optimizado para producción.

Estructura del Dockerfile:
- Stage 1 (base): Node.js 20.19.0 Alpine (imagen ligera)
- Stage 2 (deps): Instalación de dependencias con caché de Yarn
- Stage 3 (build): Build del proyecto (client + server)
- Stage 4 (final): Imagen de producción mínima con solo archivos necesarios

Build de la imagen:
1) docker build -t koolinart:latest .
   # Build con etiqueta específica
   docker build -t koolinart:v1.0.0 .

2) Verificar imagen creada:
   docker images | grep koolinart

Ejecutar localmente:
1) Ejecutar con variables de entorno desde archivo:
   docker run -p 3000:3000 --env-file .env koolinart:latest

2) Ejecutar con variables individuales (ejemplo con todas las variables mínimas):
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
     -e STORACHA_KEY=tu_key \
     -e STORACHA_PROOF=tu_proof \
     koolinart:latest

3) Ejecutar en modo detached (background):
   docker run -d -p 3000:3000 --name koolinart-app --env-file .env koolinart:latest

4) Ver logs del contenedor:
   docker logs -f koolinart-app

5) Detener y eliminar contenedor:
   docker stop koolinart-app
   docker rm koolinart-app

Docker Compose (opcional):
Crear docker-compose.yml:

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

Comandos Docker Compose:
- docker-compose up -d          # Iniciar en background
- docker-compose logs -f        # Ver logs en tiempo real
- docker-compose down           # Detener y eliminar
- docker-compose restart        # Reiniciar servicios
- docker-compose ps             # Ver estado de servicios

Despliegue en Cloud Platforms con Docker:

1) AWS ECS/Fargate:
   - Subir imagen a Amazon ECR
   - Crear task definition con imagen
   - Configurar service en ECS cluster
   - Definir variables de entorno en task definition

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
   - Conectar repositorio GitHub
   - Detecta automáticamente Dockerfile
   - Configurar variables de entorno en dashboard
   - Deploy automático en cada push

5) Railway:
   railway login
   railway init
   railway up  # Detecta Dockerfile automáticamente
   railway variables set PUBLIC_CHAIN_ID=8453 STORACHA_KEY=tu_key

6) Render:
   - Conectar repositorio
   - Tipo: "Docker"
   - Render detecta y usa Dockerfile
   - Configurar variables de entorno en dashboard

Optimizaciones Docker:
- Imagen final ~150MB (Node Alpine + app)
- Multi-stage build minimiza tamaño
- Caché de dependencias acelera rebuilds
- Usuario no-root para seguridad
- Health checks para monitoreo

Producción:
- Usar secrets management para STORACHA_KEY y STORACHA_PROOF
- Configurar ORIGIN correcto para tu dominio
- Habilitar logs centralizados
- Implementar auto-scaling según carga
- Monitorear métricas con Prometheus/Grafana

───────────────────────────────────────────────────────────────────────────────
9) SMART CONTRACTS (RESUMEN) + VIEM
───────────────────────────────────────────────────────────────────────────────
- KNRT (ERC‑20): mint, burn, transfer.
- PropertyNFT (ERC‑721): mint(to, tokenURI), burn(tokenId).
- RealEstateMarketplace: createListing, buyNFT, cancelListing.
- PropertyRentalManager: createRental, rentProperty, endRental.
- RightsTransferMarketplace: transferRights, getRightsBalance, delegateControl.

Viem (cliente)
- getWalletClient(): usa window.ethereum (navegador).
- getPublicClient(): http(PUBLIC_RPC_URL).
- readContract/writeContract para ownerOf, mint, listings, etc.

───────────────────────────────────────────────────────────────────────────────
10) RUTAS Y API
───────────────────────────────────────────────────────────────────────────────
Páginas
- /              (dashboard + charts)
- /all-nfts      (marketplace, filtros, estado: venta/renta/power)
- /my-nfts       (colección del usuario, requiere wallet)
- /mint          (formulario de minteo con upload IPFS)
- /nft/[tokenId] (detalle, acciones, QR, PDF, metadata privada)

API
- POST /api/nft/upload  → subir imagen + metadata a Storacha/IPFS.
  Body: { image(base64), name, description, attributes[], wallet }
  Respuesta: { cid, tokenURI, metadataUrl }
  Requiere: STORACHA_KEY, STORACHA_PROOF en servidor.

───────────────────────────────────────────────────────────────────────────────
11) VARIABLES DE ENTORNO: PREFIJOS Y ACCESO
───────────────────────────────────────────────────────────────────────────────
Prefijos
- PUBLIC_: legibles en cliente y servidor (no sensibles).
- PRIVATE_: solo servidor (sensibles).
- VITE_: build‑time, cliente y servidor.

Acceso en servidor (routeLoader$, routeAction$, server$)
- const apiKey = ev.env.get('PRIVATE_OPENAI_API_KEY');

Acceso en cliente
- const chainId = import.meta.env.PUBLIC_CHAIN_ID;
- Nunca intentes leer PRIVATE_* en el cliente.

───────────────────────────────────────────────────────────────────────────────
12) SCRIPTS DISPONIBLES
───────────────────────────────────────────────────────────────────────────────
Desarrollo
- dev            → vite --mode ssr
- start          → vite --open --mode ssr
- dev.debug      → node --inspect-brk ./node_modules/vite/bin/vite.js

Build / Producción
- build          → qwik build
- build.client   → vite build
- build.server   → vite build -c adapters/express/vite.config.ts
- serve          → node server/entry.express
- preview        → qwik build preview && vite preview

Deploy
- deploy         → wrangler pages publish ./dist  (Cloudflare Pages)

Utilidades
- fmt            → prettier --write .
- fmt.check      → prettier --check .
- qwik           → qwik

Comandos rápidos
- yarn dev
- npx tsc --noEmit
- yarn build && yarn serve
- fly deploy
- yarn fmt

───────────────────────────────────────────────────────────────────────────────
13) MEJORES PRÁCTICAS (PROD)
───────────────────────────────────────────────────────────────────────────────
- Nunca commits de claves reales; usa placeholders y fly secrets / env vars.
- Controla CORS y ORIGIN en producción (ORIGIN=https://tu-dominio).
- Activa auto‑scaling en Fly.io (auto_start/auto_stop) y health checks.
- Verifica type‑checking en CI (npx tsc --noEmit) antes de build.
- Minimiza imágenes y usa fuentes subset para LCP < 1.2s.
- Mantén ABIs y direcciones en un solo módulo (lib/contracts/addresses.ts).
- Implementa reintentos con RPC fallback (PUBLIC_FALLBACK_RPC_URL).
- Maneja estados de transacción: “enviada”, “minada”, “error”.
- Log seguro: nunca imprimas secretos; centraliza console.error en servidor.
- Backups de artefactos y pinning IPFS (considera redundancia de gateways).
- Observabilidad: fly logs, métricas y alertas básicas.

───────────────────────────────────────────────────────────────────────────────
14) SOPORTE, LICENCIA Y AUTORES
───────────────────────────────────────────────────────────────────────────────
- Licencia: MIT
- Autor: Golfredo Pérez Fernández (GitHub: @GolfredoPerezFernandez)
- Comunidad Qwik (Discord): https://qwik.builder.io/chat
- Contacto: support@koolinart.com
