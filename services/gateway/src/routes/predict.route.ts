import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/guards.js";
import { request as httpRequest } from "undici";

const predictSchema = z.object({
  orderId: z.string().uuid(),
});

const geocodeSchema = z.object({
  address: z.string().min(5),
});

export async function predictRoutes(app: FastifyInstance) {
  // Get failure prediction for an order
  app.post(
    "/api/predict",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { orderId } = predictSchema.parse(req.body);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { zone: true },
      });

      if (!order) {
        return { error: "NOT_FOUND", message: "Order not found" };
      }

      const now = new Date();
      const features = {
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),
        location_type: order.locationType.toLowerCase(),
        zone_failure_rate: order.zone?.failureRate ?? 0.05,
        distance_from_depot_km: 5.0, // Placeholder — compute from coords
        weather_category: "clear",    // Placeholder — integrate weather API later
        is_evening: now.getHours() >= 18 ? 1 : 0,
        is_weekend: [0, 6].includes(now.getDay()) ? 1 : 0,
      };

      try {
        const { body } = await httpRequest(`${config.predictorUrl}/predict`, {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, features }),
          headers: { "content-type": "application/json" },
        });
        const prediction = (await body.json()) as {
          failure_probability: number;
          risk_tier: string;
          contributing_factors?: string[];
        };

        // Determine risk tier
        const riskTier =
          prediction.failure_probability >= 0.65
            ? "HIGH"
            : prediction.failure_probability >= 0.3
              ? "MEDIUM"
              : "LOW";

        // Update order with prediction
        await prisma.order.update({
          where: { id: orderId },
          data: {
            failureProb: prediction.failure_probability,
            riskTier,
          },
        });

        // Log risk event if high
        if (riskTier === "HIGH") {
          await prisma.deliveryEvent.create({
            data: {
              orderId,
              eventType: "RISK_FLAGGED",
              payload: {
                failureProbability: prediction.failure_probability,
                contributingFactors: prediction.contributing_factors,
              },
            },
          });
        }

        return {
          data: {
            orderId,
            failureProbability: prediction.failure_probability,
            riskTier,
            contributingFactors: prediction.contributing_factors ?? [],
          },
        };
      } catch (error) {
        app.log.error(error, "Prediction service call failed");
        return {
          error: "UPSTREAM_ERROR",
          message: "Failure prediction service unavailable",
        };
      }
    }
  );
}

export async function geocodeRoutes(app: FastifyInstance) {
  app.post(
    "/api/geocode",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest) => {
      const { address } = geocodeSchema.parse(req.body);

      // Use Nominatim for geocoding (free, no API key)
      try {
        const { body } = await httpRequest(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: { "User-Agent": "SynapseRouteAI/0.1" },
          }
        );
        const results = (await body.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
        }>;

        if (results.length === 0) {
          return {
            data: {
              address,
              lat: null,
              lng: null,
              zoneId: null,
              normalized: null,
            },
          };
        }

        const result = results[0];
        return {
          data: {
            address,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            zoneId: "Z1", // Placeholder — implement zone detection
            normalized: result.display_name,
          },
        };
      } catch {
        // Fallback to Chennai central coords
        return {
          data: {
            address,
            lat: 13.0827,
            lng: 80.2707,
            zoneId: "Z1",
            normalized: address,
          },
        };
      }
    }
  );
}
