import { z } from "zod";

export const createOrderSchema = z.object({
  recipientName: z.string().min(2),
  address: z.string().min(5),
  locationType: z.enum(["home", "apartment", "office"]),
  timePreference: z.string().min(2)
});

export const geocodeSchema = z.object({
  address: z.string().min(5)
});

export const predictSchema = z.object({
  orderId: z.string().uuid().optional(),
  features: z.record(z.any())
});

export const optimizeRouteSchema = z.object({
  driverId: z.string(),
  stops: z.array(z.object({
    orderId: z.string().uuid().optional(),
    lat: z.number(),
    lng: z.number(),
    riskScore: z.number().min(0).max(1).optional()
  })).min(1)
});
