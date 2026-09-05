import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/shared/theme';
import { SheetModal } from '@/shared/components/SheetModal';
import { WheelColumn } from '@/shared/components/WheelColumn';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

function yearsUpTo(year: number, span = 6): string[] {
  return Array.from({ length: span }, (_, i) => String(year - span + 1 + i));
}

interface DateTimePickerSheetProps {
  visible:   boolean;
  value:     Date;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
}

/** Bottom sheet for picking the Moment's capture date & time (H-02). */
export function DateTimePickerSheet({ visible, value, onConfirm, onDismiss }: DateTimePickerSheetProps) {
  const now = new Date();
  const YEARS = yearsUpTo(now.getFullYear());

  const [monthIdx, setMonthIdx]     = useState(value.getMonth());
  const [dayIdx, setDayIdx]         = useState(value.getDate() - 1);
  const [yearIdx, setYearIdx]       = useState(Math.max(0, YEARS.indexOf(String(value.getFullYear()))));
  const [hourIdx, setHourIdx]       = useState(((value.getHours() % 12) || 12) - 1);
  const [minuteIdx, setMinuteIdx]   = useState(value.getMinutes());
  const [meridiemIdx, setMeridiemIdx] = useState(value.getHours() >= 12 ? 1 : 0);

  // Re-sync the wheels to the caller's current value each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setMonthIdx(value.getMonth());
    setDayIdx(value.getDate() - 1);
    setYearIdx(Math.max(0, YEARS.indexOf(String(value.getFullYear()))));
    setHourIdx(((value.getHours() % 12) || 12) - 1);
    setMinuteIdx(value.getMinutes());
    setMeridiemIdx(value.getHours() >= 12 ? 1 : 0);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    let hour24 = hourIdx + 1; // 1-12
    if (meridiemIdx === 1 && hour24 !== 12) hour24 += 12;
    if (meridiemIdx === 0 && hour24 === 12) hour24 = 0;
    const picked = new Date(Number(YEARS[yearIdx]), monthIdx, dayIdx + 1, hour24, minuteIdx);
    // A moment can't be captured in the future — clamp to now.
    onConfirm(picked > now ? now : picked);
    onDismiss();
  };

  return (
    <SheetModal
      visible={visible}
      onRequestClose={onDismiss}
      sheetStyle={styles.sheet}
      scrimColor="rgba(0,0,0,0.45)"
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>Date & Time</Text>
        <Pressable hitSlop={8} onPress={handleConfirm}>
          <Text style={styles.doneBtn}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.wheelRow}>
        <WheelColumn items={MONTHS} selectedIndex={monthIdx} onChange={setMonthIdx} />
        <View style={styles.colDivider} />
        <WheelColumn items={DAYS} selectedIndex={dayIdx} onChange={setDayIdx} />
        <View style={styles.colDivider} />
        <WheelColumn items={YEARS} selectedIndex={yearIdx} onChange={setYearIdx} />
      </View>

      <View style={styles.wheelRow}>
        <WheelColumn items={HOURS} selectedIndex={hourIdx} onChange={setHourIdx} />
        <View style={styles.colDivider} />
        <WheelColumn items={MINUTES} selectedIndex={minuteIdx} onChange={setMinuteIdx} />
        <View style={styles.colDivider} />
        <WheelColumn items={MERIDIEM} selectedIndex={meridiemIdx} onChange={setMeridiemIdx} />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.surface.default,
    borderTopLeftRadius: theme.radius.l,
    borderTopRightRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm + theme.spacing.l,
    gap: theme.spacing.m,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border.strong,
    alignSelf: 'center',
    marginBottom: theme.spacing.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...theme.typography.h3, color: theme.text.primary },
  doneBtn: { ...theme.typography.buttonLabelM, color: theme.text.brand },
  wheelRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.m,
    backgroundColor: theme.surface.card,
    paddingVertical: theme.spacing.l,
    overflow: 'hidden',
  },
  colDivider: { width: 1, backgroundColor: theme.border.default },
});
