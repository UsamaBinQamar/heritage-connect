-- =========================================================================
-- MotherlandMatch, Milestone 1 schema
--
-- Replaces the 30 migrations of the original project with the launch scope only:
-- the seven-step application, private photos, staff access, the contact form
-- and the catalogs the form reads. Written for a fresh database.
--
-- Not included (later milestones or out of scope): assignments, matchmaker
-- notes, review decisions, audit events, draft recovery codes, introductions,
-- feedback, shortlists, memberships, pricing, deletion requests, notifications,
-- push subscriptions, follow-ups, verifications.
-- =========================================================================

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('staff');
CREATE TYPE public.application_status AS ENUM ('draft','submitted','accepted','waitlisted','declined');
CREATE TYPE public.section_key AS ENUM ('contact','identity','life','relationship','partner_preferences','photos','consent');
CREATE TYPE public.preference_weight AS ENUM ('must_have','strong_preference','nice_to_have','does_not_matter');
CREATE TYPE public.photo_review_status AS ENUM ('uploaded','pending_review','approved','rejected');
CREATE TYPE public.gender_type AS ENUM ('woman','man','other','prefer_not_to_say');
CREATE TYPE public.education_level AS ENUM ('secondary','vocational','bachelors','masters','doctorate','other');
CREATE TYPE public.employment_status AS ENUM ('employed','self_employed','business_owner','student','not_working','other');
CREATE TYPE public.yes_no AS ENUM ('no','yes');
CREATE TYPE public.wants_children_type AS ENUM ('yes','no','open','not_sure');
CREATE TYPE public.legal_status_type AS ENUM ('single','divorced','widowed','legally_separated','other');
CREATE TYPE public.marital_history_type AS ENUM ('never_married','previously_divorced','previously_widowed','other');
CREATE TYPE public.smoking_type AS ENUM ('never','sometimes','regularly');
CREATE TYPE public.drinking_type AS ENUM ('never','socially','regularly');
CREATE TYPE public.faith_observance_type AS ENUM ('not_important','somewhat','important','central');
CREATE TYPE public.looking_for_type AS ENUM ('marriage','marriage_open_to_serious');
CREATE TYPE public.marriage_timeline_type AS ENUM ('ready_now','within_1_year','within_2_years','unhurried');
CREATE TYPE public.yes_no_depends AS ENUM ('yes','no','depends');
CREATE TYPE public.introduction_style_type AS ENUM ('blind_first','photo_first','matchmaker_decides');

-- ============ SHARED HELPERS ============
CREATE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE FUNCTION public.is_country_code_array(_codes text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _codes IS NULL OR (
    array_length(_codes,1) IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM unnest(_codes) c WHERE c !~ '^[A-Z]{2}$')
  );
$$;

CREATE FUNCTION public.is_clean_token_array(_vals text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _vals IS NULL OR (
    array_length(_vals,1) IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM unnest(_vals) v WHERE v IS NULL OR btrim(v) = '')
  );
$$;

