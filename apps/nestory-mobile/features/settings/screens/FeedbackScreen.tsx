import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { FEEDBACK_CONSTRAINTS } from '@nestory/types';
import { BottomSheet, sheetSection } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { NavBar } from '@/shared/components/NavBar';
import { theme, palette } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { useMe, useSubmitFeedback, uploadPhoto } from '@/api';
import { usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { showToast } from '@/features/ui/toast';

// ST-feedback (2026-07 redesign): the 10% off idea program. Text OR photos
// activates Send (unlike Add Moment, which requires text). Submission happens
// on "All Done" in the thanks sheet so the (editable) email rides along.

const HOW_IT_WORKS = [
  "If we ship your idea in the app, you'll get an email the day it goes live.",
  'Your very next Premium bill is automatically discounted 10% pre-tax. No code needed.',
  'Limited to one discount per idea shipped. Discounts stack before they take effect.',
  'If your discounts add up to more than 100%, the extra rolls onto the bill after that, and so on.',
  'Free-tier members get the discount applied the month they upgrade.',
  'Discounts expire in one year since you receive our notification.',
];

export function FeedbackScreen() {
  const goBack = useGoBack();
  const meQ = useMe();
  const submit = useSubmitFeedback();
  const pickFromLibrary = usePhotoPicker({ multiple: true });

  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail]               = useState('');
  const [photos, setPhotos]             = useState<PickedPhoto[]>([]);
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);
  const [thanksVisible, setThanksVisible] = useState(false);
  const [sending, setSending] = useState(false);

  // Default email to the signed-in user's address once it loads (only if user hasn't typed yet).
  useEffect(() => {
    if (!email && meQ.data?.email) setEmail(meQ.data.email);
  }, [meQ.data?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeText = (text: string) => {
    if (text.length > FEEDBACK_CONSTRAINTS.maxTextChars) {
      showToast({ type: 'warning', message: `Feedback is limited to ${FEEDBACK_CONSTRAINTS.maxTextChars} characters.` });
      setFeedbackText(text.slice(0, FEEDBACK_CONSTRAINTS.maxTextChars));
      return;
    }
    setFeedbackText(text);
  };

  const addPickedPhotos = (picked: PickedPhoto[]) => {
    if (picked.length === 0) return;
    setPhotos(prev => {
      const room = FEEDBACK_CONSTRAINTS.maxPhotos - prev.length;
      const accepted = picked.slice(0, room);
      if (accepted.length < picked.length) {
        showToast({ type: 'warning', message: `Maximum ${FEEDBACK_CONSTRAINTS.maxPhotos} photos.` });
      }
      return [...prev, ...accepted];
    });
  };

  // The "+" goes straight to the album — no source sheet, the product doesn't
  // take photos (Justin 2026-09-04).
  const handleAddPhotos = async () => {
    const room = FEEDBACK_CONSTRAINTS.maxPhotos - photos.length;
    if (room <= 0) return;
    addPickedPhotos(await pickFromLibrary({ selectionLimit: room }));
  };

  // Either text or photos activates Send (FEEDBACK_CONSTRAINTS — unlike Add Moment).
  const canSend = (feedbackText.trim().length > 0 || photos.length > 0) && !sending;

  const handleAllDone = async () => {
    if (sending) return;
    setSending(true);
    try {
      const uploaded = photos.length > 0
        ? await Promise.all(photos.map(p => uploadPhoto(p, 'memories')))
        : [];
      await submit.mutateAsync({
        ...(feedbackText.trim() ? { text: feedbackText.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(uploaded.length > 0 ? { photoUrls: uploaded.map(u => u.fileUrl) } : {}),
      });
      setThanksVisible(false);
      showToast({ type: 'success', message: 'Feedback sent. Thank you!' });
      goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      showToast({ type: 'error', message: `Couldn't send feedback: ${msg}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NavBar 769:2308 — back arrow only, the H1 below carries the title */}
      <NavBar onBack={goBack} />

      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle}>Share feedback, Earn 10% off.</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introGroup}>
            <Text style={styles.introText}>
              Tell us what would make this feel more like home. If we build it, your next Premium
              bill is 10% lighter.
            </Text>
            <Pressable style={styles.howLinkBtn} onPress={() => setHowItWorksVisible(true)}>
              <Text style={styles.howLink}>How does the 10% off work? →</Text>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Let us know what's on your mind:</Text>
            <TextInput
              style={[styles.textarea, feedbackText.length > 0 && styles.textareaFilled]}
              value={feedbackText}
              onChangeText={onChangeText}
              placeholder={"e.g. I'd love it if Nestory could..."}
              placeholderTextColor={theme.text.hint}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Photos — same 3-up grid as Add Moment, ≤ 9 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Any pictures you'd like to share?</Text>
            <View style={styles.photoGrid}>
              {photos.map((p, i) => (
                <View key={`${p.uri}-${i}`} style={styles.photoCell}>
                  <Image source={{ uri: p.uri }} style={styles.photoCellImg} />
                  <Pressable
                    style={styles.deleteBadge}
                    hitSlop={6}
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <RemixIcon name="close-line" size={24} color={theme.text.onColor} />
                  </Pressable>
                </View>
              ))}
              {photos.length < FEEDBACK_CONSTRAINTS.maxPhotos && (
                <Pressable style={styles.photoAdd} onPress={() => void handleAddPhotos()}>
                  <RemixIcon name="add-large-line" size={36} color={theme.text.hint} />
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>

        {/* cta 768:4465 */}
        <View style={styles.cta}>
          <Button
            label="Send feedback"
            disabled={!canSend}
            onPress={() => setThanksVisible(true)}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Sheet · How the 10% off works (ST-feedback annotation) */}
      <BottomSheet visible={howItWorksVisible} onRequestClose={() => setHowItWorksVisible(false)}>
        <View style={sheetSection.title}>
          <Text style={styles.sheetTitle}>How the 10% off works</Text>
        </View>
        <View style={sheetSection.body}>
          <View style={styles.sheetList}>
            {HOW_IT_WORKS.map((line) => (
              <View key={line.slice(0, 24)} style={styles.benefitRow}>
                <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
                <Text style={styles.benefitText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={sheetSection.cta}>
          <Button label="Got it" onPress={() => setHowItWorksVisible(false)} />
        </View>
      </BottomSheet>

      {/* Bottom Sheet · Thanks — All Done submits and returns to Settings */}
      <BottomSheet visible={thanksVisible} onRequestClose={() => setThanksVisible(false)}>
        <View style={sheetSection.title}>
          <Text style={styles.sheetTitle}>Thanks for your feedback!</Text>
        </View>
        <View style={sheetSection.body}>
          <View style={styles.sheetList}>
            <View style={styles.benefitRow}>
              <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
              <Text style={styles.benefitText}>
                We'll get back to you soon and let you know if you earn 10% off your Premium bill.
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <RemixIcon name="vip-crown-2-line" size={20} color={theme.text.premium} />
              <Text style={styles.benefitText}>
                This is the email we'll connect you with. Please change if it's not correct.
              </Text>
            </View>
            <Input
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>
        </View>
        <View style={sheetSection.cta}>
          <Button
            label={sending ? 'Sending…' : 'All Done'}
            disabled={sending}
            onPress={() => void handleAllDone()}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const PHOTO_CELL = 107;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  flex: { flex: 1 },
  // title 768:4420 — the page headline lives under the bar, not in it
  titleBlock: {
    paddingHorizontal: 20,
    paddingVertical: theme.spacing.l,
  },
  pageTitle: { ...theme.typography.h1, color: theme.text.primary },

  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.l,
  },

  introGroup: { gap: theme.spacing.s },
  introText: { ...theme.typography.body, color: theme.text.primary },
  howLinkBtn: { height: 40, justifyContent: 'center' },
  howLink: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
  },

  fieldGroup: { gap: theme.spacing.s },
  fieldLabel: { ...theme.typography.h4, color: theme.text.primary },

  textarea: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    height: 200, // 768:4446
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    ...theme.typography.body,
    color: theme.text.primary,
  },
  textareaFilled: { borderColor: theme.border.strong },

  // Photo grid 768:4454 — same 3-up 107 grid as Add Moment
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.l,
  },
  photoCell: {
    width: PHOTO_CELL,
    height: PHOTO_CELL,
    borderRadius: theme.radius.m,
    backgroundColor: palette.neutral[200],
    overflow: 'hidden',
  },
  photoCellImg: { width: PHOTO_CELL, height: PHOTO_CELL },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    left: 79,
    width: 24,
    height: 24,
    borderRadius: theme.radius.full,
    backgroundColor: theme.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoAdd: {
    width: PHOTO_CELL,
    height: PHOTO_CELL,
    borderRadius: theme.radius.m,
    borderWidth: 1.5,
    borderColor: theme.border.default,
    backgroundColor: theme.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cta: {
    paddingTop: theme.spacing.l, // 16
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: 20,
  },

  // Sheet content (shell comes from shared/components/BottomSheet)
  sheetTitle: {
    ...theme.typography.h1, // Manrope Bold 28/38
    color: theme.text.primary,
  },
  sheetList: { gap: theme.spacing.s },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs, // 4
  },
  benefitText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
  },
});
