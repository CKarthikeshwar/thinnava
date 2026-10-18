import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Bell, ClipboardPaste, Globe, MessageCircle, Plus, Search, Utensils, type LucideProps } from 'lucide-react-native';
import { Avatar, OfflineStrip, Pressable, T } from '@/components';
import { useAuth } from '@/features/auth/session';
import { unreadNotifications } from '@/features/notifications/api';
import { openImport, pasteMessage } from '@/features/import/paste';
import { useEscape, type LayoutMode } from '@/lib/layout';
import { colors, fonts, radii, shadows } from '@/theme';

const ICON = require('../../../assets/icon.png');

export const TABS = [
  { path: '/', label: 'Home' },
  { path: '/search', label: 'Search' },
  { path: '/map', label: 'Map' },
  { path: '/profile', label: 'Profile' },
] as const;
export const isTabPath = (p: string) => TABS.some((t) => t.path === p);

type Add = 'visit' | 'friend' | 'internet';
const ADD: { key: Add; label: string; Icon: ComponentType<LucideProps> }[] = [
  { key: 'visit', label: 'I went somewhere', Icon: Utensils },
  { key: 'friend', label: 'A friend told me', Icon: MessageCircle },
  { key: 'internet', label: 'Found it online', Icon: Globe },
];
const goAdd = (a: Add) => a === 'visit'
  ? router.push({ pathname: '/pick-place', params: { for: 'visit' } })
  : router.push({ pathname: '/saved/new', params: { source: a } });
const goTab = (path: string) => router.navigate(path === '/' ? '/(tabs)' : `/(tabs)${path}` as never);

/**
 * Web top bar (spec §18.3, design/web.html). Laptop: wordmark, the four pages as links, a search box, Paste a message,
 * + Add, 🔔 and my avatar. Phone browser: wordmark, + Add and 🔔, with the four pages as tabs underneath.
 */