-- ============ CATALOGS ============
CREATE TABLE public.countries (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z]{2}$'),
  name text NOT NULL,
  calling_code text,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.languages (
  code text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.cultural_backgrounds (
  id text PRIMARY KEY,
  label text NOT NULL,
  grouping text,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.profession_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.industries (
  id text PRIMARY KEY,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.religions (
  id text PRIMARY KEY,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO public.countries (code, name) VALUES
('AD','Andorra'),('AE','United Arab Emirates'),('AF','Afghanistan'),('AG','Antigua & Barbuda'),('AI','Anguilla'),('AL','Albania'),('AM','Armenia'),('AO','Angola'),('AR','Argentina'),('AS','American Samoa'),('AT','Austria'),('AU','Australia'),('AW','Aruba'),('AX','Aland Islands'),('AZ','Azerbaijan'),('BA','Bosnia & Herzegovina'),('BB','Barbados'),('BD','Bangladesh'),('BE','Belgium'),('BF','Burkina Faso'),('BG','Bulgaria'),('BH','Bahrain'),('BI','Burundi'),('BJ','Benin'),('BL','St. Barthelemy'),('BM','Bermuda'),('BN','Brunei'),('BO','Bolivia'),('BQ','Caribbean Netherlands'),('BR','Brazil'),('BS','Bahamas'),('BT','Bhutan'),('BW','Botswana'),('BY','Belarus'),('BZ','Belize'),('CA','Canada'),('CC','Cocos (Keeling) Islands'),('CD','Congo - Kinshasa'),('CF','Central African Republic'),('CG','Congo - Brazzaville'),('CH','Switzerland'),('CI','Cote d''Ivoire'),('CK','Cook Islands'),('CL','Chile'),('CM','Cameroon'),('CN','China'),('CO','Colombia'),('CR','Costa Rica'),('CU','Cuba'),('CV','Cape Verde'),('CW','Curacao'),('CX','Christmas Island'),('CY','Cyprus'),('CZ','Czechia'),('DE','Germany'),('DJ','Djibouti'),('DK','Denmark'),('DM','Dominica'),('DO','Dominican Republic'),('DZ','Algeria'),('EC','Ecuador'),('EE','Estonia'),('EG','Egypt'),('EH','Western Sahara'),('ER','Eritrea'),('ES','Spain'),('ET','Ethiopia'),('FI','Finland'),('FJ','Fiji'),('FK','Falkland Islands'),('FM','Micronesia'),('FO','Faroe Islands'),('FR','France'),('GA','Gabon'),('GB','United Kingdom'),('GD','Grenada'),('GE','Georgia'),('GF','French Guiana'),('GG','Guernsey'),('GH','Ghana'),('GI','Gibraltar'),('GL','Greenland'),('GM','Gambia'),('GN','Guinea'),('GP','Guadeloupe'),('GQ','Equatorial Guinea'),('GR','Greece'),('GT','Guatemala'),('GU','Guam'),('GW','Guinea-Bissau'),('GY','Guyana'),('HK','Hong Kong SAR China'),('HN','Honduras'),('HR','Croatia'),('HT','Haiti'),('HU','Hungary'),('ID','Indonesia'),('IE','Ireland'),('IL','Israel'),('IM','Isle of Man'),('IN','India'),('IO','British Indian Ocean Territory'),('IQ','Iraq'),('IR','Iran'),('IS','Iceland'),('IT','Italy'),('JE','Jersey'),('JM','Jamaica'),('JO','Jordan'),('JP','Japan'),('KE','Kenya'),('KG','Kyrgyzstan'),('KH','Cambodia'),('KI','Kiribati'),('KM','Comoros'),('KN','St. Kitts & Nevis'),('KP','North Korea'),('KR','South Korea'),('KW','Kuwait'),('KY','Cayman Islands'),('KZ','Kazakhstan'),('LA','Laos'),('LB','Lebanon'),('LC','St. Lucia'),('LI','Liechtenstein'),('LK','Sri Lanka'),('LR','Liberia'),('LS','Lesotho'),('LT','Lithuania'),('LU','Luxembourg'),('LV','Latvia'),('LY','Libya'),('MA','Morocco'),('MC','Monaco'),('MD','Moldova'),('ME','Montenegro'),('MF','St. Martin'),('MG','Madagascar'),('MH','Marshall Islands'),('MK','North Macedonia'),('ML','Mali'),('MM','Myanmar (Burma)'),('MN','Mongolia'),('MO','Macao SAR China'),('MP','Northern Mariana Islands'),('MQ','Martinique'),('MR','Mauritania'),('MS','Montserrat'),('MT','Malta'),('MU','Mauritius'),('MV','Maldives'),('MW','Malawi'),('MX','Mexico'),('MY','Malaysia'),('MZ','Mozambique'),('NA','Namibia'),('NC','New Caledonia'),('NE','Niger'),('NF','Norfolk Island'),('NG','Nigeria'),('NI','Nicaragua'),('NL','Netherlands'),('NO','Norway'),('NP','Nepal'),('NR','Nauru'),('NU','Niue'),('NZ','New Zealand'),('OM','Oman'),('PA','Panama'),('PE','Peru'),('PF','French Polynesia'),('PG','Papua New Guinea'),('PH','Philippines'),('PK','Pakistan'),('PL','Poland'),('PM','St. Pierre & Miquelon'),('PN','Pitcairn Islands'),('PR','Puerto Rico'),('PS','Palestinian Territories'),('PT','Portugal'),('PW','Palau'),('PY','Paraguay'),('QA','Qatar'),('RE','Reunion'),('RO','Romania'),('RS','Serbia'),('RU','Russia'),('RW','Rwanda'),('SA','Saudi Arabia'),('SB','Solomon Islands'),('SC','Seychelles'),('SD','Sudan'),('SE','Sweden'),('SG','Singapore'),('SH','St. Helena'),('SI','Slovenia'),('SJ','Svalbard & Jan Mayen'),('SK','Slovakia'),('SL','Sierra Leone'),('SM','San Marino'),('SN','Senegal'),('SO','Somalia'),('SR','Suriname'),('SS','South Sudan'),('ST','Sao Tome & Principe'),('SV','El Salvador'),('SX','Sint Maarten'),('SY','Syria'),('SZ','Eswatini'),('TC','Turks & Caicos Islands'),('TD','Chad'),('TG','Togo'),('TH','Thailand'),('TJ','Tajikistan'),('TK','Tokelau'),('TL','Timor-Leste'),('TM','Turkmenistan'),('TN','Tunisia'),('TO','Tonga'),('TR','Turkiye'),('TT','Trinidad & Tobago'),('TV','Tuvalu'),('TW','Taiwan'),('TZ','Tanzania'),('UA','Ukraine'),('UG','Uganda'),('US','United States'),('UY','Uruguay'),('UZ','Uzbekistan'),('VA','Vatican City'),('VC','St. Vincent & Grenadines'),('VE','Venezuela'),('VG','British Virgin Islands'),('VI','U.S. Virgin Islands'),('VN','Vietnam'),('VU','Vanuatu'),('WF','Wallis & Futuna'),('WS','Samoa'),('XK','Kosovo'),('YE','Yemen'),('YT','Mayotte'),('ZA','South Africa'),('ZM','Zambia'),('ZW','Zimbabwe');

INSERT INTO public.languages (code, name) VALUES
('en','English'),('fr','French'),('pt','Portuguese'),('es','Spanish'),('ar','Arabic'),('sw','Swahili'),('ha','Hausa'),('yo','Yoruba'),('ig','Igbo'),('ak','Akan / Twi'),('ee','Ewe'),('gaa','Ga'),('pcm','Nigerian Pidgin'),('wo','Wolof'),('ff','Fula'),('bm','Bambara'),('mnk','Mandinka'),('am','Amharic'),('ti','Tigrinya'),('om','Oromo'),('so','Somali'),('lg','Luganda'),('rw','Kinyarwanda'),('rn','Kirundi'),('ln','Lingala'),('kg','Kikongo'),('lu','Luba-Katanga'),('ki','Kikuyu'),('luo','Dholuo'),('ny','Chichewa'),('sn','Shona'),('nd','Ndebele'),('zu','Zulu'),('xh','Xhosa'),('st','Sesotho'),('tn','Setswana'),('ts','Xitsonga'),('ve','Tshivenda'),('ss','Siswati'),('af','Afrikaans'),('mg','Malagasy'),('ber','Tamazight'),('nl','Dutch'),('de','German'),('it','Italian'),('ht','Haitian Creole'),('kea','Cape Verdean Creole'),('tr','Turkish'),('ru','Russian'),('hi','Hindi'),('ur','Urdu'),('zh','Chinese'),('other','Other');

INSERT INTO public.cultural_backgrounds (id, label, grouping) VALUES
('akan','Akan','west_africa'),('ga_dangme','Ga-Dangme','west_africa'),('ewe','Ewe','west_africa'),('dagomba','Dagomba / Mole-Dagbani','west_africa'),('yoruba','Yoruba','west_africa'),('igbo','Igbo','west_africa'),('hausa','Hausa','west_africa'),('fulani','Fulani','west_africa'),('ijaw','Ijaw','west_africa'),('efik_ibibio','Efik / Ibibio','west_africa'),('tiv','Tiv','west_africa'),('edo','Edo / Bini','west_africa'),('wolof','Wolof','west_africa'),('serer','Serer','west_africa'),('mandinka','Mandinka / Malinke','west_africa'),('bambara','Bambara','west_africa'),('soninke','Soninke','west_africa'),('temne','Temne','west_africa'),('mende','Mende','west_africa'),('krio','Krio','west_africa'),('kru','Kru','west_africa'),('mossi','Mossi','west_africa'),('kabye','Kabye','west_africa'),('fon','Fon','west_africa'),('bassa','Bassa','west_africa'),('cape_verdean','Cape Verdean','west_africa'),('bissau_guinean','Bissau-Guinean','west_africa'),('bamileke','Bamileke','central_africa'),('beti_fang','Beti-Pahuin / Fang','central_africa'),('bakongo','Bakongo','central_africa'),('luba','Luba','central_africa'),('mongo','Mongo','central_africa'),('sara','Sara','central_africa'),('amhara','Amhara','east_africa'),('oromo','Oromo','east_africa'),('tigrinya','Tigrinya','east_africa'),('somali','Somali','east_africa'),('afar','Afar','east_africa'),('kikuyu','Kikuyu','east_africa'),('luo','Luo','east_africa'),('luhya','Luhya','east_africa'),('kamba','Kamba','east_africa'),('kalenjin','Kalenjin','east_africa'),('maasai','Maasai','east_africa'),('swahili','Swahili','east_africa'),('chagga','Chagga','east_africa'),('sukuma','Sukuma','east_africa'),('baganda','Baganda','east_africa'),('banyankole','Banyankole','east_africa'),('acholi','Acholi','east_africa'),('banyarwanda','Banyarwanda','east_africa'),('barundi','Barundi','east_africa'),('nuer','Nuer','east_africa'),('dinka','Dinka','east_africa'),('nubian','Nubian','north_africa'),('amazigh','Amazigh / Berber','north_africa'),('arab_north_african','Arab North African','north_africa'),('copt','Coptic','north_africa'),('zulu','Zulu','southern_africa'),('xhosa','Xhosa','southern_africa'),('sotho','Sotho','southern_africa'),('tswana','Tswana','southern_africa'),('tsonga','Tsonga','southern_africa'),('venda','Venda','southern_africa'),('swazi','Swazi','southern_africa'),('ndebele','Ndebele','southern_africa'),('shona','Shona','southern_africa'),('chewa','Chewa','southern_africa'),('bemba','Bemba','southern_africa'),('tonga','Tonga','southern_africa'),('ovambo','Ovambo','southern_africa'),('herero','Herero','southern_africa'),('malagasy','Malagasy','southern_africa'),('cape_coloured','Cape Coloured','southern_africa'),('african_american','African American','diaspora'),('black_british','Black British','diaspora'),('afro_canadian','Afro-Canadian','diaspora'),('afro_caribbean','Afro-Caribbean','diaspora'),('jamaican','Jamaican','diaspora'),('haitian','Haitian','diaspora'),('trinidadian','Trinidadian & Tobagonian','diaspora'),('guyanese','Guyanese','diaspora'),('afro_brazilian','Afro-Brazilian','diaspora'),('afro_latino','Afro-Latino','diaspora'),('afro_european','Afro-European','diaspora'),('afro_arab','Afro-Arab','diaspora'),('mixed_heritage','Mixed heritage','diaspora'),('other','Other (describe)','other');

INSERT INTO public.profession_categories (id, label) VALUES
('medicine_health','Medicine & health'),('law','Law'),('finance_banking','Finance & banking'),('accounting','Accounting'),('engineering','Engineering'),('technology','Technology & software'),('education','Education & academia'),('research_science','Research & science'),('business_management','Business & management'),('entrepreneurship','Entrepreneurship'),('consulting','Consulting'),('public_sector','Public sector & government'),('diplomacy_ngo','Diplomacy & international development'),('creative_arts','Creative & arts'),('media_communications','Media & communications'),('architecture_design','Architecture & design'),('agriculture','Agriculture'),('skilled_trades','Skilled trades'),('hospitality','Hospitality & travel'),('logistics_transport','Logistics & transport'),('sports','Sport & fitness'),('religious_ministry','Religious ministry'),('military_security','Military & security'),('other','Other');

INSERT INTO public.industries (id, label) VALUES
('healthcare','Healthcare'),('legal','Legal'),('financial_services','Financial services'),('technology','Technology'),('energy','Energy & resources'),('manufacturing','Manufacturing'),('construction','Construction & real estate'),('education','Education'),('government','Government'),('nonprofit','Non-profit & NGO'),('media_entertainment','Media & entertainment'),('fashion_beauty','Fashion & beauty'),('retail_consumer','Retail & consumer goods'),('agriculture','Agriculture & agribusiness'),('transport_logistics','Transport & logistics'),('hospitality_tourism','Hospitality & tourism'),('telecommunications','Telecommunications'),('professional_services','Professional services'),('sports','Sport'),('other','Other');

INSERT INTO public.religions (id, label) VALUES
('christianity','Christianity'),('islam','Islam'),('traditional_african','African traditional spirituality'),('judaism','Judaism'),('hinduism','Hinduism'),('buddhism','Buddhism'),('rastafari','Rastafari'),('spiritual_not_religious','Spiritual, not religious'),('agnostic','Agnostic'),('atheist','Atheist'),('other','Other'),('prefer_not_to_say','Prefer not to say');

-- ============ PROFILES (identity and contact) ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$'),
  phone_country text CHECK (phone_country IS NULL OR phone_country ~ '^[A-Z]{2}$'),
  country_of_residence text REFERENCES public.countries(code),
  gender public.gender_type,
  date_of_birth date,
  application_status public.application_status NOT NULL DEFAULT 'draft',
  application_started_at timestamptz NOT NULL DEFAULT now(),
  application_submitted_at timestamptz,
  last_field_saved_at timestamptz,
  current_section public.section_key,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_active_idx ON public.profiles (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX profiles_phone_idx ON public.profiles (phone) WHERE deleted_at IS NULL;
CREATE INDEX profiles_status_idx ON public.profiles (application_status);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.validate_profile_age()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > (current_date - interval '20 years') THEN
    RAISE EXCEPTION 'applicants must be at least 20 years old';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_validate_age
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_age();

-- ============ USER_ROLES (staff access) ============
-- One access level for the launch: everyone holding 'staff' sees and manages
-- every application. Applicants hold no role.
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX user_roles_active_unique ON public.user_roles (profile_id, role) WHERE revoked_at IS NULL;
CREATE INDEX user_roles_profile_idx ON public.user_roles (profile_id);

CREATE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

CREATE FUNCTION public.has_role(_profile_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = _profile_id AND role = _role AND revoked_at IS NULL
  );
$$;

CREATE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(public.current_profile_id(), 'staff');
$$;

-- ============ PROFILE_FACTS (applicant facts) ============
CREATE TABLE public.profile_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- identity
  city text,
  state_or_region text,
  nationality text[],
  country_of_origin text REFERENCES public.countries(code),
  cultural_backgrounds text[],
  cultural_background_other_label text,
  languages text[],
  height_cm integer,
  -- life
  education_level public.education_level,
  field_of_study text,
  profession_category text REFERENCES public.profession_categories(id),
  job_title text,
  employment_status public.employment_status,
  industry text REFERENCES public.industries(id),
  has_children public.yes_no,
  number_of_children integer,
  children_living_status text,
  wants_children public.wants_children_type,
  current_legal_status public.legal_status_type,
  marital_history public.marital_history_type,
  smoking public.smoking_type,
  drinking public.drinking_type,
  religion text REFERENCES public.religions(id),
  denomination_or_faith_tradition text,
  faith_observance public.faith_observance_type,
  -- relationship
  looking_for public.looking_for_type,
  marriage_timeline public.marriage_timeline_type,
  willing_to_relocate public.yes_no_depends,
  open_to_long_distance public.yes_no_depends,
  countries_would_relocate_to text[],
  countries_would_date_from text[],
  introduction_style public.introduction_style_type,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_facts_nationality_codes CHECK (public.is_country_code_array(nationality)),
  CONSTRAINT profile_facts_relocate_codes CHECK (public.is_country_code_array(countries_would_relocate_to)),
  CONSTRAINT profile_facts_date_from_codes CHECK (public.is_country_code_array(countries_would_date_from)),
  CONSTRAINT profile_facts_cultural_clean CHECK (public.is_clean_token_array(cultural_backgrounds)),
  CONSTRAINT profile_facts_languages_clean CHECK (public.is_clean_token_array(languages)),
  CONSTRAINT profile_facts_height_range CHECK (height_cm IS NULL OR (height_cm BETWEEN 120 AND 220)),
  CONSTRAINT profile_facts_children_count CHECK (
    has_children IS DISTINCT FROM 'yes' OR number_of_children IS NULL OR number_of_children >= 0
  ),
  CONSTRAINT profile_facts_other_label CHECK (
    cultural_background_other_label IS NULL
    OR (cultural_backgrounds IS NOT NULL AND 'other' = ANY(cultural_backgrounds))
  )
);
CREATE INDEX idx_profile_facts_height ON public.profile_facts (height_cm);
CREATE INDEX idx_profile_facts_languages ON public.profile_facts USING gin (languages);
CREATE INDEX idx_profile_facts_nationality ON public.profile_facts USING gin (nationality);
CREATE INDEX idx_profile_facts_cultural ON public.profile_facts USING gin (cultural_backgrounds);
CREATE INDEX idx_profile_facts_origin ON public.profile_facts (country_of_origin);
CREATE INDEX idx_profile_facts_education ON public.profile_facts (education_level);
CREATE INDEX idx_profile_facts_children ON public.profile_facts (has_children, wants_children);
CREATE INDEX idx_profile_facts_faith ON public.profile_facts (religion, faith_observance);
CREATE TRIGGER profile_facts_updated_at BEFORE UPDATE ON public.profile_facts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PARTNER PREFERENCES ============
CREATE TABLE public.preference_attributes (
  attribute_key text PRIMARY KEY,
  description text,
  value_type text NOT NULL DEFAULT 'text',
  operator text,
  allowed_values jsonb,
  section text NOT NULL DEFAULT 'partner_preferences',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.preference_attributes (attribute_key, description, value_type, operator, allowed_values) VALUES
('partner_gender','Gender(s) the applicant wishes to be introduced to','enum_array','include','["woman","man"]'),
('partner_age_range','Acceptable partner age range','integer_range','between',null),
('partner_height_range','Acceptable partner height range in cm','integer_range','between',null),
('partner_geography_mode','How geography should be applied','enum','equal','["specific","anywhere","exclude_only"]'),
('partner_countries','Countries the partner may be based in','country_code_array','include',null),
('partner_countries_excluded','Countries explicitly excluded','country_code_array','exclude',null),
('partner_cities','Cities of interest','text_array','include',null),
('partner_nationalities','Partner nationalities','country_code_array','include_exclude',null),
('partner_cultural_backgrounds','Partner cultural backgrounds','catalog_array','include_exclude',null),
('partner_languages','Languages the partner should speak','catalog_array','include',null),
('partner_education_min','Minimum education level','enum','gte','["secondary","vocational","bachelors","masters","doctorate"]'),
('partner_has_children','Openness to a partner who already has children','enum','equal','["no","yes","either"]'),
('partner_max_existing_children','Maximum number of existing children','integer','lte',null),
('partner_wants_children','Partner intentions about future children','enum','equal','["yes","no","open","either"]'),
('partner_marital_history','Acceptable marital history','enum_array','include_exclude','["never_married","divorced","widowed"]'),
('partner_religion','Partner religion','catalog_array','include_exclude',null),
('partner_faith_observance_min','Minimum faith observance','enum','gte','["not_important","somewhat","important","central"]'),
('partner_smoking','Smoking tolerance','enum','equal','["never","sometimes_ok","any"]'),
('partner_drinking','Drinking tolerance','enum','equal','["never","socially_ok","any"]'),
('partner_relocation','Relocation expectation','enum','equal','["must_relocate_ok","must_live_near_me","flexible"]'),
('partner_long_distance','Long-distance tolerance','enum','equal','["ok","not_ok","short_term_ok"]'),
('partner_marriage_timeline','Marriage timeline expectation','enum','equal','["ready_now","within_1_year","within_2_years","unhurried"]'),
('partner_employment_status','Acceptable employment situations','enum_array','include','["employed","self_employed","business_owner","student","not_working"]'),
('partner_profession_category','Preferred profession categories','catalog_array','include',null),
('partner_industry','Preferred industries','catalog_array','include',null);

CREATE TABLE public.profile_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attribute_key text NOT NULL REFERENCES public.preference_attributes(attribute_key) ON UPDATE CASCADE,
  attribute_value text,
  attribute_value_json jsonb,
  weight public.preference_weight NOT NULL DEFAULT 'nice_to_have',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, attribute_key),
  CONSTRAINT profile_preferences_value_present CHECK (
    weight = 'does_not_matter' OR attribute_value IS NOT NULL OR attribute_value_json IS NOT NULL
  )
);
CREATE INDEX profile_preferences_key_weight_idx ON public.profile_preferences (attribute_key, weight);
CREATE INDEX profile_preferences_value_json_idx ON public.profile_preferences USING gin (attribute_value_json);
CREATE TRIGGER profile_preferences_updated_at BEFORE UPDATE ON public.profile_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ APPLICANT'S NOTE TO THE MATCHMAKER ============
CREATE TABLE public.applicant_matchmaking_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_applicant_notes_profile ON public.applicant_matchmaking_notes (profile_id);
CREATE TRIGGER applicant_matchmaking_notes_updated_at BEFORE UPDATE ON public.applicant_matchmaking_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SECTION COMPLETENESS ============
CREATE TABLE public.profile_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_key public.section_key NOT NULL,
  completeness_percent integer NOT NULL DEFAULT 0 CHECK (completeness_percent BETWEEN 0 AND 100),
  is_complete boolean NOT NULL DEFAULT false,
  last_saved_at timestamptz,
  UNIQUE (profile_id, section_key)
);

-- ============ CONSENTS (append-only ledger) ============
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_key text NOT NULL CHECK (consent_key IN
    ('data_processing','matchmaking_consideration','contact_followup','photo_use_internal')),
  policy_version text NOT NULL,
  accepted boolean NOT NULL,
  accepted_at timestamptz,
  withdrawn_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consents_profile_key_idx ON public.consents (profile_id, consent_key);

-- ============ PHOTOS ============
-- Files live in the private member-photos bucket at <profile_id>/<filename>.
-- Staff see them through short-lived signed links minted on the server.
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  review_status public.photo_review_status NOT NULL DEFAULT 'uploaded',
  rejected_reason_public text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_profile_idx ON public.photos (profile_id, sort_order);
CREATE TRIGGER photos_updated_at BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ============ CONTACT PAGE MESSAGES ============
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(btrim(email)) BETWEEN 3 AND 200),
  phone text CHECK (phone IS NULL OR length(btrim(phone)) <= 40),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 5 AND 4000),
  handled_at timestamptz,
  handled_by_profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_messages_created_idx ON public.contact_messages (created_at DESC);

