import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import MapScreen from './app/(tabs)/index';
import MyPageScreen from './app/(tabs)/mypage';
import GoldScreen from './app/(tabs)/gold';
import ToiletDetailScreen from './app/ToiletDetailScreen';
import ReviewWriteScreen from './app/ReviewWriteScreen';
import ReportScreen from './app/ReportScreen';
import { RootStackParamList } from './types/navigation';
import { colors } from './constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.backgroundPrimary,
          borderTopColor: colors.borderTertiary,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="지도"
        component={MapScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="황금칸"
        component={GoldScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="마이페이지"
        component={MyPageScreen}
        options={{
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            headerStyle: { backgroundColor: colors.backgroundPrimary },
            contentStyle: { backgroundColor: colors.backgroundPrimary },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ToiletDetail"
            component={ToiletDetailScreen}
            options={{ title: '화장실 상세' }}
          />
          <Stack.Screen
            name="ReviewWrite"
            component={ReviewWriteScreen}
            options={{ title: '리뷰 작성' }}
          />
          <Stack.Screen
            name="Report"
            component={ReportScreen}
            options={{ title: '화장실 제보' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
