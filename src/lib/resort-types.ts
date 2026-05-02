export const CURRENCIES = ["PHP", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  PHP: "PHP — Philippine Peso (₱)",
  USD: "USD — US Dollar ($)",
  EUR: "EUR — Euro (€)",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
};

export const AMENITIES = [
  "Pool",
  "Spa",
  "Restaurant",
  "Gym",
  "Beach Access",
  "Terrace",
  "Private Chef",
  "Concierge",
  "Hammam",
  "Cinema",
  "Wine Cellar",
  "Yoga Studio",
  "Helipad",
  "Private Dock",
  "Jacuzzi",
  "Free Wi-Fi",
  "Air Conditioning",
  "Pet Friendly",
  "Airport Transfer",
  "Kids Club",
] as const;

export type Amenity = (typeof AMENITIES)[number];

export const ROOM_AMENITIES = [
  "Free Wi-Fi",
  "Air Conditioning",
  "Minibar",
  "Safe",
  "Smart TV",
  "Nespresso",
  "Bathtub",
  "Rainfall Shower",
  "Bathrobes",
  "Hairdryer",
  "Balcony",
  "Sea View",
  "Blackout Curtains",
  "Workspace",
] as const;

export type RoomAmenity = (typeof ROOM_AMENITIES)[number];

export interface Room {
  id: string;
  name: string;
  shortDescription: string;
  // Size & Layout
  size: string;              // e.g. "65 sqm"
  bedSize: string;           // King / Queen / Twin
  maxAdults: number;
  maxChildren: number;
  balcony: string;           // "Private terrace" / "No"
  // Bathroom
  showerType: string;
  waterPressure: string;
  toiletPrivacy: string;
  toiletries: string;
  // Tech & Comfort
  wifiSpeed: string;
  outlets: string;
  climateControl: string;
  blackoutCurtains: boolean;
  // Money & Rules
  resortFee: string;
  incidentalDeposit: string;
  minibarPolicy: string;
  earlyLateFee: string;
  petPolicy: string;
  // Noise & Location
  floorWing: string;
  nearbyNoise: string;
  quietHours: string;
  // Accessibility
  rollInShower: string;
  grabBars: string;
  serviceAnimalArea: string;
  // Inclusions
  breakfastIncluded: boolean;
  poolTowels: boolean;
  gymAccess: boolean;
  // Pricing & media
  pricePerNight: number;
  amenities: RoomAmenity[];
  images: string[];
}

export const DEFAULT_ROOM: Room = {
  id: "",
  name: "",
  shortDescription: "",
  size: "45 sqm",
  bedSize: "King",
  maxAdults: 2,
  maxChildren: 1,
  balcony: "Private balcony",
  showerType: "Walk-in rainfall",
  waterPressure: "High pressure, instant hot water",
  toiletPrivacy: "Separate water closet",
  toiletries: "Diptyque",
  wifiSpeed: "Fibre — 200 Mbps",
  outlets: "USB-A & USB-C bedside, EU & US sockets",
  climateControl: "Individual AC & heat",
  blackoutCurtains: true,
  resortFee: "Included",
  incidentalDeposit: "500 hold",
  minibarPolicy: "Stocked, billed on consumption",
  earlyLateFee: "Subject to availability",
  petPolicy: "Small pets up to 8kg, 50/night",
  floorWing: "Main wing",
  nearbyNoise: "Quiet — away from pool & bar",
  quietHours: "22:00 – 08:00",
  rollInShower: "On request",
  grabBars: "On request",
  serviceAnimalArea: "Garden lawn, north side",
  breakfastIncluded: true,
  poolTowels: true,
  gymAccess: true,
  pricePerNight: 850,
  amenities: ["Free Wi-Fi", "Air Conditioning", "Rainfall Shower", "Sea View", "Bathrobes", "Nespresso"],
  images: [],
};

export const EXPERIENCE_CATEGORIES = ["Tours", "Transportation", "Spa", "Dining", "Activities"] as const;
export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

