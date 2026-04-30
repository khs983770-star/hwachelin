import { useMemo, useState } from 'react';
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
import { submitReview } from '../lib/reviewService';
import { signInWithKakao } from '../lib/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewWrite'>;

type ChecklistItem = {
  key: string;
  label: string;
};

const checklistGroups: { title: string; items: ChecklistItem[] }[] = [
  {
    title: '청결',
    items: [
      { key: 'floor', label: '바닥 청결' },
      { key: 'toilet', label: '변기 청결' },
      { key: 'smell', label: '냄새 없음' },
      { key: 'sink', label: '세면대 청결' },
    ],
  },
  {
    title: '비치물품',
    items: [
      { key: 'paper', label: '휴지 있음' },
      { key: 'bidet', label: '비데 작동' },
      { key: 'soap', label: '비누 있음' },
      { key: 'dryer', label: '핸드드라이어' },
    ],
  },
  {
    title: '시설/보안',
    items: [
      { key: 'lock', label: '도어락 정상' },
      { key: 'light', label: '조명 양호' },
      { key: 'air', label: '환기 양호' },
      { key: 'safe', label: '안심 가능' },
    ],
  },
];

export default function ReviewWriteScreen({ route, navigation }: Props) {
  const { toiletId, toiletName, toiletLat, toiletLng } = route.params;
  const [rating, setRating] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const toggle = (key: string) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const submit = async () => {
    if (rating === 0) {
      Alert.alert('별점을 선택해 주세요', '화장실 점수를 먼저 골라주세요.');
      return;
    }

    setSubmitting(true);
    const result = await submitReview({
      toiletId,
      rating,
      // 청결 그룹(바닥·변기·냄새·세면대) 중 하나라도 체크하면 true
      cleanliness: !!(selected.floor || selected.toilet || selected.smell || selected.sink),
      // 비치물품 중 핵심 항목
      paper: !!selected.paper,
      soap: !!selected.soap,
      // 시설/보안 그룹 중 하나라도 체크하면 true
      security: !!(selected.lock || selected.light || selected.air || selected.safe),
      comment: memo.trim() || undefined,
      toiletLat,
      toiletLng,
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.reason === 'NOT_LOGGED_IN') {
        Alert.alert(
          '로그인이 필요해요',
          '리뷰를 작성하려면 카카오 로그인이 필요해요.',
          [
            { text: '나중에', style: 'cancel' },
            {
              text: '로그인하기',
              onPress: async () => {
                const loginResult = await signInWithKakao();
                if (!loginResult.ok) Alert.alert('로그인 실패', loginResult.message);
                else submit();
              },
            },
          ]
        );
      } else if (result.reason === 'SENSITIVE_TEXT') {
        Alert.alert('작성 불가', result.message, [{ text: '수정할게요' }]);
      } else {
        Alert.alert('저장 실패', result.message, [{ text: '확인' }]);
      }
      return;
    }

    Alert.alert(
      result.isVerified ? '✅ 인증된 리뷰로 등록됐어요!' : '리뷰가 등록됐어요!',
      result.isVerified
        ? '현재 위치가 화장실 50m 이내로 확인됐어요.'
        : '리뷰가 저장됐습니다.',
      [{ text: '확인', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>상세로</Text>
        </TouchableOpacity>

        <Text style={styles.placeName} numberOfLines={1}>
          {toiletName ?? '화장실'}
        </Text>

        <View style={styles.ratingBox}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)} activeOpacity={0.75}>
                <Text style={[styles.star, value <= rating && styles.starOn]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.score}>{rating > 0 ? rating.toFixed(1) : '-.-'}</Text>
          <Text style={styles.hint}>별을 눌러 점수를 선택하세요</Text>
        </View>

        {checklistGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.checkGrid}>
              {group.items.map((item) => {
                const isSelected = selected[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.checkItem, isSelected && styles.checkItemOn]}
                    onPress={() => toggle(item.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.dot, isSelected && styles.dotOn]} />
                    <Text style={[styles.checkText, isSelected && styles.checkTextOn]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.photoButton} activeOpacity={0.8}>
          <Text style={styles.photoText}>📷 사진 첨부 (선택)</Text>
        </TouchableOpacity>

        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="특이사항을 남겨주세요 (최대 300자)"
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={300}
          style={styles.memoInput}
          textAlignVertical="top"
        />
        <Text style={styles.memoCount}>{memo.length}/300 · 체크 {selectedCount}개</Text>
      </ScrollView>

      <View style={styles.submitRow}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={submit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>리뷰 등록하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backArrow: { fontSize: 24, color: colors.textSecondary, lineHeight: 26 },
  backText: { fontSize: 13, color: colors.textSecondary },
  placeName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  ratingBox: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    marginBottom: 10,
  },
  starRow: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginBottom: 4 },
  star: { fontSize: 30, color: '#D1D5DB', lineHeight: 34 },
  starOn: { color: colors.amber },
  score: { textAlign: 'center', fontSize: 22, fontWeight: '700', color: colors.orange },
  hint: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  group: { marginTop: 12 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  checkItem: {
    width: '48.9%',
    minHeight: 38,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkItemOn: {
    backgroundColor: '#FFF0E9',
    borderColor: colors.orange,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary },
  dotOn: { backgroundColor: colors.orange },
  checkText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  checkTextOn: { color: colors.orangeDark },
  photoButton: {
    height: 46,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  photoText: { fontSize: 13, color: colors.textTertiary, fontWeight: '500' },
  memoInput: {
    minHeight: 78,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  memoCount: { fontSize: 11, color: colors.textTertiary, textAlign: 'right', marginTop: 6 },
  submitRow: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderTertiary,
    backgroundColor: colors.backgroundPrimary,
  },
  submitButton: {
    borderRadius: 11,
    backgroundColor: colors.orange,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
