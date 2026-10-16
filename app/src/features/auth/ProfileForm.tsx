import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, TextField, type FieldStatus } from '@/components';
import { friendlyError } from '@/lib/errors';
import { usernameAvailable } from './api';

const RULE = 'Letters, numbers, . and _ only. 3–20 characters.';
const validUsername = (u: string) => /^[a-z0-9._]{3,20}$/.test(u) && !/^[._]/.test(u) && !/[._]$/.test(u);

export type ProfileValues = { name: string; username: string; bio: string };

type Props = {
  initial: ProfileValues;
  /** The username the user already owns (edit profile): treated as available. */
  ownUsername?: string;
  showBio?: boolean;
  submitLabel: string;
  onSubmit: (v: ProfileValues) => Promise<void>;
};

/** Name + username (+ bio) with the live "available / taken" check (A3, F3). No suggestions. */
export function ProfileForm({ initial, ownUsername, showBio = true, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio);
  const [check, setCheck] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'>('idle');
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const u = username;
    if (!u) return setCheck('idle');
    if (!validUsername(u)) return setCheck('invalid');
    if (ownUsername && u === ownUsername) return setCheck('available');
    setCheck('checking');
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const ok = await usernameAvailable(u);
        if (my === seq.current) setCheck(ok ? 'available' : 'taken');
      } catch {
        if (my === seq.current) setCheck('error');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, ownUsername]);

  const status: FieldStatus =
    check === 'checking' ? { kind: 'neutral', text: 'Checking…' }
    // Your own unchanged username just shows the ✓ (F3 mockup); a new one says it's available.
    : check === 'available' ? { kind: 'success', text: ownUsername && username === ownUsername ? '' : `@${username} is available` }
    : check === 'taken' ? { kind: 'error', text: `@${username} is taken. Try another.` }
    : check === 'invalid' ? { kind: username.length < 3 ? 'neutral' : 'error', text: RULE }
    : check === 'error' ? { kind: 'neutral', text: "Couldn't check right now." }
    : { kind: 'neutral', text: RULE };

  const nameOk = name.trim().length >= 1 && name.trim().length <= 40;
  const canSubmit = nameOk && check === 'available' && bio.length <= 150 && !busy;

  return (
    <View style={styles.form}>
      <TextField label="Name" value={name} onChangeText={(t) => setName(t.slice(0, 40))} autoComplete="name" textContentType="name" returnKeyType="next" />
      <TextField
        label="Username"
        prefix="@"
        value={username}
        onChangeText={(t) => { setSubmitError(null); setUsername(t.toLowerCase().replace(/\s/g, '').slice(0, 20)); }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        status={submitError ? { kind: 'error', text: submitError } : status}
      />
      {showBio ? (
        <TextField label="Bio" optional value={bio} onChangeText={(t) => setBio(t.slice(0, 150))} placeholder="Will travel for a good dosa…" multiline maxLength={150} />
      ) : null}
      <View style={styles.spacer} />
      <Button
        label={busy ? 'Saving…' : submitLabel}
        disabled={!canSubmit}
        onPress={async () => {
          setBusy(true);
          setSubmitError(null);
          try {
            await onSubmit({ name: name.trim(), username, bio: bio.trim() });
          } catch (e) {
            setSubmitError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18, flexGrow: 1 },
  spacer: { flexGrow: 1, minHeight: 8 },
});
