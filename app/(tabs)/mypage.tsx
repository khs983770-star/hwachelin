import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

export default function MyPage() {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.avatarText}>화</Text>
        </View>
        <View>
          <Text style={styles.name}>화슐랭러</Text>
          <Text style={styles.profileSub}>깨끗한 화장실을 찾아다니는 중</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <StatCard value="0" label="작성 리뷰" />
        <StatCard value="3" label="저장 장소" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 활동</Text>
        <MenuRow icon="★" title="내가 평가한 화장실" subtitle="별점과 체크리스트" />
        <MenuRow icon="📍" title="저장한 장소" subtitle="다시 가기 좋은 곳" />
        <MenuRow icon="!" title="제보 내역" subtitle="수정 요청과 신규 등록" />
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

function MenuRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Text style={styles.menuIconText}>{icon}</Text>
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </View>
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
