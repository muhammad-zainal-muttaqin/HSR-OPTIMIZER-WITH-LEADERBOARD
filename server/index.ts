import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { computeCv, makeBuildHash } from "./utils.js";

const UID_REGION_MAP: Record<string, string> = {
  "6": "NA",
  "7": "EU",
  "8": "ASIA",
  "9": "TW",
  "1": "CN",
};

function normalizeRegion(region?: string | null): string | null {
  if (!region) return null;
  const trimmed = region.trim().toUpperCase();
  return trimmed.length ? trimmed : null;
}

function inferRegionFromUid(uid: string): string | null {
  const first = uid.trim()[0];
  if (!first) return null;
  return UID_REGION_MAP[first] ?? null;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

const uidBuckets = new Map<string, { tokens: number; last: number }>();
function allowUid(uid: string, ratePerMin = 60) {
  const now = Date.now();
  const refillMs = 60_000;
  const bucket = uidBuckets.get(uid) ?? { tokens: ratePerMin, last: now };
  if (now - bucket.last >= refillMs) {
    bucket.tokens = ratePerMin;
    bucket.last = now;
  }
  if (bucket.tokens <= 0) return false;
  bucket.tokens -= 1;
  uidBuckets.set(uid, bucket);
  return true;
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post("/api/ingest", async (req: Request, res: Response) => {
  try {
    const { uid, region, characterId, level, eidolon, lightConeId, stats } = req.body ?? {};
    if (!uid || typeof uid !== "string") return res.status(400).json({ error: "uid invalid" });
    if (!allowUid(uid)) return res.status(429).json({ error: "too many requests" });
    if (characterId == null) return res.status(400).json({ error: "characterId required" });
    const cr = Number(stats?.cr);
    const cd = Number(stats?.cd);
    if (!isFinite(cr) || !isFinite(cd)) return res.status(400).json({ error: "cr/cd required" });
    const cv = computeCv(cr, cd);
    const buildHash = makeBuildHash({ uid, characterId, eidolon, lightConeId });

    const inferredRegion = inferRegionFromUid(uid);
    const preferredRegion = normalizeRegion(region) ?? inferredRegion;

    await prisma.user.upsert({
      where: { uid },
      update: { region: preferredRegion ?? undefined },
      create: { uid, region: preferredRegion },
    });

    const charId = Number(characterId);
    if (!isFinite(charId)) return res.status(400).json({ error: "characterId must be number" });

    const character = await prisma.character.upsert({
      where: { uid_characterId: { uid, characterId: charId } },
      update: { 
        level: Number(level) || 80, 
        eidolon: Number(eidolon) || 0, 
        lightConeId: Number(lightConeId) || 0 
      },
      create: { 
        uid, 
        characterId: charId, 
        level: Number(level) || 80, 
        eidolon: Number(eidolon) || 0, 
        lightConeId: Number(lightConeId) || 0 
      },
    });

    const atkValue = stats?.atk != null && isFinite(Number(stats.atk)) ? new Prisma.Decimal(Number(stats.atk)) : null;
    const spdValue = stats?.spd != null && isFinite(Number(stats.spd)) ? new Prisma.Decimal(Number(stats.spd)) : null;
    
    const updated = await prisma.build.upsert({
      where: { characterId: character.id },
      update: { 
        cv: new Prisma.Decimal(cv), 
        atk: atkValue, 
        spd: spdValue, 
        critRate: new Prisma.Decimal(cr), 
        critDmg: new Prisma.Decimal(cd), 
        buildHash 
      },
      create: { 
        characterId: character.id, 
        atk: atkValue, 
        spd: spdValue, 
        critRate: new Prisma.Decimal(cr), 
        critDmg: new Prisma.Decimal(cd), 
        cv: new Prisma.Decimal(cv), 
        buildHash 
      },
    });

    res.json({ ok: true, id: updated.id.toString() });
  } catch (e) {
    console.error("[Ingest] Error:", e);
    if (e instanceof Error) {
      console.error("[Ingest] Stack:", e.stack);
    }
    res.status(500).json({ error: "internal", message: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/leaderboard/global", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const region = req.query.region ? String(req.query.region) : undefined;
    const builds = await prisma.build.findMany({
      take: limit,
      orderBy: { cv: "desc" },
      include: { character: { include: { user: true } } },
      where: region ? { character: { user: { region } } } : undefined,
    });
    res.json(builds.map(b => ({
      id: b.id.toString(),
      cv: b.cv,
      critRate: b.critRate,
      critDmg: b.critDmg,
      atk: b.atk,
      spd: b.spd,
      characterId: b.character.characterId,
      level: b.character.level,
      eidolon: b.character.eidolon,
      lightConeId: b.character.lightConeId,
      uid: b.character.uid,
      region: b.character.user?.region ?? null,
      createdAt: b.createdAt,
    })));
  } catch (e) {
    res.status(500).json({ error: "internal" });
  }
});

app.get("/api/leaderboard/character/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!isFinite(id)) return res.status(400).json({ error: "invalid character id" });
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const region = req.query.region ? String(req.query.region) : undefined;
    const builds = await prisma.build.findMany({
      take: limit,
      orderBy: { cv: "desc" },
      include: { character: { include: { user: true } } },
      where: {
        character: {
          characterId: id,
          ...(region ? { user: { region } } : {}),
        },
      },
    });
    res.json(builds.map(b => ({
      id: b.id.toString(),
      cv: b.cv,
      critRate: b.critRate,
      critDmg: b.critDmg,
      atk: b.atk,
      spd: b.spd,
      characterId: b.character.characterId,
      level: b.character.level,
      eidolon: b.character.eidolon,
      lightConeId: b.character.lightConeId,
      uid: b.character.uid,
      region: b.character.user?.region ?? null,
      createdAt: b.createdAt,
    })));
  } catch (e) {
    res.status(500).json({ error: "internal" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("[Server] Database connected");
  } catch (e) {
    console.error("[Server] Database connection failed:", e);
    process.exit(1);
  }
  
  app.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
  });
}

startServer();


