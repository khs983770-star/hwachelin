import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import PhotoReviewModal from '../components/PhotoReviewModal';
import BottomSheetMenu from '../components/BottomSheetMenu';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getToiletDetail } from '../lib/toiletService';
import { deleteReview } from '../lib/reviewService';
import { checkIsBookmarked, toggleBookmark } from '../lib/bookmarkService';
import { requireLogin } from '../lib/authService';
import { showToast } from '../components/Toast';
import { toggleHelpful, getMyHelpfulReviewIds } from '../lib/helpfulService';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';
import { Review } from '../types/toilet';
import { colors } from '../constants/theme';
import HwachelinStars from '../components/HwachelinStars';

type Props = NativeStackScreenProps<RootStackParamList, 'ToiletDetail'>;

type ToiletDetail = NonNullable<Awaited<ReturnType<typeof getToiletDetail>>>;

// 상단 사진 갤러리: 4열 × 2줄 정확한 픽셀 계산
const SCREEN_W = Dimensions.get('window').width;
const TOP_GALLERY_CONTENT_PADDING = 16;
const TOP_GALLERY_GAP = 4;
const TOP_GALLERY_COLS = 4;
const TOP_GALLERY_CELL_SIZE = Math.floor(
  (SCREEN_W - TOP_GALLERY_CONTENT_PADDING * 2 - TOP_GALLERY_GAP * (TOP_GALLERY_COLS - 1)) /
    TOP_GALLERY_COLS
);