export function WebTopBar({ mode }: { mode: Exclude<LayoutMode, 'app'> }) {
  const path = usePathname();
  const profile = useAuth((s) => s.profile);
  const unread = useQuery({ queryKey: ['unread'], queryFn: unreadNotifications, refetchInterval: 60_000 });
  const [menu, setMenu] = useState(false);
  useEscape(menu, () => setMenu(false));
  useShortcuts();
  const laptop = mode === 'laptop';

  const brand = (
    <Pressable onPress={() => goTab('/')} pressScale={0.98} style={styles.brand} accessibilityRole="link" accessibilityLabel="Thinnava, Home">
      <Image source={ICON} style={laptop ? styles.logo : styles.logoSmall} contentFit="cover" />
      <T variant="wordmark" style={laptop ? null : { fontSize: 22 }}>Thinnava</T>
    </Pressable>
  );
  const bell = (
    <Pressable onPress={() => router.push('/notifications')} pressScale={0.95} style={[styles.bell, !laptop && styles.bellSmall]}
      accessibilityRole="button" accessibilityLabel={unread.data ? `Notifications, ${unread.data} new` : 'Notifications'}>
      <Bell size={21} color={colors.ink} strokeWidth={2} />
      {unread.data ? <View style={styles.dot} /> : null}
    </Pressable>
  );
  const add = (
    <View style={{ zIndex: 60 }}>
      <Pressable onPress={() => setMenu(!menu)} pressScale={0.97} style={[styles.btn, laptop ? styles.primary : styles.tonal]}
        accessibilityRole="button" accessibilityLabel="Add" accessibilityState={{ expanded: menu }}>
        <Plus size={18} color={laptop ? colors.onPrimary : colors.onPrimaryContainer} strokeWidth={2.4} />
        <T style={[styles.btnText, { color: laptop ? colors.onPrimary : colors.onPrimaryContainer }]}>Add</T>
      </Pressable>
      {menu ? (
        <View style={styles.menu}>
          {ADD.map((a) => (
            <Pressable key={a.key} onPress={() => { setMenu(false); goAdd(a.key); }} pressScale={0.99} style={styles.menuItem} accessibilityRole="menuitem">
              <View style={styles.menuIcon}><a.Icon size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
              <T style={styles.menuText}>{a.label}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
  const links = TABS.map((t) => {
    const on = path === t.path;
    return (
      <Pressable key={t.path} onPress={() => goTab(t.path)} pressScale={0.98} style={laptop ? styles.link : styles.tab}
        accessibilityRole="link" accessibilityState={{ selected: on }}>
        <T style={[styles.linkText, on && styles.linkOn, !laptop && { fontSize: 14 }]}>{t.label}</T>
        {on ? <View style={laptop ? styles.underline : styles.underlineTab} /> : null}
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      {menu ? <Pressable style={styles.away} pressScale={1} onPress={() => setMenu(false)} accessibilityLabel="Close menu" /> : null}
      {laptop ? (
        <View style={styles.bar}>
          {brand}
          <View style={styles.links}>{links}</View>
          <Pressable onPress={() => router.navigate({ pathname: '/(tabs)/search', params: { focus: String(Date.now()) } })} pressScale={0.99}
            style={styles.searchBox} accessibilityRole="search" accessibilityLabel="Search places or people">
            <Search size={17} color={colors.inkMuted} strokeWidth={2.2} />
            <T style={styles.searchText} numberOfLines={1}>Search places or people</T>
            <Kbd>/</Kbd>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={pasteMessage} pressScale={0.97} style={[styles.btn, styles.ghost]} accessibilityRole="button" accessibilityLabel="Paste a message">
            <ClipboardPaste size={17} color={colors.ink} strokeWidth={2} />
            <T style={styles.btnText}>Paste a message</T>
          </Pressable>
          {add}
          {bell}
          <Pressable onPress={() => goTab('/profile')} pressScale={0.95} accessibilityRole="link" accessibilityLabel="Your profile">
            <Avatar name={profile?.display_name ?? '?'} uri={profile?.avatar_url} size={38} />
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.bar, styles.barSmall]}>
            {brand}
            <View style={{ flex: 1 }} />
            {add}
            {bell}
          </View>
          {isTabPath(path) ? <View style={styles.tabs}>{links}</View> : null}
        </>
      )}
      <OfflineStrip />
    </View>
  );
}

export function Kbd({ children }: { children: string }) {
  return <View style={styles.kbd}><T style={styles.kbdText}>{children}</T></View>;
}

const editable = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.isContentEditable);
};

/** Laptop keys (spec §18.3): "/" → Search, "N" → I went somewhere, Ctrl+V outside a text field → paste a message. */
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || editable(e.target)) return;
      if (e.key === '/') { e.preventDefault(); router.navigate({ pathname: '/(tabs)/search', params: { focus: String(Date.now()) } }); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); goAdd('visit'); }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (editable(e.target)) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (!text.trim()) return;
      e.preventDefault();
      openImport(text);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste); };
  }, []);
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.hairline, zIndex: 50 },
  away: { position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'auto' },
  bar: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 32, zIndex: 50 },
  barSmall: { height: 56, gap: 10, paddingHorizontal: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 32, height: 32, borderRadius: 10 },
  logoSmall: { width: 28, height: 28, borderRadius: 9 },
  links: { flexDirection: 'row', alignSelf: 'stretch', gap: 2, marginLeft: 10 },
  link: { justifyContent: 'center', paddingHorizontal: 14 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 11 },
  linkText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkSoft },
  linkOn: { color: colors.ink },
  underline: { position: 'absolute', left: 12, right: 12, bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: colors.primary },
  underlineTab: { position: 'absolute', left: '22%', right: '22%', bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: colors.primary },
  tabs: { flexDirection: 'row', paddingHorizontal: 6 },
  searchBox: { flexShrink: 1, width: 380, minWidth: 220, height: 42, borderRadius: 12, backgroundColor: colors.surfaceTint, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginLeft: 8 },
  searchText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.inkMuted },
  btn: { height: 40, paddingHorizontal: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  primary: { backgroundColor: colors.primary },
  tonal: { backgroundColor: colors.primaryContainer, height: 36, paddingHorizontal: 12, borderRadius: 11 },
  ghost: { backgroundColor: colors.surface, boxShadow: `inset 0px 0px 0px 1.5px ${colors.hairline}` },
  btnText: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.ink },
  bell: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  bellSmall: { width: 36, height: 36, borderRadius: 11 },
  dot: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.bad, borderWidth: 2, borderColor: colors.surface },
  menu: { position: 'absolute', top: 46, right: 0, width: 230, backgroundColor: colors.surface, borderRadius: radii.field, paddingVertical: 6, boxShadow: shadows.panel, zIndex: 60 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  menuText: { fontFamily: fonts.bodyHeavy, fontSize: 14.5, color: colors.ink },
  kbd: { backgroundColor: colors.surface, borderWidth: 1, borderBottomWidth: 2, borderColor: colors.hairline, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  kbdText: { fontFamily: fonts.bodyHeavy, fontSize: 11.5, color: colors.inkMuted },
});
