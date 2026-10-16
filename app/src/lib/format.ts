/** "120 m" / "1.2 km". */
export function formatDistance(m?: number | null) {
  if (m == null) return '';
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

/** Google price level → ₹ marks. */
export function priceMarks(level?: string | null) {
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE': return '₹';
    case 'PRICE_LEVEL_MODERATE': return '₹₹';
    case 'PRICE_LEVEL_EXPENSIVE': return '₹₹₹';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '₹₹₹₹';
    default: return null;
  }
}

/** "Indiranagar · Café" from the bits that exist. */
export const dotJoin = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ');
