import { server$ } from '@builder.io/qwik-city';
import { getTurso } from '~/lib/turso';
import { demoNfts, demoListings, demoOffers } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// removing hardcoded DB_URL to allow getTurso to use env vars

// ---- NFT Actions ----

export const getDemoNft = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const result = await db.select().from(demoNfts).where(eq(demoNfts.id, tokenId)).get();
    return result;
});

export const getUserDemoNfts = server$(async function (ownerId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const result = await db.select().from(demoNfts).where(eq(demoNfts.ownerId, ownerId)).all();
    return result.map(n => n.id);
});

export const mintDemoNft = server$(async function (tokenId: string, ownerId: string, metadata: any, isPublic: boolean = true) {
    try {
        const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
        const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
        const db = getTurso(url, token);

        const title = metadata.name || `NFT #${tokenId}`;
        const description = metadata.description || '';
        const imageUrl = metadata.image || '';

        const json = JSON.stringify(metadata);
        const b64 = Buffer.from(json).toString('base64');
        const metadataUrl = `data:application/json;base64,${b64}`;

        await db.insert(demoNfts).values({
            id: tokenId,
            title,
            description,
            imageUrl,
            metadataUrl,
            ownerId,
            isPublic: isPublic ? 1 : 0,
            createdAt: Math.floor(Date.now() / 1000),
        }).onConflictDoUpdate({
            target: demoNfts.id,
            set: { title, description, imageUrl, metadataUrl, ownerId, isPublic: isPublic ? 1 : 0 }
        });

        return tokenId;
    } catch (e: any) {
        console.error('[SERVER] mintDemoNft failed:', e);
        throw new Error(`Server mint failed: ${e.message}`);
    }
});

export const getAllDemoNfts = server$(async function () {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const result = await db.select().from(demoNfts).all();
    return result;
});

export const setDemoNftVisibility = server$(async function (tokenId: string, isPublic: boolean) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.update(demoNfts).set({ isPublic: isPublic ? 1 : 0 }).where(eq(demoNfts.id, tokenId)).run();
    return true;
});

// ---- Sale Actions ----

export const getDemoSaleListing = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const result = await db.select().from(demoListings).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'sale'), eq(demoListings.isActive, 1))).get();
    if (!result) return null;
    return { seller: result.sellerId, price: result.price?.toString() || '0', isActive: true };
});

export const listDemoNftForSale = server$(async function (tokenId: string, sellerId: string, price: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.update(demoListings).set({ isActive: 0 }).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'sale'))).run();
    await db.insert(demoListings).values({ nftId: tokenId, sellerId, price: price, listingType: 'sale', isActive: 1, expiresAt: 0 }).run();
    await db.update(demoNfts).set({ isListed: 1, listingType: 'sale', price: price }).where(eq(demoNfts.id, tokenId)).run();
    return true;
});

export const cancelDemoSale = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.update(demoListings).set({ isActive: 0 }).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'sale'))).run();
    await db.update(demoNfts).set({ isListed: 0 }).where(eq(demoNfts.id, tokenId)).run();
    return true;
});

export const buyDemoNft = server$(async function (tokenId: string, buyerId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const listing = await db.select().from(demoListings).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'sale'), eq(demoListings.isActive, 1))).get();
    if (!listing) return false;
    await db.update(demoNfts).set({ ownerId: buyerId, isListed: 0 }).where(eq(demoNfts.id, tokenId)).run();
    await db.update(demoListings).set({ isActive: 0 }).where(eq(demoListings.id, listing.id)).run();
    return true;
});

// ---- Rental Actions ----

export const getDemoRentalListing = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const res = await db.select().from(demoListings).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'rental'), eq(demoListings.isActive, 1))).get();
    if (!res) return null;
    return { owner: res.sellerId, basePrice: res.price?.toString() || '0', duration: res.duration || 0, isActive: true };
});

