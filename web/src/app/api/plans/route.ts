import { NextResponse } from "next/server";

// Sabit plan tanımları
export const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    priceLabel: "Ücretsiz",
    color: "zinc",
    badge: null,
    features: [
      "Her hafta 3 PDF yükleme",
      "Sınırsız quiz çözme",
      "Çalışma odalarına katılabilme",
      "Canlı derslere katılım",
      "Kurs satın alma",
    ],
    limits: {
      pdfsPerWeek: 3,
      roomCreationsPerWeek: 0,
      canCreateRoom: false,
    },
  },
  {
    id: "GOLD",
    name: "Gold",
    price: 75,
    priceLabel: "₺75 / ay",
    color: "amber",
    badge: "Popüler",
    features: [
      "Her hafta 8 PDF yükleme",
      "Haftada 1 çalışma odası oluşturma",
      "Gold ve üstü odalara katılma",
      "Sınırsız quiz çözme",
      "Canlı derslere katılım",
      "Kurs satın alma",
    ],
    limits: {
      pdfsPerWeek: 8,
      roomCreationsPerWeek: 1,
      canCreateRoom: true,
    },
  },
  {
    id: "PLATINUM",
    name: "Platinum",
    price: 200,
    priceLabel: "₺200 / ay",
    color: "violet",
    badge: "En İyi",
    features: [
      "Her hafta 20 PDF yükleme",
      "Haftada 5 çalışma odası oluşturma",
      "Tüm odalara katılma",
      "Platinum odaları açabilme",
      "Sınırsız quiz çözme",
      "Öncelikli destek",
    ],
    limits: {
      pdfsPerWeek: 20,
      roomCreationsPerWeek: 5,
      canCreateRoom: true,
    },
  },
];

// GET /api/plans — Plan listesini dön
export async function GET() {
  return NextResponse.json({ plans: PLANS });
}
