import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../constants/theme';
import { submitReview, updateReview } from '../lib/reviewService';
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

const MAX_PHOTOS = 3;

export default function ReviewWriteScreen({ route, navigation }: Props) {
  const {
    toiletId,
    toiletName,
    toiletLat,
    toiletLng,
    reviewId,
    initialRating,
    initialCleanliness,
    initialPaper,
    initialSoap,
    initialSecurity,
    initialBidet,
    initialComment,
    initialImageUrls,
  } = route.params;
  const isEditing = !!reviewId;

  const [rating, setRating] = useState(initialRating ?? 0);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    floor: !!initialCleanliness,
    paper: !!initialPaper,
    soap: !!initialSoap,
    bidet: !!initialBidet,
    lock: !!initialSecurity,
  });
  const [memo, setMemo] = useState(initialComment ?? '');
  // 이미지: 기존 URL + 새로 추가한 로컬 URI 혼합
  const [images, setImages] = useState<string[]>(initialImageUrls ?? []);
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const toggle = (key: string) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요해요.\n설정에서 허용해 주세요.');
      return;
    }

    const remaining = MAX_PHOTOS - images.length;
    if (remaining <= 0) {
      Alert.alert('사진 제한', `최대 ${MAX_PHOTOS}장까지 첨부할 수 있어요.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.75,
      exif: false,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_PHOTOS));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (rating === 0) {
      Alert.alert('별점을 선택해 주세요', '화장실 점수를 먼저 골라주세요.');
      return;
    }

    setSubmitting(true);
    const reviewPayload = {
      rating,
      cleanliness: !!(selected.floor || selected.toilet || selected.smell || selected.sink),
      paper: !!selected.paper,
      soap: !!selected.soap,
      bidet: !!selected.bidet,
      security: !!(selected.lock || selected.light || selected.air || selected.safe),
      comment: memo.trim() || undefined,
      imageUris: images,
    };

    const result =
      isEditing && reviewId
        ? await updateReview(reviewId, reviewPayload)
        : await submitReview({
            toiletId,
            ...reviewPayload,
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
      isEditing
        ? '리뷰가 수정됐어요!'
        : result.isVerified
          ? '✅ 인증된 리뷰로 등록됐어요!'
          : '리뷰가 등록됐어요!',
      isEditing
        ? '리뷰가 수정됐습니다.'
        : result.isVerified
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

        {/* 별점 */}
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

        {/* 체크리스트 */}
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

        {/* 사진 첨부 */}
        <View style={styles.photoSection}>
          <View style={styles.photoRow}>
            {images.map((uri, index) => (
              <View key={uri + index} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => removeImage(index)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.photoAdd} onPress={pickImages} activeOpacity={0.8}>
                <Text style={styles.photoAddIcon}>📷</Text>
                <Text style={styles.photoAddText}>
                  {images.length === 0 ? '사진 추가' : `${images.length}/${MAX_PHOTOS}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {images.length > 0 && (
            <Text style={styles.photoCount}>{images.length}/{MAX_PHOTOS}장 · 탭해서 삭제</Text>
          )}
        </View>

        {/* 메모 */}
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
            <Text style={styles.submitText}>{isEditing ? '리뷰 수정하기' : '리뷰 등록하기'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const THUMB_SIZE = 76;

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
  // ─── 사진 첨부 ─────────────────────────────────────────────────────────
  photoSection: { marginTop: 16 },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  photoAdd: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  photoAddIcon: { fontSize: 20 },
  photoAddText: { fontSize: 10, color: colors.textTertiary, fontWeight: '500' },
  photoCount: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },
  // ─── 메모 ───────────────────────────────────────────────────────────────
  memoInput: {
    minHeight: 78,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 12,
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
