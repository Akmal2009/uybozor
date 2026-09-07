import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { reverseGeocodeCoords, UZBEKISTAN_REGIONS } from '../services/regionsData';

// Leaflet default icon
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (
    lat: number,
    lng: number,
    addressInfo?: { state?: string; city?: string; street?: string; fullAddress?: string }
  ) => void;
}

// Xarita bosilganda markerni siljitish
const LocationMarker: React.FC<{
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}> = ({ lat, lng, onChange }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    }
  });

  return <Marker position={[lat, lng]} icon={customIcon} />;
};

// Xarita markazini siljitish
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

export const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onLocationChange }) => {
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([
    lat || 41.2995,
    lng || 69.2401
  ]);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (lat && lng && (lat !== currentPosition[0] || lng !== currentPosition[1])) {
      setCurrentPosition([lat, lng]);
    }
  }, [lat, lng]);

  const handlePositionSelect = async (newLat: number, newLng: number) => {
    setCurrentPosition([newLat, newLng]);
    // Reverse geocoding orqali viloyat, tuman, ko'cha nomini aniqlash
    const addr = await reverseGeocodeCoords(newLat, newLng);
    onLocationChange(newLat, newLng, addr || undefined);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setCurrentPosition([newLat, newLng]);
          const addr = await reverseGeocodeCoords(newLat, newLng);
          onLocationChange(newLat, newLng, addr || undefined);
          setGeoLoading(false);
        },
        () => {
          setGeoLoading(false);
          alert('Geolokatsiya ruxsat etilmadi. Xaritadan o\'zingiz tanlashingiz mumkin.');
        }
      );
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-brand-600" />
          <span>Xaritadan aniq joyni tanlang (xaritani bosing):</span>
        </label>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all border border-brand-200 shadow-sm active:scale-95 disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-brand-600" />
          )}
          <span>{geoLoading ? 'Aniqlanmoqda...' : 'Mening joylashuvim'}</span>
        </button>
      </div>

      {/* Tezkor hudud tugmalari */}
      <div className="flex items-center gap-1 text-[11px] text-gray-500 overflow-x-auto pb-1 no-scrollbar">
        <span className="font-bold text-gray-700 shrink-0 mr-1">Tezkor viloyat:</span>
        {UZBEKISTAN_REGIONS.map(reg => (
          <button
            key={reg.name}
            type="button"
            onClick={() => handlePositionSelect(reg.lat, reg.lng)}
            className="px-2.5 py-1 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-700 rounded-lg shrink-0 font-medium transition-colors"
          >
            {reg.name.replace(' viloyati', '').replace(' Respublikasi', '')}
          </button>
        ))}
      </div>

      {/* Xarita */}
      <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-0">
        <MapContainer
          center={currentPosition}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            lat={currentPosition[0]}
            lng={currentPosition[1]}
            onChange={handlePositionSelect}
          />
          <RecenterMap lat={currentPosition[0]} lng={currentPosition[1]} />
        </MapContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 font-mono">
        <span>Kenglik: <strong>{currentPosition[0].toFixed(5)}</strong></span>
        <span>Uzunlik: <strong>{currentPosition[1].toFixed(5)}</strong></span>
      </div>
    </div>
  );
};
