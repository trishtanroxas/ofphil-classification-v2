'use client';
import React, { useEffect, useState } from 'react';
import { getProvinces, getCitiesMunicipalities, getBarangays, GeoItem } from '@/lib/psgc';

interface PsgcAddressSelectorProps {
  province: string;
  city: string;
  barangay: string;
  street?: string;
  onProvinceChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onBarangayChange: (val: string) => void;
  onStreetChange?: (val: string) => void;
  showStreet?: boolean;
  streetLabel?: string;
}

export default function PsgcAddressSelector({
  province,
  city,
  barangay,
  street = '',
  onProvinceChange,
  onCityChange,
  onBarangayChange,
  onStreetChange,
  showStreet = true,
  streetLabel = 'House No., Street Name, Subd. / Building (Permanent Address)',
}: PsgcAddressSelectorProps) {
  const [provincesList, setProvincesList] = useState<GeoItem[]>([]);
  const [citiesList, setCitiesList] = useState<GeoItem[]>([]);
  const [barangaysList, setBarangaysList] = useState<GeoItem[]>([]);

  // Load Provinces on mount and resolve matching City & Barangay lists
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const provs = await getProvinces();
        if (!active) return;
        setProvincesList(provs);

        const targetProv =
          provs.find((p) => p.name.toLowerCase() === (province || '').toLowerCase()) ||
          provs.find((p) => p.code === '130000000') ||
          provs[0];

        if (targetProv) {
          const cities = await getCitiesMunicipalities(targetProv.code);
          if (!active) return;
          setCitiesList(cities);

          const targetCity =
            cities.find((c) => c.name.toLowerCase() === (city || '').toLowerCase()) ||
            cities.find((c) => c.name.toLowerCase().includes((city || 'manila').toLowerCase())) ||
            cities[0];

          if (targetCity) {
            const bgys = await getBarangays(targetCity.code);
            if (!active) return;
            setBarangaysList(bgys);
          }
        }
      } catch (e) {
        console.warn('PSGC init error:', e);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectProvince = async (provName: string) => {
    onProvinceChange(provName);
    const foundProv = provincesList.find((p) => p.name === provName);
    if (!foundProv) return;
    try {
      const cities = await getCitiesMunicipalities(foundProv.code);
      setCitiesList(cities);
      if (cities.length > 0) {
        const firstCity = cities[0];
        onCityChange(firstCity.name);
        const bgys = await getBarangays(firstCity.code);
        setBarangaysList(bgys);
        if (bgys.length > 0) {
          onBarangayChange(bgys[0].name);
        } else {
          onBarangayChange('Poblacion');
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSelectCity = async (cityName: string) => {
    onCityChange(cityName);
    const foundCity = citiesList.find((c) => c.name === cityName);
    if (!foundCity) return;
    try {
      const bgys = await getBarangays(foundCity.code);
      setBarangaysList(bgys);
      if (bgys.length > 0) {
        onBarangayChange(bgys[0].name);
      } else {
        onBarangayChange('Poblacion');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Ensure current value is always selectable even while list is loading
  const hasCurrentProv = provincesList.some((p) => p.name === province);
  const hasCurrentCity = citiesList.some((c) => c.name === city);
  const hasCurrentBgy = barangaysList.some((b) => b.name === barangay);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
            Province / Region <span className="text-red-500">*</span>
          </label>
          <select
            value={province}
            onChange={(e) => handleSelectProvince(e.target.value)}
            className="w-full h-10 px-3 text-xs bg-white border border-[#D5E2D9] rounded-xl text-[#10241A] focus:outline-none focus:border-[#0B6B3A] cursor-pointer"
          >
            {!hasCurrentProv && province && <option value={province}>{province}</option>}
            {provincesList.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
            City / Municipality <span className="text-red-500">*</span>
          </label>
          <select
            value={city}
            onChange={(e) => handleSelectCity(e.target.value)}
            className="w-full h-10 px-3 text-xs bg-white border border-[#D5E2D9] rounded-xl text-[#10241A] focus:outline-none focus:border-[#0B6B3A] cursor-pointer"
          >
            {!hasCurrentCity && city && <option value={city}>{city}</option>}
            {citiesList.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
            Barangay <span className="text-red-500">*</span>
          </label>
          <select
            value={barangay}
            onChange={(e) => onBarangayChange(e.target.value)}
            className="w-full h-10 px-3 text-xs bg-white border border-[#D5E2D9] rounded-xl text-[#10241A] focus:outline-none focus:border-[#0B6B3A] cursor-pointer"
          >
            {!hasCurrentBgy && barangay && <option value={barangay}>{barangay}</option>}
            {barangaysList.map((b) => (
              <option key={b.code} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showStreet && onStreetChange && (
        <div>
          <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1">
            {streetLabel}
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="e.g. Block 4 Lot 12, St. Jude Street"
            className="w-full h-10 px-3.5 text-xs bg-white border border-[#D5E2D9] rounded-xl text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
          />
        </div>
      )}
    </div>
  );
}
