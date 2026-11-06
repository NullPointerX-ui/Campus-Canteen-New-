// Turns text into a 384-number "meaning vector" (embedding) using the free
// all-MiniLM-L6-v2 model. It runs on your own computer - no API key needed.
// The model (~23 MB) is downloaded automatically the first time.
import { query } from './db';

let extractorPromise;

export async function embed(text) {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  const extractor = await extractorPromise;
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// pgvector expects the format  [0.1,0.2,...]
export const toVec = (arr) => `[${arr.join(',')}]`;

export const itemText = (i) =>
  `${i.name}. ${i.description || ''}. Category: ${i.category}. ${i.is_veg ? 'Vegetarian' : 'Non-vegetarian'}.`;

// (Re)compute and store the embedding of one food item
export async function embedItem(itemId) {
  const { rows } = await query(
    `SELECT f.name, f.description, f.is_veg, c.name AS category
       FROM food_items f JOIN categories c USING (category_id) WHERE item_id = $1`,
    [itemId]
  );
  if (!rows[0]) return;
  const v = await embed(itemText(rows[0]));
  await query('UPDATE food_items SET embedding = $1 WHERE item_id = $2', [toVec(v), itemId]);
}
