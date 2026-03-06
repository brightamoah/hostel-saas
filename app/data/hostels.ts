export interface Hostel {
  id: number;
  name: string;
  location: string;
  city: string;
  country: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  image: string;
  gallery: string[];
  amenities: string[];
  roomTypes: { type: string; price: number; available: boolean }[];
  tags: string[];
  coordinates: { lat: number; lng: number };
  checkIn: string;
  checkOut: string;
  badge?: string;
}

export const hostels: Hostel[] = [
  {
    id: 1,
    name: "The Wanderer's Den",
    location: "Shoreditch, East London",
    city: "London",
    country: "United Kingdom",
    price: 28,
    currency: "GBP",
    rating: 4.8,
    reviewCount: 1243,
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
      "https://images.unsplash.com/photo-1520277739336-7bf67ec9e5e8?w=800&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
    ],
    amenities: ["Free WiFi", "Rooftop Bar", "Communal Kitchen", "Lockers", "24h Reception", "Tours Desk", "Laundry", "Bike Rental"],
    roomTypes: [
      { type: "12-Bed Dorm", price: 28, available: true },
      { type: "6-Bed Dorm", price: 38, available: true },
      { type: "Private Double", price: 89, available: false },
    ],
    tags: ["Social", "Design", "City Center", "Rooftop"],
    coordinates: { lat: 51.522, lng: -0.075 },
    checkIn: "14:00",
    checkOut: "11:00",
    badge: "Top Rated",
  },
  {
    id: 2,
    name: "Casa Nomada",
    location: "El Born, Barcelona",
    city: "Barcelona",
    country: "Spain",
    price: 22,
    currency: "EUR",
    rating: 4.6,
    reviewCount: 892,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    ],
    amenities: ["Free WiFi", "Patio Garden", "Tapas Kitchen", "Luggage Storage", "Bar", "Daily Tours", "AC", "City Maps"],
    roomTypes: [
      { type: "8-Bed Mixed Dorm", price: 22, available: true },
      { type: "4-Bed Female Dorm", price: 26, available: true },
      { type: "Private Twin", price: 72, available: true },
    ],
    tags: ["Cultural", "Social Events", "Historic Building", "Beachside"],
    coordinates: { lat: 41.385, lng: 2.181 },
    checkIn: "15:00",
    checkOut: "12:00",
  },
  {
    id: 3,
    name: "Sakura Nights",
    location: "Shinjuku, Tokyo",
    city: "Tokyo",
    country: "Japan",
    price: 3200,
    currency: "JPY",
    rating: 4.9,
    reviewCount: 2107,
    image: "https://images.unsplash.com/photo-1535082623926-b39352a03fb7?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1535082623926-b39352a03fb7?w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80",
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80",
    ],
    amenities: ["Free WiFi", "Capsule Pods", "Izakaya Lounge", "Coin Laundry", "24h Security", "Luggage Storage", "Vending Machines", "Shoe Lockers"],
    roomTypes: [
      { type: "Capsule Pod (Mixed)", price: 3200, available: true },
      { type: "Capsule Pod (Female)", price: 3200, available: true },
      { type: "Private Capsule Suite", price: 7500, available: true },
    ],
    tags: ["Capsule", "Premium", "Nightlife", "Transit Hub"],
    coordinates: { lat: 35.692, lng: 139.703 },
    checkIn: "16:00",
    checkOut: "10:00",
    badge: "Best in City",
  },
  {
    id: 4,
    name: "Selva Social Club",
    location: "Miraflores, Lima",
    city: "Lima",
    country: "Peru",
    price: 18,
    currency: "USD",
    rating: 4.5,
    reviewCount: 634,
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
    ],
    amenities: ["Free WiFi", "Ocean View Terrace", "Cooking Classes", "Bar", "Lockers", "Travel Desk", "Book Exchange", "Surf Lessons"],
    roomTypes: [
      { type: "10-Bed Dorm", price: 18, available: true },
      { type: "6-Bed Dorm", price: 24, available: true },
      { type: "Private Room", price: 58, available: false },
    ],
    tags: ["Ocean View", "Social", "Food & Drink", "Adventure"],
    coordinates: { lat: -12.119, lng: -77.037 },
    checkIn: "14:00",
    checkOut: "11:00",
  },
  {
    id: 5,
    name: "The Cape Collective",
    location: "De Waterkant, Cape Town",
    city: "Cape Town",
    country: "South Africa",
    price: 320,
    currency: "ZAR",
    rating: 4.7,
    reviewCount: 789,
    image: "https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80",
    ],

    amenities: ["Free WiFi", "Mountain Views", "Gear Rental", "Braai Terrace", "Pool", "Lockers", "Shuttle Service", "Surf Storage"],
    roomTypes: [
      { type: "8-Bed Dorm", price: 320, available: true },
      { type: "4-Bed Dorm", price: 420, available: true },
      { type: "Private En-Suite", price: 950, available: true },
    ],
    tags: ["Adventure", "Nature", "Surf", "Mountain"],
    coordinates: { lat: -33.919, lng: 18.419 },
    checkIn: "14:00",
    checkOut: "10:00",
    badge: "Staff Pick",
  },
  {
    id: 6,
    name: "Buda Side Bunks",
    location: "Castle District, Budapest",
    city: "Budapest",
    country: "Hungary",
    price: 14,
    currency: "EUR",
    rating: 4.4,
    reviewCount: 1056,
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    ],

    amenities: ["Free WiFi", "Basement Bar", "Pub Crawls", "Communal Kitchen", "Luggage Storage", "City Tours", "Laundry", "Terrace"],
    roomTypes: [
      { type: "Mixed Dorm (10-Bed)", price: 14, available: true },
      { type: "Female Dorm (6-Bed)", price: 16, available: true },
      { type: "Private Double", price: 52, available: true },
    ],
    tags: ["Party", "Budget", "Historic", "Nightlife"],
    coordinates: { lat: 47.497, lng: 19.039 },
    checkIn: "14:00",
    checkOut: "11:00",
  },
];
