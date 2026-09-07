import React, { useState } from 'react';
import { FilterState } from '../types';
import { UZBEKISTAN_REGIONS } from '../services/regionsData';
import { Search, SlidersHorizontal, RotateCcw, Map, Grid, ChevronDown, Check, MapPin } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  viewMode: 'grid' | 'map';
  onViewModeChange: (mode: 'grid' | 'map') => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  totalCount
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const handleViloyatSelect = (v: string) => {
    onFilterChange({
      ...filters,
      viloyat: v === 'Barchasi' ? undefined : v,
      shahar: v === 'Barchasi' ? 'Barchasi' : v,
      tuman: undefined // Viloyat o'zgarganda tumanni tozalash
    });
  };

  const handleTumanSelect = (t: string) => {
    onFilterChange({
      ...filters,
      tuman: t === 'Barchasi' ? undefined : t
    });
  };

  const handleReset = () => {
    onFilterChange({
      turi: 'barchasi',
      viloyat: undefined,
      shahar: 'Barchasi',
      tuman: undefined,
      xonalar_soni: 'barchasi',
      minNarx: undefined,
      maxNarx: undefined,
      minMaydon: undefined,
      maxMaydon: undefined,
      searchQuery: '',
      sortBy: 'yangi'
    });
  };

  // Tanlangan viloyatga mos tumanlar ro'yxati
  const selectedRegion = UZBEKISTAN_REGIONS.find(
    r => r.name === filters.viloyat || (filters.shahar && filters.shahar.includes(r.name))
  );
  const availableDistricts = selectedRegion ? selectedRegion.districts : [];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-8 space-y-4">
      {/* Tepadagi Asosiy Tablar (Sotuv / Ijara) & Qidiruv */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Sotuv / Ijara switch */}
        <div className="inline-flex p-1.5 bg-gray-100/80 rounded-2xl self-start">
          <button
            type="button"
            onClick={() => updateFilter('turi', 'barchasi')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              filters.turi === 'barchasi'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Barchasi
          </button>
          <button
            type="button"
            onClick={() => updateFilter('turi', 'sotuv')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
              filters.turi === 'sotuv'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sotib olish
          </button>
          <button
            type="button"
            onClick={() => updateFilter('turi', 'ijara')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
              filters.turi === 'ijara'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Ijara
          </button>
        </div>

        {/* Qidiruv maydoni */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="filter-search-input"
            type="text"
            aria-label="Tuman, ko'cha, mahalla yoki xususiyat bo'yicha qidiruv"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="Tuman, ko'cha, mahalla yoki xususiyat bo'yicha qidiruv..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-gray-900 transition-all placeholder:text-gray-500"
          />
          {filters.searchQuery && (
            <button
              type="button"
              aria-label="Qidiruv matnini tozalash"
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Ko'rinish rejimi (Grid / Map) */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <div className="inline-flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              aria-label="E'lonlarni ro'yxat ko'rinishida ko'rsatish"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              title="Ro'yxat ko'rinishi"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Ro'yxat</span>
            </button>
            <button
              type="button"
              aria-label="E'lonlarni xaritada ko'rsatish"
              onClick={() => onViewModeChange('map')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-brand-800 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              title="Xaritada ko'rish"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Xarita</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asosiy filtrlar qatori: 1. Viloyat, 2. Shahar/Tuman, 3. Xonalar, 4. Narx, 5. Saralash */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
        {/* 1-Input: Viloyat tanlash */}
        <div>
          <label htmlFor="filter-viloyat-select" className="block text-xs font-bold text-gray-700 mb-1">
            1. Viloyat
          </label>
          <div className="relative">
            <select
              id="filter-viloyat-select"
              aria-label="Viloyat tanlash"
              value={filters.viloyat || (filters.shahar !== 'Barchasi' ? filters.shahar : 'Barchasi')}
              onChange={(e) => handleViloyatSelect(e.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white truncate pr-8 font-medium"
            >
              <option value="Barchasi">Barcha viloyatlar</option>
              {UZBEKISTAN_REGIONS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* 2-Input: Shahar yoki Tuman tanlash */}
        <div>
          <label htmlFor="filter-tuman-select" className="block text-xs font-bold text-gray-700 mb-1">
            2. Shahar / Tuman
          </label>
          <div className="relative">
            <select
              id="filter-tuman-select"
              aria-label="Shahar yoki tuman tanlash"
              value={filters.tuman || 'Barchasi'}
              onChange={(e) => handleTumanSelect(e.target.value)}
              disabled={availableDistricts.length === 0}
              className="w-full appearance-none bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white truncate pr-8 disabled:opacity-50 font-medium"
            >
              <option value="Barchasi">
                {availableDistricts.length === 0 ? 'Avval viloyatni tanlang' : 'Barcha tumanlar'}
              </option>
              {availableDistricts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* 3-Input: Xonalar soni */}
        <div>
          <span className="block text-xs font-bold text-gray-700 mb-1">Xonalar soni</span>
          <div className="flex bg-gray-50 border border-gray-300 rounded-xl p-0.5" role="group" aria-label="Xonalar soni bo'yicha filter">
            {['barchasi', 1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                aria-label={`Xonalar soni: ${num === 'barchasi' ? 'Barchasi' : num}`}
                onClick={() => updateFilter('xonalar_soni', num)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filters.xonalar_soni === num
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {num === 'barchasi' ? 'Har' : num === 5 ? '5+' : num}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Input: Narx oralig'i */}
        <div>
          <label htmlFor="filter-min-narx" className="block text-xs font-bold text-gray-700 mb-1">
            Narx ($)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="filter-min-narx"
              type="number"
              aria-label="Minimal narx"
              placeholder="dan"
              value={filters.minNarx || ''}
              onChange={(e) => updateFilter('minNarx', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-500 font-medium"
            />
            <span className="text-gray-500 font-bold">-</span>
            <input
              id="filter-max-narx"
              type="number"
              aria-label="Maksimal narx"
              placeholder="gacha"
              value={filters.maxNarx || ''}
              onChange={(e) => updateFilter('maxNarx', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-500 font-medium"
            />
          </div>
        </div>

        {/* 5-Input: Saralash & Qo'shimcha filter toggle */}
        <div>
          <label htmlFor="filter-sort-select" className="block text-xs font-bold text-gray-700 mb-1">
            Saralash
          </label>
          <div className="flex items-center gap-2">
            <select
              id="filter-sort-select"
              aria-label="E'lonlarni saralash tartibi"
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value as any)}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="yangi">Eng yangilari</option>
              <option value="arzon">Narx: arzon</option>
              <option value="qimmat">Narx: qimmat</option>
              <option value="maydon_katta">Katta maydon</option>
            </select>

            <button
              type="button"
              aria-label="Qo'shimcha filtrlarni ochish yoki yopish"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`p-2 rounded-xl border transition-colors ${
                isAdvancedOpen
                  ? 'bg-brand-50 border-brand-300 text-brand-700'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title="Qo'shimcha filtrlar"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Kengaytirilgan Filtrlar (Maydon, Tozalash) */}
      {isAdvancedOpen && (
        <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-2xl">
          <div>
            <label htmlFor="filter-min-maydon" className="block text-xs font-bold text-gray-700 mb-1">
              Maydoni (m²)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="filter-min-maydon"
                type="number"
                aria-label="Minimal maydon m²"
                placeholder="Min m²"
                value={filters.minMaydon || ''}
                onChange={(e) => updateFilter('minMaydon', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium placeholder:text-gray-500"
              />
              <span className="text-gray-500 font-bold">-</span>
              <input
                id="filter-max-maydon"
                type="number"
                aria-label="Maksimal maydon m²"
                placeholder="Max m²"
                value={filters.maxMaydon || ''}
                onChange={(e) => updateFilter('maxMaydon', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end justify-between gap-3">
            <span className="text-xs font-semibold text-gray-700">
              Topilgan e'lonlar: <strong className="text-gray-900">{totalCount} ta</strong>
            </span>
            <button
              type="button"
              aria-label="Barcha filtrlarni boshlang'ich holatga qaytarish"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-red-700 bg-white hover:bg-red-50 border border-gray-300 rounded-xl transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Filtrlarni tozalash
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
