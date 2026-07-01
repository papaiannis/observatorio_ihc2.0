import { Tabs } from 'expo-router';
import CustomTabBar from '../../components/CustomTabBar';

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
