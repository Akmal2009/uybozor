import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Listing } from '../types';
import { Link } from 'react-router-dom';
import { Bed, Maximize2, Sparkles, MapPin } from 'lucide-react';

interface MapListingViewProps {
  listings: Listing[];
}

export const MapListingView: React.FC<MapListingViewProps> = ({ listings }) => {
  // O'rtacha markazni aniqlash yoki Toshkent
  const defaultCenter: [number, number] = listings.length > 0 
    ? [listings[0].manzil_lat, listings[0].manzil_lng] 
    : [41.2995, 69.2401];

  const createCustomPriceIcon = (price: number, valyuta: string, isVip?: boolean) => {
    const formattedPrice = valyuta === 'USD' 
      ? `$${price.toLocaleString()}` 
      : `${(price / 1000000).toFixed(1)}M so'm`;

    return L.divIcon({
      className: 'custom-map-price-marker',
      html: `
        <div class="px-2.5 py-1 rounded-full text-xs font-bold shadow-md cursor-pointer transition-transform hover:scale-110 flex items-center gap-1 border ${
          isVip 
            ? 'bg-amber-500 text-white border-amber-300 ring-2 ring-amber-300' 
            : 'bg-brand-600 text-white border-brand-400'
        }">
          ${isVip ? '★ ' : ''}${formattedPrice}
        </div>
      `,
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    });
  };

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-sm border border-gray-200 relative">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {listings.map(item => (
          <Marker
            key={item.id}
            position={[item.manzil_lat, item.manzil_lng]}
            icon={createCustomPriceIcon(item.narx, item.valyuta, item.is_vip)}
          >
            <Popup className="listing-map-popup">
              <div className="w-64 overflow-hidden rounded-xl bg-white">
                <div className="relative h-32 w-full bg-gray-100">
                  <img
                    src={item.rasmlar[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'}
                    alt={item.manzil_matn}
                    width={256}
                    height={128}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow ${
                    item.turi === 'sotuv' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {item.turi === 'sotuv' ? 'Sotuv' : 'Ijara'}
                  </span>
                  {item.is_vip && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-900 bg-amber-300 flex items-center gap-0.5 shadow">
                      <Sparkles className="w-3 h-3 text-amber-700" /> VIP
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div className="text-base font-bold text-brand-700">
                    {item.valyuta === 'USD' ? `$${item.narx.toLocaleString()}` : `${item.narx.toLocaleString()} so'm`}
                    {item.turi === 'ijara' && <span className="text-xs text-gray-500 font-normal"> /oy</span>}
                  </div>

                  <p className="text-xs text-gray-700 line-clamp-1 flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {item.manzil_matn}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-600 border-t border-gray-100 pt-2">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-brand-500" />
                      {item.xonalar_soni} xona
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-brand-500" />
                      {item.maydon} m²
                    </span>
                  </div>

                  <Link
                    to={`/listing/${item.id}`}
                    className="block w-full py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-center rounded-lg text-xs font-semibold transition-colors mt-2"
                  >
                    Batafsil ko'rish
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