export const listDemoNftForRental = server$(async function (tokenId: string, owner: string, basePrice: string, duration: number) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.update(demoListings).set({ isActive: 0 }).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'rental'))).run();
    await db.insert(demoListings).values({ nftId: tokenId, sellerId: owner, price: basePrice, duration, listingType: 'rental', isActive: 1 }).run();
    await db.update(demoNfts).set({ isListed: 1, listingType: 'rental', price: basePrice }).where(eq(demoNfts.id, tokenId)).run();
    return true;
});

export const getDemoRentalOffers = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const res = await db.select().from(demoOffers).where(and(eq(demoOffers.nftId, tokenId), eq(demoOffers.market, 'rental'))).all();
    return res.map(o => ({
        renter: o.offererId,
        percentage: o.percentage,
        offerTime: o.offerTime.toString(),
        amountPaid: o.amountPaid?.toString() || '0',
        amountPaidWei: (Number(o.amountPaid || 0) * 1e18).toString(), // approximation for demo
        accepted: o.accepted === 1
    }));
});

export const createDemoRentalOffer = server$(async function (tokenId: string, offerer: string, percentage: number, amountPaid: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.insert(demoOffers).values({
        nftId: tokenId,
        market: 'rental',
        offererId: offerer,
        percentage,
        offerTime: Math.floor(Date.now() / 1000),
        amountPaid,
        accepted: 0
    }).run();
    return true;
});

// ---- Power Actions ----

export const getDemoPowerListing = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const res = await db.select().from(demoListings).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'power'), eq(demoListings.isActive, 1))).get();
    if (!res) return null;
    return { owner: res.sellerId, basePrice: res.price?.toString() || '0', duration: res.duration || 0, payUpfront: res.payUpfront === 1, isActive: true };
});

export const listDemoNftForPower = server$(async function (tokenId: string, owner: string, basePrice: string, duration: number, payUpfront: boolean) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.update(demoListings).set({ isActive: 0 }).where(and(eq(demoListings.nftId, tokenId), eq(demoListings.listingType, 'power'))).run();
    await db.insert(demoListings).values({ nftId: tokenId, sellerId: owner, price: basePrice, duration, payUpfront: payUpfront ? 1 : 0, listingType: 'power', isActive: 1 }).run();
    await db.update(demoNfts).set({ isListed: 1, listingType: 'power', price: basePrice }).where(eq(demoNfts.id, tokenId)).run();
    return true;
});

export const getDemoPowerOffers = server$(async function (tokenId: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const res = await db.select().from(demoOffers).where(and(eq(demoOffers.nftId, tokenId), eq(demoOffers.market, 'power'))).all();
    return res.map(o => ({
        renter: o.offererId,
        percentage: o.percentage,
        offerTime: o.offerTime.toString(),
        amountPaid: o.amountPaid?.toString() || '0',
        amountPaidWei: (Number(o.amountPaid || 0) * 1e18).toString(),
        accepted: o.accepted === 1
    }));
});

export const createDemoPowerOffer = server$(async function (tokenId: string, offerer: string, percentage: number, amountPaid: string) {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    await db.insert(demoOffers).values({
        nftId: tokenId,
        market: 'power',
        offererId: offerer,
        percentage,
        offerTime: Math.floor(Date.now() / 1000),
        amountPaid,
        accepted: 0
    }).run();
    return true;
});

export const getActiveDemoRentalIds = server$(async function () {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const res = await db.select({ nftId: demoListings.nftId }).from(demoListings).where(and(eq(demoListings.listingType, 'rental'), eq(demoListings.isActive, 1))).all();
    return res.map(r => r.nftId);
});

export const getActiveDemoPowerIds = server$(async function () {
    const url = this.env.get('PRIVATE_TURSO_DATABASE_URL');
    const token = this.env.get('PRIVATE_TURSO_AUTH_TOKEN');
    const db = getTurso(url, token);
    const res = await db.select({ nftId: demoListings.nftId }).from(demoListings).where(and(eq(demoListings.listingType, 'power'), eq(demoListings.isActive, 1))).all();
    return res.map(r => r.nftId);
});
