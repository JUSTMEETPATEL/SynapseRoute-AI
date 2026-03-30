import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Zones (Chennai districts with synthetic failure rates) ───
  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { id: "Z1" },
      update: {},
      create: {
        id: "Z1",
        name: "Chennai Central",
        failureRate: 0.04,
        centerLat: 13.0827,
        centerLng: 80.2707,
      },
    }),
    prisma.zone.upsert({
      where: { id: "Z2" },
      update: {},
      create: {
        id: "Z2",
        name: "T. Nagar",
        failureRate: 0.06,
        centerLat: 13.0418,
        centerLng: 80.2341,
      },
    }),
    prisma.zone.upsert({
      where: { id: "Z3" },
      update: {},
      create: {
        id: "Z3",
        name: "Adyar",
        failureRate: 0.03,
        centerLat: 13.0063,
        centerLng: 80.2574,
      },
    }),
    prisma.zone.upsert({
      where: { id: "Z4" },
      update: {},
      create: {
        id: "Z4",
        name: "Anna Nagar",
        failureRate: 0.08,
        centerLat: 13.0860,
        centerLng: 80.2101,
      },
    }),
    prisma.zone.upsert({
      where: { id: "Z5" },
      update: {},
      create: {
        id: "Z5",
        name: "Velachery",
        failureRate: 0.10,
        centerLat: 12.9815,
        centerLng: 80.2180,
      },
    }),
    prisma.zone.upsert({
      where: { id: "Z6" },
      update: {},
      create: {
        id: "Z6",
        name: "Mylapore",
        failureRate: 0.05,
        centerLat: 13.0339,
        centerLng: 80.2695,
      },
    }),
  ]);
  console.log(`  ✓ ${zones.length} zones seeded`);

  // ─── Drivers ───
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Rajesh Kumar",
        currentLat: 13.0827,
        currentLng: 80.2707,
        status: "IDLE",
        totalDeliveries: 342,
        successRate: 0.96,
      },
    }),
    prisma.driver.upsert({
      where: { id: "00000000-0000-0000-0000-000000000002" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Priya Sharma",
        currentLat: 13.0418,
        currentLng: 80.2341,
        status: "IDLE",
        totalDeliveries: 287,
        successRate: 0.98,
      },
    }),
    prisma.driver.upsert({
      where: { id: "00000000-0000-0000-0000-000000000003" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000003",
        name: "Vikram Singh",
        currentLat: 13.0063,
        currentLng: 80.2574,
        status: "IDLE",
        totalDeliveries: 156,
        successRate: 0.94,
      },
    }),
  ]);
  console.log(`  ✓ ${drivers.length} drivers seeded`);

  // ─── Demo Orders ───
  const orders = await Promise.all([
    prisma.order.upsert({
      where: { id: "10000000-0000-0000-0000-000000000001" },
      update: {},
      create: {
        id: "10000000-0000-0000-0000-000000000001",
        recipientName: "Arjun Mehta",
        rawAddress: "14 Anna Salai, Chennai, TN",
        lat: 13.0604,
        lng: 80.2496,
        zoneId: "Z1",
        locationType: "COMMERCIAL",
        timePreference: "ASAP",
        status: "PENDING",
      },
    }),
    prisma.order.upsert({
      where: { id: "10000000-0000-0000-0000-000000000002" },
      update: {},
      create: {
        id: "10000000-0000-0000-0000-000000000002",
        recipientName: "Kavitha Rajan",
        rawAddress: "27 Besant Nagar, Adyar, Chennai",
        lat: 13.0002,
        lng: 80.2668,
        zoneId: "Z3",
        locationType: "RESIDENTIAL",
        timePreference: "SCHEDULED",
        scheduledTime: new Date(Date.now() + 3600_000),
        status: "PENDING",
      },
    }),
    prisma.order.upsert({
      where: { id: "10000000-0000-0000-0000-000000000003" },
      update: {},
      create: {
        id: "10000000-0000-0000-0000-000000000003",
        recipientName: "Sanjay Nair",
        rawAddress: "55 Velachery Main Road, Chennai",
        lat: 12.9815,
        lng: 80.2180,
        zoneId: "Z5",
        locationType: "RESIDENTIAL",
        timePreference: "ASAP",
        status: "PENDING",
        failureProb: 0.73,
        riskTier: "HIGH",
      },
    }),
    prisma.order.upsert({
      where: { id: "10000000-0000-0000-0000-000000000004" },
      update: {},
      create: {
        id: "10000000-0000-0000-0000-000000000004",
        recipientName: "Meera Iyer",
        rawAddress: "9 Mylapore Tank, Chennai",
        lat: 13.0339,
        lng: 80.2695,
        zoneId: "Z6",
        locationType: "RESIDENTIAL",
        timePreference: "ASAP",
        status: "PENDING",
        failureProb: 0.12,
        riskTier: "LOW",
      },
    }),
    prisma.order.upsert({
      where: { id: "10000000-0000-0000-0000-000000000005" },
      update: {},
      create: {
        id: "10000000-0000-0000-0000-000000000005",
        recipientName: "Deepak Reddy",
        rawAddress: "42 T. Nagar, Chennai",
        lat: 13.0418,
        lng: 80.2341,
        zoneId: "Z2",
        locationType: "COMMERCIAL",
        timePreference: "ASAP",
        status: "PENDING",
        failureProb: 0.45,
        riskTier: "MEDIUM",
      },
    }),
  ]);
  console.log(`  ✓ ${orders.length} demo orders seeded`);

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
