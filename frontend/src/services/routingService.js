/**
 * Connect360 - Real Road Routing & Geocoding Service
 *
 * Computes actual road networks and turn-by-turn routes between
 * worker GPS coordinates and customer service locations.
 *
 * Supports:
 *   1. Google Maps Routes API (when VITE_GOOGLE_MAPS_API_KEY is configured)
 *   2. OSRM (Open Source Routing Machine) - Free, real turn-by-turn road geometry,
 *      distance in meters, and driving time in seconds with zero key requirement.
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Known city center defaults
const DEFAULT_LOCATIONS = {
  chennai: { lat: 13.0827, lng: 80.2707 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
};

// In-memory geocode cache
const geocodeCache = new Map();
// In-memory route cache
const routeCache = new Map();

/**
 * Geocode a text address to real latitude & longitude.
 * Uses Nominatim (OpenStreetMap) with local fallback.
 */
export async function geocodeAddress(address, fallbackCity = 'chennai') {
  const query = (address || '').trim();
  if (!query) {
    return DEFAULT_LOCATIONS[fallbackCity.toLowerCase()] || DEFAULT_LOCATIONS.chennai;
  }

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query);
  }

  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'Connect360-Service-Marketplace',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
        geocodeCache.set(query, coords);
        return coords;
      }
    }
  } catch (err) {
    console.warn('Geocoding service warning, using city centroid:', err);
  }

  // Fallback to city centroid if specific street lookup fails
  const cityKey = Object.keys(DEFAULT_LOCATIONS).find((c) => query.toLowerCase().includes(c)) || fallbackCity.toLowerCase();
  const fallback = DEFAULT_LOCATIONS[cityKey] || DEFAULT_LOCATIONS.chennai;
  geocodeCache.set(query, fallback);
  return fallback;
}

/**
 * Compute real road routing between origin (worker) and destination (customer).
 * Returns turn-by-turn road polyline points [[lat, lng], ...], distance in km, and ETA in minutes.
 */
export async function getRoadRoute(originLat, originLng, destLat, destLng) {
  const oLat = parseFloat(originLat);
  const oLng = parseFloat(originLng);
  const dLat = parseFloat(destLat);
  const dLng = parseFloat(destLng);

  if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
    return null;
  }

  // Cache key rounded to ~10 meters
  const cacheKey = `${oLat.toFixed(4)},${oLng.toFixed(4)}->${dLat.toFixed(4)},${dLng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // Option A: Google Maps Routes API (if key available)
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const googleRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: oLat, longitude: oLng } } },
          destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
      });

      if (googleRes.ok) {
        const data = await googleRes.json();
        const route = data.routes?.[0];
        if (route) {
          const meters = route.distanceMeters || 1000;
          const seconds = parseInt(route.duration?.replace('s', '') || '300', 10);
          const decoded = decodePolyline(route.polyline?.encodedPolyline || '');

          const result = {
            coordinates: decoded,
            distanceKm: (meters / 1000).toFixed(1),
            durationMinutes: Math.max(1, Math.round(seconds / 60)),
            source: 'google-maps',
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('Google Maps Routes API error, falling back to OSRM:', err);
    }
  }

  // Option B: OSRM (Open Source Routing Machine - 100% Free Road Routing)
  try {
    // Note: OSRM format is longitude,latitude;longitude,latitude
    const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // GeoJSON coordinates are [lon, lat] -> convert to Leaflet [lat, lon]
        const latLngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        const meters = route.distance || 1000;
        const seconds = route.duration || 300;

        const result = {
          coordinates: latLngs,
          distanceKm: (meters / 1000).toFixed(1),
          durationMinutes: Math.max(1, Math.round(seconds / 60)),
          source: 'osrm',
        };
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.error('OSRM route calculation error:', err);
  }

  // Fallback: interpolate points along the road corridor
  const dist = haversineDistance(oLat, oLng, dLat, dLng);
  return {
    coordinates: [
      [oLat, oLng],
      [(oLat + dLat) / 2 + 0.002, (oLng + dLng) / 2 - 0.002],
      [dLat, dLng],
    ],
    distanceKm: dist.toFixed(1),
    durationMinutes: Math.max(2, Math.round((dist / 30) * 60)), // 30 km/h avg speed
    source: 'fallback-corridor',
  };
}

/**
 * Great-circle distance in km (Haversine formula).
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Standard polyline decoder for Google Maps encoded polylines.
 */
function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
