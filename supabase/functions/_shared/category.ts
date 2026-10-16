// Google primaryType → our category (spec §25.3). Null when it isn't clearly a food place.
export type Category =
  | 'restaurant' | 'cafe' | 'bakery' | 'dhaba' | 'tea_shop' | 'fast_food' | 'dessert' | 'bar' | 'street_food' | 'delivery_only';

const MAP: Record<string, Category> = {
  cafe: 'cafe', coffee_shop: 'cafe',
  bakery: 'bakery',
  tea_house: 'tea_shop',
  fast_food_restaurant: 'fast_food', hamburger_restaurant: 'fast_food', pizza_restaurant: 'fast_food', sandwich_shop: 'fast_food',
  dessert_shop: 'dessert', dessert_restaurant: 'dessert', ice_cream_shop: 'dessert', confectionery: 'dessert',
  bar: 'bar', pub: 'bar', wine_bar: 'bar',
  meal_delivery: 'delivery_only',
  restaurant: 'restaurant', food: 'restaurant',
};

export function categoryFor(primaryType: string | null | undefined, name: string): Category | null {
  const n = name.toLowerCase();
  if (n.includes('dhaba')) return 'dhaba';
  if (n.includes('chaat') || n.includes('street')) return 'street_food';
  if (!primaryType) return null;
  if (MAP[primaryType]) return MAP[primaryType];
  if (primaryType.endsWith('_restaurant')) return 'restaurant';
  return null;
}
