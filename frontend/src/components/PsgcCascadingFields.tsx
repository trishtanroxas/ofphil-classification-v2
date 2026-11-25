'use client';
import React, { useEffect, useState } from 'react';
import {
  GeoItem,
  getRegions,
  getProvincesOrDistrictsByRegion,
  getCitiesMunicipalities,
  getBarangays,
  resolveRegionItem,
} from '@/lib/psgc';

export interface CascadingAddressValue {
  region: string;
  province: string;
  city: string;
  barangay: string;
  street?: string;
}

interface PsgcCascadingFieldsProps {
  region: string;
  province: string;
  city: string;
  barangay: string;
  street?: string;
  onChange: (next: CascadingAddressValue) => void;
  showStreet?: boolean;
  streetLabel?: string;
  streetPlaceholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

function matchGeoItem(items: GeoItem[], target: string): GeoItem | undefined {
  const norm = (target || '').trim().toLowerCase();
  if (!norm) return undefined;
  return (
    items.find((i) => i.name.toLowerCase() === norm) ||
    items.find((i) => i.name.toLowerCase().includes(norm) || norm.includes(i.name.toLowerCase()))
  );
}

export default function PsgcCascadingFields({
  region,
  province,
  city,
  barangay,
  street = '',
  onChange,
  showStreet = true,
  streetLabel = 'HOUSE / STREET / PUROK',
  streetPlaceholder = 'House No., Street, Purok / Subd.',
  disabled = false,
  compact = true,
}: PsgcCascadingFieldsProps) {
  const [regionsList, setRegionsList] = useState<GeoItem[]>([]);
  const [provincesList, setProvincesList] = useState<GeoItem[]>([]);
  const [citiesList, setCitiesList] = useState<GeoItem[]>([]);
  const [barangaysList, setBarangaysList] = useState<GeoItem[]>([]);

  // Synchronize dropdown option lists whenever external region/province/city values load or sync
  useEffect(() => {
    let active = true;
    async function syncHierarchy() {
      try {
        const regs = await getRegions();
        if (!active) return;
        setRegionsList(regs);

        const resolvedReg = await resolveRegionItem(region, province, regs);
        if (!active || !resolvedReg) return;

        const provs = await getProvincesOrDistrictsByRegion(resolvedReg.code);
        if (!active) return;
        setProvincesList(provs);

        const resolvedProv = matchGeoItem(provs, province) || provs[0];
        if (!active || !resolvedProv) return;

        const cities = await getCitiesMunicipalities(resolvedProv.code, resolvedProv.isDistrict);
        if (!active) return;
        setCitiesList(cities);

        const resolvedCity = matchGeoItem(cities, city) || cities[0];
        if (!active || !resolvedCity) return;

        const bgys = await getBarangays(resolvedCity.code);
        if (!active) return;
        setBarangaysList(bgys);

        // Backfill missing hierarchical labels if region was empty on initial load
        if (!region && (province || city)) {
          onChange({
            region: resolvedReg.name,
            province: province || resolvedProv.name,
            city: city || resolvedCity.name,
            barangay: barangay || bgys[0]?.name || '',
            street,
          });
        }
      } catch (err) {
        console.warn('PSGC cascading sync warning:', err);
      }
    }
    syncHierarchy();
    return () => {
      active = false;
    };
  }, [region, province, city]);

  const handleRegionSelect = async (newRegionName: string) => {
    if (disabled) return;
    const foundReg = regionsList.find((r) => r.name === newRegionName);
    if (!foundReg) {
      onChange({ region: newRegionName, province: '', city: '', barangay: '', street });
      return;
    }
    const provs = await getProvincesOrDistrictsByRegion(foundReg.code);
    setProvincesList(provs);
    const firstProv = provs[0];
    if (!firstProv) {
      setCitiesList([]);
      setBarangaysList([]);
      onChange({ region: newRegionName, province: '', city: '', barangay: '', street });
      return;
    }
    const cities = await getCitiesMunicipalities(firstProv.code, firstProv.isDistrict);
    setCitiesList(cities);
    const firstCity = cities[0];
    if (!firstCity) {
      setBarangaysList([]);
      onChange({ region: newRegionName, province: firstProv.name, city: '', barangay: '', street });
      return;
    }
    const bgys = await getBarangays(firstCity.code);
    setBarangaysList(bgys);
    onChange({
      region: newRegionName,
      province: firstProv.name,
      city: firstCity.name,
      barangay: bgys[0]?.name || 'Poblacion',
      street,
    });
  };

  const handleProvinceSelect = async (newProvName: string) => {
    if (disabled) return;
    const foundProv = provincesList.find((p) => p.name === newProvName);
    if (!foundProv) {
      onChange({ region, province: newProvName, city: '', barangay: '', street });
      return;
    }
    const cities = await getCitiesMunicipalities(foundProv.code, foundProv.isDistrict);
    setCitiesList(cities);
    const firstCity = cities[0];
    if (!firstCity) {
      setBarangaysList([]);
      onChange({ region, province: newProvName, city: '', barangay: '', street });
      return;
    }
    const bgys = await getBarangays(firstCity.code);
    setBarangaysList(bgys);
    onChange({
      region,
      province: newProvName,
      city: firstCity.name,
      barangay: bgys[0]?.name || 'Poblacion',
      street,
    });
  };

  const handleCitySelect = async (newCityName: string) => {
    if (disabled) return;
    const foundCity = citiesList.find((c) => c.name === newCityName);
    if (!foundCity) {
      onChange({ region, province, city: newCityName, barangay: '', street });
      return;
    }
    const bgys = await getBarangays(foundCity.code);
    setBarangaysList(bgys);
    onChange({
      region,
      province,
      city: newCityName,
      barangay: bgys[0]?.name || 'Poblacion',
      street,
    });
  };

  const hasCurrentReg = regionsList.some((r) => r.name === region);
  const hasCurrentProv = provincesList.some((p) => p.name === province);
  const hasCurrentCity = citiesList.some((c) => c.name === city);
  const hasCurrentBgy = barangaysList.some((b) => b.name === barangay);

  const heightCls = compact ? 'h-9 rounded-lg' : 'h-10 rounded-xl';
  const stateCls = disabled
    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
    : 'bg-white text-[#10241A] border-[#CBD5E1] focus:border-[#0B6B3A] cursor-pointer';

  return (
    <div className={`grid grid-cols-1 ${showStreet ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
      <div>
        <label className="block text-[11px] font-semibold text-[#475569] mb-1">REGION</label>
        <select
          value={region}
          disabled={disabled}
          onChange={(e) => handleRegionSelect(e.target.value)}
          className={`w-full ${heightCls} px-2.5 border text-xs focus:outline-none ${stateCls}`}
        >
          <option value="">-- Select Region --</option>
          {!hasCurrentReg && region && <option value={region}>{region}</option>}
          {regionsList.map((r) => (
            <option key={r.code} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#475569] mb-1">PROVINCE / DISTRICT</label>
        <select
          value={province}
          disabled={disabled}
          onChange={(e) => handleProvinceSelect(e.target.value)}
          className={`w-full ${heightCls} px-2.5 border text-xs focus:outline-none ${stateCls}`}
        >
          <option value="">-- Select Province / District --</option>
          {!hasCurrentProv && province && <option value={province}>{province}</option>}
          {provincesList.map((p) => (
            <option key={p.code} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#475569] mb-1">CITY / MUNICIPALITY</label>
        <select
          value={city}
          disabled={disabled}
          onChange={(e) => handleCitySelect(e.target.value)}
          className={`w-full ${heightCls} px-2.5 border text-xs focus:outline-none ${stateCls}`}
        >
          <option value="">-- Select City / Municipality --</option>
          {!hasCurrentCity && city && <option value={city}>{city}</option>}
          {citiesList.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#475569] mb-1">BARANGAY</label>
        <select
          value={barangay}
          disabled={disabled}
          onChange={(e) => onChange({ region, province, city, barangay: e.target.value, street })}
          className={`w-full ${heightCls} px-2.5 border text-xs focus:outline-none ${stateCls}`}
        >
          <option value="">-- Select Barangay --</option>
          {!hasCurrentBgy && barangay && <option value={barangay}>{barangay}</option>}
          {barangaysList.map((b) => (
            <option key={b.code} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {showStreet && (
        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">{streetLabel}</label>
          <input
            type="text"
            value={street}
            disabled={disabled}
            placeholder={streetPlaceholder}
            onChange={(e) => onChange({ region, province, city, barangay, street: e.target.value })}
            className={`w-full ${heightCls} px-3 border text-xs focus:outline-none ${
              disabled
                ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                : 'bg-white text-[#10241A] border-[#CBD5E1] focus:border-[#0B6B3A]'
            }`}
          />
        </div>
      )}
    </div>
  );
}

