import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapScreen from './app/(tabs)/index';
import MyPageScreen from './app/(tabs)/mypage';
import GoldScreen from './app/(tabs)/gold';
import ToiletDetailScreen from './app/ToiletDetailScreen';
import ReviewWriteScreen from './app/ReviewWriteScreen';
import ReportScreen from './app/ReportScreen';
import MyBookmarksScreen from './app/MyBookmarksScreen';
import MyReviewsScreen from './app/MyReviewsScreen';
import MyReportsScreen from './app/MyReportsScreen';
import OnboardingScreen, { ONBOARDING_DONE_KEY } from './app/OnboardingScreen';
import AdminScreen from './app/AdminScreen';
import PolicyScreen from './app/PolicyScreen';
import PhotoGalleryScreen from './app/PhotoGalleryScreen';
import AllReviewsScreen from './app/AllReviewsScreen';
import Toast from './components/Toast';
import { RootStackParamList } from './types/navigation';
import { colors } from './constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress} activeOpacity={0.82}>
      <Text style={styles.backButtonText}>‹</Text>
    </TouchableOpacity>
  );
}

function TabIcon({ name, focused }: { name: 'map' | 'gold'; focused: boolean }) {
  if (name === 'map') {
    return (
      <View style={styles.tabIconWrap}>
        <Image
          source={require('./assets/map-tab-icon-cropped.png')}
          style={[styles.mapIconImage, { opacity: focused ? 1 : 0.45 }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 황금 트로피 — 컬러풀한 이모지 사용
  return (
    <View style={styles.tabIconWrap}>
      <Text style={[styles.trophyEmoji, { opacity: focused ? 1 : 0.45 }]}>🏆</Text>
    </View>
  );
}

function TrophyIcon({ color }: { color: string }) {
  return (
    <View style={styles.trophyIcon}>
      <View style={[styles.trophyHandleLeft, { borderColor: color }]} />
      <View style={[styles.trophyHandleRight, { borderColor: color }]} />
      <View style={[styles.trophyCup, { borderColor: color }]} />
      <View style={[styles.trophyStem, { backgroundColor: color }]} />
      <View style={[styles.trophyBase, { backgroundColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={styles.profileIcon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileShoulders, { borderColor: color }]} />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: '#9F9393',
        tabBarStyle: {
          backgroundColor: colors.backgroundPrimary,
          borderTopColor: 'rgba(232,220,215,0.7)',
          borderTopWidth: 0.5,
          height: 88,
          paddingTop: 10,
          paddingBottom: 18,
          shadowColor: '#4A1A1F',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '800', marginTop: 2 },
        tabBarItemStyle: { paddingVertical: 2 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="지도"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="황금칸"
        component={GoldScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="gold" focused={focused} />,
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

  if (initialRoute === null) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={({ navigation }) => ({
            headerTintColor: colors.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: '900', fontSize: 17, color: colors.textPrimary },
            headerStyle: { backgroundColor: colors.backgroundPrimary },
            headerShadowVisible: false,
            headerBackVisible: false,
            headerBackTitleVisible: false,
            headerLeft: () =>
              navigation.canGoBack() ? <BackButton onPress={() => navigation.goBack()} /> : null,
            contentStyle: { backgroundColor: colors.backgroundPrimary },
          })}
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
            name="MyPage"
            component={MyPageScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ToiletDetail"
            component={ToiletDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ReviewWrite"
            component={ReviewWriteScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Report"
            component={ReportScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MyBookmarks"
            component={MyBookmarksScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MyReviews"
            component={MyReviewsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MyReports"
            component={MyReportsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Policy"
            component={PolicyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PhotoGallery"
            component={PhotoGalleryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AllReviews"
            component={AllReviewsScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
    includeFontPadding: false,
  },
  tabIconWrap: {
    width: 42,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIconImage: {
    width: 36,
    height: 36,
  },
  trophyEmoji: {
    fontSize: 30,
    lineHeight: 34,
    includeFontPadding: false,
    textAlign: 'center',
  } as any,
  goldTabIconWrap: {
    width: 44,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldIconImage: {
    width: 44,
    height: 44,
  },
  trophyIcon: {
    width: 34,
    height: 32,
    alignItems: 'center',
  },
  trophyCup: {
    width: 20,
    height: 15,
    borderWidth: 2.5,
    borderTopWidth: 3,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: 'transparent',
  },
  trophyHandleLeft: {
    position: 'absolute',
    left: 3,
    top: 4,
    width: 9,
    height: 11,
    borderLeftWidth: 2.2,
    borderTopWidth: 2.2,
    borderBottomWidth: 2.2,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  trophyHandleRight: {
    position: 'absolute',
    right: 3,
    top: 4,
    width: 9,
    height: 11,
    borderRightWidth: 2.2,
    borderTopWidth: 2.2,
    borderBottomWidth: 2.2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  trophyStem: {
    width: 5,
    height: 8,
    borderRadius: 3,
    marginTop: -1,
  },
  trophyBase: {
    width: 22,
    height: 4,
    borderRadius: 3,
  },
  profileIcon: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
    marginBottom: 3,
  },
  profileShoulders: {
    width: 26,
    height: 13,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
});
