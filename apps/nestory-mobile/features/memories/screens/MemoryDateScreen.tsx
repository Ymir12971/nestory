import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme } from '@/shared/theme';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS = ['S','M','T','W','T','F','S'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function MemoryDateScreen() {
  const router = useRouter();
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day,   setDay]   = useState(today.getDate());

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth())) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const now = new Date();
  const isFuture = (d: number) =>
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth()) ||
    (year === now.getFullYear() && month === now.getMonth() && d > now.getDate());

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Date</Text>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Text style={styles.doneBtn}>Done</Text>
        </Pressable>
      </View>

      {/* Month nav */}
      <View style={styles.monthRow}>
        <Pressable hitSlop={8} onPress={prevMonth}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <Pressable hitSlop={8} onPress={nextMonth}>
          <RemixIcon name="arrow-right-s-line" size={24} color={theme.text.primary} />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={styles.cell} />;
          const isSelected = d === day && month === (today.getMonth()) && year === today.getFullYear()
            ? true
            : d === day;
          const disabled = isFuture(d);
          return (
            <Pressable
              key={i}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                disabled && styles.cellDisabled,
              ]}
              onPress={() => !disabled && setDay(d)}
              disabled={disabled}
            >
              <Text style={[
                styles.dayLabel,
                isSelected && styles.dayLabelSelected,
                disabled && styles.dayLabelDisabled,
              ]}>
                {d}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Selected date display */}
      <View style={styles.selectedRow}>
        <RemixIcon name="calendar-line" size={16} color={theme.text.secondary} />
        <Text style={styles.selectedLabel}>
          {MONTHS[month]} {day}, {year}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const CELL = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
  },
  navTitle: { ...theme.typography.h3, color: theme.text.primary },
  doneBtn: { ...theme.typography.buttonLabelM, color: theme.text.brand },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.l,
  },
  monthLabel: { ...theme.typography.h2, color: theme.text.primary },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.s,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.xl,
  },
  cell: {
    width: `${100 / 7}%` as any,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: theme.surface.brand,
    borderRadius: CELL / 2,
  },
  cellDisabled: { opacity: 0.3 },
  dayLabel: { ...theme.typography.body, color: theme.text.primary },
  dayLabelSelected: { color: theme.text.onColor },
  dayLabelDisabled: { color: theme.text.hint },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
  },
  selectedLabel: { ...theme.typography.body, color: theme.text.secondary },
});
