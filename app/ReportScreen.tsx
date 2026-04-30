import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../constants/theme';
import { submitReport } from '../lib/reportService';
import { signInWithKakao } from '../lib/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

const accessTypes = ['누구나', '손님만', '비밀번호'] as const;
const genderTypes = ['남녀분리', '공용', '남자', '여자', '정보 없음'] as const;

export default function ReportScreen({ route, navigation }: Props) {
  const params = route.params ?? {};
  const initialType = params.reportType ?? (params.toiletId ? 'correction' : 'new_toilet');
  const [reportType, setReportType] = useState<'new_toilet' | 'correction'>(initialType);
  const [placeName, setPlaceName] = useState(params.placeName ?? '');
  const [address, setAddress] = useState(params.address ?? '');
  const [floor, setFloor] = useState('');
  const [accessType, setAccessType] = useState<(typeof accessTypes)[number]>('누구나');
  const [genderType, setGenderType] = useState<(typeof genderTypes)[number]>('정보 없음');
  const [hasPassword, setHasPassword] = useState(false);
  const [operatingHours, setOperatingHours] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(
    () => (reportType === 'new_toilet' ? '새 화장실 제보' : '정보 수정 제보'),
    [reportType]
  );

  const submit = async () => {
    setSubmitting(true);
    const result = await submitReport({
      reportType,
      toiletId: params.toiletId,
      placeName,
      address,
      lat: params.lat,
      lng: params.lng,
      floor,
      accessType,
      genderType,
      hasPassword,
      operatingHours: operatingHours.trim() || undefined,
      comment,
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.reason === 'NOT_LOGGED_IN') {
        Alert.alert('로그인이 필요해요', '제보를 남기려면 카카오 로그인이 필요해요.', [
          { text: '나중에', style: 'cancel' },
          {
            text: '로그인하기',
            onPress: async () => {
              const loginResult = await signInWithKakao();
              if (!loginResult.ok) Alert.alert('로그인 실패', loginResult.message);
              else submit();
            },
          },
        ]);
        return;
      }

      Alert.alert('제보 실패', result.message);
      return;
    }

    Alert.alert('제보가 접수됐어요', '확인 후 데이터에 반영하겠습니다.', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentButton, reportType === 'new_toilet' && styles.segmentButtonOn]}
          onPress={() => setReportType('new_toilet')}
        >
          <Text style={[styles.segmentText, reportType === 'new_toilet' && styles.segmentTextOn]}>
            신규
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, reportType === 'correction' && styles.segmentButtonOn]}
          onPress={() => setReportType('correction')}
        >
          <Text style={[styles.segmentText, reportType === 'correction' && styles.segmentTextOn]}>
            수정
          </Text>
        </TouchableOpacity>
      </View>

      <Field label="장소명">
        <TextInput
          value={placeName}
          onChangeText={setPlaceName}
          placeholder="예: 서울시청 1층 화장실"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </Field>

      <Field label="주소">
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="주소나 위치 설명"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </Field>

      <Field label="층수">
        <TextInput
          value={floor}
          onChangeText={setFloor}
          placeholder="예: 1층, B1"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </Field>

      <Field label="이용 조건">
        <View style={styles.chipRow}>
          {accessTypes.map((type) => (
            <Chip key={type} label={type} selected={accessType === type} onPress={() => setAccessType(type)} />
          ))}
        </View>
      </Field>

      <Field label="성별 구분">
        <View style={styles.chipRow}>
          {genderTypes.map((type) => (
            <Chip key={type} label={type} selected={genderType === type} onPress={() => setGenderType(type)} />
          ))}
        </View>
      </Field>

      <TouchableOpacity
        style={[styles.toggleRow, hasPassword && styles.toggleRowOn]}
        onPress={() => setHasPassword((current) => !current)}
        activeOpacity={0.8}
      >
        <View style={[styles.toggleDot, hasPassword && styles.toggleDotOn]} />
        <Text style={[styles.toggleText, hasPassword && styles.toggleTextOn]}>
          비밀번호 또는 출입 제한이 있어요
        </Text>
      </TouchableOpacity>

      <Field label="운영시간">
        <TextInput
          value={operatingHours}
          onChangeText={setOperatingHours}
          placeholder="예: 09:00~22:00 / 주말 휴무 / 24시간"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </Field>

      <Field label="메모">
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="운영시간, 찾는 법, 고장 여부 등을 적어주세요. 비밀번호 숫자는 적지 마세요."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={300}
          textAlignVertical="top"
          style={[styles.input, styles.memo]}
        />
      </Field>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>제보 접수하기</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 16, paddingBottom: 36 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  segmentButton: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentButtonOn: { backgroundColor: colors.orange },
  segmentText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  segmentTextOn: { color: '#fff' },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7 },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  memo: { minHeight: 104, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    minHeight: 34,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: '#FFF0E9', borderColor: colors.orange },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: colors.orange },
  toggleRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleRowOn: { backgroundColor: '#FFF0E9', borderColor: colors.orange },
  toggleDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSecondary },
  toggleDotOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  toggleText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  toggleTextOn: { color: colors.orange },
  submitButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