-- ============ APPLICATION FUNCTIONS ============
CREATE FUNCTION public.recompute_profile_sections(_profile_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record; f record;
  done int; total int;
  photo_count int; overall int := 0;
  pref jsonb; geo text;
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL
     AND _profile_id IS DISTINCT FROM public.current_profile_id()
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = _profile_id;
  IF p IS NULL THEN RETURN 0; END IF;
  SELECT * INTO f FROM public.profile_facts WHERE profile_id = _profile_id;

  -- contact
  total := 7;
  done := (p.first_name IS NOT NULL)::int + (p.last_name IS NOT NULL)::int + (p.email IS NOT NULL)::int
        + (p.phone IS NOT NULL)::int + (p.phone_country IS NOT NULL)::int
        + (p.country_of_residence IS NOT NULL)::int + (p.gender IS NOT NULL)::int;
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'contact', (done*100)/total, done = total, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + (done*100)/total;

  -- identity
  total := 6;
  done := (p.date_of_birth IS NOT NULL)::int
        + (f.city IS NOT NULL)::int
        + (COALESCE(array_length(f.nationality,1),0) > 0)::int
        + (f.country_of_origin IS NOT NULL)::int
        + (COALESCE(array_length(f.cultural_backgrounds,1),0) > 0)::int
        + (COALESCE(array_length(f.languages,1),0) > 0)::int;
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'identity', (done*100)/total, done = total, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + (done*100)/total;

  -- life
  total := 11;
  done := (f.education_level IS NOT NULL)::int + (f.job_title IS NOT NULL)::int
        + (f.employment_status IS NOT NULL)::int
        + (f.has_children IS NOT NULL AND (f.has_children <> 'yes' OR f.number_of_children IS NOT NULL))::int
        + (f.wants_children IS NOT NULL)::int + (f.current_legal_status IS NOT NULL)::int
        + (f.marital_history IS NOT NULL)::int + (f.smoking IS NOT NULL)::int
        + (f.drinking IS NOT NULL)::int + (f.religion IS NOT NULL)::int
        + (f.faith_observance IS NOT NULL)::int;
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'life', (done*100)/total, done = total, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + (done*100)/total;

  -- relationship
  total := 5;
  done := (f.looking_for IS NOT NULL)::int + (f.marriage_timeline IS NOT NULL)::int
        + (f.willing_to_relocate IS NOT NULL)::int + (f.open_to_long_distance IS NOT NULL)::int
        + (f.introduction_style IS NOT NULL)::int;
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'relationship', (done*100)/total, done = total, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + (done*100)/total;

  -- partner preferences: gender, age range, geography
  total := 3; done := 0;
  IF EXISTS (SELECT 1 FROM public.profile_preferences WHERE profile_id = _profile_id
             AND attribute_key = 'partner_gender'
             AND (weight = 'does_not_matter' OR attribute_value_json IS NOT NULL OR attribute_value IS NOT NULL))
  THEN done := done + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.profile_preferences WHERE profile_id = _profile_id
             AND attribute_key = 'partner_age_range'
             AND (weight = 'does_not_matter' OR attribute_value_json IS NOT NULL))
  THEN done := done + 1; END IF;

  SELECT COALESCE(attribute_value, attribute_value_json->>'mode') INTO geo
  FROM public.profile_preferences WHERE profile_id = _profile_id AND attribute_key = 'partner_geography_mode';
  IF geo IS NOT NULL THEN
    IF geo <> 'specific' THEN
      done := done + 1;
    ELSE
      SELECT attribute_value_json INTO pref FROM public.profile_preferences
      WHERE profile_id = _profile_id AND attribute_key = 'partner_countries';
      IF pref IS NOT NULL AND jsonb_array_length(COALESCE(pref->'values', pref)) > 0 THEN
        done := done + 1;
      END IF;
    END IF;
  END IF;
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'partner_preferences', (done*100)/total, done = total, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + (done*100)/total;

  -- photos: at least one
  SELECT count(*) INTO photo_count FROM public.photos
   WHERE profile_id = _profile_id AND review_status <> 'rejected';
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'photos', LEAST(photo_count,1)*100, photo_count >= 1, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + LEAST(photo_count,1)*100;

  -- consent: the two required agreements, latest answer per key
  total := 2;
  SELECT count(*) INTO done FROM (
    SELECT DISTINCT ON (c.consent_key) c.accepted, c.withdrawn_at
      FROM public.consents c
     WHERE c.profile_id = _profile_id
       AND c.consent_key IN ('data_processing','matchmaking_consideration')
     ORDER BY c.consent_key, c.created_at DESC
  ) latest WHERE latest.accepted AND latest.withdrawn_at IS NULL;
  INSERT INTO public.profile_sections (profile_id, section_key, completeness_percent, is_complete, last_saved_at)
  VALUES (_profile_id,'consent', (done*100)/total, done = total, now())
  ON CONFLICT (profile_id, section_key) DO UPDATE
    SET completeness_percent = EXCLUDED.completeness_percent, is_complete = EXCLUDED.is_complete, last_saved_at = now();
  overall := overall + (done*100)/total;

  RETURN overall / 7;
