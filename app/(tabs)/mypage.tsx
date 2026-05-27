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
import { getBookmarkCount } from '../../lib/bookmarkService';
import { deleteAccount } from '../../lib/accountService';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../types/navigation';

export default function MyPage() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadIsAdmin = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.is_admin === true);
  }, []);

  const loadCounts = useCallback(async (userId: string) => {
    const [reviewRes, reportRes, bCount] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      getBookmarkCount(userId),
    ]);
    if (!reviewRes.error) setReviewCount(reviewRes.count ?? 0);
    if (!reportRes.error) setReportCount(reportRes.count ?? 0);
    setBookmarkCount(bCount);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        loadCounts(data.session.user.id);
        loadIsAdmin(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        loadCounts(nextSession.user.id);
        loadIsAdmin(nextSession.user.id);
      } else {
        setReviewCount(0); setReportCount(0); setBookmarkCount(0); setIsAdmin(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadCounts, loadIsAdmin]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session?.user.id) {
          await Promise.all([loadCounts(data.session.user.id), loadIsAdmin(data.session.user.id)]);
        } else {
          setReviewCount(0); setReportCount(0); setBookmarkCount(0); setIsAdmin(false);
        }
      })();
      return () => { active = false; };
    }, [loadCounts, loadIsAdmin])
  );

  const login = async () => {
    setAuthLoading(true);
    const result = await signInWithKakao();
    setAuthLoading(false);
    if (!result.ok) Alert.alert('로그인 실패', result.message);
  };

  const logout = () => {
    Alert.alert('로그아웃할까요?', '현재 계정에서 로그아웃합니다.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 작성한 리뷰, 북마크, 제보 내역이 모두 삭제되며 복구할 수 없습니다.\n정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            setAuthLoading(true);
            const result = await deleteAccount();
            setAuthLoading(false);
            if (!result.ok) { Alert.alert('탈퇴 실패', result.message); return; }
            Alert.alert('탈퇴 완료', '계정이 삭제되었습니다. 이용해주셔서 감사합니다.');
          },
        },
      ]
    );
  };

  const user = session?.user ?? null;
  const displayName =
    user?.user_metadata?.nickname ?? user?.user_metadata?.name ?? user?.email ?? '화슐랭러';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
    >
      {/* 타이틀 */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>마이페이지</Text>
      </View>

      {/* 프로필 */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user ? String(displayName).slice(0, 1) : '화'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{loading ? '확인 중...' : displayName}</Text>
          <Text style={styles.profileSub}>
            {user ? '카카오 계정으로 로그인됨' : '리뷰를 남기려면 로그인이 필요해요'}
          </Text>
        </View>
      </View>

      {/* 로그인/로그아웃 버튼 */}
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

      {/* 통계 카드 — 리뷰/북마크/제보 클릭 가능 */}
      <View style={styles.stats}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={user ? 0.8 : 1}
          onPress={() => user && navigation.navigate('MyReviews')}
        >
          <Text style={styles.statValue}>{reviewCount}</Text>
          <Text style={styles.statLabel}>작성 리뷰</Text>
        </TouchableOpacity>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{bookmarkCount}</Text>
          <Text style={styles.statLabel}>저장 장소</Text>
        </View>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={user ? 0.8 : 1}
          onPress={() => user && navigation.navigate('MyReports')}
        >
          <Text style={styles.statValue}>{reportCount}</Text>
          <Text style={styles.statLabel}>접수 제보</Text>
        </TouchableOpacity>
      </View>

      {/* 내 활동 메뉴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 활동</Text>
        <MenuRow
          icon="★"
          title="내가 평가한 화장실"
          subtitle="별점과 체크리스트"
          onPress={() => user && navigation.navigate('MyReviews')}
          disabled={!user}
        />
        <MenuRow
          icon="🔖"
          title="저장한 장소"
          subtitle="다시 가기 좋은 곳"
          onPress={() => user && navigation.navigate('MyBookmarks')}
          disabled={!user}
        />
        <MenuRow
          icon="📍"
          title="내 제보 내역"
          subtitle="신규 등록과 정보 수정 요청"
          onPress={() => user && navigation.navigate('MyReports')}
          disabled={!user}
        />
        {isAdmin && (
          <MenuRow
            icon="🛠"
            title="어드민: 제보 관리"
            subtitle="제보 승인 및 반려 처리"
            onPress={() => navigation.navigate('Admin')}
          />
        )}
      </View>

      {/* 서비스 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>서비스 정보</Text>
        <MenuRow
          icon="📄"
          title="개인정보처리방침"
          subtitle="수집 항목 및 이용 목적 안내"
          onPress={() => navigation.navigate('Policy', { type: 'privacy' })}
        />
        <MenuRow
          icon="📋"
          title="이용약관"
          subtitle="서비스 이용 규칙"
          onPress={() => navigation.navigate('Policy', { type: 'terms' })}
        />
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>버전</Text>
          <Text style={styles.versionValue}>1.0.0</Text>
        </View>
        {user && (
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
            disabled={authLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteAccountText}>회원 탈퇴</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function MenuRow({
  icon, title, subtitle, onPress, disabled,
}: {
  icon: string; title: string; subtitle: string; onPress?: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, disabled && { opacity: 0.45 }]}
      onPress={onPress}
      activeOpacity={onPress && !disabled ? 0.8 : 1}
      disabled={disabled}
    >
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
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  titleBar: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
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
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 28, color: colors.orange, fontWeight: '800' },
  statLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },

  section: { marginTop: 20 },
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

  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  versionLabel: { fontSize: 14, color: colors.textSecondary },
  versionValue: { fontSize: 13, color: colors.textTertiary },
  deleteAccountBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  deleteAccountText: {
    fontSize: 13,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
});
