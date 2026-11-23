import { captains } from './captain-data.js';

const collectionKey = 'tavern-heros.captain-collection.v1';
export const collectionChangeKey = 'tavern-heros.captain-collection.changed';
const starter = captains[0].id;
const captainIds = new Set(captains.map(captain => captain.id));
const duplicateShards = 2;
const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
export const shopProducts = [
  { id: 'one-pack', name: '대장 팩 1개', packs: 1, currency: 'coins', cost: 100 },
  { id: 'three-packs', name: '대장 팩 3개 묶음', packs: 3, currency: 'coins', cost: 250 },
  { id: 'five-packs', name: '대장 팩 5개 묶음', packs: 5, currency: 'diamonds', cost: 100 },
];

function legacyCollection() {
  try {
    return JSON.parse(localStorage.getItem(collectionKey));
  } catch {
    return null;
  }
}

function readCollection(saved, expeditionCaptain) {
  const owned = new Set([starter]);
  if (Array.isArray(saved?.owned)) {
    for (const id of saved.owned) if (captainIds.has(id)) owned.add(id);
  } else if (captainIds.has(expeditionCaptain)) {
    // Preserve the selected captain of an expedition started before packs existed.
    owned.add(expeditionCaptain);
  }
  const selected = saved?.selected ?? expeditionCaptain;
  const last = saved?.last;
  return {
    packs: count(saved?.packs),
    coins: count(saved?.coins),
    diamonds: count(saved?.diamonds),
    shopStockGranted: saved?.shopStockGranted === true,
    owned: [...owned],
    selected: owned.has(selected) ? selected : starter,
    shards: Object.fromEntries(captains.map(({ id }) => [id, count(saved?.shards?.[id])])),
    claimed: Array.isArray(saved?.claimed) ? saved.claimed.filter(id => typeof id === 'string') : [],
    last: last && captainIds.has(last.id) ? { id: last.id, shards: count(last.shards) } : null,
  };
}

let opening;
function database() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(collectionKey, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('profile');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return opening;
}

async function accessCollection(change, expeditionCaptain) {
  const db = await database();
  const result = await new Promise((resolve, reject) => {
    const transaction = db.transaction('profile', change ? 'readwrite' : 'readonly');
    const store = transaction.objectStore('profile');
    const request = store.get('captains');
    let value = null;
    request.onsuccess = () => {
      const collection = readCollection(request.result ?? legacyCollection(), expeditionCaptain);
      if (change && !change(collection)) return;
      if (change) store.put(collection, 'captains');
      value = collection;
    };
    transaction.oncomplete = () => resolve(value);
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
  if (change && result) {
    try {
      localStorage.setItem(collectionChangeKey, crypto.randomUUID());
    } catch {
      // The collection is already committed. Other screens reread it when opened.
    }
  }
  return result;
}

export async function captainCollection(expeditionCaptain) {
  try {
    return await accessCollection(null, expeditionCaptain);
  } catch {
    return readCollection(legacyCollection(), expeditionCaptain);
  }
}

export function awardExpeditionPack(id, expeditionCaptain) {
  if (typeof id !== 'string' || !id) return Promise.resolve(null);
  return accessCollection(collection => {
    if (collection.claimed.includes(id)) return false;
    collection.claimed.push(id);
    collection.packs += 1;
    return true;
  }, expeditionCaptain);
}

export async function initializeShopStock(expeditionCaptain) {
  const current = await captainCollection(expeditionCaptain);
  if (current.shopStockGranted) return current;
  return await accessCollection(collection => {
    if (collection.shopStockGranted) return false;
    collection.shopStockGranted = true;
    collection.coins += 1000;
    collection.diamonds += 200;
    collection.packs += 5;
    return true;
  }, expeditionCaptain) ?? await captainCollection(expeditionCaptain);
}

export function buyShopProduct(id, expeditionCaptain) {
  const product = shopProducts.find(item => item.id === id);
  if (!product) return Promise.resolve(null);
  return accessCollection(collection => {
    if (collection[product.currency] < product.cost) return false;
    collection[product.currency] -= product.cost;
    collection.packs += product.packs;
    return true;
  }, expeditionCaptain);
}

export function openCaptainPack() {
  return accessCollection(collection => {
    if (collection.packs === 0) return false;
    const { id } = captains[Math.floor(Math.random() * captains.length)];
    const shards = collection.owned.includes(id) ? duplicateShards : 0;
    if (shards) collection.shards[id] += shards;
    else collection.owned.push(id);
    collection.packs -= 1;
    collection.last = { id, shards };
    return true;
  });
}

export function selectCaptain(id, expeditionCaptain) {
  return accessCollection(collection => {
    if (!collection.owned.includes(id) || collection.selected === id) return false;
    collection.selected = id;
    return true;
  }, expeditionCaptain);
}
