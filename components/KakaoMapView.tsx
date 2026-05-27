import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ToiletMarkerData } from '../types/toilet';

type LatLng = {
  lat: number;
  lng: number;
};

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type MapViewport = LatLng & {
  radiusKm?: number;
  bounds?: MapBounds;
};

type KakaoMapViewProps = {
  center: LatLng;
  currentLocation: LatLng | null;
  toilets: ToiletMarkerData[];
  selectedToiletId?: string | null;
  /** 급해요 모드: toilet_id → 순위(1~3) 매핑 */
  urgentRanks?: Record<string, number>;
  onMapPress: () => void;
  onMarkerPress: (toilet: ToiletMarkerData) => void;
  onClusterPress?: (toilets: ToiletMarkerData[], center: LatLng) => void;
  onRegionIdle: (center: MapViewport) => void;
  onMapError?: (message: string) => void;
};

export type KakaoMapViewRef = {
  moveTo: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** 지정한 좌표 목록이 모두 보이도록 지도 범위 조정 */
  fitPoints: (points: LatLng[], paddingRatio?: number) => void;
};

export default forwardRef<KakaoMapViewRef, KakaoMapViewProps>(function KakaoMapView(
  {
    center,
    currentLocation,
    toilets,
    selectedToiletId,
    urgentRanks,
    onMapPress,
    onMarkerPress,
    onClusterPress,
    onRegionIdle,
    onMapError,
  },
  ref
) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const toiletsRef = useRef(toilets);

  toiletsRef.current = toilets;

  const kakaoKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY ?? '';
  const html = useMemo(() => createKakaoMapHtml(kakaoKey, center), [kakaoKey]);

  const postToMap = (message: object) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  };

  useImperativeHandle(ref, () => ({
    moveTo: (lat: number, lng: number) => {
      postToMap({ type: 'MOVE_TO', lat, lng });
    },
    zoomIn: () => {
      postToMap({ type: 'ZOOM_IN' });
    },
    zoomOut: () => {
      postToMap({ type: 'ZOOM_OUT' });
    },
    fitPoints: (points: LatLng[], paddingRatio = 0.25) => {
      postToMap({ type: 'FIT_POINTS', points, paddingRatio });
    },
  }));

  useEffect(() => {
    if (!isReady) return;
    postToMap({ type: 'SET_MARKERS', toilets, urgentRanks: urgentRanks ?? {} });
  }, [isReady, toilets, urgentRanks]);

  useEffect(() => {
    if (!isReady) return;
    postToMap({ type: 'SET_SELECTED_TOILET', toiletId: selectedToiletId ?? null });
  }, [isReady, selectedToiletId]);

  useEffect(() => {
    if (!isReady || !currentLocation) return;
    postToMap({ type: 'SET_CURRENT_LOCATION', ...currentLocation });
  }, [currentLocation, isReady]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'MAP_READY') {
        setIsReady(true);
        postToMap({ type: 'SET_MARKERS', toilets: toiletsRef.current });
        postToMap({ type: 'SET_SELECTED_TOILET', toiletId: selectedToiletId ?? null });
        if (currentLocation) postToMap({ type: 'SET_CURRENT_LOCATION', ...currentLocation });
        return;
      }

      if (message.type === 'MARKER_PRESS') {
        const toilet = toiletsRef.current.find((item) => item.toilet_id === message.toiletId);
        if (toilet) onMarkerPress(toilet);
        return;
      }

      if (message.type === 'CLUSTER_PRESS') {
        const ids = Array.isArray(message.toiletIds) ? message.toiletIds : [];
        const clusterToilets = ids
          .map((id: string) => toiletsRef.current.find((item) => item.toilet_id === id))
          .filter(Boolean) as ToiletMarkerData[];
        if (clusterToilets.length > 0) {
          onClusterPress?.(clusterToilets, { lat: message.lat, lng: message.lng });
        }
        return;
      }

      if (message.type === 'MAP_PRESS') {
        onMapPress();
        return;
      }

      if (message.type === 'MAP_IDLE') {
        onRegionIdle({
          lat: message.lat,
          lng: message.lng,
          radiusKm: message.radiusKm,
          bounds: message.bounds,
        });
        return;
      }

      if (message.type === 'ERROR') {
        onMapError?.(message.message ?? '카카오맵을 불러오지 못했어요');
      }
    } catch (error) {
      onMapError?.('카카오맵 메시지를 처리하지 못했어요');
    }
  };

  return (
    <WebView
      ref={webViewRef}
      style={styles.webView}
      source={{ html, baseUrl: 'http://localhost:8081' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled
      scrollEnabled={false}
      onMessage={handleMessage}
      onError={(event) => onMapError?.(event.nativeEvent.description)}
      onHttpError={(event) => onMapError?.(`HTTP ${event.nativeEvent.statusCode}`)}
    />
  );
});

