import "dotenv/config";
import express from "express";
import { createClient } from "redis";
import { prisma } from "./prisma.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (error) => {
  console.error("Redis error:", error.message);
});

app.get("/", (req, res) => {
  res.json({ message: "IoT Backend System" });
});

// POST /api/telemetry
app.post("/api/telemetry", async (req, res) => {
  try {
    const { device_id, voltage, current, timestamp } = req.body;

    if (
      typeof device_id !== "string" ||
      !device_id.trim() ||
      typeof voltage !== "number" ||
      !Number.isFinite(voltage) ||
      typeof current !== "number" ||
      !Number.isFinite(current)
    ) {
      return res.status(400).json({
        message: "device_id, voltage and current are required",
      });
    }

    const data = {
      device_id: device_id.trim(),
      voltage,
      current,
    };

    if (timestamp !== undefined) {
      const parsedDate = new Date(timestamp);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "timestamp must be a valid date",
        });
      }

      data.timestamp = parsedDate;
    }

    const telemetry = await prisma.telemetry.create({ data });

    // Redis cache is best-effort; PostgreSQL is the source of truth.
    try {
      await redis.set(
        `device:${telemetry.device_id}:latest_status`,
        JSON.stringify(telemetry),
      );
    } catch (error) {
      console.error("Unable to update Redis cache:", error.message);
    }

    return res.status(201).json({
      message: "Telemetry saved successfully",
      data: telemetry,
    });
  } catch (error) {
    console.error("POST /api/telemetry:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/devices/:id/status
app.get("/api/devices/:id/status", async (req, res) => {
  const deviceId = req.params.id;
  const cacheKey = `device:${deviceId}:latest_status`;

  try {
    // Try Redis first.
    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json({
          source: "redis",
          data: JSON.parse(cached),
        });
      }
    } catch (error) {
      console.error("Redis cache read failed:", error.message);
    }

    // Cache miss or Redis unavailable: query PostgreSQL.
    const telemetry = await prisma.telemetry.findFirst({
      where: { device_id: deviceId },
      orderBy: { timestamp: "desc" },
    });

    if (!telemetry) {
      return res.status(404).json({
        message: "No telemetry found for this device",
      });
    }

    try {
      await redis.set(cacheKey, JSON.stringify(telemetry));
    } catch (error) {
      console.error("Unable to populate Redis cache:", error.message);
    }

    return res.json({
      source: "postgres",
      data: telemetry,
    });
  } catch (error) {
    console.error("GET /api/devices/:id/status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

async function startServer() {
  await redis.connect();

  app.listen(PORT, () => {
    console.log(`IoT Backend API running at http://localhost:${PORT}`);
  });
}

startServer().catch(async (error) => {
  console.error("Failed to start server:", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});