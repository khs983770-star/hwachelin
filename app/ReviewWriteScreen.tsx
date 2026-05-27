import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../constants/theme';
import {
  submitReview,
  updateReview,
  containsRealtimeBlocked,
  getDistanceMeters,
} from '../lib/reviewService';
import { signInWithKakao } from '../lib/authService';
import ScreenHeader from '../components/ScreenHeader';
import { showToast } from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewWrite'>;

// ─── 청결 카드 ─────────────────────────────────────────────────────────────
const CLEANLINESS_CARDS: {
  key: 'clean' | 'normal' | 'dirty';
  label: string;
  emoji: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}[] = [
  { key: 'clean',  label: '깨끗해요',  emoji: '✨', activeBg: '#E8F5ED', activeBorder: '#059669', activeText: '#1E7E34' },
  { key: 'normal', label: '보통이에요', emoji: '😐', activeBg: '#FEF3C7', activeBorder: '#F59E0B', activeText: '#92400E' },
  { key: 'dirty',  label: '지저분해요', emoji: '🤢', activeBg: '#FEF0F0', activeBorder: '#E51B3E', activeText: '#C0392B' },
];

// ─── 시설 6개 (윤서판 기획서: 5개 + 비밀번호 유무) ─────────────────────────
type FacilityKey = 'paper' | 'soap' | 'handDryer' | 'bidet' | 'handTissue' | 'hasPassword';
const FACILITY_ITEMS: { key: FacilityKey; label: string }[] = [
  { key: 'paper',       label: '휴지' },
  { key: 'soap',        label: '비누' },
  { key: 'handDryer',   label: '핸드드라이어' },
  { key: 'bidet',       label: '비데' },
  { key: 'handTissue',  label: '핸드티슈' },
  { key: 'hasPassword', label: '비밀번호 유무' },
];

// ─── 분위기 태그 6개 ───────────────────────────────────────────────────────
const MOOD_TAGS: { key: string; label: string }[] = [
  { key: 'noSmell',         label: '냄새 없어요' },
  { key: 'brightLight',     label: '조명 밝아요' },
  { key: 'goodVentilation', label: '환기 잘 돼요' },
  { key: 'sturdyPartition', label: '칸막이 튼튼해요' },
  { key: 'crowded',         label: '사람 많아요' },
  { key: 'waitingLine',     label: '대기줄 있어요' },
];

// ─── 점수별 라벨 ───────────────────────────────────────────────────────────
function scoreLabel(rating: number | null): string {
  if (rating == null || rating === 0) return '';
  if (rating <= 1.0) return '많이 아쉬워요';
  if (rating <= 2.0) return '별로예요';
  if (rating <= 3.0) return '그냥 그래요';
  if (rating <= 4.0) return '꽤 깨끗해요';
  return '완전 추천해요';
}

const MAX_PHOTOS = 5;
const STAR_SIZE = 44;

