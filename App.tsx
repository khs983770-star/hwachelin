import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapScreen from './app/(tabs)/index';
import MyPageScreen from './app/(tabs)/mypage';
import GoldScreen from './app/(tabs)/gold';
import ToiletDetailScreen from './app/ToiletDetailScreen';
import ReviewWriteScreen from './app/ReviewWriteScreen';
import ReportScreen from './app/ReportScreen';
import MyBookmarksScreen from './app/MyBookmarksScreen';
import MyReviewsScreen from './app/MyReviewsScreen';
import OnboardingScreen, { ONBOARDING_DONE_KEY } from './app/OnboardingScreen';
import AdminScreen from './app/AdminScreen';
import PolicyScreen from './app/PolicyScreen';
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
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'MainTabs' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then((value) => {
      setInitialRoute(value === 'true' ? 'MainTabs' : 'Onboarding');
    });
  }, []);

  // 온보딩 여부 확인 중에는 스플래시 유지
  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundPrimary }}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
            headerStyle: { backgroundColor: colors.backgroundPrimary },
            contentStyle: { backgroundColor: colors.backgroundPrimary },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
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
          <Stack.Screen
            name="MyBookmarks"
            component={MyBookmarksScreen}
            options={{ title: '저장한 장소' }}
          />
          <Stack.Screen
            name="MyReviews"
            component={MyReviewsScreen}
            options={{ title: '내가 평가한 화장실' }}
          />
          <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: '제보 관리' }}
          />
          <Stack.Screen
            name="Policy"
            component={PolicyScreen}
            options={({ route }) => ({
              title: route.params?.type === 'privacy' ? '개인정보처리방침' : '이용약관',
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
