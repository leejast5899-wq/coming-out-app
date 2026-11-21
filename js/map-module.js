import { APP_CONFIG } from "./config.js";
import { deriveSpotStatus } from "./data-service.js";

const CARTO_DARK_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const OSM_FALLBACK_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${meters} 公尺`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

export function getGoogleMapsNavUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=walking`;
}

function getFriendlyEmoji(subType) {
  switch (subType) {
    case "police":
      return "🚓";
    case "convenience_24h":
      return "🏪";
    case "campus_support":
      return "🎓";
    case "ngo":
      return "🌈";
    default:
      return "♥";
  }
}

function createSpotDivIcon(spot, isSelected) {
  const L = window.L;
  const derived = deriveSpotStatus(spot);
  const selectedClass = isSelected ? "is-selected" : "";
  const expiredClass = derived.expired ? "is-expired" : "";

  if (spot.type === "friendly") {
    const emoji = getFriendlyEmoji(spot.subType);
    return L.divIcon({
      className: "sp-div-icon",
      html: `<div class="sp-pin friendly ${selectedClass}"><span class="sp-pin-ico">${emoji}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  if (derived.trustState === "pending_verify") {
    return L.divIcon({
      className: "sp-div-icon",
      html: `<div class="sp-pin warning-pending ${selectedClass} ${expiredClass}"><span class="sp-pin-ico">?</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  return L.divIcon({
    className: "sp-div-icon",
    html: `<div class="sp-pin warning-confirmed ${selectedClass} ${expiredClass}"><span class="sp-pin-ico">!</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function attachBaseTiles(map) {
  const L = window.L;
  let switchedToOsm = false;
  const darkLayer = L.tileLayer(CARTO_DARK_URL, {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19
  });

  darkLayer.on("tileerror", () => {
    if (switchedToOsm) return;
    switchedToOsm = true;
    const osmLayer = L.tileLayer(OSM_FALLBACK_URL, {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    });
    osmLayer.addTo(map);
    map.removeLayer(darkLayer);
  });

  darkLayer.addTo(map);
}

export function createMapManager({ onSelectSpot, onPickCoords }) {
  const L = typeof window !== "undefined" ? window.L : null;
  let homeMap = null;
  let fullMap = null;
  let homePinLayer = null;
  let fullPinLayer = null;
  let homeRouteLayer = null;
  let fullRouteLayer = null;
  let homeUserLayer = null;
  let fullUserLayer = null;
  let homePickLayer = null;
  let fullPickLayer = null;

  let userLocation = null;
  let pickedCoords = null;
  let pickMode = false;
  let routeActive = false;
  let lastRouteCoords = null;

  function initMapInstance(containerId) {
    if (!L) return null;
    const el = document.getElementById(containerId);
    if (!el) return null;
    const map = L.map(el, {
      center: APP_CONFIG.defaultCenter,
      zoom: APP_CONFIG.defaultZoom,
      zoomControl: true
    });
    attachBaseTiles(map);

    map.on("click", (e) => {
      if (!pickMode) return;
      const { lat, lng } = e.latlng;
      setPickedCoords(lat, lng);
      pickMode = false;
      updatePickCursor();
      if (typeof onPickCoords === "function") {
        onPickCoords({ lat, lng, source: "map" });
      }
    });

    return map;
  }

  function init() {
    if (!L) {
      ["home-leaflet-map", "full-leaflet-map"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.innerHTML = `<div class="map-offline-fallback">⚠️ 地圖套件尚未載入（目前可能處於首次離線環境），仍可使用下方文字列表、回報表單與 SOS 求助工具。</div>`;
        }
      });
      return false;
    }

    homeMap = initMapInstance("home-leaflet-map");
    fullMap = initMapInstance("full-leaflet-map");

    if (homeMap) {
      homePinLayer = L.layerGroup().addTo(homeMap);
      homeRouteLayer = L.layerGroup().addTo(homeMap);
      homeUserLayer = L.layerGroup().addTo(homeMap);
      homePickLayer = L.layerGroup().addTo(homeMap);
    }
    if (fullMap) {
      fullPinLayer = L.layerGroup().addTo(fullMap);
      fullRouteLayer = L.layerGroup().addTo(fullMap);
      fullUserLayer = L.layerGroup().addTo(fullMap);
      fullPickLayer = L.layerGroup().addTo(fullMap);
    }
    return true;
  }

  function updatePickCursor() {
    ["home-leaflet-map", "full-leaflet-map"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("pick-mode-active", pickMode);
    });
  }

  function setPickMode(enabled) {
    pickMode = Boolean(enabled);
    updatePickCursor();
  }

  function isPickMode() {
    return pickMode;
  }

  function setPickedCoords(lat, lng) {
    pickedCoords = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    [homePickLayer, fullPickLayer].forEach((layer) => {
      if (!layer || !L) return;
      layer.clearLayers();
      const marker = L.marker([pickedCoords.lat, pickedCoords.lng], {
        icon: L.divIcon({
          className: "sp-div-icon",
          html: `<div class="sp-pin draft-pick"><span class="sp-pin-ico">📍</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 30]
        })
      });
      marker.bindTooltip("回報選點位置", { direction: "top" });
      marker.addTo(layer);
    });
  }

  function clearPickedCoords() {
    pickedCoords = null;
    [homePickLayer, fullPickLayer].forEach((layer) => {
      if (layer) layer.clearLayers();
    });
  }

  function renderMarkers({ homeSpots, fullSpots, selectedSpotId }) {
    if (!L) return;

    const populate = (layer, spots) => {
      if (!layer) return;
      layer.clearLayers();
      spots.forEach((spot) => {
        const marker = L.marker([spot.lat, spot.lng], {
          icon: createSpotDivIcon(spot, spot.id === selectedSpotId)
        });
        const badgeText =
          spot.type === "friendly"
            ? "❤️ 友善安全空間"
            : deriveSpotStatus(spot).trustState === "pending_verify"
              ? "❔ 待社群確認"
              : "⚠️ 社群警示熱點";

        marker.bindTooltip(`${spot.name} (${badgeText})`, {
          direction: "top",
          offset: [0, -10]
        });

        marker.on("click", () => {
          if (pickMode) return;
          if (typeof onSelectSpot === "function") {
            onSelectSpot(spot.id);
          }
        });

        marker.addTo(layer);
      });
    };

    populate(homePinLayer, homeSpots || []);
    populate(fullPinLayer, fullSpots || homeSpots || []);
  }

  function focusSpot(spot, zoom = 17) {
    if (!spot) return;
    [homeMap, fullMap].forEach((map) => {
      if (map) {
        map.setView([spot.lat, spot.lng], Math.max(map.getZoom(), zoom), { animate: true });
      }
    });
  }

  function invalidateFullMap(selectedSpot) {
    if (!fullMap) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        fullMap.invalidateSize();
        if (selectedSpot) {
          fullMap.setView([selectedSpot.lat, selectedSpot.lng], 16);
        } else if (userLocation) {
          fullMap.setView([userLocation.lat, userLocation.lng], 16);
        } else {
          fullMap.setView(APP_CONFIG.defaultCenter, APP_CONFIG.defaultZoom);
        }
      }, 60);
    });
  }

  function renderUserMarker() {
    if (!L || !userLocation) return;
    [homeUserLayer, fullUserLayer].forEach((layer) => {
      if (!layer) return;
      layer.clearLayers();
      L.circle([userLocation.lat, userLocation.lng], {
        radius: Math.min(120, Math.max(20, userLocation.accuracy || 35)),
        color: "#33ebff",
        fillColor: "#33ebff",
        fillOpacity: 0.14,
        weight: 1.5
      }).addTo(layer);
      L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 7,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#2596ff",
        fillOpacity: 1
      })
        .bindTooltip("你目前的位置", { direction: "top" })
        .addTo(layer);
    });
  }

  function locateUser({ flyTo = true } = {}) {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("此瀏覽器不支援 GPS 定位功能"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 30)
          };
          renderUserMarker();
          if (flyTo) {
            [homeMap, fullMap].forEach((map) => {
              if (map) map.setView([userLocation.lat, userLocation.lng], 17, { animate: true });
            });
          }
          resolve(userLocation);
        },
        (err) => {
          let msg = "無法取得定位，將以文化大學校區為預設參考點";
          if (err && err.code === 1) msg = "尚未開啟定位權限，請改用「地圖選點」或以校區為中心瀏覽";
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });
  }

  function clearRoutes() {
    routeActive = false;
    lastRouteCoords = null;
    [homeRouteLayer, fullRouteLayer].forEach((layer) => {
      if (layer) layer.clearLayers();
    });
  }

  function drawRoutePolyline(coords, isFallback) {
    if (!L) return;
    lastRouteCoords = coords;
    [
      { map: homeMap, layer: homeRouteLayer },
      { map: fullMap, layer: fullRouteLayer }
    ].forEach(({ map, layer }) => {
      if (!map || !layer) return;
      layer.clearLayers();
      const poly = L.polyline(coords, {
        color: "#4cffb3",
        weight: 5,
        opacity: 0.9,
        dashArray: isFallback ? "8 8" : "10 6"
      }).addTo(layer);
      try {
        map.fitBounds(poly.getBounds(), { padding: [36, 36], maxZoom: 17 });
      } catch {
        // ignore bounds error
      }
    });
  }

  async function toggleSafeRoute(spots, selectedSpot, forceState) {
    const nextState = typeof forceState === "boolean" ? forceState : !routeActive;
    if (!nextState) {
      clearRoutes();
      return { active: false };
    }

    const origin = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, label: "你的目前位置" }
      : APP_CONFIG.fallbackOrigin;

    const friendlySpots = spots.filter((s) => s.type === "friendly");
    if (!friendlySpots.length) {
      return { active: false, error: "目前沒有可導航的友善據點" };
    }

    let destination = null;
    if (selectedSpot && selectedSpot.type === "friendly") {
      const d = calcDistanceMeters(origin.lat, origin.lng, selectedSpot.lat, selectedSpot.lng);
      if (d <= 6000) destination = selectedSpot;
    }

    if (!destination) {
      const sorted = [...friendlySpots].sort(
        (a, b) =>
          calcDistanceMeters(origin.lat, origin.lng, a.lat, a.lng) -
          calcDistanceMeters(origin.lat, origin.lng, b.lat, b.lng)
      );
      destination = sorted[0];
    }

    const warningSpots = spots.filter((s) => s.type === "warning");
    let routeCoords = null;
    let distanceMeters = calcDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng);
    let durationMinutes = Math.max(1, Math.round(distanceMeters / 75));
    let fallbackUsed = false;

    try {
      const url = `${APP_CONFIG.osrmFootUrl}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("OSRM 回應異常");
      const json = await res.json();
      const route = json?.routes?.[0];
      if (!route?.geometry?.coordinates?.length) throw new Error("無可用步行路徑");

      routeCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      distanceMeters = Math.round(route.distance || distanceMeters);
      durationMinutes = Math.max(1, Math.round((route.duration || durationMinutes * 60) / 60));
    } catch {
      fallbackUsed = true;
      routeCoords = [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ];
    }

    let nearbyWarnings = 0;
    warningSpots.forEach((w) => {
      const near = routeCoords.some(([lat, lng]) => calcDistanceMeters(lat, lng, w.lat, w.lng) <= 80);
      if (near) nearbyWarnings += 1;
    });

    routeActive = true;
    drawRoutePolyline(routeCoords, fallbackUsed);

    return {
      active: true,
      originLabel: origin.label,
      destSpot: destination,
      distanceMeters,
      durationMinutes,
      nearbyWarnings,
      fallbackUsed
    };
  }

  return {
    init,
    renderMarkers,
    focusSpot,
    invalidateFullMap,
    locateUser,
    setPickMode,
    isPickMode,
    setPickedCoords,
    clearPickedCoords,
    getPickedCoords: () => pickedCoords,
    getUserLocation: () => userLocation,
    isRouteActive: () => routeActive,
    toggleSafeRoute,
    clearRoutes,
    hasLastRoute: () => Boolean(lastRouteCoords)
  };
}
