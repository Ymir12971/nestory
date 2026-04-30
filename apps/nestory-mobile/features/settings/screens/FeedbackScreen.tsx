import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RemixIcon from 'react-native-remix-icon';
import { useRouter } from 'expo-router';
import { theme, palette } from '@/shared/theme';

// Annotation: email field defaults to the user's Apple/Google account email
const MOCK_USER_EMAIL = 'sarah.j@icloud.com';

export function FeedbackScreen() {
  const router = useRouter();
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail]               = useState(MOCK_USER_EMAIL);

  const canSubmit = feedbackText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
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
          {/* Feedback textarea section */}
          <View style={styles.section}>
            <View style={styles.titleGroup}>
              <Text style={styles.sectionTitle}>{"We'd love to hear from you"}</Text>
              <Text style={styles.sectionSubtitle}>
                Your feedback helps us make Nestory better for all families.
              </Text>
            </View>
            <TextInput
              style={styles.textarea}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder={"Tell us what you think, or let us know if something isn't working right…"}
              placeholderTextColor={theme.text.hint}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Email section */}
          <View style={styles.section}>
            <View style={styles.titleGroup}>
              <Text style={styles.sectionTitle}>{"We'll get back to you within 24h"}</Text>
              <Text style={styles.sectionSubtitle}>Leave your email address here.</Text>
            </View>
            <TextInput
              style={styles.emailInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={styles.cta}>
          {canSubmit ? (
            <Pressable
              style={({ pressed }) => [styles.submitBtnWrap, pressed && { opacity: 0.85 }]}
              onPress={() => { /* TODO: POST /feedback { text: feedbackText, email } */ }}
            >
              <LinearGradient
                colors={[palette.primary[500], palette.primary[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnLabel}>Submit Feedback</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[styles.submitBtn, styles.submitBtnDisabled]}>
              <Text style={styles.submitBtnLabelDisabled}>Submit Feedback</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

  section: { gap: theme.spacing.l },

  titleGroup: { gap: 6 },
  sectionTitle:    { ...theme.typography.h2, color: theme.text.primary },
  sectionSubtitle: { ...theme.typography.body, color: theme.text.secondary },

  // Textarea — surface.card, border.default, radius.s, px-16, py-12, h-300
  textarea: {
    backgroundColor: theme.surface.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: theme.radius.s,
    height: 300,
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.m,
    ...theme.typography.body,
    color: theme.text.primary,
  },

  // Email input — surface.card, border.strong, radius.s, h-48
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

  // CTA
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
});
