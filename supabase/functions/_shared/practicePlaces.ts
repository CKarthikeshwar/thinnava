// Practice mode fixtures (spec §25.6): used by the places function only when no Google key is set.
// Names are real Bengaluru places with rough coordinates; ratings/hours/prices are made up and are
// always shown as "practice data" in the app. One clearly fictional place is permanently closed (C1b).

export type PracticePlace = {
  placeId: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  primaryType: string;
  businessStatus: 'OPERATIONAL' | 'CLOSED_PERMANENTLY';
  keywords: string[];
  rating: number;
  userRatingCount: number;
  priceLevel: 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE';
  hours: string; // e.g. "12 pm – 11 pm"
};

const p = (
  slug: string, name: string, area: string, lat: number, lng: number, primaryType: string,
  keywords: string[], rating: number, count: number, price: 1 | 2 | 3, hours: string,
  closed = false,
): PracticePlace => ({
  placeId: `practice:${slug}`, name, area, address: `${area}, Bengaluru`, lat, lng, primaryType,
  businessStatus: closed ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL', keywords, rating, userRatingCount: count,
  priceLevel: (['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE'] as const)[price - 1],
  hours,
});

export const PRACTICE_PLACES: PracticePlace[] = [
  p('meghana-residency', 'Meghana Foods', 'Residency Road', 12.9719, 77.6075, 'restaurant', ['biryani', 'andhra', 'chicken'], 4.4, 2300, 2, '12 pm – 11 pm'),
  p('meghana-koramangala', 'Meghana Foods', 'Koramangala', 12.9352, 77.6245, 'restaurant', ['biryani', 'andhra'], 4.3, 1800, 2, '12 pm – 11 pm'),
  p('mtr-lalbagh', 'MTR 1924', 'Lalbagh Road', 12.9553, 77.5856, 'restaurant', ['dosa', 'south indian', 'breakfast', 'rava idli'], 4.5, 5200, 2, '6:30 am – 9 pm'),
  p('vidyarthi-bhavan', 'Vidyarthi Bhavan', 'Basavanagudi', 12.9445, 77.5711, 'restaurant', ['dosa', 'masala dosa', 'breakfast'], 4.6, 6100, 1, '6:30 am – 11:30 am, 2 pm – 8 pm'),
  p('ctr-malleshwaram', 'CTR (Shri Sagar)', 'Malleshwaram', 13.0004, 77.5694, 'restaurant', ['dosa', 'benne dosa', 'breakfast'], 4.6, 4800, 1, '7 am – 12:30 pm, 4 pm – 9 pm'),
  p('toit-indiranagar', 'Toit', 'Indiranagar', 12.9791, 77.6408, 'bar', ['beer', 'pizza', 'brewpub'], 4.5, 3900, 3, '12 pm – 1 am'),
  p('third-wave-indiranagar', 'Third Wave Coffee', 'Indiranagar', 12.9716, 77.6412, 'cafe', ['coffee', 'cold brew', 'croissant'], 4.3, 900, 2, '8 am – 11 pm'),
  p('truffles-koramangala', 'Truffles', 'Koramangala', 12.9334, 77.6143, 'hamburger_restaurant', ['burger', 'steak', 'fries'], 4.4, 4200, 2, '11 am – 11 pm'),
  p('nagarjuna-residency', 'Nagarjuna', 'Residency Road', 12.9715, 77.6080, 'restaurant', ['andhra meals', 'biryani', 'chicken fry'], 4.3, 3500, 2, '12 pm – 4 pm, 7 pm – 11 pm'),
  p('empire-church-street', 'Empire Restaurant', 'Church Street', 12.9750, 77.6050, 'restaurant', ['kebab', 'ghee rice', 'shawarma', 'late night'], 4.1, 2700, 1, '11 am – 1 am'),
  p('koshys-st-marks', "Koshy's", 'St Marks Road', 12.9757, 77.6011, 'cafe', ['breakfast', 'fish and chips', 'coffee'], 4.2, 2100, 2, '9 am – 11 pm'),
  p('brahmins-coffee-bar', "Brahmin's Coffee Bar", 'Basavanagudi', 12.9497, 77.5712, 'cafe', ['idli', 'vada', 'filter coffee'], 4.6, 3300, 1, '6 am – 12 pm, 3 pm – 7 pm'),
  p('corner-house-residency', 'Corner House', 'Residency Road', 12.9677, 77.6047, 'ice_cream_shop', ['ice cream', 'death by chocolate', 'dessert'], 4.6, 2500, 1, '11 am – 11 pm'),
  p('glens-indiranagar', "Glen's Bakehouse", 'Indiranagar', 12.9784, 77.6385, 'bakery', ['cake', 'red velvet', 'pastry'], 4.3, 1400, 2, '8 am – 11 pm'),
  p('shivaji-military-jayanagar', 'Shivaji Military Hotel', 'Jayanagar', 12.9300, 77.5800, 'restaurant', ['donne biryani', 'biryani', 'mutton'], 4.3, 2000, 1, '6:30 am – 2 pm'),
  p('taaza-thindi-jayanagar', 'Taaza Thindi', 'Jayanagar', 12.9263, 77.5836, 'restaurant', ['dosa', 'idli', 'breakfast'], 4.5, 1700, 1, '7 am – 9:30 pm'),
  p('rameshwaram-indiranagar', 'The Rameshwaram Cafe', 'Indiranagar', 12.9786, 77.6406, 'restaurant', ['ghee podi idli', 'dosa', 'filter coffee'], 4.5, 3000, 1, '6:30 am – 1 am'),
  p('brik-oven-church-street', 'Brik Oven', 'Church Street', 12.9745, 77.6066, 'pizza_restaurant', ['pizza', 'wood fired'], 4.3, 1600, 2, '12 pm – 11 pm'),
  p('smoke-house-indiranagar', 'Smoke House Deli', 'Indiranagar', 12.9719, 77.6411, 'restaurant', ['pasta', 'brunch', 'continental'], 4.3, 2200, 3, '9 am – 12 am'),
  p('chai-point-koramangala', 'Chai Point', 'Koramangala', 12.9346, 77.6266, 'tea_house', ['chai', 'tea', 'snacks'], 4.1, 600, 1, '7 am – 11 pm'),
  p('biere-club-lavelle', 'The Biere Club', 'Lavelle Road', 12.9702, 77.5984, 'bar', ['beer', 'wings', 'brewpub'], 4.3, 2400, 3, '12 pm – 1 am'),
  p('hari-super-sandwich', 'Hari Super Sandwich', 'Jayanagar', 12.9286, 77.5835, 'sandwich_shop', ['sandwich', 'chaat', 'snacks'], 4.3, 1500, 1, '10 am – 10 pm'),
  p('sri-krishna-kafe', 'Sri Krishna Kafe', 'Koramangala', 12.9355, 77.6203, 'restaurant', ['south indian meals', 'banana leaf', 'thali'], 4.3, 1900, 1, '7 am – 10:30 pm'),
  p('burma-burma-indiranagar', 'Burma Burma', 'Indiranagar', 12.9719, 77.6413, 'restaurant', ['khow suey', 'burmese', 'tea leaf salad'], 4.5, 2800, 3, '12 pm – 11 pm'),
  p('arbor-magrath', 'Arbor Brewing Company', 'Magrath Road', 12.9708, 77.6105, 'bar', ['beer', 'brewpub', 'burger'], 4.2, 2600, 3, '12 pm – 1 am'),
  p('polar-bear-indiranagar', 'Polar Bear', 'Indiranagar', 12.9765, 77.6408, 'dessert_shop', ['sundae', 'ice cream', 'dessert'], 4.4, 1100, 1, '11 am – 12 am'),
  p('vv-puram-food-street', 'VV Puram Food Street', 'Basavanagudi', 12.9479, 77.5733, 'food', ['chaat', 'street food', 'holige', 'gobi'], 4.3, 3100, 1, '5 pm – 11 pm'),
  p('leon-grill-koramangala', 'Leon Grill', 'Koramangala', 12.9360, 77.6240, 'fast_food_restaurant', ['burger', 'wings', 'fries'], 4.1, 900, 2, '12 pm – 1 am'),
  p('burger-factory-koramangala', 'Burger Factory', 'Koramangala', 12.9348, 77.6230, 'hamburger_restaurant', ['burger', 'chicken burger', 'shake'], 4.2, 800, 2, '12 pm – 11 pm'),
  p('old-corner-cafe', 'Old Corner Café (practice)', 'MG Road', 12.9756, 77.6060, 'cafe', ['coffee', 'sandwich'], 4.0, 300, 1, '9 am – 9 pm', true),
];

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Name/area match for autocomplete (prefix of any word, or substring). */
export function practiceAutocomplete(input: string): PracticePlace[] {
  const q = norm(input);
  if (!q) return [];
  return PRACTICE_PLACES.filter((pl) => {
    const hay = norm(`${pl.name} ${pl.area}`);
    return hay.includes(q) || hay.split(' ').some((w) => w.startsWith(q));
  }).slice(0, 5);
}

/** Keyword search (food words too): every query word must match the name, area or keywords. */
export function practiceSearch(query: string): PracticePlace[] {
  const words = norm(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  return PRACTICE_PLACES.filter((pl) => {
    const hay = norm(`${pl.name} ${pl.area} ${pl.keywords.join(' ')}`);
    return words.every((w) => hay.includes(w));
  });
}

export function practiceById(id: string) {
  return PRACTICE_PLACES.find((pl) => pl.placeId === id) ?? null;
}

/** Haversine distance in metres. */
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Name-first match for AI candidates in practice mode: every word of the extracted name must appear in a place's
 * name (prefix match, so "Meghana" finds "Meghana Foods"); places in the mentioned area come first.
 */
export function practiceByName(name: string, area?: string | null): PracticePlace[] {
  const words = norm(name).split(' ').filter((w) => w.length > 1);
  if (!words.length) return [];
  const a = area ? norm(area) : '';
  return PRACTICE_PLACES.filter((pl) => {
    const nameWords = norm(pl.name).split(' ');
    return words.every((w) => nameWords.some((nw) => nw.startsWith(w)));
  }).sort((x, y) => Number(!!a && norm(y.area).includes(a)) - Number(!!a && norm(x.area).includes(a)));
}
