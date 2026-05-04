import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';

export type HeightSystem = 'metric' | 'imperial';

export interface HeightInputProps {
  system: HeightSystem;
  cm:     string;
  ft:     string;
  inches: string;
  onChangeCm:     (v: string) => void;
  onChangeFt:     (v: string) => void;
  onChangeInches: (v: string) => void;
  onToggle:       () => void;
}

/**
 * Height input that swaps shape when the user toggles units:
 *   metric   → 1 input (cm) + 1 pill
 *   imperial → 2 inputs (ft + in) + 2 pills
 *
 * Both pills toggle back to metric, so the user can flip from either side
 * without hunting for a specific control.
 */
export function HeightInput(props: HeightInputProps) {
  if (props.system === 'metric') {
    return (
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={props.cm}
          onChangeText={props.onChangeCm}
          keyboardType="numeric"
          placeholderTextColor={theme.text.hint}
        />
        <Pressable style={styles.pill} onPress={props.onToggle}>
          <Text style={styles.unitLabel}>cm</Text>
          <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={props.ft}
        onChangeText={props.onChangeFt}
        keyboardType="numeric"
        placeholderTextColor={theme.text.hint}
      />
      <Pressable style={styles.pill} onPress={props.onToggle}>
        <Text style={styles.unitLabel}>ft</Text>
        <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
      </Pressable>
      <TextInput
        style={styles.input}
        value={props.inches}
        onChangeText={props.onChangeInches}
        keyboardType="numeric"
        placeholderTextColor={theme.text.hint}
      />
      <Pressable style={styles.pill} onPress={props.onToggle}>
        <Text style={styles.unitLabel}>in</Text>
        <RemixIcon name="arrow-up-down-line" size={16} color={theme.text.brand} />
      </Pressable>
    </View>
  );
}

// ─── Conversion helpers ────────────────────────────────────────────────────
// API stores `heightValue: number + heightUnit: 'cm' | 'in'`. Imperial mode in
// the UI splits inches into ft + in for display only — on save we collapse
// back to total inches (`ft*12 + in`).

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function inchesToFtIn(totalInches: number): { ft: number; in: number } {
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - ft * 12);
  return { ft, in: inches };
}

export function ftInToInches(ft: number, inches: number): number {
  return ft * 12 + inches;
}

// ─── useHeightState ────────────────────────────────────────────────────────
// Owns the metric/imperial display strings + system toggle, and (importantly)
// preserves the original user-typed value across toggles so a round-trip
// (cm → in → cm or vice versa) doesn't drift due to integer-inch rounding.
//
// Mechanism:
//   - On toggle, snapshot the side we're leaving (the user-typed value).
//   - Remember what we DERIVED into the side we're entering.
//   - On the next toggle, if the active side still equals what we derived
//     (i.e. user didn't edit it), restore the snapshot. Otherwise recompute.

export interface HeightState {
  system: HeightSystem;
  cm:     string;
  ft:     string;
  inches: string;
  setCm:     (v: string) => void;
  setFt:     (v: string) => void;
  setInches: (v: string) => void;
  toggle:    () => void;
  /** Returns the API-shape height field, or null if no value entered. */
  resolve:   () => { heightValue: number; heightUnit: 'cm' | 'in' } | null;
}

export function useHeightState(opts?: {
  initialValue?: number | null;
  initialUnit?:  'cm' | 'in' | null;
}): HeightState {
  const initialUnit  = opts?.initialUnit  ?? null;
  const initialValue = opts?.initialValue ?? null;
  const initialIsImperial = initialUnit === 'in';
  const initialFtIn = initialIsImperial && initialValue != null
    ? inchesToFtIn(initialValue)
    : null;
  const initialCmStr = initialUnit === 'cm' && initialValue != null ? String(initialValue) : '';
  const initialFtStr = initialFtIn ? String(initialFtIn.ft) : '';
  const initialInStr = initialFtIn ? String(initialFtIn.in) : '';

  const [system, setSystem]   = useState<HeightSystem>(initialIsImperial ? 'imperial' : 'metric');
  const [cm, setCmRaw]        = useState(initialCmStr);
  const [ft, setFtRaw]        = useState(initialFtStr);
  const [inches, setInchesRaw] = useState(initialInStr);

  // Last user-typed value on the non-active side, restored on toggle-back if
  // the active side wasn't edited.
  const snapshot = useRef<{ cm: string | null; ftIn: { ft: string; in: string } | null }>({
    cm:   initialCmStr || null,
    ftIn: initialFtIn ? { ft: initialFtStr, in: initialInStr } : null,
  });

  // What we last derived into the active side (string-equality detects edits).
  const derivedActive = useRef<{ cm: string | null; ft: string | null; in: string | null }>({
    cm: !initialIsImperial ? initialCmStr : null,
    ft: initialIsImperial  ? initialFtStr : null,
    in: initialIsImperial  ? initialInStr : null,
  });

  const toggle = () => {
    if (system === 'metric') {
      // Leaving metric: snapshot cm, derive ft+in from cm.
      snapshot.current.cm = cm;
      const cmN = parseFloat(cm);
      if (Number.isFinite(cmN) && cmN > 0) {
        const { ft: fN, in: iN } = inchesToFtIn(cmToInches(cmN));
        const fStr = String(fN);
        const iStr = String(iN);
        setFtRaw(fStr);
        setInchesRaw(iStr);
        derivedActive.current = { cm: null, ft: fStr, in: iStr };
      } else {
        setFtRaw('');
        setInchesRaw('');
        derivedActive.current = { cm: null, ft: '', in: '' };
      }
      setSystem('imperial');
      return;
    }

    // Leaving imperial: snapshot ft+in.
    snapshot.current.ftIn = { ft, in: inches };

    const userEdited = !(
      ft === derivedActive.current.ft && inches === derivedActive.current.in
    );

    if (!userEdited && snapshot.current.cm != null) {
      // Round-trip: restore the original cm, no rounding drift.
      setCmRaw(snapshot.current.cm);
      derivedActive.current = { cm: snapshot.current.cm, ft: null, in: null };
    } else {
      const totalIn = ftInToInches(parseFloat(ft) || 0, parseFloat(inches) || 0);
      if (totalIn > 0) {
        const cmStr = String(Math.round(inchesToCm(totalIn)));
        setCmRaw(cmStr);
        derivedActive.current = { cm: cmStr, ft: null, in: null };
      } else {
        setCmRaw('');
        derivedActive.current = { cm: '', ft: null, in: null };
      }
    }
    setSystem('metric');
  };

  const resolve = (): { heightValue: number; heightUnit: 'cm' | 'in' } | null => {
    if (system === 'metric') {
      const cmN = parseFloat(cm);
      if (Number.isFinite(cmN) && cmN > 0) return { heightValue: cmN, heightUnit: 'cm' };
      return null;
    }
    const totalIn = ftInToInches(parseFloat(ft) || 0, parseFloat(inches) || 0);
    if (totalIn > 0) return { heightValue: totalIn, heightUnit: 'in' };
    return null;
  };

  return {
    system, cm, ft, inches,
    setCm:     setCmRaw,
    setFt:     setFtRaw,
    setInches: setInchesRaw,
    toggle,
    resolve,
  };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.s, alignItems: 'center' },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.surface.brandSubtle,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  unitLabel: { ...theme.typography.h2, color: theme.text.brand },
});
