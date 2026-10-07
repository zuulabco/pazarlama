import "server-only";
import { z } from "zod";
import { searchLimits } from "./config";

const API = "https://api.apify.com/v2";
/** compass/crawler-google-places (Google Maps Scraper) */
const ACTOR = "compass~crawler-google-places";

const auth = () => ({ Authorization: `Bearer ${process.env.APIFY_TOKEN}` });

export type RunInfo = { id: string; status: string; datasetId: string; costUsd: number | null };

const runSchema = z.object({
  id: z.string(),
  status: z.string(),
  defaultDatasetId: z.string(),
  usageTotalUsd: z.number().nullish(),
});

const toRun = (data: unknown): RunInfo => {
  const r = runSchema.parse(data);
  return { id: r.id, status: r.status, datasetId: r.defaultDatasetId, costUsd: r.usageTotalUsd ?? null };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...auth(), ...init?.headers }, cache: "no-store" });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

/** Yalnızca temel yer verisi çekilir; ücretli ek hizmetler (iletişim, yorum, görsel) kapalıdır. */
export async function startPlacesRun(opts: {
  query: string;
  location: string;
  maxResults: number;
  /** Tanımlıysa koşu bitince bu adrese çağrı yapılır. */
  webhook?: { url: string; secret: string };
}): Promise<RunInfo> {
  const params = new URLSearchParams({
    maxTotalChargeUsd: String(searchLimits.maxChargeUsd),
    timeout: String(searchLimits.runTimeoutSecs),
  });

  if (opts.webhook) {
    const hook = [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED", "ACTOR.RUN.TIMED_OUT"],
        requestUrl: opts.webhook.url,
        headersTemplate: JSON.stringify({ "x-webhook-secret": opts.webhook.secret }),
      },
    ];
    params.set("webhooks", Buffer.from(JSON.stringify(hook)).toString("base64"));
  }

  const body = {
    searchStringsArray: [opts.query],
    locationQuery: `${opts.location}, Türkiye`,
    maxCrawledPlacesPerSearch: opts.maxResults,
    language: "tr",
    skipClosedPlaces: true,
    scrapePlaceDetailPage: false,
    scrapeContacts: false,
    maxReviews: 0,
    maxImages: 0,
  };

  const { data } = await call<{ data: unknown }>(`/acts/${ACTOR}/runs?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return toRun(data);
}

export async function getRun(runId: string): Promise<RunInfo> {
  const { data } = await call<{ data: unknown }>(`/actor-runs/${encodeURIComponent(runId)}`);
  return toRun(data);
}

const placeSchema = z.object({
  placeId: z.string().min(1),
  title: z.string().min(1),
  categoryName: z.string().nullish(),
  categories: z.array(z.string()).nullish(),
  address: z.string().nullish(),
  neighborhood: z.string().nullish(),
  city: z.string().nullish(),
  website: z.string().nullish(),
  phone: z.string().nullish(),
  totalScore: z.number().nullish(),
  reviewsCount: z.number().nullish(),
  url: z.string().nullish(),
  claimThisBusiness: z.boolean().nullish(),
  imagesCount: z.number().nullish(),
  permanentlyClosed: z.boolean().nullish(),
  temporarilyClosed: z.boolean().nullish(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullish(),
});

export type Place = {
  placeId: string;
  name: string;
  category: string | null;
  categories: string[];
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** İşletme sahibi profili sahiplenmemişse false. */
  claimed: boolean | null;
  imageCount: number | null;
  closed: boolean;
  raw: Record<string, unknown>;
};

const fields = Object.keys(placeSchema.shape).join(",");

/** Veri kümesinden firmaları okur; biçimi bozuk kayıtları atlar. */
export async function listPlaces(datasetId: string, limit: number): Promise<Place[]> {
  const items = await call<unknown[]>(
    `/datasets/${encodeURIComponent(datasetId)}/items?format=json&clean=true&limit=${limit}&fields=${fields}`,
  );
  const places: Place[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const parsed = placeSchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.placeId)) continue;
    seen.add(parsed.data.placeId);
    const p = parsed.data;
    places.push({
      placeId: p.placeId,
      name: p.title,
      category: p.categoryName ?? null,
      categories: p.categories ?? [],
      address: p.address ?? null,
      city: p.city ?? null,
      district: p.neighborhood ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      mapsUrl: p.url ?? null,
      rating: p.totalScore ?? null,
      reviewCount: p.reviewsCount ?? null,
      claimed: p.claimThisBusiness == null ? null : p.claimThisBusiness === false,
      imageCount: p.imagesCount ?? null,
      closed: Boolean(p.permanentlyClosed || p.temporarilyClosed),
      raw: item as Record<string, unknown>,
    });
  }
  return places;
}

export const isFinished = (status: string) => ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status);
