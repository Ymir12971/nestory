import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePushRegistration } from '@/shared/hooks/usePushRegistration';

// DS TabBar (Figma 48:825): pt 8 / pb SafeBtm-34 over a 44pt tab (24 icon +
// 4 gap + 16 label) = 86 tall, 1px border/default hairline on top. Labels use
// the Tag&Badge style — Inter Medium 14/16, not 12.
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
          height: 8 + 44 + bottomInset,
          paddingTop: theme.spacing.s,
          paddingBottom: bottomInset,
        },
        tabBarIconStyle: {
          marginBottom: theme.spacing.xs,
        },
        // React Navigation's own tab item carries `padding: 5` (styles
        // tabVerticalUiKit), so the content wanted 5+24+4+16+5 = 54 inside the
        // 44 the design allots — the label was pushed out and clipped, leaving
        // a bar of bare icons. Zeroing it makes 24+4+16 land exactly on 44.
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
