import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { FEEDBACK_CONSTRAINTS } from '@nestory/types';
import { theme, palette } from '@/shared/theme';
import { useGoBack } from '@/shared/hooks/useGoBack';
import { useMe, useSubmitFeedback, uploadPhoto } from '@/api';
import { usePhotoCamera, usePhotoPicker, type PickedPhoto } from '@/shared/hooks/usePhotoPicker';
import { PhotoSourceSheet } from '@/shared/components/PhotoSourceSheet';
import { showToast } from '@/features/ui/toast';

// ST-feedback (2026-07 redesign): the 10% off idea program. Text OR photos
// activates Send (unlike Add Memory, which requires text). Submission happens
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
  const takePhoto = usePhotoCamera();

  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail]               = useState('');
  const [photos, setPhotos]             = useState<PickedPhoto[]>([]);
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);
  const [photoSourceVisible, setPhotoSourceVisible] = useState(false);
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

  // Either text or photos activates Send (FEEDBACK_CONSTRAINTS — unlike Add Memory).
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
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={goBack}>
          <RemixIcon name="arrow-left-s-line" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Feedback</Text>
        <View style={styles.navSpacer} />
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
          <View style={styles.section}>
            <View style={styles.titleGroup}>
              <Text style={styles.sectionTitle}>Share an idea, earn 10% off</Text>
              <Text style={styles.sectionSubtitle}>
                Tell us what would make Nestory better. If we ship it, your next Premium bill is 10% off.
              </Text>
              <Pressable onPress={() => setHowItWorksVisible(true)}>
                <Text style={styles.howLink}>How does the 10% off work?</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.textarea}
              value={feedbackText}
              onChangeText={onChangeText}
              placeholder={"Tell us what you think, or let us know if something isn't working right…"}
              placeholderTextColor={theme.text.hint}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Photos — same flow as Add Memory, ≤ 9 */}
          <View style={styles.section}>
            <Text style={styles.photoLabel}>Add photos (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {photos.map((p, i) => (
                <View key={`${p.uri}-${i}`} style={styles.photoThumbWrap}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumbImg} />
                  <Pressable
                    style={styles.deleteBadge}
                    hitSlop={6}
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <RemixIcon name="close-line" size={12} color={theme.text.onColor} />
                  </Pressable>
                </View>
              ))}
              {photos.length < FEEDBACK_CONSTRAINTS.maxPhotos && (
                <Pressable style={styles.photoAdd} onPress={() => setPhotoSourceVisible(true)}>
                  <RemixIcon name="add-large-line" size={28} color={theme.text.hint} />
                </Pressable>
              )}
            </ScrollView>
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={styles.cta}>
          {canSend ? (
            <Pressable
              style={({ pressed }) => [styles.submitBtnWrap, pressed && { opacity: 0.85 }]}
              onPress={() => setThanksVisible(true)}
            >
              <LinearGradient
                colors={[palette.primary[500], palette.primary[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnLabel}>Send Feedback</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[styles.submitBtn, styles.submitBtnDisabled]}>
              <Text style={styles.submitBtnLabelDisabled}>Send Feedback</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* How the 10% off works */}
      <Modal visible={howItWorksVisible} transparent animationType="slide" onRequestClose={() => setHowItWorksVisible(false)}>
        <Pressable style={styles.scrim} onPress={() => setHowItWorksVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>How the 10% off works</Text>
          {HOW_IT_WORKS.map(line => (
            <View key={line.slice(0, 24)} style={styles.benefitRow}>
              <RemixIcon name="vip-crown-2-line" size={18} color={theme.text.premium} />
              <Text style={styles.benefitText}>{line}</Text>
            </View>
          ))}
          <Pressable style={styles.sheetPrimaryBtn} onPress={() => setHowItWorksVisible(false)}>
            <Text style={styles.sheetPrimaryLabel}>Got it</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Thanks — email confirm; All Done submits and returns to Settings */}
      <Modal visible={thanksVisible} transparent animationType="slide" onRequestClose={() => setThanksVisible(false)}>
        <Pressable style={styles.scrim} onPress={() => setThanksVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Thanks for your feedback!</Text>
          <View style={styles.benefitRow}>
            <RemixIcon name="mail-send-line" size={18} color={theme.text.brand} />
            <Text style={styles.benefitText}>
              We'll get back to you soon and let you know if you earn 10% off your Premium bill.
            </Text>
          </View>
          <Text style={styles.emailHint}>
            This is the email we'll contact you with. Please change if it's not correct.
          </Text>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
          />
          <Pressable
            style={[styles.sheetPrimaryBtn, sending && { opacity: 0.7 }]}
            onPress={() => void handleAllDone()}
            disabled={sending}
          >
            <Text style={styles.sheetPrimaryLabel}>{sending ? 'Sending…' : 'All Done'}</Text>
          </Pressable>
        </View>
      </Modal>

      <PhotoSourceSheet
        visible={photoSourceVisible}
        onTakePhoto={() => { setPhotoSourceVisible(false); void takePhoto().then(addPickedPhotos); }}
        onChooseLibrary={() => {
          setPhotoSourceVisible(false);
          void pickFromLibrary({ selectionLimit: FEEDBACK_CONSTRAINTS.maxPhotos - photos.length }).then(addPickedPhotos);
        }}
        onDismiss={() => setPhotoSourceVisible(false)}
      />
    </SafeAreaView>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface.default },
  flex: { flex: 1 },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  navTitle:  { ...theme.typography.h2, color: theme.text.primary },
  navSpacer: { width: 24 },

  scroll: { flex: 1 },
  body: {
    paddingTop: theme.spacing.l,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.l,
  },

  section: { gap: theme.spacing.m },

  titleGroup: { gap: 6 },
  sectionTitle:    { ...theme.typography.h2, color: theme.text.primary },
  sectionSubtitle: { ...theme.typography.body, color: theme.text.secondary },
  howLink: {
    ...theme.typography.buttonLabelM,
    color: theme.text.brand,
    paddingTop: 2,
  },

  textarea: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    height: 220,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.m,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  photoLabel: { ...theme.typography.h4, color: theme.text.primary },
  photoStrip: { gap: theme.spacing.s },
  photoThumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.m,
    overflow: 'visible',
  },
  photoThumbImg: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.m,
    backgroundColor: theme.border.strong,
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.m,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emailHint: {
    ...theme.typography.caption,
    color: theme.text.secondary,
  },
  emailInput: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.strong,
    borderRadius: theme.radius.s,
    height: 48,
    paddingHorizontal: theme.spacing.l,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  cta: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.safeBtm,
    paddingHorizontal: theme.spacing.xl,
  },
  submitBtnWrap: {
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.primary[50],
  },
  submitBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  submitBtnDisabled: {
    backgroundColor: theme.surface.disabled,
  },
  submitBtnLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
  submitBtnLabelDisabled: {
    ...theme.typography.buttonLabelM,
    color: theme.text.disabled,
  },

  // Sheets
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: theme.surface.card,
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
  sheetTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: theme.text.primary,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s,
  },
  benefitText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.text.primary,
    lineHeight: 22,
  },
  sheetPrimaryBtn: {
    height: 52,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.s,
  },
  sheetPrimaryLabel: {
    ...theme.typography.buttonLabelM,
    color: theme.text.onColor,
  },
});
