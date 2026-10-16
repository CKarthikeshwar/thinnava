import { LocateFixed } from 'lucide-react-native';
import { Dialog } from '@/components';
import { useLocationExplainer } from '@/lib/location';

/** A7 Location explainer (spec §14): shown once, before Android's own prompt. Mounted in the root layout. */
export function LocationExplainer() {
  const { explainerOpen, resolve } = useLocationExplainer();
  return (
    <Dialog
      visible={explainerOpen}
      icon={LocateFixed}
      title="Show places near you?"
      body="We use your location only to centre the map and list nearby places first. It's never shared."
      confirmLabel="Allow"
      cancelLabel="Not now"
      onConfirm={() => resolve?.(true)}
      onCancel={() => resolve?.(false)}
    />
  );
}