export default function ReviewWriteScreen({ route, navigation }: Props) {
  const {
    toiletId,
    toiletName,
    toiletLat,
    toiletLng,
    reviewId,
    initialRating,
    initialCleanlinessLevel,
    initialPaper,
    initialSoap,
    initialHandDryer,
    initialHandTissue,
    initialBidet,
    initialHasPassword,
    initialMoodTags,
    initialImageUrls,
    initialComment,
  } = route.params;
  const isEditing = !!reviewId;
  const scrollRef = useRef<ScrollView>(null);

  // ─── 단계 ───────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showErrors, setShowErrors] = useState(false);

  // ─── 1단계 상태 ─────────────────────────────────────────────────────────
  const [rating, setRating] = useState<number | null>(
    initialRating && initialRating > 0 ? initialRating : null
  );
  const [cleanlinessLevel, setCleanlinessLevel] = useState<'clean' | 'normal' | 'dirty' | null>(
    initialCleanlinessLevel ?? null
  );
  const [facility, setFacility] = useState<Record<FacilityKey, boolean | null>>({
    paper:       initialPaper       ?? null,
    soap:        initialSoap        ?? null,
    handDryer:   initialHandDryer   ?? null,
    bidet:       initialBidet       ?? null,
    handTissue:  initialHandTissue  ?? null,
    hasPassword: initialHasPassword ?? null,
  });

  // ─── 2단계 상태 ─────────────────────────────────────────────────────────
  const [moodTags, setMoodTags] = useState<string[]>(initialMoodTags ?? []);
  const [memo, setMemo] = useState(initialComment ?? '');
  const [memoLastValid, setMemoLastValid] = useState(initialComment ?? '');
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialImageUrls ?? []);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [isLocationVerified, setIsLocationVerified] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── 1단계 유효성 ───────────────────────────────────────────────────────
  const errors = {
    rating: rating == null,
    cleanliness: cleanlinessLevel == null,
    facility: Object.values(facility).some((v) => v == null),
  };
  const step1Valid = !errors.rating && !errors.cleanliness && !errors.facility;

  // ─── 별점 탭 (0.5 단위) ─────────────────────────────────────────────────
  const tapStar = (value: number, half: boolean) => {
    const newRating = half ? value - 0.5 : value;
    setRating(newRating);
  };

  // ─── 별점 −/+ 버튼 ─────────────────────────────────────────────────────
  const decrementRating = () => {
    if (rating == null) return;
    const next = Math.max(0.5, rating - 0.5);
    setRating(next);
  };
  const incrementRating = () => {
    const current = rating ?? 0;
    const next = Math.min(5.0, current + 0.5);
    setRating(next);
  };
  const canDecrement = rating != null && rating > 0.5;
  const canIncrement = (rating ?? 0) < 5.0;

  // ─── 시설 토글 ──────────────────────────────────────────────────────────
  const toggleFacility = (key: FacilityKey, value: boolean) => {
    setFacility((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  // ─── 분위기 태그 토글 ───────────────────────────────────────────────────
  const toggleMoodTag = (key: string) => {
    setMoodTags((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ─── 한마디 실시간 비밀번호 차단 ────────────────────────────────────────
  const handleMemoChange = (text: string) => {
    if (containsRealtimeBlocked(text)) {
      // 차단된 입력 → 이전 값으로 롤백 + 토스트 안내
      setMemo(memoLastValid);
      showToast('비밀번호로 의심되는 문구는 입력할 수 없어요');
      return;
    }
    setMemo(text);
    setMemoLastValid(text);
  };

  // ─── 사진 첨부 ──────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const totalCount = existingImageUrls.length + photoUris.length;
    if (totalCount >= MAX_PHOTOS) {
      Alert.alert('사진은 최대 5장까지 첨부할 수 있어요');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '사진 권한이 필요해요',
        '설정에서 사진 접근 권한을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - totalCount,
      quality: 0.8, // picker 단계 JPEG 압축 (1280px 리사이즈는 dev client 재빌드 후 추가)
    });
    if (result.canceled || !result.assets?.length) return;
    const newUris = result.assets.map((a) => a.uri);
    setPhotoUris((prev) => [...prev, ...newUris].slice(0, MAX_PHOTOS - existingImageUrls.length));
  };

  const removeExistingImage = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const removeNewPhoto = (uri: string) => {
    setPhotoUris((prev) => prev.filter((u) => u !== uri));
  };

  // ─── 2단계 진입 시 GPS 인증 1회 ─────────────────────────────────────────
  useEffect(() => {
    if (currentStep !== 2 || isEditing || toiletLat == null || toiletLng == null) return;
    if (isLocationVerified !== null) return; // 이미 계산됨
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLocationVerified(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, toiletLat, toiletLng);
        setIsLocationVerified(dist <= 50);
      } catch {
        setIsLocationVerified(false);
      }
    })();
  }, [currentStep, isEditing, toiletLat, toiletLng, isLocationVerified]);

  // ─── [다음 단계로] ──────────────────────────────────────────────────────
  const goToStep2 = () => {
    if (!step1Valid) {
      setShowErrors(true);
      // 첫 번째 에러 항목으로 스크롤
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
      return;
    }
    setShowErrors(false);
    setCurrentStep(2);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // ─── [이전] ─────────────────────────────────────────────────────────────
  const goToStep1 = () => {
    setCurrentStep(1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // ─── 제출 ───────────────────────────────────────────────────────────────
  const submit = async () => {
    if (rating == null || cleanlinessLevel == null) return;
    setSubmitting(true);
    const payload = {
      rating,
      cleanlinessLevel,
      paper:       facility.paper,
      soap:        facility.soap,
      handDryer:   facility.handDryer,
      bidet:       facility.bidet,
      handTissue:  facility.handTissue,
      hasPassword: facility.hasPassword,
      moodTags,
      photoUris,
      existingImageUrls,
      comment: memo.trim() || undefined,
    };
    const result =
      isEditing && reviewId
        ? await updateReview(reviewId, payload)
        : await submitReview({ toiletId, ...payload, toiletLat, toiletLng });
    setSubmitting(false);

    if (!result.ok) {
      if (result.reason === 'NOT_LOGGED_IN') {
        Alert.alert('로그인이 필요해요', '리뷰를 작성하려면 카카오 로그인이 필요해요.', [
          { text: '나중에', style: 'cancel' },
          {
            text: '로그인하기',
            onPress: async () => {
              const r = await signInWithKakao();
              if (!r.ok) Alert.alert('로그인 실패', r.message);
              else submit();
            },
          },
        ]);
      } else if (result.reason === 'SENSITIVE_TEXT') {
        Alert.alert('작성 불가', result.message, [{ text: '수정할게요' }]);
      } else {
        Alert.alert('저장 실패', result.message, [{ text: '확인' }]);
      }
      return;
    }
    // 사진 일부 또는 전체 업로드 실패 시 토스트로 안내
    if (result.ok && result.photoFailedCount && result.photoFailedCount > 0) {
      showToast(`사진 ${result.photoFailedCount}장 업로드에 실패했어요`);
    }

    Alert.alert(
      isEditing ? '리뷰가 수정됐어요!' : result.isVerified ? '✅ 인증된 리뷰로 등록됐어요!' : '리뷰가 등록됐어요!',
      isEditing ? '리뷰가 수정됐습니다.' : result.isVerified ? '현재 위치가 화장실 50m 이내로 확인됐어요.' : '리뷰가 저장됐습니다.',
      [{ text: '확인', onPress: () => navigation.goBack() }]
    );
  };

  // ─── 별 부분 채움 렌더 ──────────────────────────────────────────────────
  const renderStar = (value: number) => {
    const r = rating ?? 0;
    const fillRatio = Math.max(0, Math.min(1, r - (value - 1))); // 0 ~ 1
    return (
      <View key={value} style={styles.starWrap}>
        <Text style={[styles.star, styles.starBase]}>★</Text>
        {fillRatio > 0 && (
          <View style={[styles.starFillClip, { width: STAR_SIZE * fillRatio }]}>
            <Text style={[styles.star, styles.starFill]}>★</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.starHalfTap, { left: 0 }]}
          onPress={() => tapStar(value, true)}
          activeOpacity={0.6}
        />
        <TouchableOpacity
          style={[styles.starHalfTap, { right: 0 }]}
          onPress={() => tapStar(value, false)}
          activeOpacity={0.6}
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title={toiletName ? `${toiletName}` : '리뷰 작성'}
        subtitle={isEditing ? '리뷰 수정' : '화슐랭 평가 등록'}
        onBack={() => navigation.goBack()}
      />

      {/* ─── 스텝 인디케이터 ─── */}
      {/* 윤서판 사양: 현재=초록 채운 원+굵은 텍스트 / 완료=초록 채운 원+체크 / 미완료=테두리 원+회색 텍스트 */}
      <View style={styles.stepRow}>
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep === 1 ? styles.stepCircleCurrent : styles.stepCircleDone,
            ]}
          >
            {currentStep === 2 ? (
              <Text style={styles.stepCheck}>✓</Text>
            ) : (
              <Text style={styles.stepNumber}>1</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              currentStep === 1 ? styles.stepLabelCurrent : styles.stepLabelDone,
            ]}
          >
            필수 정보
          </Text>
        </View>
        <View
          style={[
            styles.stepLine,
            currentStep === 2 ? styles.stepLineActive : styles.stepLineInactive,
          ]}
        />
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep === 2 ? styles.stepCircleCurrent : styles.stepCirclePending,
            ]}
          >
            <Text
              style={currentStep === 2 ? styles.stepNumber : styles.stepNumberPending}
            >
              2
            </Text>
          </View>
          <Text
            style={[
              styles.stepLabel,
              currentStep === 2 ? styles.stepLabelCurrent : styles.stepLabelPending,
            ]}
          >
            추가 정보
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {currentStep === 1 ? (
          <>
            {/* ─── 1-1. 별점 ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>별점</Text>
              <View style={styles.starRow}>
                <TouchableOpacity
                  style={[styles.stepBtn, !canDecrement && styles.stepBtnDisabled]}
                  onPress={decrementRating}
                  activeOpacity={0.7}
                  disabled={!canDecrement}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
                >
                  <Text style={[styles.stepBtnText, !canDecrement && styles.stepBtnTextDisabled]}>−</Text>
                </TouchableOpacity>

                <View style={styles.starsInner}>{[1, 2, 3, 4, 5].map(renderStar)}</View>

                <TouchableOpacity
                  style={[styles.stepBtn, !canIncrement && styles.stepBtnDisabled]}
                  onPress={incrementRating}
                  activeOpacity={0.7}
                  disabled={!canIncrement}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                >
                  <Text style={[styles.stepBtnText, !canIncrement && styles.stepBtnTextDisabled]}>＋</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.scoreText}>
                {rating != null ? rating.toFixed(1) : '점수를 선택해 주세요'}
              </Text>
              {rating != null && <Text style={styles.scoreLabel}>{scoreLabel(rating)}</Text>}
              {showErrors && errors.rating && (
                <Text style={styles.errorText}>별점을 선택해 주세요</Text>
              )}
            </View>

            {/* ─── 1-2. 청결 상태 ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>청결 상태</Text>
              <View style={styles.cardRow}>
                {CLEANLINESS_CARDS.map((c) => {
                  const active = cleanlinessLevel === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.cleanCard,
                        active && {
                          backgroundColor: c.activeBg,
                          borderColor: c.activeBorder,
                        },
                      ]}
                      onPress={() => setCleanlinessLevel(active ? null : c.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cleanEmoji}>{c.emoji}</Text>
                      <Text
                        style={[
                          styles.cleanLabel,
                          active && { color: c.activeText, fontWeight: '700' },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {showErrors && errors.cleanliness && (
                <Text style={styles.errorText}>청결 상태를 선택해 주세요</Text>
              )}
            </View>

            {/* ─── 1-3. 시설 상태 ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>시설 상태</Text>
              <View style={styles.facilityGrid}>
                {FACILITY_ITEMS.map((item) => {
                  const val = facility[item.key];
                  const missing = showErrors && val == null;
                  return (
                    <View
                      key={item.key}
                      style={[styles.facilityItem, missing && styles.facilityItemError]}
                    >
                      <Text style={styles.facilityLabel}>{item.label}</Text>
                      <View style={styles.yesNoRow}>
                        <TouchableOpacity
                          style={[styles.yesNoBtn, val === true && styles.yesBtnOn]}
                          onPress={() => toggleFacility(item.key, true)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.yesNoText, val === true && styles.yesTextOn]}>
                            있어요
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.yesNoBtn, val === false && styles.noBtnOn]}
                          onPress={() => toggleFacility(item.key, false)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.yesNoText, val === false && styles.noTextOn]}>
                            없어요
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
              {showErrors && errors.facility && (
                <Text style={styles.errorText}>시설 항목을 모두 선택해 주세요</Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* ─── 2-1. 분위기 태그 ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>분위기 태그 (선택)</Text>
              <View style={styles.chipRow}>
                {MOOD_TAGS.map((t) => {
                  const active = moodTags.includes(t.key);
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.chip, active && styles.chipOn]}
                      onPress={() => toggleMoodTag(t.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextOn]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ─── 2-2. 한마디 ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>한마디 (선택)</Text>
              <TextInput
                value={memo}
                onChangeText={handleMemoChange}
                placeholder="특이사항을 남겨주세요 (비밀번호·번호는 입력할 수 없어요)"
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={300}
                style={styles.memoInput}
                textAlignVertical="top"
              />
              <Text style={styles.memoCount}>{memo.length}/300</Text>
            </View>

            {/* ─── 2-3. 사진 첨부 ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>사진 (선택, 최대 5장)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {existingImageUrls.map((url) => (
                  <View key={url} style={styles.photoItem}>
                    <Image source={{ uri: url }} style={styles.photoImg} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => removeExistingImage(url)}
                    >
                      <Text style={styles.photoRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {photoUris.map((uri) => (
                  <View key={uri} style={styles.photoItem}>
                    <Image source={{ uri }} style={styles.photoImg} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeNewPhoto(uri)}>
                      <Text style={styles.photoRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {existingImageUrls.length + photoUris.length < MAX_PHOTOS && (
                  <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto} activeOpacity={0.7}>
                    <Text style={styles.photoAddIcon}>＋</Text>
                    <Text style={styles.photoAddText}>
                      {existingImageUrls.length + photoUris.length}/{MAX_PHOTOS}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* ─── 2-4. GPS 인증 배너 ─── */}
            {!isEditing && isLocationVerified === true && (
              <View style={styles.gpsBanner}>
                <Text style={styles.gpsBannerIcon}>📍</Text>
                <Text style={styles.gpsBannerText}>
                  현재 위치 인증됨 — 현장 인증 뱃지가 붙어요
                </Text>
              </View>
            )}
            {!isEditing && isLocationVerified === false && (
              <View style={[styles.gpsBanner, styles.gpsBannerDim]}>
                <Text style={styles.gpsBannerIcon}>ℹ️</Text>
                <Text style={[styles.gpsBannerText, styles.gpsBannerTextDim]}>
                  현재 위치가 화장실 50m 밖이에요. 비인증 리뷰로 저장돼요.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── 하단 버튼 ─── */}
      <View style={styles.submitRow}>
        {currentStep === 1 ? (
          <TouchableOpacity
            style={[styles.submitButton, !step1Valid && styles.submitButtonDisabled]}
            onPress={goToStep2}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>다음 단계로</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.bottomBtnRow}>
            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={goToStep1}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <Text style={styles.secondaryText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, styles.submitButtonFlex, submitting && styles.submitButtonDisabled]}
              onPress={submit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{isEditing ? '수정 완료' : '리뷰 등록하기'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },

  // ─── 스텝 인디케이터 (윤서판) ────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    backgroundColor: colors.backgroundPrimary,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCurrent: {
    backgroundColor: '#059669',
  },
  stepCircleDone: {
    backgroundColor: '#059669',
  },
  stepCirclePending: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1.5,
    borderColor: colors.borderSecondary,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 16,
    includeFontPadding: false,
  } as any,
  stepNumberPending: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
    lineHeight: 16,
    includeFontPadding: false,
  } as any,
  stepCheck: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 16,
    includeFontPadding: false,
  } as any,
  stepLabel: { fontSize: 13 },
  stepLabelCurrent: { color: colors.textPrimary, fontWeight: '800' },
  stepLabelDone: { color: '#059669', fontWeight: '700' },
  stepLabelPending: { color: colors.textTertiary, fontWeight: '600' },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 12,
    borderRadius: 1,
  },
  stepLineActive: { backgroundColor: '#059669' },
  stepLineInactive: { backgroundColor: colors.borderSecondary },

  // ─── 섹션 공통 ───────────────────────────────────────────────────────────
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },

  // ─── 별점 ───────────────────────────────────────────────────────────────
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  starsInner: { flexDirection: 'row', gap: 4 },
  starWrap: {
    width: STAR_SIZE,
    height: STAR_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { fontSize: STAR_SIZE, lineHeight: STAR_SIZE + 4, includeFontPadding: false } as any,
  starBase: { color: '#E5E0DA' },
  starFill: { color: '#F59E0B' },
  starFillClip: {
    position: 'absolute',
    left: 0, top: 0,
    height: STAR_SIZE + 4,
    overflow: 'hidden',
  },
  starHalfTap: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: STAR_SIZE / 2,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderTertiary,
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
    includeFontPadding: false,
  } as any,
  stepBtnTextDisabled: { color: colors.textTertiary },
  scoreText: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: colors.orange,
    marginTop: 10,
  },
  scoreLabel: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 3,
    fontWeight: '700',
  },

  // ─── 청결 카드 ───────────────────────────────────────────────────────────
  cardRow: { flexDirection: 'row', gap: 8 },
  cleanCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    gap: 6,
  },
  cleanEmoji: { fontSize: 28 },
  cleanLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  // ─── 시설 ────────────────────────────────────────────────────────────────
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityItem: {
    width: '48.5%',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
  },
  facilityItemError: { borderColor: colors.orange, backgroundColor: '#FFF5F6' },
  facilityLabel: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 7,
  },
  yesNoRow: { flexDirection: 'row', gap: 5 },
  yesNoBtn: {
    flex: 1,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesBtnOn: { backgroundColor: '#E8F5ED', borderColor: '#059669' },
  noBtnOn:  { backgroundColor: '#FEF0F0', borderColor: '#E51B3E' },
  yesNoText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  yesTextOn: { color: '#1E7E34', fontWeight: '700' },
  noTextOn:  { color: '#C0392B', fontWeight: '700' },

  errorText: {
    fontSize: 12,
    color: colors.orange,
    marginTop: 8,
    fontWeight: '600',
  },

  // ─── 분위기 태그 칩 ──────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
  },
  chipOn: { backgroundColor: '#E8F5ED', borderColor: '#059669' },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: '#1E7E34', fontWeight: '700' },

  // ─── 메모 ────────────────────────────────────────────────────────────────
  memoInput: {
    minHeight: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  memoCount: { fontSize: 11, color: colors.textTertiary, textAlign: 'right', marginTop: 6 },

  // ─── 사진 ────────────────────────────────────────────────────────────────
  photoScroll: { flexDirection: 'row' },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 14, lineHeight: 16, fontWeight: '700' },
  photoAddBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderSecondary,
    borderStyle: 'dashed',
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  photoAddIcon: { fontSize: 24, color: colors.textSecondary, fontWeight: '300' },
  photoAddText: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },

  // ─── GPS 배너 ────────────────────────────────────────────────────────────
  gpsBanner: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E8F5ED',
    borderWidth: 1,
    borderColor: '#A7D7B5',
  },
  gpsBannerDim: { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSecondary },
  gpsBannerIcon: { fontSize: 16 },
  gpsBannerText: { flex: 1, fontSize: 12, color: '#1E7E34', fontWeight: '700' },
  gpsBannerTextDim: { color: colors.textSecondary, fontWeight: '600' },

  // ─── 하단 버튼 ───────────────────────────────────────────────────────────
  submitRow: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderTertiary,
    backgroundColor: colors.backgroundPrimary,
  },
  bottomBtnRow: { flexDirection: 'row', gap: 10 },
  submitButton: {
    borderRadius: 12,
    backgroundColor: colors.orange,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonFlex: { flex: 2 },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { fontSize: 14, color: '#fff', fontWeight: '800' },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  secondaryText: { fontSize: 14, color: colors.textPrimary, fontWeight: '700' },
});
