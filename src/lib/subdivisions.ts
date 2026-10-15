/**
 * Canonical first-level subdivisions for the countries our applicants most
 * commonly live in, plus the correct local word for that level. Countries not
 * listed here fall back to a calm free-text control with a sensible label.
 */
type Subdivisions = { label: string; options?: string[] };

const REGION_LABELS: Record<string, string> = {
  FR: "Region",
  IT: "Region",
  PT: "District",
  NL: "Province",
  BE: "Province",
  ES: "Province",
  IE: "County",
  SE: "County",
  NO: "County",
  DK: "Region",
  CH: "Canton",
  AT: "State",
  AU: "State",
  NZ: "Region",
  BR: "State",
  IN: "State",
  JP: "Prefecture",
  AE: "Emirate",
  QA: "Municipality",
  SA: "Region",
  CN: "Province",
  MA: "Region",
  EG: "Governorate",
  ET: "Region",
  TZ: "Region",
  UG: "Region",
  RW: "Province",
  ZW: "Province",
  ZM: "Province",
  SN: "Region",
  CI: "District",
  CM: "Region",
  LR: "County",
  SL: "Province",
  GM: "Division",
  DE: "State",
};

export const SUBDIVISIONS: Record<string, Subdivisions> = {
  US: {
    label: "State",
    options: [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
      "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
      "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
      "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
      "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
      "Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah",
      "Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
    ],
  },
  CA: {
    label: "Province or territory",
    options: [
      "Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador",
      "Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec",
      "Saskatchewan","Yukon",
    ],
  },
  GB: {
    label: "Nation or region",
    options: [
      "England — East Midlands","England — East of England","England — Greater London",
      "England — North East","England — North West","England — South East","England — South West",
      "England — West Midlands","England — Yorkshire and the Humber","Northern Ireland",
      "Scotland","Wales",
    ],
  },
  NG: {
    label: "State",
    options: [
      "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River",
      "Delta","Ebonyi","Edo","Ekiti","Enugu","Federal Capital Territory","Gombe","Imo","Jigawa",
      "Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo",
      "Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
    ],
  },
  GH: {
    label: "Region",
    options: [
      "Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East",
      "Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North",
    ],
  },
  KE: {
    label: "County",
    options: [
      "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo",
      "Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui",
      "Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori",
      "Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri",
      "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana",
      "Uasin Gishu","Vihiga","Wajir","West Pokot",
    ],
  },
  ZA: {
    label: "Province",
    options: [
      "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","North West",
      "Northern Cape","Western Cape",
    ],
  },
};

export function subdivisionFor(countryCode: string): Subdivisions {
  const known = SUBDIVISIONS[countryCode];
  if (known) return known;
  return { label: REGION_LABELS[countryCode] ?? "State, province or region" };
}
