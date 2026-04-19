import {
  component$,
  noSerialize,
  useSignal,
  useStyles$,
  useVisibleTask$,
} from "@builder.io/qwik";
import type { Map } from "leaflet";
import type { MapProps } from "~/models/map";
import leafletStyles from "leaflet/dist/leaflet.css?inline";

interface LeafletMapProps extends MapProps {
  height?: string | number;
  style?: 'standard' | 'satellite';
  interactive?: boolean;
}

export const LeafletMap = component$<LeafletMapProps>(({ location, height = '400px', style, markers, group, interactive = true }: LeafletMapProps) => {
  useStyles$(leafletStyles);

  const mapHeight = typeof height === 'number' ? `${height}px` : height;
  const mapContainerSig = useSignal<Map>();
  const mapId = useSignal(`map-${Math.random().toString(36).slice(2, 9)}`);

  useVisibleTask$(async ({ track }) => {
    track(location);
    track(() => style);
    track(() => interactive);
    if (group) track(group);
    if (markers) track(() => markers.length);

    const L = await import("leaflet");
    const { getBoundaryBox } = await import("../../helpers/boundary-box");

    // Cleanup previous map instance if it exists
    if (mapContainerSig.value) {
      mapContainerSig.value.remove();
      mapContainerSig.value = undefined;
    }

    const { value: locationData } = location;
    if (!locationData) return;

    const centerPosition: [number, number] = locationData.point as [number, number];

    // Initialize the map
    const map = L.map(mapId.value, {
      zoomControl: interactive,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
    }).setView(centerPosition, locationData.zoom || 14);

    const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const TILE_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const currentStyle = style || 'standard';
    const currentUrl = currentStyle === 'satellite' ? TILE_SATELLITE_URL : TILE_URL;
    const attribution = currentStyle === 'satellite'
      ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    L.tileLayer(currentUrl, {
      maxZoom: 20,
      attribution,
      crossOrigin: true,
      subdomains: 'abc', // subdomain support for OSM
    }).addTo(map);

    // Update boundary box
    locationData.boundaryBox = getBoundaryBox(map);

    // Configure default icons
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/marker-icon-2x.png",
      iconUrl: "/marker-icon.png",
      shadowUrl: "/marker-shadow.png",
    });

    const qwikIcon = L.divIcon({
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c1272d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 30], // Anchor at bottom center
    });

    if (locationData.marker) {
      L.marker(centerPosition, { icon: qwikIcon }).bindPopup(locationData.name || "Location").addTo(map);
    }

    if (markers && markers.length > 0) {
      markers.forEach(m => {
        const markerIcon = L.divIcon({
          className: 'marker-point',
          html: `<div class="bg-red-600 text-white rounded-full px-2 py-1 text-xs font-bold shadow-md" title="${m.name}" >${m.label}</div>`,
        });
        L.marker([+m.lat, +m.lon], { icon: markerIcon }).addTo(map);
      });
    }

    mapContainerSig.value = noSerialize(map);

    // CRITICAL: Leaflet needs to know when its container size changes
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  });

  return (
    <div
      id={mapId.value}
      style={{ width: '100%', height: mapHeight, minHeight: mapHeight }}
      class="rounded-2xl overflow-hidden shadow-inner bg-gray-100"
    ></div>
  );
});
