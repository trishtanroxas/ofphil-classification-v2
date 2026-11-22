'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { getProvinces, getCitiesMunicipalities, getBarangays, GeoItem } from '@/lib/psgc';

// Geographic Reference Data for Philippine Provinces, Cities/Municipalities, and Barangays
const PHILIPPINE_GEO_DATA: Record<
  string,
  { cities: Record<string, string[]> }
> = {
  'Metro Manila (NCR)': {
    cities: {
      'Manila': [
        'Barangay 659 (Intramuros)',
        'Barangay 660 (Ermita)',
        'Barangay 666 (Malate)',
        'Barangay 400 (Sampaloc)',
        'Barangay 300 (Santa Cruz)',
        'Barangay 200 (Tondo)',
        'Barangay 800 (Paco)',
        'Barangay 900 (Santa Ana)',
      ],
      'Pasig City': [
        'San Nicolas',
        'Kapitolyo',
        'Ugong',
        'Rosario',
        'Caniogan',
        'Pinagbuhatan',
        'Bagong Ilog',
        'Maybunga',
        'Santa Lucia',
      ],
      'Quezon City': [
        'Batasan Hills',
        'Commonwealth',
        'Diliman',
        'Fairview',
        'Kamuning',
        'Loyola Heights',
        'Novaliches Proper',
        'Tandang Sora',
      ],
      'Caloocan City': [
        'Barangay 1',
        'Barangay 12',
        'Barangay 73',
        'Barangay 171 (Bagumbong)',
        'Barangay 178 (Camarin)',
      ],
      'Makati City': [
        'Poblacion',
        'Bel-Air',
        'San Lorenzo',
        'Pio del Pilar',
        'Pembo',
        'Comembo',
        'Guadalupe Nuevo',
      ],
      'Taguig City': [
        'Fort Bonifacio',
        'Ususan',
        'Western Bicutan',
        'Central Bicutan',
        'Tanyag',
        'Bagumbayan',
      ],
      'Mandaluyong City': [
        'Highway Hills',
        'Wack-Wack Greenhills',
        'Barangka Ilaya',
        'Plainview',
        'Hulo',
      ],
      'Marikina City': [
        'Concepcion Uno',
        'Concepcion Dos',
        'Marikina Heights',
        'San Roque',
        'Industrial Valley',
      ],
      'Parañaque City': [
        'Baclaran',
        'Don Bosco',
        'Moonwalk',
        'San Antonio',
        'BF Homes',
      ],
      'Pasay City': [
        'Barangay 76',
        'Barangay 183 (Villamor)',
        'Barangay 190',
        'San Isidro',
      ],
    },
  },
  'Rizal': {
    cities: {
      'Antipolo City': ['Dela Paz', 'San Roque', 'Cupang', 'Mayamot', 'Mambugan'],
      'Cainta': ['San Andres', 'San Juan', 'Santo Domingo', 'Santo Niño'],
      'Taytay': ['Dolores', 'San Isidro', 'San Juan', 'Muzon'],
      'San Mateo': ['Ampid I', 'Ampid II', 'Guinayang', 'Malanday'],
      'Binangonan': ['Bilibiran', 'Calumpang', 'Layunan', 'Tagpos'],
    },
  },
  'Bulacan': {
    cities: {
      'Malolos City': ['Catmon', 'Cofradia', 'Dakila', 'Guinhawa', 'San Gabriel'],
      'San Jose del Monte City': ['Graceville', 'Kaypian', 'Muzon', 'Tungkong Mangga'],
      'Meycauayan City': ['Bancal', 'Calvario', 'Camalig', 'Perez'],
      'Marilao': ['Ibayo', 'Lias', 'Poblacion I', 'Saog'],
    },
  },
  'Cavite': {
    cities: {
      'Bacoor City': ['Habay I', 'Mambog I', 'Molino III', 'Niog I', 'Panapaan I'],
      'Imus City': ['Alapan I-A', 'Bucandala I', 'Malagasang I-A', 'Poblacion I-A'],
      'Dasmariñas City': ['Burol', 'Fatima I', 'Paliparan III', 'Salawag', 'Sampaloc I'],
      'General Trias City': ['Bacao I', 'Manggahan', 'Navarro', 'San Francisco'],
    },
  },
  'Laguna': {
    cities: {
      'Santa Rosa City': ['Balibago', 'Dila', 'Don Jose', 'Macabling', 'Tagapo'],
      'Biñan City': ['Canlalay', 'De La Paz', 'San Antonio', 'San Vicente', 'Zapote'],
      'Calamba City': ['Canlubang', 'Halang', 'Parian', 'Real', 'Turbina'],
      'San Pedro City': ['Cuyab', 'Landayan', 'Nueva', 'San Antonio', 'San Roque'],
    },
  },
  'Pampanga': {
    cities: {
      'San Fernando City': ['Dolores', 'San Agustin', 'San Jose', 'Sindalan', 'Telabastagan'],
      'Angeles City': ['Balibago', 'Cutcut', 'Malabanias', 'Pulung Maragul', 'Sto. Domingo'],
    },
  },
  'Batangas': {
    cities: {
      'Batangas City': ['Alangilan', 'Balagtas', 'Bolbok', 'Kumintang Ibaba', 'Pallocan West'],
      'Lipa City': ['Balintawak', 'Marawoy', 'Mataas Na Lupa', 'Sabang', 'Tambolong'],
    },
  },
  'Pangasinan': {
    cities: {
      'Dagupan City': ['Bonuan Boquig', 'Bonuan Gueset', 'Lucao', 'Pantal', 'Tapuac'],
      'Urdaneta City': ['Anonas', 'Camantiles', 'Nancayasan', 'Pinmaludpod'],
    },
  },
};