function createKakaoMapHtml(kakaoKey: string, center: LatLng) {
  const appKey = JSON.stringify(kakaoKey);
  const initialLat = JSON.stringify(center.lat);
  const initialLng = JSON.stringify(center.lng);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #f9f1ec; }
    .status {
      position: fixed;
      left: 16px;
      right: 16px;
      top: 58px;
      z-index: 20;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(31, 41, 51, 0.86);
      color: #fff;
      font: 600 14px -apple-system, BlinkMacSystemFont, sans-serif;
      text-align: center;
      display: none;
    }
.rating-badge {
      min-width: 38px;
      height: 24px;
      padding: 0 9px;
      border-radius: 12px;
      background: #fff;
      color: #E50914;
      font: 900 13px -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(17,24,39,.18);
      z-index: 3;
      pointer-events: none;
    }
    .rating-badge-selected {
      box-shadow: 0 4px 14px rgba(17,24,39,.28);
      transform: scale(1.1);
    }
    .rank-badge {
      width: 28px;
      height: 28px;
      border-radius: 14px;
      background: #E50914;
      color: #fff;
      font: 900 15px -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(229,9,20,.4);
      z-index: 3;
      pointer-events: none;
    }
    .rank-badge-selected {
      background: #B00010;
      box-shadow: 0 4px 16px rgba(229,9,20,.55);
      transform: scale(1.15);
    }
    .cluster-marker {
      width: 48px;
      height: 48px;
      border-radius: 24px;
      background: rgba(255,255,255,.96);
      border: 3px solid #E50914;
      box-shadow: 0 10px 22px rgba(120,18,38,.22);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #E50914;
      font: 900 15px -apple-system, BlinkMacSystemFont, sans-serif;
      transform: translateY(-8px);
    }
    .cluster-marker.large {
      width: 54px;
      height: 54px;
      border-radius: 27px;
      font-size: 14px;
      background: #E50914;
      color: #fff;
      border-color: #fff;
    }
    .current-marker {
      width: 19px;
      height: 19px;
      border-radius: 10px;
      background: #E51B3E;
      border: 5px solid #fff;
      box-shadow: 0 0 0 18px rgba(229,27,62,.16), 0 2px 8px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="status" class="status"></div>
  <script>
    var APP_KEY = ${appKey};
    var INITIAL_LAT = ${initialLat};
    var INITIAL_LNG = ${initialLng};
    var map = null;
    var markerOverlays = [];
    var urgentRanks = {}; // { [toilet_id]: rank(1~3) }
    var currentOverlay = null;
    var allToilets = [];
    var selectedToiletId = null;
    var renderTimer = null;
    var MARKER_IMAGE_SRC = 'data:image/png;base64,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';
    var MARKER_IMAGE_SRC_INACTIVE = 'data:image/png;base64,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';

    function post(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }

    function showStatus(message) {
      var status = document.getElementById('status');
      status.textContent = message;
      status.style.display = 'block';
    }

    function distanceKm(lat1, lng1, lat2, lng2) {
      var toRad = function(value) { return value * Math.PI / 180; };
      var earthRadiusKm = 6371;
      var dLat = toRad(lat2 - lat1);
      var dLng = toRad(lng2 - lng1);
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getViewportRadiusKm() {
      if (!map || !window.kakao) return null;
      var center = map.getCenter();
      var bounds = map.getBounds();
      if (!center || !bounds) return null;
      var northEast = bounds.getNorthEast();
      var southWest = bounds.getSouthWest();
      var neDistance = distanceKm(center.getLat(), center.getLng(), northEast.getLat(), northEast.getLng());
      var swDistance = distanceKm(center.getLat(), center.getLng(), southWest.getLat(), southWest.getLng());
      return Math.max(neDistance, swDistance);
    }

    function getViewportBounds() {
      if (!map || !window.kakao) return null;
      var bounds = map.getBounds();
      if (!bounds) return null;
      var northEast = bounds.getNorthEast();
      var southWest = bounds.getSouthWest();
      return {
        north: northEast.getLat(),
        east: northEast.getLng(),
        south: southWest.getLat(),
        west: southWest.getLng()
      };
    }

    window.onerror = function(message, source, line) {
      showStatus('카카오맵 오류: ' + message);
      post({ type: 'ERROR', message: String(message), line: line });
    };

    function loadKakaoSdk() {
      if (!APP_KEY) {
        showStatus('카카오 앱 키가 없습니다.');
        post({ type: 'ERROR', message: '카카오 앱 키가 없습니다.' });
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(APP_KEY) + '&autoload=false';
      script.onload = function() {
        if (!window.kakao || !window.kakao.maps) {
          showStatus('카카오맵 SDK를 사용할 수 없습니다.');
          post({ type: 'ERROR', message: '카카오맵 SDK를 사용할 수 없습니다.' });
          return;
        }
        kakao.maps.load(initMap);
      };
      script.onerror = function() {
        showStatus('카카오맵 SDK 로드 실패. Kakao Developers의 Web 플랫폼 도메인 설정을 확인하세요.');
        post({ type: 'ERROR', message: '카카오맵 SDK 로드 실패' });
      };
      document.head.appendChild(script);
    }

    function initMap() {
      var container = document.getElementById('map');
      var center = new kakao.maps.LatLng(INITIAL_LAT, INITIAL_LNG);
      map = new kakao.maps.Map(container, {
        center: center,
        level: 4
      });

      kakao.maps.event.addListener(map, 'click', function() {
        post({ type: 'MAP_PRESS' });
      });

      kakao.maps.event.addListener(map, 'idle', function() {
        renderMarkers();
        var center = map.getCenter();
        post({
          type: 'MAP_IDLE',
          lat: center.getLat(),
          lng: center.getLng(),
          radiusKm: getViewportRadiusKm(),
          bounds: getViewportBounds()
        });
      });

      post({ type: 'MAP_READY' });

      // idle 이벤트는 사용자 인터랙션 없이는 초기 렌더 시 발화하지 않으므로 직접 발송
      kakao.maps.event.addListener(map, 'tilesloaded', function() {
        kakao.maps.event.removeListener(map, 'tilesloaded', arguments.callee);
        var c = map.getCenter();
        post({
          type: 'MAP_IDLE',
          lat: c.getLat(),
          lng: c.getLng(),
          radiusKm: getViewportRadiusKm(),
          bounds: getViewportBounds()
        });
      });
    }

    function clearMarkers() {
      markerOverlays.forEach(function(item) {
        if (item && typeof item.setMap === 'function') item.setMap(null);
      });
      markerOverlays = [];
    }

    function setMarkers(toilets, ranks) {
      if (!map || !window.kakao) return;
      allToilets = toilets || [];
      if (ranks) urgentRanks = ranks;
      renderMarkers();
    }

    function setSelectedToilet(toiletId) {
      selectedToiletId = toiletId || null;
      renderMarkers();
    }

    function renderMarkers() {
      if (!map || !window.kakao) return;
      if (renderTimer) window.clearTimeout(renderTimer);
      renderTimer = window.setTimeout(function() {
        renderTimer = null;
        renderMarkersNow();
      }, 40);
    }

    function renderMarkersNow() {
      if (!map || !window.kakao) return;
      clearMarkers();

      var groups = clusterToilets(allToilets);

      groups.forEach(function(group) {
        if (group.items.length === 1) {
          renderToiletMarker(group.items[0]);
        } else {
          renderClusterMarker(group);
        }
      });
    }

    function clusterToilets(toilets) {
      var level = map.getLevel();
      var bounds = map.getBounds();
      var grid = getClusterGrid(level);
      var grouped = {};
      var groups = [];

      toilets.forEach(function(toilet) {
        var position = new kakao.maps.LatLng(toilet.lat, toilet.lng);
        if (bounds && !bounds.contain(position)) return;

        var key = grid === 0
          ? toilet.toilet_id
          : Math.floor(toilet.lat / grid) + ':' + Math.floor(toilet.lng / grid);

        if (!grouped[key]) {
          grouped[key] = {
            items: [],
            latSum: 0,
            lngSum: 0,
            ratingSum: 0,
            ratingCount: 0
          };
          groups.push(grouped[key]);
        }

        grouped[key].items.push(toilet);
        grouped[key].latSum += toilet.lat;
        grouped[key].lngSum += toilet.lng;
        if (typeof toilet.avg_rating === 'number') {
          grouped[key].ratingSum += toilet.avg_rating;
          grouped[key].ratingCount += 1;
        }
      });

      groups.forEach(function(group) {
        group.lat = group.latSum / group.items.length;
        group.lng = group.lngSum / group.items.length;
        group.avgRating = group.ratingCount > 0 ? group.ratingSum / group.ratingCount : null;
      });

      return groups;
    }

    function getClusterGrid(level) {
      if (level <= 2) return 0;
      if (level === 3) return 0.0009;
      if (level === 4) return 0.0024;
      if (level === 5) return 0.005;
      if (level === 6) return 0.010;
      if (level === 7) return 0.020;
      return 0.024;
    }

    function renderToiletMarker(toilet) {
      var rating = typeof toilet.avg_rating === 'number' ? toilet.avg_rating : null;
      var isInactive = rating === null || toilet.operating_state === 'closed';
      var isSelected = selectedToiletId === toilet.toilet_id;
      var rank = urgentRanks[toilet.toilet_id]; // 급해요 모드 순위 (1~3, 없으면 undefined)
      var isUrgentMode = Object.keys(urgentRanks).length > 0;

      var imageSrc = (isInactive && !isUrgentMode) ? MARKER_IMAGE_SRC_INACTIVE : MARKER_IMAGE_SRC;
      var imageSize = new kakao.maps.Size(58, 58);
      var imageOption = { offset: new kakao.maps.Point(29, 52) };
      var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

      var marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(toilet.lat, toilet.lng),
        image: markerImage,
        zIndex: isSelected ? 30 : 10
      });
      marker.setMap(map);

      kakao.maps.event.addListener(marker, 'click', function() {
        selectedToiletId = toilet.toilet_id;
        renderMarkers();
        post({ type: 'MARKER_PRESS', toiletId: toilet.toilet_id });
      });

      markerOverlays.push(marker);

      if (rank != null) {
        // 급해요 모드: 순위 뱃지 (빨간 원에 숫자)
        var rankEl = document.createElement('div');
        rankEl.className = 'rank-badge' + (isSelected ? ' rank-badge-selected' : '');
        rankEl.textContent = String(rank);
        var rankOverlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(toilet.lat, toilet.lng),
          content: rankEl,
          yAnchor: 3.4,
          zIndex: isSelected ? 31 : 11
        });
        rankOverlay.setMap(map);
        markerOverlays.push(rankOverlay);
      } else if (!isInactive) {
        // 일반 모드: 평점 뱃지
        var badgeEl = document.createElement('div');
        badgeEl.className = 'rating-badge' + (isSelected ? ' rating-badge-selected' : '');
        badgeEl.textContent = rating.toFixed(1);
        var badgeOverlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(toilet.lat, toilet.lng),
          content: badgeEl,
          yAnchor: 3.3,
          zIndex: isSelected ? 31 : 11
        });
        badgeOverlay.setMap(map);
        markerOverlays.push(badgeOverlay);
      }
    }

    function renderClusterMarker(group) {
      var el = document.createElement('div');
      el.className = 'cluster-marker ' + (group.items.length >= 10 ? 'large' : '');
      el.textContent = group.items.length >= 100 ? '99+' : String(group.items.length);
      el.onclick = function(event) {
        event.stopPropagation();
        var currentLevel = map.getLevel();
        if (currentLevel > 4) {
          // 아직 줌아웃 상태 → 클러스터 중심으로 줌인만
          map.setLevel(Math.max(1, currentLevel - 1), {
            anchor: new kakao.maps.LatLng(group.lat, group.lng),
            animate: true
          });
        } else {
          // 충분히 줌인된 상태(level ≤ 3) → 바텀시트 리스트 표시
          post({
            type: 'CLUSTER_PRESS',
            toiletIds: group.items.map(function(item) { return item.toilet_id; }),
            lat: group.lat,
            lng: group.lng
          });
        }
      };

      el.ondblclick = function(event) {
        event.stopPropagation();
        map.setLevel(Math.max(1, map.getLevel() - 1), {
          anchor: new kakao.maps.LatLng(group.lat, group.lng),
          animate: true
        });
      };

      var overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(group.lat, group.lng),
        content: el,
        yAnchor: 1,
        zIndex: 12
      });
      overlay.setMap(map);
      markerOverlays.push(overlay);
    }

    function setCurrentLocation(lat, lng) {
      if (!map || !window.kakao) return;
      if (currentOverlay) currentOverlay.setMap(null);

      var el = document.createElement('div');
      el.className = 'current-marker';

      currentOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(lat, lng),
        content: el,
        yAnchor: 0.5,
        zIndex: 9
      });
      currentOverlay.setMap(map);
    }

    function moveTo(lat, lng) {
      if (!map || !window.kakao) return;
      map.panTo(new kakao.maps.LatLng(lat, lng));
    }

    function zoomIn() {
      if (!map || !window.kakao) return;
      map.setLevel(Math.max(1, map.getLevel() - 1), { animate: true });
    }

    function zoomOut() {
      if (!map || !window.kakao) return;
      map.setLevel(Math.min(14, map.getLevel() + 1), { animate: true });
    }

    function fitPoints(points, paddingRatio) {
      if (!map || !window.kakao || !points || points.length === 0) return;
      var bounds = new kakao.maps.LatLngBounds();
      points.forEach(function(p) {
        bounds.extend(new kakao.maps.LatLng(p.lat, p.lng));
      });
      map.setBounds(bounds);
      // 패딩만큼 살짝 줌아웃
      var pad = typeof paddingRatio === 'number' ? paddingRatio : 0.25;
      if (pad > 0) {
        setTimeout(function() {
          map.setLevel(Math.min(14, map.getLevel() + Math.round(pad * 4)), { animate: true });
        }, 300);
      }
    }

    function handleMessage(raw) {
      try {
        var message = JSON.parse(raw);
        if (message.type === 'SET_MARKERS') setMarkers(message.toilets || [], message.urgentRanks);
        if (message.type === 'SET_SELECTED_TOILET') setSelectedToilet(message.toiletId);
        if (message.type === 'SET_CURRENT_LOCATION') setCurrentLocation(message.lat, message.lng);
        if (message.type === 'MOVE_TO') moveTo(message.lat, message.lng);
        if (message.type === 'ZOOM_IN') zoomIn();
        if (message.type === 'ZOOM_OUT') zoomOut();
        if (message.type === 'FIT_POINTS') fitPoints(message.points, message.paddingRatio);
      } catch (error) {
        post({ type: 'ERROR', message: '메시지 파싱 실패' });
      }
    }

    document.addEventListener('message', function(event) { handleMessage(event.data); });
    window.addEventListener('message', function(event) { handleMessage(event.data); });
    loadKakaoSdk();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: '#f6f2ea',
  },
});
