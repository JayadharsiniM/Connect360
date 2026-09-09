import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { getRoadRoute, haversineDistance } from '../services/routingService';

// Fix default Leaflet icon assets in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom HTML Icons using L.divIcon
function createCustomerIcon(label = 'Service Location') {
  return L.divIcon({
    className: 'custom-customer-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
        <div style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 800; font-family: 'Manrope', sans-serif; padding: 3px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; margin-bottom: 4px; display: flex; items-center; gap: 4px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: #10b981;"></span>
          <span>${label}</span>
        </div>
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 20px; height: 20px; border-radius: 9999px; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(37,99,235,0.6);"></div>
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(37,99,235,0.2); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createWorkerIcon(name = 'Specialist', etaMinutes = null, heading = 0) {
  const etaText = etaMinutes != null ? `⚡ ~${etaMinutes} min` : '⚡ En Route';
  return L.divIcon({
    className: 'custom-worker-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); pointer-events: auto; transition: transform 0.5s ease-out;">
        <div style="background: #2563eb; color: #ffffff; font-size: 10px; font-weight: 900; font-family: 'Manrope', sans-serif; padding: 2px 7px; border-radius: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.4); display: flex; align-items: center; gap: 4px; margin-bottom: 2px; white-space: nowrap;">
          <span>${etaText}</span>
          <span style="background: #1e40af; font-size: 8px; padding: 1px 4px; border-radius: 4px;">LIVE</span>
        </div>
        <div style="position: relative; width: 38px; height: 38px; background: #ffffff; border: 2.5px solid #2563eb; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 18px;">
          <span style="display: inline-block; transform: rotate(${heading || 0}deg);">🚐</span>
          <span style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #10b981; border: 2px solid #ffffff; border-radius: 9999px;"></span>
        </div>
        <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(4px); border: 1px solid #cbd5e1; font-size: 9px; font-weight: 800; color: #1e293b; padding: 1px 6px; border-radius: 4px; margin-top: 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); white-space: nowrap;">
          ${name}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * LiveTrackingMap Component
 */
export default function LiveTrackingMap({
  workerLocation,
  customerLocation,
  workerName = 'Specialist',
  customerLabel = 'Customer Address',
  onRouteCalculated,
  className = '',
  style = {},
  isWorkerPerspective = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const workerMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routeCasingRef = useRef(null);
  const lastRoutedWorkerPos = useRef(null);

  const [routeInfo, setRouteInfo] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default initial center (Chennai or Seattle depending on customer loc)
    const initLat = customerLocation?.lat || 13.0827;
    const initLng = customerLocation?.lng || 80.2707;

    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // High quality street map tiles (CartoDB Positron / OSM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Customer Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !customerLocation || !customerLocation.lat || !customerLocation.lng) return;

    const { lat, lng } = customerLocation;
    const label = isWorkerPerspective ? 'Customer Destination' : customerLabel;

    if (customerMarkerRef.current) {
      customerMarkerRef.current.setLatLng([lat, lng]);
      customerMarkerRef.current.setIcon(createCustomerIcon(label));
    } else {
      customerMarkerRef.current = L.marker([lat, lng], {
        icon: createCustomerIcon(label),
        zIndexOffset: 500,
      }).addTo(map);
    }
  }, [customerLocation, customerLabel, isWorkerPerspective, mapReady]);

  // Update Worker Marker & Recalculate Turn-by-Turn Road Route
  const updateRoute = useCallback(async (workerLat, workerLng, custLat, custLng) => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const route = await getRoadRoute(workerLat, workerLng, custLat, custLng);
      if (!route || !route.coordinates || route.coordinates.length === 0) return;

      setRouteInfo(route);
      if (onRouteCalculated) {
        onRouteCalculated(route);
      }

      // Draw or update the polyline
      const latLngs = route.coordinates;

      if (routeCasingRef.current) {
        routeCasingRef.current.setLatLngs(latLngs);
      } else {
        routeCasingRef.current = L.polyline(latLngs, {
          color: '#1d4ed8',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(latLngs);
      } else {
        routePolylineRef.current = L.polyline(latLngs, {
          color: '#2563eb',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '2, 8',
        }).addTo(map);
      }

      // Smoothly fit bounds to show both worker and destination
      const bounds = L.latLngBounds([
        [workerLat, workerLng],
        [custLat, custLng],
      ]);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
        duration: 0.8,
      });

      lastRoutedWorkerPos.current = { lat: workerLat, lng: workerLng };
    } catch (err) {
      console.error('Failed to update road route:', err);
    }
  }, [onRouteCalculated]);

  // Worker Location updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !workerLocation || !workerLocation.latitude || !workerLocation.longitude) return;

    const wLat = parseFloat(workerLocation.latitude);
    const wLng = parseFloat(workerLocation.longitude);
    const heading = parseFloat(workerLocation.heading || 0);
    const name = isWorkerPerspective ? 'You (Technician)' : workerName;
    const eta = routeInfo?.durationMinutes;

    if (workerMarkerRef.current) {
      workerMarkerRef.current.setLatLng([wLat, wLng]);
      workerMarkerRef.current.setIcon(createWorkerIcon(name, eta, heading));
    } else {
      workerMarkerRef.current = L.marker([wLat, wLng], {
        icon: createWorkerIcon(name, eta, heading),
        zIndexOffset: 1000,
      }).addTo(map);
    }

    // Check if worker has moved significantly (> 15 meters) or if route hasn't been computed yet
    if (customerLocation?.lat && customerLocation?.lng) {
      const last = lastRoutedWorkerPos.current;
      const movedDist = last ? haversineDistance(wLat, wLng, last.lat, last.lng) : 999;

      if (movedDist > 0.015) { // 15 meters
        updateRoute(wLat, wLng, customerLocation.lat, customerLocation.lng);
      }
    }
  }, [workerLocation, customerLocation, workerName, isWorkerPerspective, routeInfo?.durationMinutes, updateRoute, mapReady]);

  // Recenter helper
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (workerLocation?.latitude && customerLocation?.lat) {
      const bounds = L.latLngBounds([
        [workerLocation.latitude, workerLocation.longitude],
        [customerLocation.lat, customerLocation.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else if (customerLocation?.lat) {
      map.setView([customerLocation.lat, customerLocation.lng], 15, { animate: true });
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={style}>
      {/* The Leaflet DOM Element */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Floating HUD: Real Road Distance & Driving ETA */}
      {routeInfo && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 font-manrope">
                ~{routeInfo.durationMinutes} min drive
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                {routeInfo.distanceKm} km
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Real Road Routing • {routeInfo.source === 'google-maps' ? 'Google Maps Routes' : 'Turn-by-turn road network'}
            </p>
          </div>
        </div>
      )}

      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        type="button"
        title="Recenter Map"
        className="absolute bottom-4 right-4 z-[1000] bg-white hover:bg-slate-50 text-slate-700 p-2.5 rounded-xl border border-slate-200 shadow-md transition flex items-center justify-center cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px] text-blue-600">my_location</span>
      </button>

      {/* Map Attribution Watermark */}
      <div className="absolute bottom-1 left-2 z-[1000] pointer-events-none text-[9px] text-slate-400 bg-white/60 px-1.5 rounded">
        © OpenStreetMap • Turn-by-turn Road Routing
      </div>
    </div>
  );
}