END; $$;

CREATE FUNCTION public.profile_ready_to_submit(_profile_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE complete_sections int;
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL
     AND _profile_id IS DISTINCT FROM public.current_profile_id()
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(*) INTO complete_sections FROM public.profile_sections
   WHERE profile_id = _profile_id AND is_complete
     AND section_key IN ('contact','identity','life','relationship','partner_preferences','photos','consent');
  RETURN complete_sections = 7;
END; $$;

CREATE FUNCTION public.submit_application(_profile_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_status public.application_status;
BEGIN
  IF _profile_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  PERFORM public.recompute_profile_sections(_profile_id);
  IF NOT public.profile_ready_to_submit(_profile_id) THEN
    RAISE EXCEPTION 'application not complete';
  END IF;

  SELECT application_status INTO current_status FROM public.profiles WHERE id = _profile_id FOR UPDATE;
  IF current_status = 'draft' THEN
    UPDATE public.profiles
       SET application_status = 'submitted', application_submitted_at = now()
     WHERE id = _profile_id;
  END IF;
  RETURN 'submitted';
END; $$;

-- Contact step: saves a recoverable draft. Called by the server with the
-- service role only; the browser never owns the row.
CREATE FUNCTION public.upsert_draft_profile(
  _email text, _phone text, _phone_country text DEFAULT NULL,
  _first_name text DEFAULT NULL, _last_name text DEFAULT NULL,
  _country_of_residence text DEFAULT NULL, _gender text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF _email IS NULL OR position('@' in _email) < 2 THEN RAISE EXCEPTION 'valid email required'; END IF;
  IF _phone IS NULL OR _phone !~ '^\+[1-9][0-9]{6,14}$' THEN RAISE EXCEPTION 'valid international phone required'; END IF;

  SELECT id INTO _id FROM public.profiles
   WHERE lower(email) = lower(_email) AND deleted_at IS NULL LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.profiles (email, phone, phone_country, first_name, last_name,
                                 country_of_residence, gender, application_status, current_section, last_field_saved_at)
    VALUES (_email, _phone, _phone_country, _first_name, _last_name,
            _country_of_residence, NULLIF(_gender,'')::public.gender_type, 'draft', 'contact', now())
    RETURNING id INTO _id;
  ELSIF (SELECT auth_user_id FROM public.profiles WHERE id = _id) IS NULL THEN
    UPDATE public.profiles
       SET phone = COALESCE(_phone, phone), phone_country = COALESCE(_phone_country, phone_country),
           first_name = COALESCE(_first_name, first_name), last_name = COALESCE(_last_name, last_name),
           country_of_residence = COALESCE(_country_of_residence, country_of_residence),
           gender = COALESCE(NULLIF(_gender,'')::public.gender_type, gender),
           last_field_saved_at = now()
     WHERE id = _id;
  END IF;

  PERFORM public.recompute_profile_sections(_id);
  RETURN _id;
END; $$;

-- Binds a draft to the signed-in account. Service role only.
CREATE FUNCTION public.attach_draft_to_auth_user(_profile_id uuid, _auth_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE id = _profile_id AND auth_user_id IS NOT NULL AND auth_user_id <> _auth_user_id) THEN
    RAISE EXCEPTION 'draft already attached to a different account';
  END IF;
  UPDATE public.profiles SET auth_user_id = _auth_user_id WHERE id = _profile_id;
END; $$;

-- ============ STAFF FUNCTIONS ============
-- Every submitted application, newest first. Drafts stay out of the list.
CREATE FUNCTION public.list_applications()
RETURNS TABLE (
  profile_id uuid,
  first_name text,
  last_name text,
  gender public.gender_type,
  date_of_birth date,
  country_of_residence text,
  city text,
  state_or_region text,
  application_status public.application_status,
  submitted_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name, p.last_name, p.gender, p.date_of_birth,
         p.country_of_residence, f.city, f.state_or_region,
         p.application_status, p.application_submitted_at
  FROM public.profiles p
  LEFT JOIN public.profile_facts f ON f.profile_id = p.id
  WHERE public.is_staff()
    AND p.deleted_at IS NULL
    AND p.application_status <> 'draft'
  ORDER BY p.application_submitted_at DESC NULLS LAST;
$$;

-- Accept, waitlist or decline a submitted application.
CREATE FUNCTION public.set_application_status(_profile_id uuid, _status public.application_status)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _current public.application_status;
BEGIN
  IF NOT public.is_staff() THEN RETURN 'not_permitted'; END IF;
  IF _status NOT IN ('accepted','waitlisted','declined') THEN RETURN 'invalid_status'; END IF;

  SELECT application_status INTO _current FROM public.profiles
   WHERE id = _profile_id AND deleted_at IS NULL
   FOR UPDATE;
  IF _current IS NULL THEN RETURN 'not_found'; END IF;
  IF _current = 'draft' THEN RETURN 'not_submitted'; END IF;

  UPDATE public.profiles SET application_status = _status WHERE id = _profile_id;
  RETURN 'ok';
END; $$;

-- Gives an existing Auth user staff access. Run from the SQL editor after
-- inviting the person under Authentication > Users:
--   select public.grant_staff_access('name@example.com');
CREATE FUNCTION public.grant_staff_access(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _clean text := lower(btrim(_email));
  _auth uuid;
  _profile uuid;
  _linked uuid;
BEGIN
  SELECT id INTO _auth FROM auth.users WHERE lower(email) = _clean LIMIT 1;
  IF _auth IS NULL THEN RETURN 'no_auth_user'; END IF;

  SELECT id, auth_user_id INTO _profile, _linked FROM public.profiles
   WHERE lower(email) = _clean AND deleted_at IS NULL LIMIT 1;

  IF _profile IS NULL THEN
    INSERT INTO public.profiles (email, auth_user_id) VALUES (_clean, _auth)
    RETURNING id INTO _profile;
  ELSIF _linked IS NULL THEN
    UPDATE public.profiles SET auth_user_id = _auth WHERE id = _profile;
  ELSIF _linked <> _auth THEN
    RETURN 'profile_linked_to_other_account';
  END IF;

  INSERT INTO public.user_roles (profile_id, role) VALUES (_profile, 'staff')
  ON CONFLICT DO NOTHING;
  RETURN 'ok';
END; $$;

-- ============ ROW LEVEL SECURITY ============
-- Applicants reach only their own rows. Staff (one access level) reach every
-- application. Status changes go through set_application_status() only.

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultural_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profession_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.religions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.countries, public.languages, public.cultural_backgrounds,
  public.profession_categories, public.industries, public.religions TO anon, authenticated;
GRANT ALL ON public.countries, public.languages, public.cultural_backgrounds,
  public.profession_categories, public.industries, public.religions TO service_role;
CREATE POLICY "Countries are readable" ON public.countries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Languages are readable" ON public.languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Cultural backgrounds are readable" ON public.cultural_backgrounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Profession categories are readable" ON public.profession_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Industries are readable" ON public.industries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Religions are readable" ON public.religions FOR SELECT TO anon, authenticated USING (true);

-- profiles: applicants may edit their own contact fields, never the status.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, phone, phone_country, country_of_residence,
              gender, date_of_birth, current_section, last_field_saved_at)
  ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_staff());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_staff())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_staff());
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- user_roles: read-only from the app; granted with grant_staff_access().
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_staff());

