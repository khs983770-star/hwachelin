import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../constants/theme';
import { PlaceSearchResult } from '../lib/searchService';
import {
  RecentKeyword,
  SearchStatus,
  TrendingKeyword,
} from '../hooks/useSearch';

interface Props {
  query: string;
  onChangeQuery: (query: string) => void;
  results: PlaceSearchResult[];
  recentKeywords: RecentKeyword[];
  trendingKeywords: TrendingKeyword[];
  status: SearchStatus;
  errorMessage: string | null;
  isLoading: boolean;
  onSelectPlace: (place: PlaceSearchResult) => void;
  onSelectKeyword: (keyword: string) => void;
  onDeleteRecentKeyword: (keyword: string) => void;
  onClearRecentKeywords: () => void;
  onClear: () => void;
  onRetry: () => void;
  renderDropdown?: boolean;
  dropdownOpen?: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export default function SearchBar({
  query,
  onChangeQuery,
  results,
  recentKeywords,
  trendingKeywords,
  status,
  errorMessage,
  isLoading,
  onSelectPlace,
  onSelectKeyword,
  onDeleteRecentKeyword,
  onClearRecentKeywords,
  onClear,
  onRetry,
  renderDropdown = true,
  dropdownOpen = false,
  onFocusChange,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const keyword = query.trim();
  const showRecent = isFocused && keyword.length === 0;
  const showSuggestions =
    isFocused &&
    (showRecent || keyword.length > 0) &&
    (results.length > 0 ||
      status === 'empty' ||
      status === 'error' ||
      showRecent ||
      trendingKeywords.length > 0);
  const isOpen = renderDropdown ? showSuggestions : dropdownOpen;
  const visibleItems = useMemo(
    () => results.slice(0, 8),
    [results]
  );

  const selectPlace = (place: PlaceSearchResult) => {
    setIsFocused(false);
    onFocusChange?.(false);
    onSelectPlace(place);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputWrap, isFocused && styles.inputWrapFocused, isOpen && styles.inputWrapOpen]}>
        <Text style={styles.leadingIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="지역, 건물, 가게 검색"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          returnKeyType="search"
          showSoftInputOnFocus
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => {
            setIsFocused(true);
            onFocusChange?.(true);
          }}
          onSubmitEditing={() => {
            if (results[0]) selectPlace(results[0]);
          }}
        />
        <View style={styles.accessory}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : query ? (
            <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {renderDropdown && isOpen && (
        <SearchSuggestionList
          keyword={keyword}
          showRecent={showRecent}
          visibleItems={visibleItems}
          recentKeywords={recentKeywords}
          trendingKeywords={trendingKeywords}
          status={status}
          errorMessage={errorMessage}
          onRetry={onRetry}
          onSelectPlace={selectPlace}
          onSelectKeyword={onSelectKeyword}
          onDeleteRecentKeyword={onDeleteRecentKeyword}
          onClearRecentKeywords={onClearRecentKeywords}
          attached
        />
      )}
    </View>
  );
}

export function SearchSuggestionList({
  keyword,
  showRecent,
  visibleItems,
  recentKeywords,
  trendingKeywords,
  status,
  errorMessage,
  onRetry,
  onSelectPlace,
  onSelectKeyword,
  onDeleteRecentKeyword,
  onClearRecentKeywords,
  attached = false,
  onClose,
}: {
  keyword: string;
  showRecent: boolean;
  visibleItems: PlaceSearchResult[];
  recentKeywords: RecentKeyword[];
  trendingKeywords: TrendingKeyword[];
  status: SearchStatus;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectPlace: (place: PlaceSearchResult) => void;
  onSelectKeyword: (keyword: string) => void;
  onDeleteRecentKeyword: (keyword: string) => void;
  onClearRecentKeywords: () => void;
  attached?: boolean;
  onClose?: () => void;
}) {
  const sortedTrending = useMemo(
    () => [...trendingKeywords].sort((a, b) => b.count - a.count).slice(0, 8),
    [trendingKeywords]
  );

  return (
    <View style={[styles.dropdown, attached && styles.dropdownAttached]}>
      {onClose && (
        <View style={styles.dropdownCloseRow}>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.dropdownCloseBtn}>
            <Text style={styles.dropdownCloseText}>닫기</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        style={styles.dropdownScroll}
        contentContainerStyle={styles.dropdownContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {showRecent ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.dropdownTitle}>최근 검색</Text>
              {recentKeywords.length > 0 && (
                <TouchableOpacity onPress={onClearRecentKeywords} hitSlop={8}>
                  <Text style={styles.clearAllText}>전체 삭제</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentKeywords.length > 0 ? (
              recentKeywords.slice(0, 5).map((item) => (
                <View key={`${item.keyword}:${item.searchedAt}`} style={styles.keywordRow}>
                  <TouchableOpacity
                    style={styles.keywordMain}
                    onPress={() => onSelectKeyword(item.keyword)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.keywordIcon}>↺</Text>
                    <View style={styles.keywordTextWrap}>
                      <Text style={styles.keywordText} numberOfLines={1}>
                        {item.keyword}
                      </Text>
                      <Text style={styles.keywordMeta}>{formatRecentTime(item.searchedAt)}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.keywordDelete}
                    onPress={() => onDeleteRecentKeyword(item.keyword)}
                    hitSlop={8}
                  >
                    <Text style={styles.keywordDeleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.messageText}>최근 검색어가 없어요.</Text>
            )}

            {sortedTrending.length > 0 && (
              <>
                <Text style={[styles.dropdownTitle, styles.trendingTitle]}>인기 검색</Text>
                <View style={styles.trendingWrap}>
                  {sortedTrending.map((item, index) => (
                    <TouchableOpacity
                      key={item.keyword}
                      style={styles.trendingChip}
                      onPress={() => onSelectKeyword(item.keyword)}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.trendingRank}>{index + 1}</Text>
                      <Text style={styles.trendingText} numberOfLines={1}>
                        {item.keyword}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        ) : null}

        {visibleItems.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.resultRow}
            onPress={() => onSelectPlace(place)}
            activeOpacity={0.82}
          >
            <View style={styles.resultMain}>
              <HighlightedText text={place.name} keyword={keyword} />
              <Text style={styles.resultMeta} numberOfLines={1}>
                {place.category}
                {getShortAddress(place) ? ` · ${getShortAddress(place)}` : ''}
              </Text>
              {(place.hasToiletData || place.avgRating || place.reviewCount) && (
                <Text style={styles.resultStats} numberOfLines={1}>
                  {place.hasToiletData ? '화장실 정보 있음' : ''}
                  {place.avgRating ? ` · ★ ${place.avgRating.toFixed(1)}` : ''}
                  {place.reviewCount ? ` · 리뷰 ${place.reviewCount}` : ''}
                </Text>
              )}
            </View>
            <Text style={styles.resultAction}>이동</Text>
          </TouchableOpacity>
        ))}

        {status === 'empty' && !showRecent && (
          <Text style={styles.messageText}>검색 결과 없음</Text>
        )}

        {status === 'error' && !showRecent && (
          <View style={styles.retryRow}>
            <Text style={styles.messageText}>{errorMessage ?? '검색 중 오류가 발생했어요.'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>재시도</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  const matchIndex = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (matchIndex < 0) {
    return (
      <Text style={styles.resultName} numberOfLines={1}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={styles.resultName} numberOfLines={1}>
      {text.slice(0, matchIndex)}
      <Text style={styles.highlight}>{text.slice(matchIndex, matchIndex + keyword.length)}</Text>
      {text.slice(matchIndex + keyword.length)}
    </Text>
  );
}

function getShortAddress(place: PlaceSearchResult) {
  const address = place.roadAddress || place.address;
  return address.replace(/^서울특별시\s*/, '').replace(/^서울시\s*/, '');
}

function formatRecentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  inputWrap: {
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,220,215,0.78)',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 14,
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  inputWrapFocused: {
    borderColor: 'rgba(229,27,62,0.42)',
  },
  inputWrapOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  leadingIcon: { fontSize: 22, color: '#6C554F', fontWeight: '700', marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  accessory: { width: 26, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { fontSize: 20, lineHeight: 20, color: colors.textTertiary, fontWeight: '600' },
  dropdown: {
    marginTop: 0,
    borderRadius: 18,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,220,215,0.82)',
    overflow: 'hidden',
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  dropdownAttached: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
  },
  dropdownCloseRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(232,220,215,0.6)',
  },
  dropdownCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dropdownCloseText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '700',
  },
  dropdownScroll: {
    maxHeight: 330,
  },
  dropdownContent: {
    paddingBottom: 6,
  },
  sectionHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 11,
  },
  dropdownTitle: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 4,
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '800',
  },
  clearAllText: { fontSize: 11, color: colors.textTertiary, fontWeight: '700' },
  keywordRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderTertiary,
  },
  keywordMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    paddingVertical: 8,
  },
  keywordIcon: { width: 22, fontSize: 15, color: colors.textTertiary, fontWeight: '700' },
  keywordTextWrap: { flex: 1, minWidth: 0 },
  keywordText: { fontSize: 13, color: colors.textPrimary, fontWeight: '800' },
  keywordMeta: { marginTop: 2, fontSize: 10, color: colors.textTertiary },
  keywordDelete: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordDeleteText: { fontSize: 18, color: colors.textTertiary, fontWeight: '600' },
  trendingTitle: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderTertiary },
  trendingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 11,
    paddingBottom: 10,
  },
  trendingChip: {
    maxWidth: '48%',
    minHeight: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
  },
  trendingRank: { fontSize: 11, color: colors.orange, fontWeight: '900' },
  trendingText: { flexShrink: 1, fontSize: 12, color: colors.textPrimary, fontWeight: '700' },
  trendingCount: { fontSize: 10, color: colors.textTertiary, fontWeight: '700' },
  resultRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderTertiary,
  },
  resultMain: { flex: 1, minWidth: 0, marginRight: 8 },
  resultName: { fontSize: 14, color: colors.textPrimary, fontWeight: '800', marginBottom: 3 },
  highlight: { color: colors.orange },
  resultMeta: { fontSize: 11, color: colors.textSecondary },
  resultStats: { marginTop: 3, fontSize: 10, color: colors.orangeDark, fontWeight: '800' },
  resultAction: { fontSize: 12, color: colors.orange, fontWeight: '800' },
  messageText: { padding: 12, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  retryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retryButton: {
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: colors.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
