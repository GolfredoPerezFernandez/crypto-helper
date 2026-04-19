import type { RequestHandler } from '@builder.io/qwik-city';
import { getChatDbClient, initChatSchema, getPrivateMessages, getConversationPartners, addMessage } from '~/lib/db/chat-db';

function validateMarket(m: string | undefined): m is 'rental' | 'power' {
  return m === 'rental' || m === 'power';
}

// GET: Retrieve private messages between two addresses or list conversation partners
// Query params:
//   - myAddress (required): current user's address
//   - withAddress (optional): get messages with specific address. If not provided, returns list of partners
export const onGet: RequestHandler = async ({ params, query, json }) => {
  try {
    const { tokenId, market } = params as { tokenId?: string; market?: string };
    const myAddress = query.get('myAddress');
    const withAddress = query.get('withAddress');

    if (!tokenId) {
      json(400, { error: 'tokenId required' });
      return;
    }
    if (!validateMarket(market)) {
      json(400, { error: 'market must be rental|power' });
      return;
    }
    if (!myAddress || !/^(0x[a-fA-F0-9]{40}|0xdemo_[a-zA-Z0-9_]+)$/i.test(myAddress)) {
      json(400, { error: 'valid myAddress query param required' });
      return;
    }

    const client = getChatDbClient();
    await initChatSchema(client);

    // If withAddress is provided, get private messages between the two
    if (withAddress) {
      if (!/^(0x[a-fA-F0-9]{40}|0xdemo_[a-zA-Z0-9_]+)$/i.test(withAddress)) {
        json(400, { error: 'invalid withAddress' });
        return;
      }
      const rows = await getPrivateMessages(client, tokenId, market, myAddress, withAddress, 200);
      json(200, { messages: rows });
    } else {
      // Otherwise, return list of conversation partners
      const partners = await getConversationPartners(client, tokenId, market, myAddress);
      json(200, { partners });
    }
  } catch (e: any) {
    json(500, { error: e?.message || 'Internal error' });
  }
};

interface PostBody {
  from?: string;
  to?: string;
  body?: string;
}

// POST: Send a private message
export const onPost: RequestHandler = async ({ params, request, json }) => {
  try {
    const { tokenId, market } = params as { tokenId?: string; market?: string };

    if (!tokenId) {
      json(400, { error: 'tokenId required' });
      return;
    }
    if (!validateMarket(market)) {
      json(400, { error: 'market must be rental|power' });
      return;
    }

    const bodyJson: PostBody = await request.json().catch(() => ({}));

    const from = (bodyJson.from || '').trim();
    const to = (bodyJson.to || '').trim();
    const body = (bodyJson.body || '').trim();

    if (!from || !/^(0x[a-fA-F0-9]{40}|0xdemo_[a-zA-Z0-9_]+)$/i.test(from)) {
      json(400, { error: 'valid from address required' });
      return;
    }
    if (!to || !/^(0x[a-fA-F0-9]{40}|0xdemo_[a-zA-Z0-9_]+)$/i.test(to)) {
      json(400, { error: 'valid to address required (private messages only)' });
      return;
    }
    if (!body) {
      json(400, { error: 'message body required' });
      return;
    }
    if (body.length > 1000) {
      json(400, { error: 'message too long (max 1000 chars)' });
      return;
    }

    const client = getChatDbClient();
    await initChatSchema(client);
    await addMessage(client, {
      token_id: tokenId,
      market: market as 'rental' | 'power',
      from_address: from.toLowerCase(),
      to_address: to.toLowerCase(),
      body
    });

    // Return success without extra data to minimize response
    json(201, { ok: true });
  } catch (e: any) {
    json(500, { error: e?.message || 'Internal error' });
  }
};
