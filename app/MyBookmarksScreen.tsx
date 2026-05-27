import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  BookmarkedToilet,
  getBookmarks,
  removeBookmark,
} from '../lib/bookmarkService';
import { RootStackParamList } from '../types/navigation';
import ScreenHeader from '../components/ScreenHeader';

export default function MyBookmarksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [bookmarks, setBookmarks] = useState<BookmarkedToilet[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getBookmarks().then((data) => {
        if (!active) return;
        setBookmarks(data);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleRemove = (item: BookmarkedToilet) => {
    Alert.alert('저장 취소', `'${item.name}'을(를) 저장 목록에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const ok = await removeBookmark(item.bookmark_id);
          if (ok) {
            setBookmarks((prev) =>
              prev.filter((b) => b.bookmark_id !== item.bookmark_id)
            );
          } else {
            Alert.alert('오류', '삭제에 실패했어요. 다시 시도해 주세요.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="저장한 장소" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
      ]}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.centerText}>불러오는 중...</Text>
        </View>
      ) : bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔖</Text>
          <Text style={styles.emptyTitle}>저장한 화장실이 없어요</Text>
          <Text style={styles.emptyText}>
            화장실 상세 화면에서 북마크 버튼을 눌러{'\n'}자주 가는 곳을 저장해 보세요.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.countLabel}>{bookmarks.length}개 저장됨</Text>
          {bookmarks.map((item) => (
            <TouchableOpacity
              key={item.bookmark_id}
              style={styles.card}
              activeOpacity={0.84}
              onPress={() =>
                navigation.navigate('ToiletDetail', { toiletId: item.toilet_id })
              }
            >
              {/* 타입 + 접근 배지 */}
              <View style={styles.badges}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: item.type === '공공' ? '#DBEAFE' : '#FFF0E9' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: item.type === '공공' ? colors.blue : colors.orange },
                    ]}
                  >
                    {item.type}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.access_type}</Text>
                </View>
              </View>

              {/* 이름 + 주소 */}
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>

              {/* 평점 + 액션 */}
              <View style={styles.bottom}>
                <Text style={styles.rating}>
                  {item.avg_rating != null
                    ? `★ ${item.avg_rating.toFixed(1)} (${item.review_count})`
                    : '리뷰 없음'}
                </Text>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.removeBtnText}>🔖 저장취소</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 16 },
  center: { alignItems: 'center', paddingTop: 60, gap: 10 },
  centerText: { fontSize: 13, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
  },
  badges: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
  },
  badgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  address: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rating: { fontSize: 12, color: colors.amber, fontWeight: '600' },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  removeBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
