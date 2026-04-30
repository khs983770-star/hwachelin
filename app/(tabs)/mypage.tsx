import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { signInWithKakao, signOut } from '../../lib/authService';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../types/navigation';

export default function MyPage() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  const loadReviewCount = useCallback(async (userId: string) => {
    const { count, error } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!error) setReviewCount(count ?? 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) loadReviewCount(data.session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        loadReviewCount(nextSession.user.id);
      } else {
        setReviewCount(0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadReviewCount]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session?.user.id) {
          await loadReviewCount(data.session.user.id);
        } else {
          setReviewCount(0);
        }
      })();

      return () => {
        active = false;
      };
    }, [loadReviewCount])
  );

  const login = async () => {
    setAuthLoading(true);
    const result = await signInWithKakao();
    setAuthLoading(false);

    if (!result.ok) {
      Alert.alert('로그인 실패', result.message);
    }
  };

  const logout = () => {
    Alert.alert('로그아웃할까요?', '현재 계정에서 로그아웃합니다.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const user = session?.user ?? null;
  const displayName =
    user?.user_metadata?.nickname ?? user?.user_metadata?.name ?? user?.email ?? '화슐랭러';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>마이페이지</Text>
        <Text style={styles.subtitle}>화슐랭 탐험 기록</Text>
      </View>

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user ? String(displayName).slice(0, 1) : '화'}</Text>
        </View>
        <View>
          <Text style={styles.name}>{loading ? '확인 중...' : displayName}</Text>
          <Text style={styles.profileSub}>
            {user ? '카카오 계정으로 로그인됨' : '리뷰를 남기려면 로그인이 필요해요'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.authButton, user && styles.authButtonSecondary]}
        onPress={user ? logout : login}
        activeOpacity={0.85}
        disabled={authLoading || loading}
      >
        {authLoading ? (
          <ActivityIndicator color={user ? colors.textSecondary : '#2B1F16'} />
        ) : (
          <Text style={[styles.authButtonText, user && styles.authButtonTextSecondary]}>
            {user ? '로그아웃' : '카카오로 로그인'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.stats}>
        <StatCard value={String(reviewCount)} label="작성 리뷰" />
        <StatCard value="3" label="저장 장소" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 활동</Text>
        <MenuRow icon="★" title="내가 평가한 화장실" subtitle="별점과 체크리스트" />
        <MenuRow icon="📍" title="저장한 장소" subtitle="다시 가기 좋은 곳" />
        <MenuRow
          icon="!"
          title="화장실 제보하기"
          subtitle="신규 등록과 정보 수정 요청"
          onPress={() => navigation.navigate('Report', { reportType: 'new_toilet' })}
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <View style={styles.menuIcon}>
        <Text style={styles.menuIconText}>{icon}</Text>
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  authButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FEE500',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  authButtonSecondary: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  authButtonText: { fontSize: 14, color: '#2B1F16', fontWeight: '700' },
  authButtonTextSecondary: { color: colors.textSecondary },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, color: colors.orange, fontWeight: '700' },
  name: { fontSize: 16, color: colors.textPrimary, fontWeight: '700' },
  profileSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
  },
  statValue: { fontSize: 22, color: colors.orange, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuIconText: { fontSize: 16, color: colors.orange, fontWeight: '700' },
  menuTextWrap: { flex: 1 },
  menuTitle: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  menuSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  menuArrow: { fontSize: 18, color: colors.textTertiary },
});
