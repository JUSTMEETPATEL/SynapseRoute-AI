import { PrismaClient, LocationType, TimePreference, OrderStatus, RiskTier } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

// Pan-India zones
const INDIA_ZONES = [
  { id: "Z-DEL", name: "Delhi NCR", centerLat: 28.7041, centerLng: 77.1025, failureRate: 0.08 },
  { id: "Z-MUM", name: "Mumbai MMR", centerLat: 19.0760, centerLng: 72.8777, failureRate: 0.09 },
  { id: "Z-BLR", name: "Bangalore", centerLat: 12.9716, centerLng: 77.5946, failureRate: 0.07 },
  { id: "Z-HYD", name: "Hyderabad", centerLat: 17.3850, centerLng: 78.4867, failureRate: 0.05 },
  { id: "Z-MAA", name: "Chennai", centerLat: 13.0827, centerLng: 80.2707, failureRate: 0.06 },
  { id: "Z-CCU", name: "Kolkata", centerLat: 22.5726, centerLng: 88.3639, failureRate: 0.10 },
  { id: "Z-PNQ", name: "Pune", centerLat: 18.5204, centerLng: 73.8567, failureRate: 0.04 },
  { id: "Z-AMD", name: "Ahmedabad", centerLat: 23.0225, centerLng: 72.5714, failureRate: 0.03 },
];

function generateRandomOrderInZone(zone: typeof INDIA_ZONES[0], i: number) {
  // Scatter lat/lng around the zone center (±0.2 degrees ~ ±22km for massive city sprawl)
  const offsetLat = (Math.random() - 0.5) * 0.4;
  const offsetLng = (Math.random() - 0.5) * 0.4;
  
  const isHighRisk = Math.random() > 0.85; // 15% high risk
  const failureProb = isHighRisk ? 0.6 + Math.random() * 0.3 : 0.01 + Math.random() * 0.1;

  // Generic Indian names for variety
  const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Manoj", "Rahul", "Priya", "Neha", "Anita", "Riya", "Kavita", "Sita"];
  const lastNames = ["Patel", "Sharma", "Singh", "Yadav", "Nair", "Iyer", "Rao", "Reddy", "Chauhan", "Gupta"];
  const recipientName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${i}`;

  return {
    id: randomUUID(),
    recipientName,
    rawAddress: `${Math.floor(Math.random() * 999) + 1} Main Road, Sector ${Math.floor(Math.random() * 50) + 1}, ${zone.name}`,
    lat: zone.centerLat + offsetLat,
    lng: zone.centerLng + offsetLng,
    zoneId: zone.id,
    locationType: (Math.random() > 0.4 ? LocationType.RESIDENTIAL : LocationType.COMMERCIAL) as LocationType,
    timePreference: (Math.random() > 0.9 ? TimePreference.SCHEDULED : TimePreference.ASAP) as TimePreference,
    scheduledTime: Math.random() > 0.9 ? new Date(Date.now() + Math.random() * 86400000) : null,
    status: OrderStatus.PENDING as OrderStatus,
    failureProb,
    riskTier: (isHighRisk ? RiskTier.HIGH : failureProb > 0.05 ? RiskTier.MEDIUM : RiskTier.LOW) as RiskTier,
  };
}

async function main() {
  console.log("🌱 Seeding database with Pan-India Pan-India ML-aligned data...");

  // ─── Delete existing dependent data to avoid constraint issues ───
  await prisma.deliveryEvent.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.order.deleteMany({});
  
  // ─── Zones ───
  const zones = await Promise.all(
    INDIA_ZONES.map((z) =>
      prisma.zone.upsert({
        where: { id: z.id },
        update: z,
        create: z,
      })
    )
  );
  console.log(`  ✓ ${zones.length} Pan-India zones seeded`);

  // ─── Drivers ───
  const driverData = [];
  const driverFirstNames = ["Ramesh", "Suresh", "Ravi", "Amit", "Karan", "Raj", "Manoj", "Prakash", "Gaurav", "Sunil"];
  const driverLastNames = ["Kumar", "Singh", "Patel", "Yadav", "Sharma", "Chauhan", "Das", "Jadhav"];

  let driverCounter = 1;

  for (const zone of INDIA_ZONES) {
    // Give Ahmedabad 12 drivers, the rest 3-4 drivers each
    const numDrivers = zone.id === "Z-AMD" ? 12 : Math.floor(Math.random() * 2) + 3;
    for (let i = 0; i < numDrivers; i++) {
      driverData.push({
        id: randomUUID(),
        name: `${driverFirstNames[Math.floor(Math.random() * driverFirstNames.length)]} ${driverLastNames[Math.floor(Math.random() * driverLastNames.length)]} [${zone.id.split("-")[1]}]`,
        currentLat: zone.centerLat + (Math.random() - 0.5) * 0.1,
        currentLng: zone.centerLng + (Math.random() - 0.5) * 0.1,
        status: "IDLE" as const,
        totalDeliveries: Math.floor(Math.random() * 1000) + 50,
        successRate: 0.85 + (Math.random() * 0.14), // 85% to 99%
      });
      driverCounter++;
    }
  }

  const drivers = await Promise.all(
    driverData.map((d) =>
      prisma.driver.upsert({
        where: { id: d.id },
        update: d,
        create: {
          id: d.id,
          name: d.name,
          currentLat: d.currentLat,
          currentLng: d.currentLng,
          status: d.status,
          successRate: d.successRate
        },
      })
    )
  );
  console.log(`  ✓ ${drivers.length} drivers seeded (Heavy on Ahmedabad)`);

  // ─── Generate ~450+ Demo Orders ───
  const mockOrders = [];
  let orderCounter = 1;
  for (const zone of INDIA_ZONES) {
    // Give Ahmedabad ~200 orders, others ~35 orders
    const orderCount = zone.id === "Z-AMD" ? Math.floor(Math.random() * 20) + 180 : Math.floor(Math.random() * 15) + 30;
    for (let i = 0; i < orderCount; i++) {
        mockOrders.push(generateRandomOrderInZone(zone, orderCounter++));
    }
  }

  // Batch insert orders since there are many
  // Due to SQLite or simple Postgres limits, we chunk it to 100 per chunk
  const chunks = [];
  for (let i = 0; i < mockOrders.length; i += 100) {
      chunks.push(mockOrders.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((o) =>
        prisma.order.upsert({
          where: { id: o.id },
          update: o,
          create: o,
        })
      )
    );
  }
  
  console.log(`  ✓ ${mockOrders.length} randomized demo orders seeded across all zones (Heavy on Ahmedabad)`);
  console.log("✅ ML-Aligned Pan-India Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
