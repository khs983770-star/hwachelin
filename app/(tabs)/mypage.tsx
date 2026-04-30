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

type MyReviewItem = {
  id: string;
  toilet_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  placeName: string;
  address: string;
};

type MyReportItem = {
  id: string;
  toilet_id: string | null;
  report_type: 'new_toilet' | 'correction';
  place_name: string;
  address: string | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  created_at: string;
};

export default function MyPage() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [myReviews, setMyReviews] = useState<MyReviewItem[]>([]);
  const [myReports, setMyReports] = useState<MyReportItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const loadMyActivity = useCallback(async (userId: string) => {
    setActivityLoading(true);
    const [reviewCountRes, reviewListRes, reportCountRes, reportListRes] = await Promise.all([
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('reviews')
        .select(`
          id,
          toilet_id,
          rating,
          comment,
          created_at,
          toilets (
            id,
            places (
              name,
              address
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('reports')
        .select('id, toilet_id, report_type, place_name, address, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    setActivityLoading(false);

    if (!reviewCountRes.error) setReviewCount(reviewCountRes.count ?? 0);
    if (!reportCountRes.error) setReportCount(reportCountRes.count ?? 0);
    if (!reviewListRes.error) setMyReviews(normalizeReviews(reviewListRes.data ?? []));
    if (!reportListRes.error) setMyReports((reportListRes.data ?? []) as MyReportItem[]);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) loadMyActivity(data.session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        loadMyActivity(nextSession.user.id);
      } else {
        setReviewCount(0);
        setReportCount(0);
        setMyReviews([]);
        setMyReports([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadMyActivity]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session?.user.id) {
          await loadMyActivity(data.session.user.id);
        } else {
          setReviewCount(0);
          setReportCount(0);
          setMyReviews([]);
          setMyReports([]);
        }
      })();

      return () => {
        active = false;
      };
    }, [loadMyActivity])
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
        <StatCard value={String(reportCount)} label="접수 제보" />
      </View>

      {user && (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>내 리뷰</Text>
              {activityLoading && <ActivityIndicator size="small" color={colors.orange} />}
            </View>
            {myReviews.length === 0 ? (
              <Text style={styles.emptyText}>아직 작성한 리뷰가 없어요.</Text>
            ) : (
              myReviews.map((review) => (
                <TouchableOpacity
                  key={review.id}
                  style={styles.activityCard}
                  onPress={() => navigation.navigate('ToiletDetail', { toiletId: review.toilet_id })}
                  activeOpacity={0.82}
                >
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {review.placeName}
                    </Text>
                    <Text style={styles.activityScore}>★ {Number(review.rating).toFixed(1)}</Text>
                  </View>
                  <Text style={styles.activitySub} numberOfLines={1}>
                    {review.comment || review.address || '리뷰 메모 없음'}
                  </Text>
                  <Text style={styles.activityDate}>{formatDate(review.created_at)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>내 제보</Text>
            {myReports.length === 0 ? (
              <Text style={styles.emptyText}>아직 접수한 제보가 없어요.</Text>
            ) : (
              myReports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.activityCard}
                  onPress={() =>
                    report.toilet_id
                      ? navigation.navigate('ToiletDetail', { toiletId: report.toilet_id })
                      : undefined
                  }
                  activeOpacity={report.toilet_id ? 0.82 : 1}
                >
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {report.place_name}
                    </Text>
                    <Text style={[styles.statusBadge, getStatusStyle(report.status)]}>
                      {getStatusLabel(report.status)}
                    </Text>
                  </View>
                  <Text style={styles.activitySub} numberOfLines={1}>
                    {report.report_type === 'new_toilet' ? '신규 제보' : '수정 제보'} ·{' '}
                    {report.address || '주소 정보 없음'}
                  </Text>
                  <Text style={styles.activityDate}>{formatDate(report.created_at)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      )}

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

function normalizeReviews(rows: any[]): MyReviewItem[] {
  return rows.map((row) => {
    const toilet = Array.isArray(row.toilets) ? row.toilets[0] : row.toilets;
    const place = Array.isArray(toilet?.places) ? toilet.places[0] : toilet?.places;

    return {
      id: row.id,
      toilet_id: row.toilet_id,
      rating: Number(row.rating),
      comment: row.comment,
      created_at: row.created_at,
      placeName: place?.name ?? '화장실',
      address: place?.address ?? '',
    };
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusLabel(status: MyReportItem['status']) {
  if (status === 'reviewing') return '검토중';
  if (status === 'approved') return '승인';
  if (status === 'rejected') return '반려';
  return '대기';
}

function getStatusStyle(status: MyReportItem['status']) {
  if (status === 'approved') return styles.statusApproved;
  if (status === 'rejected') return styles.statusRejected;
  if (status === 'reviewing') return styles.statusReviewing;
  return styles.statusPending;
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
  sectionHeader: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
  },
  activityCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    marginBottom: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  activityTitle: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '700' },
  activityScore: { fontSize: 12, color: colors.amber, fontWeight: '700' },
  activitySub: { fontSize: 12, color: colors.textSecondary },
  activityDate: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },
  statusBadge: {
    minWidth: 44,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  statusPending: { color: '#92400E', backgroundColor: '#FEF3C7' },
  statusReviewing: { color: colors.blue, backgroundColor: '#DBEAFE' },
  statusApproved: { color: colors.green, backgroundColor: '#D1FAE5' },
  statusRejected: { color: '#D24134', backgroundColor: '#FEE2E2' },
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
