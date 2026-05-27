import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenHeader from '../components/ScreenHeader';
import PhotoReviewModal from '../components/PhotoReviewModal';
import { getToiletDetail } from '../lib/toiletService';
import { RootStackParamList } from '../types/navigation';
import { Review } from '../types/toilet';
import { colors } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoGallery'>;

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 3;
const CELL = Math.floor(SCREEN_W / COLS);

type PhotoEntry = { url: string; reviewId: string; imageIndex: number };

export default function PhotoGalleryScreen({ route, navigation }: Props) {
  const { toiletId } = route.params;
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allPhotos, setAllPhotos] = useState<PhotoEntry[]>([]);
  const [galleryView, setGalleryView] = useState<{
    reviewId: string;
    imageIndex: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getToiletDetail(toiletId);
      if (!active || !data) {
        setLoading(false);
        return;
      }
      const revs = [...((data.reviews as Review[]) ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setReviews(revs);
      const photos: PhotoEntry[] = revs.flatMap((r) =>
        (r.image_urls ?? []).map((url, i) => ({ url, reviewId: r.id, imageIndex: i }))
      );
      setAllPhotos(photos);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [toiletId]);

  const galleryReview = galleryView
    ? reviews.find((r) => r.id === galleryView.reviewId) ?? null
    : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="사진 갤러리"
        subtitle={allPhotos.length > 0 ? `리뷰 사진 ${allPhotos.length}장` : undefined}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      ) : allPhotos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>아직 등록된 사진이 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={allPhotos}
          keyExtractor={(item, i) => `${item.reviewId}-${item.imageIndex}-${i}`}
          numColumns={COLS}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cell}
              activeOpacity={0.86}
              onPress={() =>
                setGalleryView({ reviewId: item.reviewId, imageIndex: item.imageIndex })
              }
            >
              <Image source={{ uri: item.url }} style={styles.cellImage} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <PhotoReviewModal
        review={galleryReview}
        initialIndex={galleryView?.imageIndex ?? 0}
        onClose={() => setGalleryView(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  list: { paddingBottom: 24 },
  cell: {
    width: CELL,
    height: CELL,
    backgroundColor: colors.backgroundSecondary,
  },
  cellImage: { width: '100%', height: '100%' },
});
