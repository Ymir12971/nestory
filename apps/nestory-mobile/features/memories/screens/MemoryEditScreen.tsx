import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme, palette } from '@/shared/theme';

// TODO: derive from GET /assets/:id — pre-fill real data
const MOCK_EDIT_DATA = {
  noteText: 'Emma laughed at the ducks at the park today. She kept pointing at them and saying "quack quack" over and over.',
  photos: ['placeholder_1', 'placeholder_2'],
  tags: 'Playtime +2',
  date: 'Apr 8, 2026',
  isHighlight: true,
};

export function MemoryEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [noteText, setNoteText]       = useState(MOCK_EDIT_DATA.noteText);
  const [isHighlight, setIsHighlight] = useState(MOCK_EDIT_DATA.isHighlight);
  const [photos, setPhotos]           = useState<string[]>(MOCK_EDIT_DATA.photos);

  const handleAddPhoto = () => {
    // TODO(expo-image-picker): replace with real picker
    setPhotos(prev => [...prev, `placeholder_${Date.now()}`]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // TODO: call PATCH /assets/:id with updated fields
    router.back();
  };

  const handleDelete = () => {
    // TODO: call DELETE /assets/:id, then navigate to memory list
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <RemixIcon name="arrow-left-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Edit Memory</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {photos.map((_, i) => (
            <View key={i} style={styles.photoThumbWrap}>
              {/* TODO: replace with <Image source={...}> when picker is wired */}
              <View style={styles.photoThumbImg} />
              <Pressable
                style={styles.deleteBadge}
                hitSlop={6}
                onPress={() => handleRemovePhoto(i)}
              >
                <RemixIcon name="close-line" size={12} color={theme.text.onColor} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.photoAdd} onPress={handleAddPhoto}>
            <RemixIcon name="add-large-line" size={36} color={theme.text.hint} />
          </Pressable>
        </ScrollView>

        {/* Note Input */}
        <TextInput
          style={styles.noteInput}
          placeholder="What happened today…"
          placeholderTextColor={theme.text.hint}
          multiline
          textAlignVertical="top"
          value={noteText}
          onChangeText={setNoteText}
        />

        {/* Details List */}
        <View style={styles.detailsList}>
          {/* Tags */}
          <Pressable style={styles.detailRow} onPress={() => router.push('/memory/tags')}>
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>{MOCK_EDIT_DATA.tags}</Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Date */}
          <Pressable style={styles.detailRow} onPress={() => router.push('/memory/date')}>
            <Text style={styles.detailLabel}>Date</Text>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>{MOCK_EDIT_DATA.date}</Text>
              <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Highlight toggle */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mark as Highlight</Text>
            <Switch
              value={isHighlight}
              onValueChange={setIsHighlight}
              trackColor={{ true: theme.surface.brand, false: theme.border.strong }}
              thumbColor={theme.surface.card}
            />
          </View>

          {/* Cover photo sub-row — visible when highlight on + ≥2 photos */}
          {isHighlight && photos.length >= 2 && (
            <>
              <View style={styles.rowDivider} />
              <Pressable style={styles.detailRow} onPress={() => router.push('/memory/cover')}>
                <Text style={styles.detailLabelBrand}>Change cover photo</Text>
                <RemixIcon name="arrow-right-s-line" size={20} color={theme.text.secondary} />
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <Pressable
          style={({ pressed }) => [styles.saveWrap, pressed && { opacity: 0.88 }]}
          onPress={handleSave}
        >
          <LinearGradient
            colors={[palette.primary[500], palette.primary[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnLabel}>Save Changes</Text>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnLabel}>Delete Memory</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface.default,
  },

  // NavBar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    height: 56,
  },
  navTitle: {
    ...theme.typography.h3,
    color: theme.text.primary,
  },
  navSpacer: {
    width: 24,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.l,
  },

  // Photo strip
  photoStrip: {
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.s,
  },
  photoThumbWrap: {
    width: THUMB,
    height: THUMB,
  },
  photoThumbImg: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.s,
    backgroundColor: theme.border.strong,
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.s,
    borderWidth: 1.5,
    borderColor: theme.border.default,
    borderStyle: 'dashed',
    backgroundColor: theme.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Note input
  noteInput: {
    height: 160,
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.m,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  // Details list
  detailsList: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.l,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.l,
    minHeight: 46,
    paddingVertical: theme.spacing.m,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.border.default,
    marginHorizontal: theme.spacing.l,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.text.primary,
  },
  detailLabelBrand: {
    ...theme.typography.body,
    color: theme.text.brand,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.text.secondary,
  },

  // CTA
  cta: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    gap: theme.spacing.s,
    alignItems: 'center',
  },
  saveWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: palette.primary[50],
    overflow: 'hidden',
  },
  saveBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  deleteBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  deleteBtnLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    color: theme.text.error,
  },
});
