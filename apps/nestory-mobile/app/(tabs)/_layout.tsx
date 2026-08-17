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
// Every tab item carries 5px of padding of its own (styles.tabVerticalUiKit)
// that cannot be overridden: BottomTabItem reads only `flex` off
// tabBarItemStyle and puts the rest on an outer wrapper, while the padding
// lives on the pressable inside it. Left unaccounted for, the item needed
// 5+24+4+16+5 = 54 in a 44 box and flex shrank the label's line box to 9px,
// which is what cut the text — the label was never clipped by an ancestor,
// it was squeezed.
//
// So subtract it from the bar's own padding instead. 3 + [5+44+5] + 29 is the
// same 86, and puts the icon 8 from the top and the label's baseline exactly
// where 48:825 has them.
const ITEM_PADDING = 5;

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
          paddingTop: theme.spacing.s - ITEM_PADDING,
          paddingBottom: bottomInset - ITEM_PADDING,
        },
        // Two layers of React Navigation's own spacing have to be cancelled or
        // the label is pushed past the bottom edge and clipped, leaving a bar
        // of bare icons. Against the 44 of content the design allows:
        //   tab item     `padding: 5`        (styles.tabVerticalUiKit)
        //   icon wrapper 31x28               (ICON_SIZE_WIDE/TALL in TabBarIcon)
        // The icon wrapper defaults to 31x28 (ICON_SIZE_WIDE/TALL in
        // TabBarIcon) around a glyph that draws at 24; pin it to 24 so the
        // column is the 24 + 4 + 16 the frame specifies.
        tabBarIconStyle: {
          width: 24,
          height: 24,
          marginBottom: theme.spacing.xs,
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
