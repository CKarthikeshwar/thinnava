/** Internet entry label by link (spec §14 B1): "From a reel" (Instagram), "From a video" (YouTube), "From a link", or "Found online". */
export function internetLabel(url: string | null | undefined): string {
  if (!url) return 'Found online';
  try {
    const h = new URL(url).hostname.replace(/^www\.|^m\./, '');
    if (h === 'instagram.com' || h === 'instagr.am') return 'From a reel';
    if (h === 'youtube.com' || h === 'youtu.be') return 'From a video';
  } catch { /* not a URL */ }
  return 'From a link';
}
