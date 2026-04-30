import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

export const ONBOARDING_DONE_KEY = '@hwachelin/onboarding_done';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

interface Slide {
  key: string;
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: '1',
    emoji: '🚻',
    title: '주변 화장실을\n한눈에',
    body: '지도에서 근처 화장실을 찾고\n상세 정보를 바로 확인하세요.',
  },
  {
    key: '2',
    emoji: '⭐',
    title: '솔직한 리뷰로\n믿을 수 있는 정보',
    body: '청결도, 비데, 비누 등 체크리스트로\n직접 경험한 정보를 남겨보세요.',
  },
  {
    key: '3',
    emoji: '🏆',
    title: '황금칸을\n발견하세요',
    body: '내 주변에서 평점 높은 화장실을\n황금칸 탭에서 한 번에 확인.',
  },
  {
    key: '4',
    emoji: '🔖',
    title: '자주 가는 곳을\n북마크로',
    body: '다시 가고 싶은 화장실은\n저장해두고 언제든지 꺼내보세요.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    navigation.replace('MainTabs');
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.emojiWrap}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* 페이지 인디케이터 */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotOn]} />
        ))}
      </View>

      {/* 버튼 영역 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{isLast ? '시작하기' : '다음'}</Text>
        </TouchableOpacity>
        {!isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
            <Text style={styles.skipBtnText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  emojiWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.borderSecondary,
  },
  dotOn: {
    backgroundColor: colors.orange,
    width: 20,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 13,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
});