export default function ToiletDetailScreen({ route, navigation }: Props) {
  const { toiletId } = route.params;
  const [detail, setDetail] = useState<ToiletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  // 통합 갤러리 모달 상태 — reviewId + 시작 사진 index
  const [galleryView, setGalleryView] = useState<{ reviewId: string; imageIndex: number } | null>(
    null
  );
  // 도움됐어요(엄지) — 카운트는 optimistic 갱신, my는 누른 리뷰 id Set
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [myHelpfulIds, setMyHelpfulIds] = useState<Set<string>>(new Set());
  const [helpfulBusy, setHelpfulBusy] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const reviewSectionY = useRef<number>(0);
  const shouldScrollToReviews = useRef(false);
  type ReviewSortKey = 'latest' | 'oldest' | 'rating-high' | 'rating-low' | 'popular';
  const REVIEW_SORT_OPTIONS: { key: ReviewSortKey; label: string }[] = [
    { key: 'latest',      label: '최신순' },
    { key: 'oldest',      label: '오래된순' },
    { key: 'rating-high', label: '별점높은순' },
    { key: 'rating-low',  label: '별점낮은순' },
    { key: 'popular',     label: '도움된순' },
  ];
  const [reviewSort, setReviewSort] = useState<ReviewSortKey>('latest');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const sortLabel =
    REVIEW_SORT_OPTIONS.find((o) => o.key === reviewSort)?.label ?? '최신순';

  const myReview = useMemo(
    () => (currentUserId ? (detail?.reviews as Review[] | undefined)?.find((r) => r.user_id === currentUserId) : undefined),
    [currentUserId, detail]
  );

  const reviews = useMemo(() => {
    if (!detail) return [];
    const base = [...(detail.reviews as Review[])];
    const tieByLatest = (a: Review, b: Review) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (reviewSort === 'oldest') {
      return base.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (reviewSort === 'rating-high') {
      return base.sort((a, b) => {
        const diff = Number(b.rating) - Number(a.rating);
        return diff !== 0 ? diff : tieByLatest(a, b);
      });
    }
    if (reviewSort === 'rating-low') {
      return base.sort((a, b) => {
        const diff = Number(a.rating) - Number(b.rating);
        return diff !== 0 ? diff : tieByLatest(a, b);
      });
    }
    if (reviewSort === 'popular') {
      return base.sort((a, b) => {
        const diff = (helpfulCounts[b.id] ?? 0) - (helpfulCounts[a.id] ?? 0);
        return diff !== 0 ? diff : tieByLatest(a, b);
      });
    }
    return base.sort(tieByLatest);
  }, [detail, reviewSort, helpfulCounts]);

  const openSortMenu = () => setSortSheetOpen(true);

  const doToggleBookmark = async () => {
    const result = await toggleBookmark(toiletId);
    if (!result.ok) {
      Alert.alert('저장 실패', result.message ?? '잠시 후 다시 시도해 주세요.');
      return;
    }
    setIsBookmarked(result.isBookmarked);
    showToast(
      result.isBookmarked ? '즐겨찾기에 저장되었어요.' : '즐겨찾기에서 해제되었어요.'
    );
  };

  const handleToggleBookmark = () => {
    requireLogin({
      message: '즐겨찾기를 저장하려면 3초 로그인이 필요해요!',
      onAuthed: doToggleBookmark,
    });
  };

  const handleToggleHelpful = (reviewId: string) => {
    if (helpfulBusy.has(reviewId)) return;
    requireLogin({
      message: '리뷰에 도움됐어요를 누르려면 3초 로그인이 필요해요!',
      onAuthed: async () => {
        // optimistic UI
        const wasHelpful = myHelpfulIds.has(reviewId);
        setHelpfulBusy((s) => new Set(s).add(reviewId));
        setMyHelpfulIds((s) => {
          const next = new Set(s);
          if (wasHelpful) next.delete(reviewId);
          else next.add(reviewId);
          return next;
        });
        setHelpfulCounts((c) => ({
          ...c,
          [reviewId]: Math.max(0, (c[reviewId] ?? 0) + (wasHelpful ? -1 : 1)),
        }));

        const result = await toggleHelpful(reviewId);
        setHelpfulBusy((s) => {
          const next = new Set(s);
          next.delete(reviewId);
          return next;
        });

        if (!result.ok) {
          // 롤백
          setMyHelpfulIds((s) => {
            const next = new Set(s);
            if (wasHelpful) next.add(reviewId);
            else next.delete(reviewId);
            return next;
          });
          setHelpfulCounts((c) => ({
            ...c,
            [reviewId]: Math.max(0, (c[reviewId] ?? 0) + (wasHelpful ? 1 : -1)),
          }));
          if (result.reason === 'SELF_REVIEW') {
            showToast('본인 리뷰에는 누를 수 없어요');
          } else {
            showToast('잠시 후 다시 시도해 주세요');
          }
          return;
        }
        showToast(result.isHelpful ? '도움됐어요를 남겼어요 👍' : '도움됐어요를 취소했어요');
      },
    });
  };

  const loadDetail = useCallback(async () => {
    const data = await getToiletDetail(toiletId);
    setDetail(data);
    if (data?.reviews?.length) {
      const counts: Record<string, number> = {};
      const ids: string[] = [];
      for (const r of data.reviews as Review[]) {
        counts[r.id] = (r as any).helpful_count ?? 0;
        ids.push(r.id);
      }
      setHelpfulCounts(counts);
      const mine = await getMyHelpfulReviewIds(ids);
      setMyHelpfulIds(mine);
    }
  }, [toiletId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        setLoading(true);
        const [{ data: sessionData }, data, bookmarked] = await Promise.all([
          supabase.auth.getSession(),
          getToiletDetail(toiletId),
          checkIsBookmarked(toiletId),
        ]);
        if (!active) return;
        setCurrentUserId(sessionData.session?.user.id ?? null);
        setDetail(data);
        setIsBookmarked(bookmarked);
        // helpful 카운트/내 상태 초기화
        if (data?.reviews?.length) {
          const counts: Record<string, number> = {};
          const ids: string[] = [];
          for (const r of data.reviews as Review[]) {
            counts[r.id] = (r as any).helpful_count ?? 0;
            ids.push(r.id);
          }
          setHelpfulCounts(counts);
          const mine = await getMyHelpfulReviewIds(ids);
          if (active) setMyHelpfulIds(mine);
        } else {
          setHelpfulCounts({});
          setMyHelpfulIds(new Set());
        }
        setLoading(false);
        if (active && shouldScrollToReviews.current) {
          shouldScrollToReviews.current = false;
          setTimeout(() => {
            scrollRef.current?.scrollTo({ y: reviewSectionY.current, animated: true });
          }, 150);
        }
      })();

      return () => {
        active = false;
      };
    }, [toiletId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDetail();
    setRefreshing(false);
  };

  const confirmDeleteReview = (reviewId: string) => {
    Alert.alert('리뷰를 삭제할까요?', '삭제한 리뷰는 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteReview(reviewId);
          if (!result.ok) {
            Alert.alert('삭제 실패', result.message);
            return;
          }
          await loadDetail();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={styles.loadingText}>상세 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>화장실 정보를 찾을 수 없어요</Text>
        <Text style={styles.emptyText}>잠시 후 다시 시도해 주세요.</Text>
      </View>
    );
  }

  const place = Array.isArray(detail.places) ? detail.places[0] : detail.places;
  const ratingText = detail.avg_rating != null ? detail.avg_rating.toFixed(1) : '-';
  const reviewCount = detail.review_count ?? 0;

  // ─── 갤러리: 모든 리뷰 사진을 평탄화 + reviewId/index 매핑 ─────────────
  type PhotoEntry = { url: string; reviewId: string; imageIndex: number };
  const allPhotos: PhotoEntry[] = reviews.flatMap((r) =>
    (r.image_urls ?? []).map((url, i) => ({ url, reviewId: r.id, imageIndex: i }))
  );
  const TOP_GALLERY_LIMIT = 8;
  const visiblePhotos = allPhotos.slice(0, TOP_GALLERY_LIMIT);
  const extraPhotoCount = Math.max(0, allPhotos.length - TOP_GALLERY_LIMIT);

  const openGallery = (reviewId: string, imageIndex: number) => {
    setGalleryView({ reviewId, imageIndex });
  };
  const closeGallery = () => setGalleryView(null);
  const galleryReview = galleryView
    ? reviews.find((r) => r.id === galleryView.reviewId) ?? null
    : null;

  const CLEANLINESS_LABEL: Record<string, string> = {
    clean: '✨ 깨끗해요',
    normal: '😐 보통이에요',
    dirty: '🗑 지저분해요',
  };
  const MOOD_TAG_LABELS: Record<string, string> = {
    noSmell:          '냄새 없어요',
    brightLight:      '조명 밝아요',
    goodVentilation:  '환기 잘 돼요',
    sturdyPartition:  '칸막이 튼튼해요',
    crowded:          '사람 많아요',
    waitingLine:      '대기줄 있어요',
  };
  const SUPPLY_CHIPS: { key: string; trueLabel: string; falseLabel: string }[] = [
    { key: 'paper',        trueLabel: '🧻 휴지 있음',          falseLabel: '🧻 휴지 없음' },
    { key: 'soap',         trueLabel: '🧴 비누 있음',          falseLabel: '🧴 비누 없음' },
    { key: 'hand_dryer',   trueLabel: '💨 핸드드라이어 있음',  falseLabel: '💨 핸드드라이어 없음' },
    { key: 'bidet',        trueLabel: '🚽 비데 있음',          falseLabel: '🚽 비데 없음' },
    { key: 'hand_tissue',  trueLabel: '🤲 핸드티슈 있음',      falseLabel: '🤲 핸드티슈 없음' },
    { key: 'has_password', trueLabel: '🔒 비밀번호 있음',      falseLabel: '🔓 비밀번호 없음' },
  ];
  const bookmarkButton = (
    <TouchableOpacity onPress={handleToggleBookmark} activeOpacity={0.7} hitSlop={8}>
      <Text style={styles.heartIcon}>{isBookmarked ? '♥' : '♡'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="화장실 상세"
        onBack={() => navigation.goBack()}
        headerRight={bookmarkButton}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />
        }
      >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{detail.type} 화장실</Text>
        <Text style={styles.title}>{place?.name ?? '화장실'}</Text>
        <Text style={styles.address}>{place?.address ?? '주소 정보 없음'}</Text>
        {!!detail.operating_hours && (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillDetail} numberOfLines={1}>
              🕐 {detail.operating_hours}
            </Text>
          </View>
        )}

        {detail.avg_rating != null && (
          <View style={styles.hwachelinRow}>
            <HwachelinStars rating={detail.avg_rating} size={26} />
            <Text style={styles.hwachelinRating}>{detail.avg_rating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{ratingText}</Text>
            <Text style={styles.summaryLabel}>평점</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{reviewCount}</Text>
            <Text style={styles.summaryLabel}>리뷰</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{detail.access_type}</Text>
            <Text style={styles.summaryLabel}>이용</Text>
          </View>
        </View>
      </View>

      {/* ─── 사진 갤러리 (2x4 그리드, 최대 8장 + 더보기) ─── */}
      {allPhotos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.galleryHeader}>
            <Text style={styles.sectionTitle}>사진</Text>
            <Text style={styles.gallerySubtitle}>리뷰 사진 {allPhotos.length}장</Text>
          </View>
          <View style={styles.galleryGrid}>
            {visiblePhotos.map((p, i) => {
              const isOverlayCell = i === TOP_GALLERY_LIMIT - 1 && extraPhotoCount > 0;
              return (
                <TouchableOpacity
                  key={`${p.reviewId}-${p.imageIndex}-${p.url}`}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (isOverlayCell) {
                      navigation.navigate('PhotoGallery', { toiletId });
                    } else {
                      openGallery(p.reviewId, p.imageIndex);
                    }
                  }}
                  style={styles.galleryCell}
                >
                  <Image source={{ uri: p.url }} style={styles.galleryImage} />
                  {isOverlayCell && (
                    <View style={styles.galleryMoreOverlay}>
                      <Text style={styles.galleryMoreCount}>{allPhotos.length}</Text>
                      <Text style={styles.galleryMoreLabel}>더보기</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 정보</Text>
        <View style={styles.facGrid}>
          <InfoTile icon="↕" label="층수" value={detail.floor || '정보 없음'} />
          <InfoTile icon="⚥" label="성별 구분" value={detail.gender_type || '정보 없음'} />
          <InfoTile icon="🔓" label="이용 조건" value={detail.access_type || '정보 없음'} />
          <InfoTile
            icon="✓"
            label="데이터 출처"
            value={place?.source === 'public' ? '공공데이터' : '사용자 제보'}
          />
          {!!detail.operating_hours && (
            <InfoTile icon="🕐" label="운영시간" value={detail.operating_hours} />
          )}
          {detail.is_24hours && (
            <InfoTile icon="24" label="24시간" value="24시간 운영" />
          )}
          {detail.has_diaper_table && (
            <InfoTile icon="🍼" label="기저귀교환대" value="있음" />
          )}
          {detail.disabled_available && (
            <InfoTile icon="♿" label="장애인 화장실" value="있음" />
          )}
          {detail.emergency_bell && (
            <InfoTile icon="🔔" label="비상벨" value="설치됨" />
          )}
        </View>
      </View>

      {/* 칸 수 정보 — 데이터 있을 때만 표시 */}
      {(detail.male_stalls != null || detail.female_stalls != null) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>칸 수</Text>
          <View style={styles.stallGrid}>
            {detail.male_stalls != null && (
              <View style={styles.stallCard}>
                <Text style={styles.stallIcon}>🚹</Text>
                <Text style={styles.stallValue}>{detail.male_stalls}칸</Text>
                <Text style={styles.stallLabel}>남성 대변기</Text>
                {detail.male_urinals != null && (
                  <Text style={styles.stallSub}>소변기 {detail.male_urinals}개</Text>
                )}
              </View>
            )}
            {detail.female_stalls != null && (
              <View style={styles.stallCard}>
                <Text style={styles.stallIcon}>🚺</Text>
                <Text style={styles.stallValue}>{detail.female_stalls}칸</Text>
                <Text style={styles.stallLabel}>여성 대변기</Text>
              </View>
            )}
            {(detail.disabled_male_stalls != null || detail.disabled_female_stalls != null) && (
              <View style={styles.stallCard}>
                <Text style={styles.stallIcon}>♿</Text>
                <Text style={styles.stallValue}>
                  {(detail.disabled_male_stalls ?? 0) + (detail.disabled_female_stalls ?? 0)}칸
                </Text>
                <Text style={styles.stallLabel}>장애인 대변기</Text>
                {detail.disabled_male_urinals != null && detail.disabled_male_urinals > 0 && (
                  <Text style={styles.stallSub}>남성 소변기 {detail.disabled_male_urinals}개</Text>
                )}
              </View>
            )}
          </View>
        </View>
      )}


      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          requireLogin({
            onAuthed: () =>
              myReview
                ? navigation.navigate('ReviewWrite', {
                    toiletId,
                    toiletName: place?.name ?? '화장실',
                    toiletLat: place?.lat,
                    toiletLng: place?.lng,
                    reviewId: myReview.id,
                    initialRating: myReview.rating,
                    initialCleanlinessLevel: myReview.cleanliness_level ?? null,
                    initialPaper: myReview.paper,
                    initialSoap: myReview.soap,
                    initialHandDryer: myReview.hand_dryer ?? null,
                    initialHandTissue: myReview.hand_tissue ?? null,
                    initialBidet: myReview.bidet,
                    initialHasPassword: myReview.has_password ?? null,
                    initialMoodTags: myReview.mood_tags ?? [],
                    initialImageUrls: myReview.image_urls ?? [],
                    initialComment: myReview.comment ?? '',
                  })
                : navigation.navigate('ReviewWrite', {
                    toiletId,
                    toiletName: place?.name ?? '화장실',
                    toiletLat: place?.lat,
                    toiletLng: place?.lng,
                  }),
          })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>{myReview ? '내 리뷰 수정하기' : '리뷰 작성하기'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() =>
          navigation.navigate('Report', {
            toiletId,
            placeName: place?.name ?? '화장실',
            address: place?.address,
            lat: place?.lat,
            lng: place?.lng,
            reportType: 'correction',
          })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>정보 수정 제보</Text>
      </TouchableOpacity>

      {reviews.length > 0 && (
        <View
          style={styles.section}
          onLayout={(e) => { reviewSectionY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.reviewSortHeader}>
            <Text style={styles.sectionTitle}>리뷰</Text>
            <TouchableOpacity
              onPress={openSortMenu}
              style={styles.sortTrigger}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={styles.sortTriggerText}>{sortLabel}</Text>
              <Text style={styles.sortTriggerCaret}>▾</Text>
            </TouchableOpacity>
          </View>
          {reviews.slice(0, 10).map((review) => {
            const isMine = currentUserId === review.user_id;
            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderLeft}>
                    <Text style={styles.reviewRating}>✿ {Number(review.rating).toFixed(1)}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </Text>
                  </View>
                  {isMine && <Text style={styles.myReviewBadge}>내 리뷰</Text>}
                </View>
                {/* 청결도 */}
                {(review as any).cleanliness_level != null && (
                  <View style={styles.reviewChips}>
                    <View style={[styles.reviewChip, styles.reviewChipCleanliness]}>
                      <Text style={[styles.reviewChipText, styles.reviewChipTextCleanliness]}>
                        {CLEANLINESS_LABEL[(review as any).cleanliness_level] ?? (review as any).cleanliness_level}
                      </Text>
                    </View>
                  </View>
                )}
                {/* 비치물품 / 비밀번호 — 응답한 항목(true/false 모두) 표시, null은 미표시 */}
                {(() => {
                  const chips = SUPPLY_CHIPS.filter(
                    (c) => (review as any)[c.key] === true || (review as any)[c.key] === false
                  );
                  return chips.length > 0 ? (
                    <View style={styles.reviewChips}>
                      {chips.map((c) => {
                        const val = (review as any)[c.key] as boolean;
                        return (
                          <View
                            key={c.key}
                            style={[styles.reviewChip, !val && styles.reviewChipAbsent]}
                          >
                            <Text style={[styles.reviewChipText, !val && styles.reviewChipTextAbsent]}>
                              {val ? c.trueLabel : c.falseLabel}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null;
                })()}
                {/* 분위기 태그 */}
                {(review as any).mood_tags?.length > 0 && (
                  <View style={styles.reviewChips}>
                    {((review as any).mood_tags as string[]).map((tag) => (
                      <View key={tag} style={[styles.reviewChip, styles.reviewChipMood]}>
                        <Text style={[styles.reviewChipText, styles.reviewChipTextMood]}>
                          {MOOD_TAG_LABELS[tag] ?? tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.image_urls?.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => openGallery(review.id, 0)}
                    style={styles.reviewPhotoWrap}
                  >
                    <Image source={{ uri: review.image_urls[0] }} style={styles.reviewPhoto} />
                    {review.image_urls.length > 1 && (
                      <View style={styles.reviewPhotoBadge}>
                        <Text style={styles.reviewPhotoBadgeText}>
                          📷 +{review.image_urls.length - 1}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewMeta}>
                    {review.is_verified ? '✅ 현장 인증' : ''}
                  </Text>
                  {!isMine && (
                    <TouchableOpacity
                      style={[
                        styles.helpfulBtn,
                        myHelpfulIds.has(review.id) && styles.helpfulBtnOn,
                      ]}
                      onPress={() => handleToggleHelpful(review.id)}
                      activeOpacity={0.7}
                      disabled={helpfulBusy.has(review.id)}
                    >
                      <Text
                        style={[
                          styles.helpfulBtnText,
                          myHelpfulIds.has(review.id) && styles.helpfulBtnTextOn,
                        ]}
                      >
                        👍 도움됐어요 {helpfulCounts[review.id] ?? 0}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isMine && (helpfulCounts[review.id] ?? 0) > 0 && (
                    <View style={[styles.helpfulBtn, styles.helpfulBtnMine]}>
                      <Text style={styles.helpfulBtnTextMine}>
                        👍 {helpfulCounts[review.id]}
                      </Text>
                    </View>
                  )}
                </View>
                {isMine && (
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.reviewActionButton}
                      onPress={() =>
                        navigation.navigate('ReviewWrite', {
                          toiletId,
                          toiletName: place?.name ?? '화장실',
                          reviewId: review.id,
                          initialRating: review.rating,
                          initialCleanlinessLevel: (review as any).cleanliness_level ?? null,
                          initialPaper: review.paper,
                          initialSoap: review.soap,
                          initialHandDryer: (review as any).hand_dryer ?? null,
                          initialHandTissue: (review as any).hand_tissue ?? null,
                          initialHasPassword: (review as any).has_password ?? null,
                          initialMoodTags: (review as any).mood_tags ?? [],
                          initialComment: review.comment ?? '',
                          toiletLat: place?.lat,
                          toiletLng: place?.lng,
                        })
                      }
                    >
                      <Text style={styles.reviewActionText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reviewActionButton, styles.reviewDeleteButton]}
                      onPress={() => confirmDeleteReview(review.id)}
                    >
                      <Text style={[styles.reviewActionText, styles.reviewDeleteText]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          {reviews.length > 10 && (
            <TouchableOpacity
              style={styles.moreReviewsBtn}
              onPress={() => {
                shouldScrollToReviews.current = true;
                navigation.navigate('AllReviews', {
                  toiletId,
                  toiletName: place?.name ?? '화장실',
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.moreReviewsBtnText}>
                리뷰 더보기 ({reviews.length - 10}개 더)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </ScrollView>

    <PhotoReviewModal
      review={galleryReview}
      initialIndex={galleryView?.imageIndex ?? 0}
      onClose={closeGallery}
    />

    <BottomSheetMenu
      visible={sortSheetOpen}
      title="리뷰 정렬"
      options={REVIEW_SORT_OPTIONS}
      selectedKey={reviewSort}
      onSelect={(key) => setReviewSort(key as ReviewSortKey)}
      onClose={() => setSortSheetOpen(false)}
    />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.facItem}>
      <Text style={styles.facIcon}>{icon}</Text>
      <View style={styles.facTextWrap}>
        <Text style={styles.facLabel}>{label}</Text>
        <Text style={styles.facValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function countPositive(
  reviews: Pick<Review, 'cleanliness' | 'paper' | 'soap' | 'security'>[],
  key: 'cleanliness' | 'paper' | 'soap' | 'security'
) {
  const count = reviews.filter((review) => review[key]).length;
  return `${count}/${reviews.length}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundPrimary },
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 16, paddingBottom: 36 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: 24,
  },
  heartIcon: {
    color: colors.orange,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '400',
    includeFontPadding: false,
  } as any,
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  hero: {
    borderRadius: 18,
    backgroundColor: '#FFF3EC',
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229,91,38,0.22)',
  },
  eyebrow: { fontSize: 12, color: colors.orange, fontWeight: '700', marginBottom: 7 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 7 },
  address: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 10 },
  statusPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    marginBottom: 14,
  },
  statusPillOpen: { backgroundColor: '#E9F8EF', borderColor: '#B7E2C5' },
  statusPillClosed: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  statusPillText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  statusPillTextOpen: { color: '#15803D' },
  statusPillTextClosed: { color: '#4B5563' },
  statusPillDetail: { flexShrink: 1, fontSize: 12, color: colors.textSecondary },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 14,
    paddingVertical: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: colors.textTertiary },
  divider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: colors.borderTertiary },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0,
  },
  facGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  facItem: {
    width: '48.9%',
    minHeight: 58,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  facIcon: { fontSize: 15, color: colors.orange },
  facTextWrap: { flex: 1, minWidth: 0 },
  facLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  facValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', maxWidth: '62%', textAlign: 'right' },
  mutedText: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  primaryButton: {
    backgroundColor: colors.orange,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  // ─── 리뷰 칩 ────────────────────────────────────────────────────────────
  reviewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  reviewChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFDBFE',
  },
  reviewChipText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  reviewChipAbsent: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  reviewChipTextAbsent: {
    color: '#BE123C',
    fontWeight: '700',
  },
  // ─── 리뷰 카드 ───────────────────────────────────────────────────────────
  reviewCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
  },
  reviewRating: { fontSize: 14, color: colors.brand[500], fontWeight: '700' },
  reviewDate: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  myReviewBadge: {
    fontSize: 11,
    color: colors.orange,
    fontWeight: '700',
    backgroundColor: '#FFF0E9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  reviewComment: { fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginBottom: 7 },
  // ─── 상단 사진 갤러리 ───────────────────────────────────────────────────
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gallerySubtitle: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TOP_GALLERY_GAP,
  },
  galleryCell: {
    width: TOP_GALLERY_CELL_SIZE,
    height: TOP_GALLERY_CELL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,82,186,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryMoreCount: { color: '#fff', fontSize: 20, fontWeight: '900' },
  galleryMoreLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  // ─── 리뷰 대표 사진 ─────────────────────────────────────────────────────
  reviewPhotoWrap: {
    width: 110,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 7,
    backgroundColor: colors.backgroundSecondary,
  },
  reviewPhoto: { width: '100%', height: '100%' },
  reviewPhotoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  reviewPhotoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  reviewMeta: { fontSize: 11, color: colors.textTertiary, flex: 1 },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  helpfulBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
  },
  helpfulBtnOn: {
    backgroundColor: '#FFF0E9',
    borderColor: colors.orange,
  },
  helpfulBtnMine: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderTertiary,
  },
  helpfulBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  helpfulBtnTextOn: {
    color: colors.orange,
  },
  helpfulBtnTextMine: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  reviewActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reviewActionButton: {
    minWidth: 56,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  reviewDeleteButton: { borderColor: 'rgba(210,65,52,0.35)' },
  reviewActionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  reviewDeleteText: { color: '#D24134' },
  hwachelinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  hwachelinRating: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E50914',
  },
  reviewChipCleanliness: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
  },
  reviewChipTextCleanliness: {
    color: '#6D28D9',
  },
  reviewChipMood: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
  },
  reviewChipTextMood: {
    color: '#C2410C',
  },
  moreReviewsBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.orange,
    alignItems: 'center',
    backgroundColor: '#FFF7F3',
  },
  moreReviewsBtnText: {
    fontSize: 14,
    color: colors.orange,
    fontWeight: '700',
  },
  reviewSortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
  },
  sortTriggerText: { fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
  sortTriggerCaret: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  reviewSortChips: { flexDirection: 'row', gap: 5 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: '#fff',
  },
  sortChipOn: { borderColor: colors.orange, backgroundColor: '#FFF0E9' },
  sortChipText: { fontSize: 12, color: colors.textSecondary },
  sortChipTextOn: { color: colors.orange, fontWeight: '700' },
  stallGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  stallCard: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  stallIcon: { fontSize: 22, marginBottom: 4 },
  stallValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  stallLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  stallSub: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
});
