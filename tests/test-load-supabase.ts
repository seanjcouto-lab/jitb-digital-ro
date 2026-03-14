import "fake-indexeddb/auto";
import { config } from 'dotenv';
config();

// Mock import.meta.env for Node.js environment
(global as any).import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY,
    }
  }
};

import { loadFromSupabase, roStore } from '../data/roStore';
import { DEFAULT_SHOP_ID } from '../constants';

async function run() {
  await loadFromSupabase(DEFAULT_SHOP_ID);
  
  const ros = await roStore.getAll(DEFAULT_SHOP_ID);
  const testRo = ros.find(r => r.id === 'RO-1773103971746');
  if (testRo) {
    console.log(`\nVerified RO ${testRo.id}:`);
    console.log(`- Parts: ${testRo.parts.length}`);
    console.log(`- Directives: ${testRo.directives.length}`);
  }
}

run().catch(console.error);
