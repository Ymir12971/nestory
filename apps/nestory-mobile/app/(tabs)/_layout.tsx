import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePushRegistration } from '@/shared/hooks/usePushRegistration';

// DS TabBar (Figma 48:825): pt 8 / pb SafeBtm-34 over a 44pt tab (24 icon +
// 4 gap + 16 label), 1px border/default hairline on top. Labels use the
// Tag&Badge style — Inter Medium 14/16, not 12.
//
// The bar is 4 taller than the frame's 86. Laying the content out at exactly
// 44 leaves the label with a line box the same height as its lineHeight, and
// the descender in "Settings"/"Stories" clips against it. LABEL_SLACK buys
// those pixels back; drop it to 0 to sit exactly on the spec.
const LABEL_SLACK = 4;
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Register this device's push token once the user is inside the app.
  const { session } = useSession();
  usePushRegistration(!!session);
  const bottomInset = Math.max(insets.bottom, theme.spacing.safeBtm);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface.default,
          borderTopColor: theme.border.default,
          borderTopWidth: 1,
          height: 8 + 44 + LABEL_SLACK + bottomInset,
          paddingTop: theme.spacing.s,
          paddingBottom: bottomInset,
        },
        // Two layers of React Navigation's own spacing have to be cancelled or
        // the label is pushed past the bottom edge and clipped, leaving a bar
        // of bare icons. Against the 44 of content the design allows:
        //   tab item     `padding: 5`        (styles.tabVerticalUiKit)
        //   icon wrapper 31x28               (ICON_SIZE_WIDE/TALL in TabBarIcon)
        // which is 5+28+4+16+5 = 58. Pinning the wrapper to the 24 the icon
        // actually draws and dropping the padding gives 24+4+16 = 44.
        tabBarIconStyle: {
          width: 24,
          height: 24,
          marginBottom: theme.spacing.xs,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarActiveTintColor: theme.text.brand,
        tabBarInactiveTintColor: theme.text.secondary,
        tabBarLabelStyle: theme.typography.tagBadge,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <RemixIcon name={focused ? 'home-3-fill' : 'home-3-line'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: 'Stories',
          tabBarIcon: ({ color, focused }) => (
            <RemixIcon name={focused ? 'book-open-fill' : 'book-open-line'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <RemixIcon name={focused ? 'settings-fill' : 'settings-line'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
