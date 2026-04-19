import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from "@libsql/client/node";
import { schema } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const url = 'file:./drizzle/db/db.sqlite';
    console.log('Connecting to:', url);

    const client = createClient({ url });
    const db = drizzle(client, { schema });

    console.log('Listing all NFTs:');
    const nfts = await db.select().from(schema.demoNfts).all();
    console.log(`Found ${nfts.length} NFTs.`);

    nfts.forEach(n => {
        console.log(`- ID: ${n.id}`);
        console.log(`  Owner: ${n.ownerId}`);
        console.log(`  Title: ${n.title}`);
        console.log(`  MetadataURL length: ${n.metadataUrl ? n.metadataUrl.length : 0}`);
        console.log(`  MetadataURL start: ${n.metadataUrl ? n.metadataUrl.slice(0, 50) : 'EMPTY'}`);
    });
}

check().catch(console.error);
