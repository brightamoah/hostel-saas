// utils/featureIconMap.ts

const BASE_ICON_MAP: Record<string, string> = {
  "wifi": "i-lucide-wifi",
  "internet": "i-lucide-wifi",
  "wi-fi": "i-lucide-wifi",
  "tv": "i-lucide-tv",
  "television": "i-lucide-tv",
  "storage": "i-lucide-archive",
  "wardrobe": "i-mdi-wardrobe-outline",
  "cupboard": "i-mdi-wardrobe-outline",
  "desk": "i-material-symbols-desk-rounded",
  "table": "i-material-symbols-desk-rounded",
  "fridge": "i-mdi-fridge-outline",
  "ac": "i-lucide-air-vent",
  "air conditioner": "i-lucide-air-vent",
  "air-conditioning": "i-lucide-air-vent",
  "fan": "i-lucide-fan",
  "water heater": "i-lucide-flame",
  "heater": "i-lucide-flame",
  "balcony": "i-material-symbols-balcony-rounded",
  "patio": "i-material-symbols-balcony-rounded",
  "bathroom": "i-lucide-shower-head",
  "washroom": "i-lucide-shower-head",
  "toilet": "i-lucide-shower-head",
  "shower": "i-lucide-shower-head",
  "lounge": "i-lucide-sofa",
  "common room": "i-lucide-sofa",
  "kitchen": "i-lucide-cooking-pot",
  "study": "i-lucide-book-open",
  "cctv": "i-lucide-cctv",
  "camera": "i-lucide-cctv",
  "security": "i-lucide-shield",
  "gym": "i-lucide-dumbbell",
  "laundry": "i-lucide-shirt",
  "pool": "i-lucide-waves",
  "generator": "i-lucide-zap",
  "power": "i-lucide-zap",
  "elevator": "i-lucide-arrow-up-square",
  "fire": "i-lucide-fire-extinguisher",
  "borehole": "i-lucide-droplets",
  "water": "i-lucide-droplets",
  "canteen": "i-lucide-utensils",
  "parking": "i-lucide-car",
  "car": "i-lucide-car",
};

// This Proxy allows you to do `featureIconMap["Fast WiFi"]`
// and it will automatically return "i-lucide-wifi".
export const featureIconMap = new Proxy<Record<string, string>>(BASE_ICON_MAP, {
  get(target, prop) {
    if (typeof prop !== "string") return target[prop as unknown as keyof typeof target];

    const lower = prop.toLowerCase();

    // Sort keys so longer, more specific words match first
    const sortedKeys = Object.keys(target).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (lower.includes(key)) {
        return target[key]!;
      }
    }

    // Default fallback if no match is found
    return "i-lucide-check";
  },
});
