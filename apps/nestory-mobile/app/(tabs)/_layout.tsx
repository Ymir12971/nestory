import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RemixIcon from 'react-native-remix-icon';
import { theme } from '@/shared/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface.default,
          borderTopColor: theme.border.default,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarActiveTintColor: theme.text.brand,
        tabBarInactiveTintColor: theme.text.secondary,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 12,
          lineHeight: 16,
        },
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
        name="highlights"
        options={{
          title: 'Highlights',
          tabBarIcon: ({ color, focused }) => (
            <RemixIcon name={focused ? 'star-fill' : 'star-line'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
