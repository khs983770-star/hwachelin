import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';
import ScreenHeader from '../components/ScreenHeader';

interface MyReport {
  id: string;
  toilet_id: string | null;
  report_type: 'new_toilet' | 'correction';
  place_name: string;
  address: string | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  created_at: string;
}

export default function MyReportsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('reports')
      .select('id, toilet_id, report_type, place_name, address, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setReports(data as MyReport[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReports();
    }, [loadReports])
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="내 제보 내역" onBack={() => navigation.goBack()} />

      <View style={styles.countRow}>
        <Text style={styles.countText}>총 {reports.length}건</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.orange} />
            <Text style={styles.centerText}>불러오는 중...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>아직 제보 내역이 없어요</Text>
            <Text style={styles.emptyText}>새 화장실을 발견하면 제보해 주세요!</Text>
          </View>
        ) : (
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.card}
              activeOpacity={report.toilet_id ? 0.84 : 1}
              onPress={() =>
                report.toilet_id
                  ? navigation.navigate('ToiletDetail', { toiletId: report.toilet_id })
                  : undefined
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {report.place_name}
                </Text>
                <Text style={[styles.statusBadge, getStatusStyle(report.status)]}>
                  {getStatusLabel(report.status)}
                </Text>
              </View>

              <Text style={styles.typeTag}>
                {report.report_type === 'new_toilet' ? '🆕 신규 제보' : '✏️ 수정 제보'}
              </Text>

              {!!report.address && (
                <Text style={styles.address} numberOfLines={1}>{report.address}</Text>
              )}

              <Text style={styles.date}>
                {new Date(report.created_at).toLocaleString('ko-KR', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit', hour12: false,
                })}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getStatusLabel(status: MyReport['status']) {
  if (status === 'reviewing') return '검토중';
  if (status === 'approved') return '승인';
  if (status === 'rejected') return '반려';
  return '대기';
}

function getStatusStyle(status: MyReport['status']) {
  if (status === 'approved') return styles.statusApproved;
  if (status === 'rejected') return styles.statusRejected;
  if (status === 'reviewing') return styles.statusReviewing;
  return styles.statusPending;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  countText: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },
  content: { padding: 16, gap: 10 },
  center: { alignItems: 'center', paddingTop: 60, gap: 10 },
  centerText: { fontSize: 13, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  placeName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  typeTag: { fontSize: 12, color: colors.textSecondary },
  address: { fontSize: 12, color: colors.textTertiary },
  date: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },
  statusBadge: {
    overflow: 'hidden',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  statusPending: { color: '#92400E', backgroundColor: '#FEF3C7' },
  statusReviewing: { color: colors.blue, backgroundColor: '#DBEAFE' },
  statusApproved: { color: colors.green, backgroundColor: '#D1FAE5' },
  statusRejected: { color: '#D24134', backgroundColor: '#FEE2E2' },
});