ALTER TABLE public.profile_facts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profile_facts TO authenticated;
GRANT ALL ON public.profile_facts TO service_role;
CREATE POLICY profile_facts_own ON public.profile_facts FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY profile_facts_staff ON public.profile_facts FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

ALTER TABLE public.preference_attributes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.preference_attributes TO authenticated;
GRANT ALL ON public.preference_attributes TO service_role;
CREATE POLICY preference_attributes_read ON public.preference_attributes FOR SELECT TO authenticated
  USING (true);

ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_preferences TO authenticated;
GRANT ALL ON public.profile_preferences TO service_role;
CREATE POLICY profile_preferences_own ON public.profile_preferences FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY profile_preferences_staff ON public.profile_preferences FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

ALTER TABLE public.applicant_matchmaking_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applicant_matchmaking_notes TO authenticated;
GRANT ALL ON public.applicant_matchmaking_notes TO service_role;
CREATE POLICY applicant_notes_own ON public.applicant_matchmaking_notes FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY applicant_notes_staff ON public.applicant_matchmaking_notes FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

ALTER TABLE public.profile_sections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profile_sections TO authenticated;
GRANT ALL ON public.profile_sections TO service_role;
CREATE POLICY profile_sections_own ON public.profile_sections FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY profile_sections_staff_read ON public.profile_sections FOR SELECT TO authenticated
  USING (public.is_staff());

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
CREATE POLICY consents_read ON public.consents FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_staff());
CREATE POLICY consents_own_insert ON public.consents FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.photos TO authenticated;
GRANT UPDATE (sort_order) ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
CREATE POLICY photos_own ON public.photos FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY photos_staff ON public.photos FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
CREATE POLICY "Anyone may send a contact message" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (handled_at IS NULL AND handled_by_profile_id IS NULL);
CREATE POLICY "Staff read contact messages" ON public.contact_messages
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff update contact messages" ON public.contact_messages
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Applicants manage files in their own folder of the private bucket.
CREATE POLICY member_photos_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = public.current_profile_id()::text);
CREATE POLICY member_photos_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = public.current_profile_id()::text);
CREATE POLICY member_photos_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = public.current_profile_id()::text)
  WITH CHECK (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = public.current_profile_id()::text);
CREATE POLICY member_photos_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'member-photos' AND (storage.foldername(name))[1] = public.current_profile_id()::text);

-- ============ FUNCTION PRIVILEGES ============
-- Signed-out visitors call no functions. Signed-in users may call everything
-- except the server-only draft and staff-setup functions.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname IN ('upsert_draft_profile', 'attach_draft_to_auth_user', 'grant_staff_access') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
