import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';

// TODO: receive real photo URIs via route params or shared state
const MOCK_PHOTOS = [
  'https://via.placeholder.com/300',
  'https://via.placeholder.com/300',
  'https://via.placeholder.com/300',
  'https://via.placeholder.com/300',
];

export function MemoryCoverScreen() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Cover Photo</Text>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Text style={styles.doneBtn}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Choose which photo appears on the highlight card.</Text>

      <FlatList
        data={MOCK_PHOTOS}
        keyExtractor={(_, i) => String(i)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => {
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => setSelectedIndex(index)}
            >
              <Image source={{ uri: item }} style={styles.thumb} />
              {isSelected && (
                <View style={styles.checkBadge}>
                  <RemixIcon name="check-line" size={16} color={theme.text.onColor} />
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const CELL_SIZE = 170;

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
  subtitle: {
    ...theme.typography.body,
    color: theme.text.secondary,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.l,
  },
  grid: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  row: { gap: theme.spacing.s },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: theme.radius.m,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: theme.border.brand,
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.border.strong,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
