import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ToiletMarkerData } from '../types/toilet';

type LatLng = {
  lat: number;
  lng: number;
};

type KakaoMapViewProps = {
  center: LatLng;
  currentLocation: LatLng | null;
  toilets: ToiletMarkerData[];
  onMapPress: () => void;
  onMarkerPress: (toilet: ToiletMarkerData) => void;
  onRegionIdle: (center: LatLng) => void;
  onMapError?: (message: string) => void;
};

export type KakaoMapViewRef = {
  moveTo: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export default forwardRef<KakaoMapViewRef, KakaoMapViewProps>(function KakaoMapView(
  { center, currentLocation, toilets, onMapPress, onMarkerPress, onRegionIdle, onMapError },
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
  }));

  useEffect(() => {
    if (!isReady) return;
    postToMap({ type: 'SET_MARKERS', toilets });
  }, [isReady, toilets]);

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
        if (currentLocation) postToMap({ type: 'SET_CURRENT_LOCATION', ...currentLocation });
        return;
      }

      if (message.type === 'MARKER_PRESS') {
        const toilet = toiletsRef.current.find((item) => item.toilet_id === message.toiletId);
        if (toilet) onMarkerPress(toilet);
        return;
      }

      if (message.type === 'MAP_PRESS') {
        onMapPress();
        return;
      }

      if (message.type === 'MAP_IDLE') {
        onRegionIdle({ lat: message.lat, lng: message.lng });
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
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #f6f2ea; }
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
    .toilet-marker {
      width: 42px;
      height: 42px;
      border-radius: 21px;
      background: #E55B26;
      border: 2px solid #fff;
      box-shadow: 0 8px 14px rgba(43,31,22,.24);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font: 700 12px -apple-system, BlinkMacSystemFont, sans-serif;
      transform: translateY(-8px);
    }
    .toilet-marker:after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -8px;
      width: 12px;
      height: 12px;
      background: inherit;
      border-right: 2px solid #fff;
      border-bottom: 2px solid #fff;
      transform: translateX(-50%) rotate(45deg);
      border-radius: 2px;
    }
    .toilet-marker.mid { background: #F59E0B; }
    .toilet-marker.low { background: #6B7280; }
    .toilet-marker.store { background: #3B82F6; }
    .cluster-marker {
      width: 42px;
      height: 42px;
      border-radius: 21px;
      background: rgba(255,253,251,.96);
      border: 2px solid #E55B26;
      box-shadow: 0 10px 22px rgba(43,31,22,.26);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #E55B26;
      font: 800 13px -apple-system, BlinkMacSystemFont, sans-serif;
      transform: translateY(-8px);
    }
    .cluster-marker.large {
      width: 54px;
      height: 54px;
      border-radius: 27px;
      font-size: 14px;
      background: #E55B26;
      color: #fff;
      border-color: #fff;
    }
    .current-marker {
      width: 19px;
      height: 19px;
      border-radius: 10px;
      background: #1d8cff;
      border: 4px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
    var currentOverlay = null;
    var allToilets = [];
    var renderTimer = null;

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
        post({ type: 'MAP_IDLE', lat: center.getLat(), lng: center.getLng() });
      });

      post({ type: 'MAP_READY' });
    }

    function clearMarkers() {
      markerOverlays.forEach(function(overlay) { overlay.setMap(null); });
      markerOverlays = [];
    }

    function setMarkers(toilets) {
      if (!map || !window.kakao) return;
      allToilets = toilets || [];
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
        var el = document.createElement('div');
        var rating = typeof toilet.avg_rating === 'number' ? toilet.avg_rating : null;
        var ratingClass = rating === null ? 'low' : rating >= 4.3 ? '' : rating >= 3.8 ? 'mid' : 'low';
        el.className = 'toilet-marker ' + ratingClass + ' ' + (toilet.type === '매장' ? 'store' : '');
        el.textContent = rating === null ? 'WC' : rating.toFixed(1);
        el.onclick = function(event) {
          event.stopPropagation();
          post({ type: 'MARKER_PRESS', toiletId: toilet.toilet_id });
        };

        var overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(toilet.lat, toilet.lng),
          content: el,
          yAnchor: 1,
          zIndex: 10
        });
        overlay.setMap(map);
        markerOverlays.push(overlay);
    }

    function renderClusterMarker(group) {
      var el = document.createElement('div');
      el.className = 'cluster-marker ' + (group.items.length >= 10 ? 'large' : '');
      el.textContent = group.items.length >= 100 ? '99+' : String(group.items.length);
      el.onclick = function(event) {
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
      setCurrentLocation(lat, lng);
    }

    function zoomIn() {
      if (!map || !window.kakao) return;
      map.setLevel(Math.max(1, map.getLevel() - 1), { animate: true });
    }

    function zoomOut() {
      if (!map || !window.kakao) return;
      map.setLevel(Math.min(14, map.getLevel() + 1), { animate: true });
    }

    function handleMessage(raw) {
      try {
        var message = JSON.parse(raw);
        if (message.type === 'SET_MARKERS') setMarkers(message.toilets || []);
        if (message.type === 'SET_CURRENT_LOCATION') setCurrentLocation(message.lat, message.lng);
        if (message.type === 'MOVE_TO') moveTo(message.lat, message.lng);
        if (message.type === 'ZOOM_IN') zoomIn();
        if (message.type === 'ZOOM_OUT') zoomOut();
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