const PROVINCE_OPTIONS = Object.keys(PHILIPPINE_GEO_DATA);

export default function RegisterPatientPage() {
  const router = useRouter();

  // Section 1: Assigned Identifier State (Auto-incremented after M26-11-00001 Juan Dela Cruz)
  const [patientCategory, setPatientCategory] = useState<'REGULAR' | 'CHARITY'>('REGULAR');
  const [patientId, setPatientId] = useState('M26-11-00002');
  const [existingPatients, setExistingPatients] = useState<Array<{ patient_id: string; first_name: string; last_name: string }>>([
    { patient_id: 'M26-11-00001', first_name: 'Juan', last_name: 'Dela Cruz' },
  ]);

  // Helper to compute next available non-duplicate M26-11-XXXXX sequence ID
  const computeNextPatientId = (records: Array<{ patient_id: string }>) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `M${yy}-${mm}-`;
    const usedIds = new Set(records.map((r) => (r.patient_id || '').trim().toUpperCase()));
    let maxSeq = 1; // M26-11-00001 is reserved for Juan Dela Cruz
    records.forEach((r) => {
      const pid = (r.patient_id || '').trim().toUpperCase();
      if (pid.startsWith(prefix)) {
        const num = parseInt(pid.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;
    while (usedIds.has(candidate)) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;
    }
    return candidate;
  };

  // Helper to compute next available interactive sequential Charity Case ID (format: MSW_FA_MMYY-XX)
  const computeNextCharityId = (records: Array<{ patient_id: string }>) => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `MSW_FA_${mm}${yy}-`;
    const usedIds = new Set(records.map((r) => (r.patient_id || '').trim().toUpperCase()));
    let maxSeq = 0;
    records.forEach((r) => {
      const pid = (r.patient_id || '').trim().toUpperCase();
      if (pid.startsWith(prefix)) {
        const num = parseInt(pid.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      } else {
        const m = pid.match(/^MSW_FA_(\d{2})(\d{2})-(\d+)$/);
        if (m && m[1] === mm && m[2] === yy) {
          const num = parseInt(m[3], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(2, '0')}`;
    while (usedIds.has(candidate)) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(2, '0')}`;
    }
    return candidate;
  };

  const handleCategoryChange = (newCat: 'REGULAR' | 'CHARITY') => {
    setPatientCategory(newCat);
    if (newCat === 'CHARITY') {
      const nextCharity = computeNextCharityId(existingPatients);
      setPatientId(nextCharity);
    } else {
      const nextReg = computeNextPatientId(existingPatients);
      setPatientId(nextReg);
    }
  };

  // Fetch existing patients from backend + localStorage on mount to auto-assign next sequence ID
  useEffect(() => {
    async function loadExistingPatientsForSeq() {
      const combined: Array<{ patient_id: string; first_name: string; last_name: string }> = [
        { patient_id: 'M26-11-00001', first_name: 'Juan', last_name: 'Dela Cruz' },
      ];
      try {
        const res = await fetch('http://localhost:8000/api/v1/patients');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((p: any) => {
              if (p.patient_id && !combined.some((c) => c.patient_id.toUpperCase() === String(p.patient_id).toUpperCase())) {
                combined.push({
                  patient_id: String(p.patient_id),
                  first_name: String(p.first_name || ''),
                  last_name: String(p.last_name || ''),
                });
              }
            });
          }
        }
      } catch {}

      try {
        const localSaved = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
        if (Array.isArray(localSaved)) {
          localSaved.forEach((p: any) => {
            if (p.patient_id && !combined.some((c) => c.patient_id.toUpperCase() === String(p.patient_id).toUpperCase())) {
              combined.push({
                patient_id: String(p.patient_id),
                first_name: String(p.first_name || ''),
                last_name: String(p.last_name || ''),
              });
            }
          });
        }
      } catch {}

      setExistingPatients(combined);
      setPatientId(computeNextPatientId(combined));
    }
    loadExistingPatientsForSeq();
  }, []);

  // Section 2: Patient Identity & Demographics State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<'Female (F)' | 'Male (M)'>('Female (F)');
  const [civilStatus, setCivilStatus] = useState('Single');
  const [numDependents, setNumDependents] = useState('0');

  // PSGC API Dynamic Reference State
  const [provincesList, setProvincesList] = useState<GeoItem[]>([]);
  const [permCitiesList, setPermCitiesList] = useState<GeoItem[]>([]);
  const [permBarangaysList, setPermBarangaysList] = useState<GeoItem[]>([]);
  const [altCitiesList, setAltCitiesList] = useState<GeoItem[]>([]);
  const [altBarangaysList, setAltBarangaysList] = useState<GeoItem[]>([]);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);

  // Address 1: Permanent Address State
  const [permStreet, setPermStreet] = useState('');
  const [permProvince, setPermProvince] = useState('Metro Manila (NCR)');
  const [permCity, setPermCity] = useState('Manila');
  const [permBarangay, setPermBarangay] = useState('Barangay 659 (Intramuros)');

  // Same Address Checkbox
  const [sameAddress, setSameAddress] = useState(true);

  // Address 2: Alternative / Current Present Address State
  const [altStreet, setAltStreet] = useState('');
  const [altProvince, setAltProvince] = useState('Metro Manila (NCR)');
  const [altCity, setAltCity] = useState('Manila');
  const [altBarangay, setAltBarangay] = useState('Barangay 659 (Intramuros)');

  // Socio-demographic fields
  const [educationalAttainment, setEducationalAttainment] = useState('High School Graduate / Level');
  const [employmentStatus, setEmploymentStatus] = useState('Employed (Full-time / Part-time)');
  const [occupation, setOccupation] = useState('');

  // Section 3: Patient Contact Information State
  const [mobileNumber, setMobileNumber] = useState('0917 123 4567');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  // Section 4: Initial Portal Credentials State
  const [initialPassword, setInitialPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Generation of random secure temporary password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInitialPassword(pwd);
    setConfirmPassword(pwd);
    toast.success('Generated secure temporary password');
  };

  // Initialize Provinces from PSGC Open API
  useEffect(() => {
    async function initGeo() {
      setIsLoadingGeo(true);
      try {
        const provs = await getProvinces();
        setProvincesList(provs);

        // Default to NCR (code: 130000000)
        const defaultProv = provs.find((p) => p.code === '130000000') || provs[0];
        if (defaultProv) {
          setPermProvince(defaultProv.name);
          setAltProvince(defaultProv.name);

          // Fetch cities for default province
          const cities = await getCitiesMunicipalities(defaultProv.code);
          setPermCitiesList(cities);
          setAltCitiesList(cities);

          const defaultCity = cities.find((c) => c.name.toLowerCase().includes('manila')) || cities[0];
          if (defaultCity) {
            setPermCity(defaultCity.name);
            setAltCity(defaultCity.name);

            // Fetch barangays for default city
            const bgys = await getBarangays(defaultCity.code);
            setPermBarangaysList(bgys);
            setAltBarangaysList(bgys);
            if (bgys.length > 0) {
              setPermBarangay(bgys[0].name);
              setAltBarangay(bgys[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load PSGC data:', err);
      } finally {
        setIsLoadingGeo(false);
      }
    }
    initGeo();
  }, []);

  // Permanent Address dropdown handlers (PSGC API)
  const handlePermProvinceChange = async (provName: string) => {
    setPermProvince(provName);
    const foundProv = provincesList.find((p) => p.name === provName);
    if (!foundProv) return;

    try {
      const cities = await getCitiesMunicipalities(foundProv.code);
      setPermCitiesList(cities);
      if (cities.length > 0) {
        setPermCity(cities[0].name);
        const bgys = await getBarangays(cities[0].code);
        setPermBarangaysList(bgys);
        if (bgys.length > 0) {
          setPermBarangay(bgys[0].name);
        } else {
          setPermBarangay('Poblacion');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermCityChange = async (cityName: string) => {
    setPermCity(cityName);
    const foundCity = permCitiesList.find((c) => c.name === cityName);
    if (!foundCity) return;

    try {
      const bgys = await getBarangays(foundCity.code);
      setPermBarangaysList(bgys);
      if (bgys.length > 0) {
        setPermBarangay(bgys[0].name);
      } else {
        setPermBarangay('Poblacion');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Alternative Address dropdown handlers (PSGC API)
  const handleAltProvinceChange = async (provName: string) => {
    setAltProvince(provName);
    const foundProv = provincesList.find((p) => p.name === provName);
    if (!foundProv) return;

    try {
      const cities = await getCitiesMunicipalities(foundProv.code);
      setAltCitiesList(cities);
      if (cities.length > 0) {
        setAltCity(cities[0].name);
        const bgys = await getBarangays(cities[0].code);
        setAltBarangaysList(bgys);
        if (bgys.length > 0) {
          setAltBarangay(bgys[0].name);
        } else {
          setAltBarangay('Poblacion');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAltCityChange = async (cityName: string) => {
    setAltCity(cityName);
    const foundCity = altCitiesList.find((c) => c.name === cityName);
    if (!foundCity) return;

    try {
      const bgys = await getBarangays(foundCity.code);
      setAltBarangaysList(bgys);
      if (bgys.length > 0) {
        setAltBarangay(bgys[0].name);
      } else {
        setAltBarangay('Poblacion');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Live duplicate checks for Assigned Patient ID and Patient Full Name
  const duplicateIdRecord = existingPatients.find(
    (p) => p.patient_id.trim().toUpperCase() === patientId.trim().toUpperCase()
  );

  const duplicateNameRecord =
    firstName.trim().length > 0 && lastName.trim().length > 0
      ? existingPatients.find(
          (p) =>
            p.first_name.trim().toLowerCase() === firstName.trim().toLowerCase() &&
            p.last_name.trim().toLowerCase() === lastName.trim().toLowerCase()
        )
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First Name and Last Name are required.');
      return;
    }
    if (duplicateIdRecord) {
      toast.error(
        `Duplicate Patient ID: ${patientId} is already assigned to ${duplicateIdRecord.first_name} ${duplicateIdRecord.last_name}.`
      );
      return;
    }
    if (duplicateNameRecord) {
      toast.error(
        `Duplicate Patient Name: "${firstName.trim()} ${lastName.trim()}" is already registered under Patient ID ${duplicateNameRecord.patient_id}.`
      );
      return;
    }
    if (!birthdate) {
      toast.error('Date of Birth is required.');
      return;
    }
    if (initialPassword && initialPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (initialPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Registering patient and provisioning portal credentials...');

    try {
      const response = await fetch('http://localhost:8000/api/v1/patients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId.trim().toUpperCase(),
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          suffix: suffix,
          birthdate: birthdate,
          sex: sex,
          civil_status: civilStatus,
          num_dependents: numDependents,
          perm_province: permProvince,
          perm_city: permCity,
          perm_barangay: permBarangay,
          perm_street: permStreet.trim(),
          same_address: sameAddress,
          alt_province: sameAddress ? permProvince : altProvince,
          alt_city: sameAddress ? permCity : altCity,
          alt_barangay: sameAddress ? permBarangay : altBarangay,
          alt_street: sameAddress ? permStreet.trim() : altStreet.trim(),
          educational_attainment: educationalAttainment,
          employment_status: employmentStatus,
          occupation: occupation.trim(),
          category: patientCategory,
          contact_number: mobileNumber,
          email_address: emailAddress.trim() || null,
          phone_verified: phoneVerified,
          email_verified: emailVerified,
          initial_password: initialPassword || 'Ofphil@2026',
          send_credentials_email: sendWelcomeEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.detail || 'Registration rejected due to duplicate record.', { id: toastId });
        setIsSubmitting(false);
        return;
      }

      // Persist in localStorage to keep frontend sequence counter in sync
      try {
        const localSaved = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
        localSaved.push({
          patient_id: patientId.trim().toUpperCase(),
          category: patientCategory,
          has_account: patientCategory !== 'CHARITY',
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          suffix: suffix,
          birthdate: birthdate,
          sex: sex.includes('Female') ? 'F' : 'M',
          civil_status: civilStatus,
          num_dependents: numDependents,
          perm_province: permProvince,
          perm_city: permCity,
          perm_barangay: permBarangay,
          perm_street: permStreet.trim(),
          same_address: sameAddress,
          alt_province: sameAddress ? permProvince : altProvince,
          alt_city: sameAddress ? permCity : altCity,
          alt_barangay: sameAddress ? permBarangay : altBarangay,
          alt_street: sameAddress ? permStreet.trim() : altStreet.trim(),
          educational_attainment: educationalAttainment,
          employment_status: employmentStatus,
          occupation: occupation.trim(),
          contact: mobileNumber,
          email: emailAddress.trim() || '',
          phone_verified: phoneVerified,
          email_verified: emailVerified,
          residence_city: permCity,
          residence_region: permProvince,
        });
        localStorage.setItem('ofphil_registered_patients', JSON.stringify(localSaved));
      } catch {}

      if (data.email_sent) {
        toast.success(`Patient registered & credentials emailed to ${emailAddress}!`, { id: toastId });
      } else {
        toast.success(`Patient ${firstName} ${lastName} (${patientId}) successfully registered!`, { id: toastId });
      }
      setTimeout(() => {
        router.push('/admin/patient-records');
      }, 1200);
    } catch {
      // Offline fallback: save state locally
      try {
        const localSaved = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
        localSaved.push({
          patient_id: patientId.trim().toUpperCase(),
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          suffix: suffix,
          birthdate: birthdate,
          sex: sex.includes('Female') ? 'F' : 'M',
          civil_status: civilStatus,
          num_dependents: numDependents,
          perm_province: permProvince,
          perm_city: permCity,
          perm_barangay: permBarangay,
          perm_street: permStreet.trim(),
          same_address: sameAddress,
          alt_province: sameAddress ? permProvince : altProvince,
          alt_city: sameAddress ? permCity : altCity,
          alt_barangay: sameAddress ? permBarangay : altBarangay,
          alt_street: sameAddress ? permStreet.trim() : altStreet.trim(),
          educational_attainment: educationalAttainment,
          employment_status: employmentStatus,
          occupation: occupation.trim(),
          contact: mobileNumber,
          email: emailAddress.trim() || '',
          phone_verified: phoneVerified,
          email_verified: emailVerified,
          residence_city: permCity,
          residence_region: permProvince,
        });
        localStorage.setItem('ofphil_registered_patients', JSON.stringify(localSaved));
      } catch {}
      toast.success(`Patient ${firstName} ${lastName} (${patientId}) registered into local masterlist!`, { id: toastId });
      setTimeout(() => {
        router.push('/admin/patient-records');
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available cities & barangays for Permanent Address
  const permAvailableCities = Object.keys(PHILIPPINE_GEO_DATA[permProvince]?.cities || {});
  const permAvailableBarangays = PHILIPPINE_GEO_DATA[permProvince]?.cities[permCity] || [];

  // Available cities & barangays for Alternative Address
  const altAvailableCities = Object.keys(PHILIPPINE_GEO_DATA[altProvince]?.cities || {});
  const altAvailableBarangays = PHILIPPINE_GEO_DATA[altProvince]?.cities[altCity] || [];

  return (
    <DashboardLayout
      title="Patient Account Registration · OFPHIL Staff Desk"
      subtitle="Authorized intake station: Register and provision verified patient credentials"
    >
      <div className="w-full pb-12">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F1EA] text-[#0B6B3A] rounded-full text-xs font-semibold mb-2.5">
              <i className="fa-solid fa-id-badge text-[11px]" />
              <span>Authorized Staff Desk</span>
            </div>
            <h1 className="font-['Outfit'] text-[24px] font-bold text-[#10241A] m-0 mb-1 tracking-tight">
              Register New Patient Account
            </h1>
            <p className="text-[13px] text-[#5A7466] m-0 leading-relaxed">
              Create a verified patient record and portal account. Only authenticated nurses and clinic administration may issue patient credentials.
            </p>
          </div>

          <Link
            href="/admin/patient-records"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] text-xs font-semibold transition no-underline shrink-0"
          >
            <i className="fa-solid fa-address-book text-xs text-[#64748B]" />
            <span>Patient Records</span>
          </Link>
        </div>

        {/* Notice Card: Direct Patient Registration */}
        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl p-4.5 mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="px-2.5 py-1 bg-[#166534] text-white rounded-md text-[11px] font-bold uppercase tracking-wider shrink-0">
              DIRECT REGISTRATION
            </span>
            <span className="text-[#14532D] leading-relaxed">
              <strong>Direct to Patient Records</strong> — Patients registered here receive an official Patient ID immediately and can log into their portal. When seeking financial subsidy for eye surgeries, patients or caseworkers can then submit a Step 1 Charity Assessment.
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#BBF7D0] rounded-lg text-[#166534] text-[11.5px] font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>Patient Master Record</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} id="patientRegistrationForm" className="space-y-6">
          {/* ========================================================
              SECTION 1: Patient Account & Assigned Identifier
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center gap-2 text-[#0B6B3A] font-bold text-sm mb-5 pb-3 border-b border-[#F1F5F9]">
              <i className="fa-solid fa-id-card-clip text-base" />
              <span>Section A — Patient Account &amp; Assigned Identifier</span>
            </div>

            {/* Category Selector Tabs */}
            <div className="mb-5 p-3.5 bg-[#FAFBF8] border border-[#CBD5E1] rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#10241A] block">Patient Category &amp; Registration Type</span>
                <span className="text-[11px] text-[#64748B]">
                  Select whether registering a Regular patient portal user or a Charity beneficiary case
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('REGULAR')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    patientCategory === 'REGULAR'
                      ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <i className="fa-solid fa-user text-[10px]" />
                  <span>Regular Patient (M26-11-XXXXX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('CHARITY')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    patientCategory === 'CHARITY'
                      ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-xs'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <i className="fa-solid fa-hand-holding-heart text-[10px]" />
                  <span>Charity Beneficiary (MSW_FA_MMYY-XX)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Assigned ID Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {patientCategory === 'CHARITY'
                      ? 'ASSIGNED CHARITY CASE NO. (FORMAT: MSW_FA_MMYY-XX)'
                      : 'ASSIGNED PATIENT ID (FORMAT: M[YY]-[MM]-[SEQ])'}
                  </label>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold ${duplicateIdRecord ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]' : 'bg-[#ECFDF5] text-[#0B6B3A] border border-[#A7F3D0]'}`}>
                    <i className={`fa-solid ${duplicateIdRecord ? 'fa-triangle-exclamation' : 'fa-circle-check'} text-[10px]`} />
                    <span>{duplicateIdRecord ? 'Duplicate ID Detected' : 'Sequential Identifier'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className={`h-12 px-4 font-mono text-base font-bold bg-[#F8FAFC] border-2 rounded-xl tracking-wider w-full focus:outline-none transition ${
                      duplicateIdRecord
                        ? 'text-[#DC2626] border-[#DC2626] bg-[#FEF2F2]/50 focus:border-[#DC2626]'
                        : 'text-[#0B6B3A] border-[#CBD5E1] focus:border-[#0B6B3A]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextId = patientCategory === 'CHARITY'
                        ? computeNextCharityId(existingPatients)
                        : computeNextPatientId(existingPatients);
                      setPatientId(nextId);
                      toast.success(`Assigned next sequential ID: ${nextId}`);
                    }}
                    title="Auto-generate next available sequential ID"
                    className="h-12 px-3.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0B6B3A] font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                  >
                    <i className="fa-solid fa-rotate text-xs" />
                    <span>Next ID</span>
                  </button>
                </div>

                {duplicateIdRecord ? (
                  <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11.5px] font-medium flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-exclamation shrink-0" />
                      <span>
                        <strong>{patientId.trim().toUpperCase()}</strong> is already assigned to{' '}
                        <strong>{duplicateIdRecord.first_name} {duplicateIdRecord.last_name}</strong>. Duplication is not allowed.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextId = patientCategory === 'CHARITY'
                          ? computeNextCharityId(existingPatients)
                          : computeNextPatientId(existingPatients);
                        setPatientId(nextId);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10.5px] font-bold shrink-0 border-0 cursor-pointer"
                    >
                      Use {patientCategory === 'CHARITY' ? computeNextCharityId(existingPatients) : computeNextPatientId(existingPatients)}
                    </button>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-[#64748B] flex items-center gap-1.5">
                    <i className="fa-solid fa-shield-halved text-[#0B6B3A] text-[11px]" />
                    <span>
                      {patientCategory === 'CHARITY'
                        ? 'Dynamic sequential charity case numbering for current month & year (November 2026: 1126).'
                        : 'Auto-incremented after existing record M26-11-00001 (Juan Dela Cruz) to prevent ID duplication.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Linking Existing Records Info */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center shrink-0 text-sm">
                  <i className="fa-solid fa-link" />
                </div>
                <div className="text-xs">
                  <strong className="text-[#1E293B] block mb-0.5">Linking Existing Records:</strong>
                  <span className="text-[#64748B] leading-relaxed">
                    If linking an existing patient record without a portal account, the backend automatically preserves their historical Patient ID.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 2: Patient Identity & Demographics
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center gap-2 text-[#0B6B3A] font-bold text-sm mb-5 pb-3 border-b border-[#F1F5F9]">
              <i className="fa-solid fa-address-card text-base" />
              <span>Section B — Patient Identity &amp; Demographics</span>
            </div>

            <div className="space-y-6">
              {/* Row 1: First Name, Middle Name, Last Name, Suffix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_firstName">
                    First Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    id="reg_firstName"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="e.g. Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_middleName">
                    Middle Name <span className="text-[#64748B] text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="reg_middleName"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="e.g. Santos"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_lastName">
                    Last Name / Surname <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    id="reg_lastName"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="e.g. Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_suffix">
                    Suffix <span className="text-[#64748B] text-[11px]">(Optional)</span>
                  </label>
                  <select
                    id="reg_suffix"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full h-11 px-3 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
              </div>

              {/* Real-time Duplicate Patient Name Warning */}
              {duplicateNameRecord && (
                <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-user-slash text-sm shrink-0" />
                    <span>
                      <strong>Duplicate Patient Name Detected:</strong> A patient named{' '}
                      <strong>&ldquo;{duplicateNameRecord.first_name} {duplicateNameRecord.last_name}&rdquo;</strong> is already registered under Patient ID{' '}
                      <strong className="font-mono underline">{duplicateNameRecord.patient_id}</strong>. Duplicate patient records are not permitted.
                    </span>
                  </div>
                  <Link
                    href={`/admin/patient-records/${duplicateNameRecord.patient_id}`}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] font-bold text-[11px] shrink-0 no-underline transition"
                  >
                    View Existing Record &rarr;
                  </Link>
                </div>
              )}

              {/* Row 2: Birthday, Sex, Civil Status, No. of Dependents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_birthdate">
                    Birthday / Date of Birth <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    id="reg_birthdate"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_sex">
                    Sex <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    id="reg_sex"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    value={sex}
                    onChange={(e) => setSex(e.target.value as any)}
                  >
                    <option value="Female (F)">Female (F)</option>
                    <option value="Male (M)">Male (M)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_civilStatus">
                    Civil Status <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    id="reg_civilStatus"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_dependents">
                    No. of Dependents <span className="text-[#64748B] text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    id="reg_dependents"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="0"
                    value={numDependents}
                    onChange={(e) => setNumDependents(e.target.value)}
                  />
                </div>
              </div>

              {/* --------------------------------------------------------
                  ADDRESS PART 1: Permanent Address (Dropdowns)
                 -------------------------------------------------------- */}
              <div className="p-4 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8]/70 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5">
                    <i className="fa-solid fa-house text-[11px]" />
                    <span>1. Permanent Address</span>
                  </span>
                  <span className="text-[11px] text-[#64748B]">Official home / provincial registry residence</span>
                </div>

                {/* Permanent Province, City, Barangay Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Province Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-1.5">
                      Province <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition cursor-pointer"
                      value={permProvince}
                      onChange={(e) => handlePermProvinceChange(e.target.value)}
                    >
                      {provincesList.length > 0 ? (
                        provincesList.map((p) => (
                          <option key={p.code} value={p.name}>
                            {p.name}
                          </option>
                        ))
                      ) : (
                        PROVINCE_OPTIONS.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* City / Municipality Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-1.5">
                      City / Municipality <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition cursor-pointer"
                      value={permCity}
                      onChange={(e) => handlePermCityChange(e.target.value)}
                    >
                      {permCitiesList.length > 0 ? (
                        permCitiesList.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      ) : (
                        permAvailableCities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Barangay Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-1.5">
                      Barangay <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition cursor-pointer"
                      value={permBarangay}
                      onChange={(e) => setPermBarangay(e.target.value)}
                    >
                      {permBarangaysList.length > 0 ? (
                        permBarangaysList.map((b) => (
                          <option key={b.code} value={b.name}>
                            {b.name}
                          </option>
                        ))
                      ) : (
                        permAvailableBarangays.map((bgy) => (
                          <option key={bgy} value={bgy}>
                            {bgy}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Permanent Street / House No. Input */}
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5">
                    House No., Street Name, Subd./Building <span className="text-[#64748B] text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="e.g. Block 4 Lot 12, St. Jude Village"
                    value={permStreet}
                    onChange={(e) => setPermStreet(e.target.value)}
                  />
                </div>
              </div>

              {/* --------------------------------------------------------
                  Same Address Checkbox Toggle
                 -------------------------------------------------------- */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#14532D]">
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                    className="accent-[#0B6B3A] w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Alternative / Current Present address is the same as Permanent Address</span>
                </label>

                <span className="text-[11px] text-[#166534] font-medium hidden sm:inline">
                  {sameAddress ? '✓ Synced with Permanent Address' : 'Separate address specified'}
                </span>
              </div>

              {/* --------------------------------------------------------
                  ADDRESS PART 2: Alternative / Current Present Address
                 -------------------------------------------------------- */}
              {!sameAddress && (
                <div className="p-4 rounded-xl border border-[#D5E2D9] bg-[#FAFBF8]/70 space-y-4 transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5">
                      <i className="fa-solid fa-map-location-dot text-[11px]" />
                      <span>2. Alternative / Current Present Address</span>
                    </span>
                    <span className="text-[11px] text-[#64748B]">Where the patient is currently staying/boarding</span>
                  </div>

                  {/* Alternative Province, City, Barangay Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Province Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-1.5">
                        Province <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition cursor-pointer"
                        value={altProvince}
                        onChange={(e) => handleAltProvinceChange(e.target.value)}
                      >
                        {provincesList.length > 0 ? (
                          provincesList.map((p) => (
                            <option key={p.code} value={p.name}>
                              {p.name}
                            </option>
                          ))
                        ) : (
                          PROVINCE_OPTIONS.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* City / Municipality Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-1.5">
                        City / Municipality <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition cursor-pointer"
                        value={altCity}
                        onChange={(e) => handleAltCityChange(e.target.value)}
                      >
                        {altCitiesList.length > 0 ? (
                          altCitiesList.map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.name}
                            </option>
                          ))
                        ) : (
                          altAvailableCities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Barangay Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-[#334155] mb-1.5">
                        Barangay <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition cursor-pointer"
                        value={altBarangay}
                        onChange={(e) => setAltBarangay(e.target.value)}
                      >
                        {altBarangaysList.length > 0 ? (
                          altBarangaysList.map((b) => (
                            <option key={b.code} value={b.name}>
                              {b.name}
                            </option>
                          ))
                        ) : (
                          altAvailableBarangays.map((bgy) => (
                            <option key={bgy} value={bgy}>
                              {bgy}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Alternative Street / House No. Input */}
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-1.5">
                      House No., Street Name, Subd./Building <span className="text-[#64748B] text-[11px]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                      placeholder="e.g. Unit 3B, Sunshine Dormitory"
                      value={altStreet}
                      onChange={(e) => setAltStreet(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Row 4: Educational Attainment, Employment Status, Occupation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_education">
                    Educational Attainment <span className="text-[#64748B] text-[11px]">(Optional)</span>
                  </label>
                  <select
                    id="reg_education"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    value={educationalAttainment}
                    onChange={(e) => setEducationalAttainment(e.target.value)}
                  >
                    <option value="Elementary Graduate / Level">Elementary Graduate / Level</option>
                    <option value="High School Graduate / Level">High School Graduate / Level</option>
                    <option value="Vocational / Tech Course">Vocational / Tech Course</option>
                    <option value="College Undergraduate">College Undergraduate</option>
                    <option value="College Graduate">College Graduate</option>
                    <option value="None / Informal">None / Informal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_employment">
                    Employment Status <span className="text-[#64748B] text-[11px]">(Optional)</span>
                  </label>
                  <select
                    id="reg_employment"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                  >
                    <option value="Employed (Full-time / Part-time)">Employed (Full-time / Part-time)</option>
                    <option value="Self-Employed / Informal">Self-Employed / Informal</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Retired / Pensioner">Retired / Pensioner</option>
                    <option value="Student">Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_occupation">
                    Occupation <span className="text-[#DC2626]">* Required</span>
                  </label>
                  <input
                    type="text"
                    id="reg_occupation"
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="e.g. Driver, Vendor, Clerk"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 3: Patient Contact Information
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center gap-2 text-[#0B6B3A] font-bold text-sm mb-4 pb-3 border-b border-[#F1F5F9]">
              <i className="fa-solid fa-phone text-base" />
              <span>Section C — Patient Contact Information</span>
            </div>

            {/* Info Notice Banner */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-5 flex items-center gap-2 text-xs text-[#475569]">
              <i className="fa-solid fa-circle-info text-[#0B6B3A] text-sm shrink-0" />
              <span>
                Verified contact information is required for two-factor authentication (OTP) and secure password reset links. Please confirm phone/email accuracy with the patient.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mobile Phone Number */}
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-[#334155]" htmlFor="reg_mobile">
                  Mobile Phone Number <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  id="reg_mobile"
                  className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  placeholder="0917 123 4567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                />
                <div className="text-[11px] text-[#64748B]">
                  Standard Philippine mobile format (09XX or +639XX)
                </div>

                <label className="flex items-center gap-2 pt-1 text-xs text-[#1E293B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={phoneVerified}
                    onChange={(e) => setPhoneVerified(e.target.checked)}
                    className="accent-[#0B6B3A] w-4 h-4 rounded"
                  />
                  <span className="font-medium">Phone Verified: Confirmed in-person with patient handset</span>
                </label>
              </div>

              {/* Email Address */}
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-[#334155]" htmlFor="reg_email">
                  Email Address <span className="text-[#64748B] text-[11px]">(Optional — For Portal Activation)</span>
                </label>
                <input
                  type="email"
                  id="reg_email"
                  className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                  placeholder="patient@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
                <div className="text-[11px] text-[#64748B]">
                  Patients without email can still log in using Patient ID &amp; SMS OTP.
                </div>

                <label className="flex items-center gap-2 pt-1 text-xs text-[#1E293B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailVerified}
                    onChange={(e) => setEmailVerified(e.target.checked)}
                    className="accent-[#0B6B3A] w-4 h-4 rounded"
                  />
                  <span>Email Verified: Address verified by patient</span>
                </label>

                {emailAddress.trim() && (
                  <label className="flex items-center gap-2 pt-1 text-xs text-[#064826] font-semibold cursor-pointer bg-[#E8F5EC] border border-[#A7F3D0] p-2.5 rounded-xl">
                    <input
                      type="checkbox"
                      checked={sendWelcomeEmail}
                      onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                      className="accent-[#0B6B3A] w-4 h-4 rounded"
                    />
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-paper-plane text-xs text-[#0B6B3A]" />
                      <span>Send Welcome Email with Portal credentials &amp; login link to patient</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 4: Initial Portal Credentials
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center gap-2 text-[#0B6B3A] font-bold text-sm mb-4 pb-3 border-b border-[#F1F5F9]">
              <i className="fa-solid fa-shield-halved text-base" />
              <span>Section D — Initial Portal Credentials</span>
            </div>

            {/* Info Security Notice Banner */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-5 flex items-center gap-2 text-xs text-[#475569]">
              <i className="fa-solid fa-lock text-[#0B6B3A] text-sm shrink-0" />
              <span>
                <strong>Security Standard:</strong> Passwords are cryptographically hashed with PBKDF2/SHA-256 and never stored in plaintext. Patients who supply an email will also receive a secure activation link to set their own permanent password.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Initial Password */}
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_initPassword">
                  Initial Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="reg_initPassword"
                    className="w-full h-11 pl-3.5 pr-10 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="Min 6 characters"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] text-sm bg-transparent border-none cursor-pointer"
                  >
                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
                <PasswordStrengthMeter password={initialPassword} showChecks={true} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1.5" htmlFor="reg_confirmPassword">
                  Confirm Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="reg_confirmPassword"
                    className="w-full h-11 pl-3.5 pr-10 border border-[#D5E2D9] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96] hover:text-[#10241A] text-sm bg-transparent border-none cursor-pointer"
                  >
                    <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Secure Password Button */}
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition cursor-pointer"
            >
              <i className="fa-solid fa-key text-xs text-[#0B6B3A]" />
              <span>Generate Secure Temporary Password</span>
            </button>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
            <Link
              href="/admin/patient-records"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition no-underline"
            >
              <i className="fa-solid fa-xmark text-xs" />
              <span>Cancel</span>
            </Link>

            <button
              type="submit"
              className="saas-btn-primary px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#084D2C] text-white text-xs font-semibold border-none cursor-pointer flex items-center gap-2 transition shadow-md"
            >
              <span>Review &amp; Confirm Registration</span>
              <i className="fa-solid fa-arrow-right text-[11px]" />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