export interface ExperienceItem {
  id: string;
  title: string;
  description: string;
  price: string;
  image: string;
  // Dining-specific (optional, used when category === "Dining")
  cuisine?: string;
  hours?: string;
  dressCode?: string;
  reservation?: string;
  menuHighlights?: string;
  dietary?: string;
}

export interface ExperienceCategoryData {
  category: ExperienceCategory;
  /** Optional custom display label (e.g. "Excursions" instead of "Tours") */
  label?: string;
  items: ExperienceItem[];
}

export const SOCIAL_PLATFORMS = [
  "Instagram", "Facebook", "X", "TikTok", "YouTube", "LinkedIn",
  "Pinterest", "Threads", "WhatsApp", "Telegram", "Snapchat", "Other",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label?: string; // used when platform === "Other"
  url: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  website: string;
  socials: SocialLink[];
}

export const DEFAULT_CONTACT: ContactInfo = {
  email: "reservations@ultimacorfu.com",
  phone: "+30 210 000 0000",
  whatsapp: "+30 690 000 0000",
  address: "Corfu, Greece",
  website: "ultimacollection.com",
  socials: [
    { id: "s1", platform: "Instagram", url: "https://instagram.com/ultimacollection" },
  ],
};

export interface VideoTour {
  enabled: boolean;
  youtubeUrl: string;
  title: string;
  subtitle: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface MapEmbed {
  enabled: boolean;
  embedUrl: string;
  title: string;
  subtitle: string;
}

export interface HighlightItem {
  id: string;
  image: string;
  title: string;
  caption: string;
}

export const DEFAULT_HIGHLIGHTS: HighlightItem[] = [
  { id: "h1", image: "", title: "Private dock", caption: "Step from water to villa" },
  { id: "h2", image: "", title: "Cliffside living", caption: "Astonishing views" },
  { id: "h3", image: "", title: "Multiple pools", caption: "Layered infinity pools" },
];

// ----- Restaurant section -----
export interface MenuDish {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
}

export interface Restaurant {
  enabled: boolean;
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
  cuisine: string;
  hours: string;
  dressCode: string;
  reservation: string;
  gallery: string[];
  menu: MenuDish[];
}

export const DEFAULT_RESTAURANT: Restaurant = {
  enabled: false,
  name: "",
  tagline: "",
  description: "",
  heroImage: "",
  cuisine: "",
  hours: "",
  dressCode: "",
  reservation: "",
  gallery: [],
  menu: [],
};

// ----- Experiences section (fully custom categories) -----
export interface ExperienceCard {
  id: string;
  title: string;
  description: string;
  price: string;
  image: string;
  duration: string;
  included: string;
  bookingUrl: string;
}

export interface ExperienceGroup {
  id: string;
  name: string;
  items: ExperienceCard[];
}

export const DEFAULT_EXPERIENCES: ExperienceGroup[] = [
  { id: "ec-tours", name: "Tours", items: [] },
  { id: "ec-island", name: "Island Hopping", items: [] },
  { id: "ec-rentals", name: "Rentals", items: [] },
  { id: "ec-transport", name: "Transportation", items: [] },
];

export const SECTION_IDS = [
  "overview", "highlights", "amenities", "rooms", "restaurant", "experiences", "video", "faq", "map", "contact",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "overview", "highlights", "amenities", "rooms", "restaurant", "experiences", "video", "faq", "map", "contact",
];

export interface ResortData {
  name: string;
  location: string;
  tagline: string;
  description: string;
  amenities: (Amenity | string)[];
  images: string[];
  pricePerNight: number;
  currency: Currency;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  area: string;
  view: string;
  rooms: Room[];
  /** @deprecated Experiences section was removed. Field kept optional only for old data compatibility; do not render. */
  experiences?: ExperienceCategoryData[];
  contact: ContactInfo;
  videoTour?: VideoTour;
  faqs?: FaqItem[];
  mapEmbed?: MapEmbed;
  sectionOrder?: SectionId[];
  highlights?: HighlightItem[];
  restaurant?: Restaurant;
  experienceCategories?: ExperienceGroup[];
}

export const DEFAULT_RESORT: ResortData = {
  name: "BAIA Palawan Island Resort",
  location: "Palawan, Philippines",
  tagline: "A paragon of barefoot Ionian luxury",
  description:
    "Tucked into a private cove on Palawan's emerald coastline, BAIA unfolds where limestone cliffs meet impossibly clear turquoise water. We love arriving by boat, drifting into our quiet bay and letting the resort reveal itself slowly. Days here move at the pace of the tide — long swims off the dock, lazy lunches under the palms, sunset rituals on the terrace — while inside you'll find everything from a spa carved into the rock to a candlelit dining pavilion above the sea.",
  amenities: ["Pool", "Spa", "Restaurant", "Hammam", "Cinema", "Private Dock", "Private Chef", "Concierge", "Jacuzzi", "Terrace"],
  images: [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=80",
    "https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=1600&q=80",
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80",
  ],
  pricePerNight: 12500,
  currency: "PHP",
  guests: 12,
  bedrooms: 6,
  bathrooms: 6,
  area: "1,000 sqm",
  view: "Oceanfront villa",
  rooms: [
    {
      ...DEFAULT_ROOM,
      id: "r1",
      name: "Sea View Suite",
      shortDescription: "Sun-soaked suite with Ionian views and a private terrace.",
      size: "65 sqm",
      bedSize: "King",
      pricePerNight: 950,
      images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1600&q=80"],
    },
    {
      ...DEFAULT_ROOM,
      id: "r2",
      name: "Garden Villa",
      shortDescription: "Two-bedroom villa wrapped in olive groves, with plunge pool.",
      size: "120 sqm",
      bedSize: "King + Twin",
      maxAdults: 4,
      maxChildren: 2,
      pricePerNight: 1850,
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80"],
    },
  ],
  contact: { ...DEFAULT_CONTACT },
  videoTour: {
    enabled: false,
    youtubeUrl: "",
    title: "A cinematic tour",
    subtitle: "Step inside the resort",
  },
  faqs: [
    { id: "f1", question: "What time is check-in and check-out?", answer: "Check-in is from 3:00 PM and check-out is by 11:00 AM. Early check-in and late check-out can be arranged subject to availability." },
    { id: "f2", question: "Do you offer airport transfers?", answer: "Yes — our concierge team can arrange private chauffeur transfers from the nearest airport. Please share your flight details when booking." },
    { id: "f3", question: "Is breakfast included?", answer: "A daily à la carte breakfast for all registered guests is included with most room categories. Please check your specific rate for details." },
  ],
  mapEmbed: {
    enabled: false,
    embedUrl: "",
    title: "Find us",
    subtitle: "Plan your visit",
  },
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  highlights: [...DEFAULT_HIGHLIGHTS],
};

export interface ThemeTweaks {
  primary: string;
  accent: string;
  text: string;
  background: string;
  serif: string;
  sans: string;
}

export const DEFAULT_THEME: ThemeTweaks = {
  primary: "#3d5a6c",
  accent: "#d4af86",
  text: "#243845",
  background: "#f5f3f0",
  serif: "Playfair Display",
  sans: "Inter",
};

export const SERIF_OPTIONS = [
  "Playfair Display", "Cormorant Garamond", "DM Serif Display",
  "EB Garamond", "Lora", "Libre Baskerville", "Merriweather",
  "Crimson Text", "Bodoni Moda", "Italiana", "Cinzel", "Marcellus",
  "Prata", "Tenor Sans", "Spectral",
];
export const SANS_OPTIONS = [
  "Inter", "Montserrat", "Jost",
  "Poppins", "Raleway", "Work Sans", "Nunito", "Manrope",
  "DM Sans", "Outfit", "Plus Jakarta Sans", "Karla", "Mulish",
  "Quicksand", "Source Sans 3", "Roboto", "Lato", "Open Sans",
];
