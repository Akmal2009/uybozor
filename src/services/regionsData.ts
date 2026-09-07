// O'zbekistonning barcha viloyatlari, tumanlari va markaziy koordinatalari
export interface RegionInfo {
  name: string;
  lat: number;
  lng: number;
  districts: { name: string; lat: number; lng: number }[];
}

export const UZBEKISTAN_REGIONS: RegionInfo[] = [
  {
    name: 'Toshkent shahri',
    lat: 41.2995,
    lng: 69.2401,
    districts: [
      { name: 'Yunusobod tumani', lat: 41.3643, lng: 69.2891 },
      { name: 'Mirzo Ulug\'bek tumani', lat: 41.3283, lng: 69.3347 },
      { name: 'Chilonzor tumani', lat: 41.2721, lng: 69.2045 },
      { name: 'Yakkasaroy tumani', lat: 41.2825, lng: 69.2522 },
      { name: 'Shayxontohur tumani', lat: 41.3195, lng: 69.2312 },
      { name: 'Olmazor tumani', lat: 41.3533, lng: 69.2241 },
      { name: 'Mirobod tumani', lat: 41.2917, lng: 69.2801 },
      { name: 'Uchtepa tumani', lat: 41.2934, lng: 69.1741 },
      { name: 'Sirg\'ali tumani', lat: 41.2235, lng: 69.2231 },
      { name: 'Yangi Hayot tumani', lat: 41.1995, lng: 69.1985 },
      { name: 'Bektemir tumani', lat: 41.2185, lng: 69.3391 },
      { name: 'Yashnobod tumani', lat: 41.2955, lng: 69.3312 }
    ]
  },
  {
    name: 'Surxondaryo viloyati',
    lat: 37.2242,
    lng: 67.2783,
    districts: [
      { name: 'Termiz shahri', lat: 37.2242, lng: 67.2783 },
      { name: 'Termiz tumani', lat: 37.3105, lng: 67.2141 },
      { name: 'Denov tumani', lat: 38.2765, lng: 67.8985 },
      { name: 'Sherobod tumani', lat: 37.6698, lng: 66.7022 },
      { name: 'Boysun tumani', lat: 38.2065, lng: 67.2015 },
      { name: 'Jarqo\'rg\'on tumani', lat: 37.5055, lng: 67.4125 },
      { name: 'Sho\'rchi tumani', lat: 38.0055, lng: 67.7845 },
      { name: 'Qumqo\'rg\'on tumani', lat: 37.8185, lng: 67.5875 },
      { name: 'Angor tumani', lat: 37.3825, lng: 67.1455 },
      { name: 'Muzrabot tumani', lat: 37.3455, lng: 66.8825 },
      { name: 'Oltinsoy tumani', lat: 38.2415, lng: 67.6255 },
      { name: 'Sariosiyo tumani', lat: 38.4855, lng: 68.0125 },
      { name: 'Uzun tumani', lat: 38.3845, lng: 68.0515 },
      { name: 'Qiziriq tumani', lat: 37.6185, lng: 67.0845 },
      { name: 'Bandixon tumani', lat: 37.7845, lng: 67.2515 }
    ]
  },
  {
    name: 'Toshkent viloyati',
    lat: 41.3111,
    lng: 69.2797,
    districts: [
      { name: 'Nurafshon shahri', lat: 41.0425, lng: 69.3585 },
      { name: 'Chirchiq shahri', lat: 41.4685, lng: 69.5825 },
      { name: 'Angren shahri', lat: 41.0165, lng: 70.1435 },
      { name: 'Olmaliq shahri', lat: 40.8525, lng: 69.5985 },
      { name: 'Bekobod shahri', lat: 40.2185, lng: 69.2615 },
      { name: 'Yangiyo\'l shahri', lat: 41.1185, lng: 69.0485 },
      { name: 'Qibray tumani', lat: 41.3895, lng: 69.4625 },
      { name: 'Zangiota tumani', lat: 41.2425, lng: 69.0855 },
      { name: 'Toshkent tumani', lat: 41.4185, lng: 69.2155 },
      { name: 'Bo\'stonliq tumani (Chorvoq)', lat: 41.6125, lng: 69.9655 },
      { name: 'Parkent tumani', lat: 41.2955, lng: 69.6755 },
      { name: 'O\'rtachirchiq tumani', lat: 41.0855, lng: 69.3455 },
      { name: 'Quyichirchiq tumani', lat: 40.9255, lng: 68.8555 },
      { name: 'Yuqorichirchiq tumani', lat: 41.2655, lng: 69.5455 },
      { name: 'Chinoz tumani', lat: 40.9425, lng: 68.7625 }
    ]
  },
  {
    name: 'Samarqand viloyati',
    lat: 39.6542,
    lng: 66.9597,
    districts: [
      { name: 'Samarqand shahri', lat: 39.6542, lng: 66.9597 },
      { name: 'Kattaqo\'rg\'on shahri', lat: 39.8955, lng: 66.2585 },
      { name: 'Samarqand tumani', lat: 39.5825, lng: 66.9125 },
      { name: 'Pastdarg\'om tumani', lat: 39.6845, lng: 66.6855 },
      { name: 'Urgut tumani', lat: 39.4055, lng: 67.2455 },
      { name: 'Toyloq tumani', lat: 39.5855, lng: 67.0985 },
      { name: 'Bulung\'ur tumani', lat: 39.7625, lng: 67.2755 },
      { name: 'Jomboy tumani', lat: 39.7025, lng: 67.0855 },
      { name: 'Payariq tumani', lat: 39.9955, lng: 66.8455 },
      { name: 'Ishtixon tumani', lat: 39.9625, lng: 66.4855 },
      { name: 'Oqdaryo tumani', lat: 39.7955, lng: 66.7455 }
    ]
  },
  {
    name: 'Farg\'ona viloyati',
    lat: 40.3842,
    lng: 71.7843,
    districts: [
      { name: 'Farg\'ona shahri', lat: 40.3842, lng: 71.7843 },
      { name: 'Marg\'ilon shahri', lat: 40.4725, lng: 71.7125 },
      { name: 'Qo\'qon shahri', lat: 40.5345, lng: 70.9425 },
      { name: 'Quvasoy shahri', lat: 40.3125, lng: 71.9755 },
      { name: 'Oltiariq tumani', lat: 40.3955, lng: 71.4955 },
      { name: 'Bag\'dod tumani', lat: 40.4525, lng: 71.2185 },
      { name: 'Beshariq tumani', lat: 40.4355, lng: 70.6125 },
      { name: 'Rishton tumani', lat: 40.3585, lng: 71.2845 },
      { name: 'Quva tumani', lat: 40.5215, lng: 72.0725 }
    ]
  },
  {
    name: 'Andijon viloyati',
    lat: 40.7821,
    lng: 72.3442,
    districts: [
      { name: 'Andijon shahri', lat: 40.7821, lng: 72.3442 },
      { name: 'Xonobod shahri', lat: 40.8055, lng: 73.0025 },
      { name: 'Asaka tumani', lat: 40.6425, lng: 72.2455 },
      { name: 'Shahrixon tumani', lat: 40.7125, lng: 72.0585 },
      { name: 'Baliqchi tumani', lat: 40.9325, lng: 71.9125 },
      { name: 'Oltinko\'l tumani', lat: 40.8015, lng: 72.1855 },
      { name: 'Izboskan tumani', lat: 40.9025, lng: 72.2455 },
      { name: 'Xo\'jaobod tumani', lat: 40.6725, lng: 72.5625 }
    ]
  },
  {
    name: 'Namangan viloyati',
    lat: 40.9983,
    lng: 71.6726,
    districts: [
      { name: 'Namangan shahri', lat: 40.9983, lng: 71.6726 },
      { name: 'Chust tumani', lat: 41.0055, lng: 71.2285 },
      { name: 'Pop tumani', lat: 40.8755, lng: 71.1055 },
      { name: 'Uychi tumani', lat: 41.0425, lng: 71.8555 },
      { name: 'Uchqo\'rg\'on tumani', lat: 41.1155, lng: 72.0785 },
      { name: 'Kosonsoy tumani', lat: 41.2555, lng: 71.5455 },
      { name: 'To\'raqo\'rg\'on tumani', lat: 41.0025, lng: 71.5125 }
    ]
  },
  {
    name: 'Buxoro viloyati',
    lat: 39.7747,
    lng: 64.4286,
    districts: [
      { name: 'Buxoro shahri', lat: 39.7747, lng: 64.4286 },
      { name: 'Kogon shahri', lat: 39.7225, lng: 64.5455 },
      { name: 'G\'ijduvon tumani', lat: 40.1025, lng: 64.6785 },
      { name: 'Vobkent tumani', lat: 40.0325, lng: 64.5125 },
      { name: 'Shofirkon tumani', lat: 40.1255, lng: 64.5025 },
      { name: 'Romitan tumani', lat: 39.9325, lng: 64.3825 },
      { name: 'Jondor tumani', lat: 39.7425, lng: 64.1855 },
      { name: 'Qorako\'l tumani', lat: 39.5025, lng: 63.8555 },
      { name: 'Olot tumani', lat: 39.4155, lng: 63.8055 }
    ]
  },
  {
    name: 'Qashqadaryo viloyati',
    lat: 38.8606,
    lng: 65.7891,
    districts: [
      { name: 'Qarshi shahri', lat: 38.8606, lng: 65.7891 },
      { name: 'Shahrisabz shahri', lat: 39.0525, lng: 66.8325 },
      { name: 'Kitob tumani', lat: 39.1355, lng: 66.8855 },
      { name: 'Yakkabog\' tumani', lat: 38.9825, lng: 66.6855 },
      { name: 'Qamashi tumani', lat: 38.8155, lng: 66.4625 },
      { name: 'G\'uzor tumani', lat: 38.6225, lng: 66.2555 },
      { name: 'Koson tumani', lat: 39.0385, lng: 65.5855 },
      { name: 'Chiroqchi tumani', lat: 39.0325, lng: 66.5725 },
      { name: 'Muborak tumani', lat: 39.2555, lng: 65.1555 },
      { name: 'Nishon tumani', lat: 38.6555, lng: 65.6855 },
      { name: 'Kasbi tumani', lat: 38.8355, lng: 65.4125 }
    ]
  },
  {
    name: 'Xorazm viloyati',
    lat: 41.5562,
    lng: 60.6313,
    districts: [
      { name: 'Urganch shahri', lat: 41.5562, lng: 60.6313 },
      { name: 'Xiva shahri', lat: 41.3785, lng: 60.3625 },
      { name: 'Xonqa tumani', lat: 41.4725, lng: 60.7855 },
      { name: 'Gurlan tumani', lat: 41.8455, lng: 60.3955 },
      { name: 'Shovot tumani', lat: 41.6585, lng: 60.3025 },
      { name: 'Hazorasp tumani', lat: 41.3155, lng: 61.0755 },
      { name: 'Qo\'shko\'pir tumani', lat: 41.5355, lng: 60.3455 }
    ]
  },
  {
    name: 'Navoiy viloyati',
    lat: 40.0844,
    lng: 65.3792,
    districts: [
      { name: 'Navoiy shahri', lat: 40.0844, lng: 65.3792 },
      { name: 'Zarafshon shahri', lat: 41.5725, lng: 64.1955 },
      { name: 'Karmana tumani', lat: 40.1385, lng: 65.3625 },
      { name: 'Qiziltepa tumani', lat: 40.0325, lng: 64.8255 },
      { name: 'Nurota tumani', lat: 40.5625, lng: 65.6885 },
      { name: 'Xatirchi tumani', lat: 40.0255, lng: 65.9555 },
      { name: 'Uchquduq tumani', lat: 42.1555, lng: 63.5555 }
    ]
  },
  {
    name: 'Jizzax viloyati',
    lat: 40.1158,
    lng: 67.8422,
    districts: [
      { name: 'Jizzax shahri', lat: 40.1158, lng: 67.8422 },
      { name: 'Zomin tumani', lat: 39.9625, lng: 68.3955 },
      { name: 'G\'allaorol tumani', lat: 40.0255, lng: 67.5855 },
      { name: 'Sharof Rashidov tumani', lat: 40.0855, lng: 67.8255 },
      { name: 'Do\'stlik tumani', lat: 40.5255, lng: 68.0355 },
      { name: 'Paxtakor tumani', lat: 40.3155, lng: 67.9555 },
      { name: 'Baxmal tumani', lat: 39.7855, lng: 68.0125 }
    ]
  },
  {
    name: 'Sirdaryo viloyati',
    lat: 40.4939,
    lng: 68.7847,
    districts: [
      { name: 'Guliston shahri', lat: 40.4939, lng: 68.7847 },
      { name: 'Shirin shahri', lat: 40.2185, lng: 69.1355 },
      { name: 'Yangiyer shahri', lat: 40.2725, lng: 68.8185 },
      { name: 'Sirdaryo tumani', lat: 40.8425, lng: 68.6655 },
      { name: 'Sayxunobod tumani', lat: 40.6725, lng: 68.9125 },
      { name: 'Boyovut tumani', lat: 40.3855, lng: 69.0455 },
      { name: 'Mirzaobod tumani', lat: 40.4655, lng: 68.6125 }
    ]
  },
  {
    name: 'Qoraqalpog\'iston Respublikasi',
    lat: 42.4619,
    lng: 59.6166,
    districts: [
      { name: 'Nukus shahri', lat: 42.4619, lng: 59.6166 },
      { name: 'Xo\'jayli tumani', lat: 42.4025, lng: 59.4555 },
      { name: 'Chimboy tumani', lat: 42.9425, lng: 59.7755 },
      { name: 'Beruniy tumani', lat: 41.6925, lng: 60.7555 },
      { name: 'To\'rtko\'l tumani', lat: 41.5555, lng: 61.0125 },
      { name: 'Mo\'ynoq tumani', lat: 43.7655, lng: 59.0255 },
      { name: 'Qo\'ng\'irot tumani', lat: 43.0455, lng: 58.8455 },
      { name: 'Amudaryo tumani', lat: 42.1155, lng: 60.1055 }
    ]
  }
];

// Koordinatadan manzilni aniqlash (Reverse Geocoding OpenStreetMap)
export const reverseGeocodeCoords = async (lat: number, lng: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=uz`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.address) return null;

    const address = data.address;
    const state = address.state || address.region || address.county || '';
    const city = address.city || address.town || address.village || address.municipality || address.district || '';
    const road = address.road || address.neighbourhood || address.suburb || address.quarter || address.residential || '';
    const houseNumber = address.house_number ? `, ${address.house_number}-uy` : '';

    return {
      state,
      city,
      street: road ? `${road}${houseNumber}` : (data.display_name?.split(',')[0] || ''),
      fullAddress: data.display_name || ''
    };
  } catch (e) {
    return null;
  }
};
