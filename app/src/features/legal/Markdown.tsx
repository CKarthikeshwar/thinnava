import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '@/components';
import { colors, fonts } from '@/theme';

/** Inline **bold** and _italic_ inside one line. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') ? <T key={i} style={styles.bold}>{part.slice(2, -2)}</T>
      : part.startsWith('_') && part.endsWith('_') ? <T key={i} style={styles.italic}>{part.slice(1, -1)}</T>
        : <Fragment key={i}>{part}</Fragment>);
}

/**
 * Just enough Markdown for docs/legal (spec §27.4): # and ## headings, "- " bullets, "1. " numbered items, paragraphs,
 * **bold** and _italic_. Keeps the in-app text identical to the published pages without a Markdown library.
 */
export function Markdown({ source }: { source: string }) {
  return (
    <View>
      {source.split('\n').map((line, i) => {
        const l = line.trimEnd();
        if (!l.trim()) return <View key={i} style={{ height: 8 }} />;
        if (l.startsWith('# ')) return <T key={i} variant="headline" style={styles.h1} accessibilityRole="header">{l.slice(2)}</T>;
        if (l.startsWith('## ')) return <T key={i} variant="title" style={styles.h2} accessibilityRole="header">{l.slice(3)}</T>;
        const bullet = l.match(/^\s*-\s+(.*)$/);
        if (bullet) return <View key={i} style={styles.item}><T style={styles.p}>•</T><T style={[styles.p, { flex: 1 }]}>{inline(bullet[1])}</T></View>;
        const num = l.match(/^\s*(\d+)\.\s+(.*)$/);
        if (num) return <View key={i} style={styles.item}><T style={styles.p}>{num[1]}.</T><T style={[styles.p, { flex: 1 }]}>{inline(num[2])}</T></View>;
        return <T key={i} style={styles.p}>{inline(l)}</T>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { marginBottom: 4 },
  h2: { marginTop: 10, marginBottom: 2 },
  p: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.inkSoft },
  bold: { fontFamily: fonts.bodyHeavy, color: colors.ink },
  italic: { fontStyle: 'italic' },
  item: { flexDirection: 'row', gap: 8, paddingLeft: 4, marginTop: 4 },
});
