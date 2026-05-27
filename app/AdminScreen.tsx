import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

interface PendingReport {
  id: string;
  report_type: 'new_toilet' | 'correction';
  place_name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  access_type: string | null;
  floor: string | null;
  gender_type: string | null;
  has_password: boolean;
  operating_hours: string | null;
  comment: string | null;
  status: string;
  created_at: string;
  toilet_id: string | null;
  user_id: string;
}

export default function AdminScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .in('status', ['pending', 'reviewing'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      setReports(data as PendingReport[]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const setStatus = async (reportId: string, status: 'reviewing' | 'rejected', reason?: string) => {
    setProcessingId(reportId);
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        rejection_reason: reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);
    setProcessingId(null);

    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const approveNewToilet = async (report: PendingReport) => {
    if (!report.lat || !report.lng) {
      Alert.alert('승인 불가', '위경도 정보가 없어 자동 등록이 어렵습니다.\n수동으로 처리해 주세요.');
      return;
    }

    setProcessingId(report.id);
    try {
      // 1. places 테이블에 장소 삽입
      const { data: placeData, error: placeError } = await supabase
        .from('places')
        .insert({
          name: report.place_name,
          address: report.address,
          lat: report.lat,
          lng: report.lng,
          source: 'user',
        })
        .select('id')
        .single();

      if (placeError || !placeData) {
        Alert.alert('오류', placeError?.message ?? '장소 생성 실패');
        return;
      }

      // 2. toilets 테이블에 화장실 삽입
      const { error: toiletError } = await supabase.from('toilets').insert({
        place_id: placeData.id,
        type: '매장',
        access_type: report.access_type ?? '누구나',
        floor: report.floor ? parseInt(report.floor, 10) : 1,
        gender_type: report.gender_type ?? '공용',
        is_24hours: false,
        has_diaper_table: false,
        operating_hours: report.operating_hours ?? null,
      });

      if (toiletError) {
        Alert.alert('오류', toiletError.message);
        return;
      }

      // 3. 제보 상태 승인으로 업데이트
      const { error: reportError } = await supabase
        .from('reports')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', report.id);

      if (reportError) {
        Alert.alert('오류', reportError.message);
        return;
      }

      setReports((prev) => prev.filter((r) => r.id !== report.id));
      Alert.alert('승인 완료', `'${report.place_name}' 화장실이 등록됐습니다.`);
    } finally {
      setProcessingId(null);
    }
  };

  const approveCorrection = async (report: PendingReport) => {
    // 수정 제보는 상태만 approved로 변경 (실제 수정은 어드민이 직접)
    setProcessingId(report.id);
    const { error } = await supabase
      .from('reports')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', report.id);
    setProcessingId(null);

    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    Alert.alert('승인 완료', '제보가 승인됐습니다. 데이터를 직접 수정해 주세요.');
  };

  const handleApprove = (report: PendingReport) => {
    const action = report.report_type === 'new_toilet' ? approveNewToilet : approveCorrection;
    Alert.alert(
      '제보 승인',
      `'${report.place_name}' 제보를 승인하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '승인', onPress: () => action(report) },
      ]
    );
  };

  const handleReject = (report: PendingReport) => {
    const reason = rejectReasonMap[report.id] ?? '';
    Alert.alert(
      '제보 반려',
      `'${report.place_name}' 제보를 반려하시겠습니까?\n\n사유: ${reason || '(없음)'}`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '반려',
          style: 'destructive',
          onPress: () => setStatus(report.id, 'rejected', reason || undefined),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="제보 관리" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >

      {loading ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
      ) : reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>처리할 제보가 없어요</Text>
          <Text style={styles.emptyText}>모든 제보가 처리됐습니다.</Text>
        </View>
      ) : (
        reports.map((report) => {
          const isProcessing = processingId === report.id;
          const typeBadge = report.report_type === 'new_toilet' ? '신규' : '수정';

          return (
            <View key={report.id} style={styles.card}>
              {/* 헤더 */}
              <View style={styles.cardHeader}>
                <Text style={styles.placeName} numberOfLines={1}>{report.place_name}</Text>
                <View style={[styles.typeBadge, report.report_type === 'new_toilet' ? styles.badgeNew : styles.badgeCorrect]}>
                  <Text style={[styles.typeBadgeText, report.report_type === 'new_toilet' ? styles.badgeNewText : styles.badgeCorrectText]}>
                    {typeBadge}
                  </Text>
                </View>
              </View>

              {/* 상세 정보 */}
              {!!report.address && <InfoLine label="주소" value={report.address} />}
              {!!report.access_type && <InfoLine label="이용 조건" value={report.access_type} />}
              {!!report.floor && <InfoLine label="층수" value={report.floor} />}
              {!!report.gender_type && <InfoLine label="성별" value={report.gender_type} />}
              {!!report.operating_hours && <InfoLine label="운영시간" value={report.operating_hours} />}
              {!!report.comment && <InfoLine label="메모" value={report.comment} />}
              {report.lat != null && (
                <InfoLine label="위경도" value={`${report.lat.toFixed(5)}, ${report.lng?.toFixed(5)}`} />
              )}
              <Text style={styles.date}>
                접수: {new Date(report.created_at).toLocaleDateString('ko-KR')}
              </Text>

              {/* 반려 사유 입력 */}
              <TextInput
                style={styles.reasonInput}
                placeholder="반려 사유 (선택)"
                placeholderTextColor={colors.textTertiary}
                value={rejectReasonMap[report.id] ?? ''}
                onChangeText={(text) =>
                  setRejectReasonMap((prev) => ({ ...prev, [report.id]: text }))
                }
              />

              {/* 액션 버튼 */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.reviewingBtn]}
                  onPress={() => setStatus(report.id, 'reviewing')}
                  disabled={isProcessing || report.status === 'reviewing'}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reviewingBtnText}>
                    {report.status === 'reviewing' ? '검토중' : '검토 시작'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(report)}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#D24134" size="small" />
                  ) : (
                    <Text style={styles.rejectBtnText}>반려</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(report)}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.approveBtnText}>승인</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
      </ScrollView>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { paddingHorizontal: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  placeName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  badgeNew: { backgroundColor: '#DBEAFE' },
  badgeCorrect: { backgroundColor: '#FEF3C7' },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  badgeNewText: { color: colors.blue },
  badgeCorrectText: { color: '#92400E' },
  infoLine: {
    flexDirection: 'row',
    marginBottom: 5,
    gap: 8,
  },
  infoLabel: { fontSize: 12, color: colors.textTertiary, width: 64 },
  infoValue: { flex: 1, fontSize: 12, color: colors.textPrimary },
  date: { fontSize: 11, color: colors.textTertiary, marginTop: 6, marginBottom: 10 },
  reasonInput: {
    height: 38,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  actions: { flexDirection: 'row', gap: 7 },
  reviewingBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewingBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  rejectBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,65,52,0.35)',
    backgroundColor: 'rgba(210,65,52,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: { fontSize: 12, color: '#D24134', fontWeight: '700' },
  approveBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
