import type { Context } from "hono";
import type { AiRecommendation, AiRecommendationInput } from "./gemini";

const placesApiKey =
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

if (!placesApiKey) {
  console.warn(
    "GOOGLE_PLACES_API_KEY não está definida. As imagens reais dos locais ficam em fallback.",
  );
}

interface GooglePlacePhoto {
  name?: string;
}

interface GooglePlaceSearchResult {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: GooglePlacePhoto[];
  rating?: number;
}

interface GoogleTextSearchResponse {
  places?: GooglePlaceSearchResult[];
}

interface PlaceImageResult {
  googlePlaceId?: string;
  imageUrl?: string;
  rating?: number;
  lat?: number;
  lng?: number;
}

const placeImageCache = new Map<string, PlaceImageResult | null>();

const normalizeCachePart = (value?: string | number | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const buildPlacePhotoProxyUrl = (photoName: string, maxWidth: number) =>
  `/api/place-photo?name=${encodeURIComponent(photoName)}&maxWidth=${maxWidth}`;

const getSearchCacheKey = (
  recommendation: AiRecommendation,
  input: AiRecommendationInput,
) =>
  [
    input.mode ?? "personalized",
    normalizeCachePart(recommendation.name),
    normalizeCachePart(recommendation.category),
    normalizeCachePart(input.city),
    input.location?.lat?.toFixed(3),
    input.location?.lng?.toFixed(3),
  ].join("|");

async function resolvePlaceImage(
  recommendation: AiRecommendation,
  input: AiRecommendationInput,
  maxWidth: number,
): Promise<PlaceImageResult | null> {
  if (!placesApiKey) return null;

  const cacheKey = getSearchCacheKey(recommendation, input);

  if (placeImageCache.has(cacheKey)) {
    return placeImageCache.get(cacheKey) ?? null;
  }

  const textQuery = [
    recommendation.name,
    recommendation.category,
    input.city,
  ]
    .filter(Boolean)
    .join(", ");

  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "pt-PT",
    maxResultCount: 1,
  };

  if (input.location?.lat != null && input.location?.lng != null) {
    body.locationBias = {
      circle: {
        center: {
          latitude: input.location.lat,
          longitude: input.location.lng,
        },
        radius: input.mode === "nearby" ? 5000 : 20000,
      },
    };
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": placesApiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      console.warn(
        `[Places] Text search failed for ${recommendation.name}: ${response.status}`,
      );
      placeImageCache.set(cacheKey, null);
      return null;
    }

    const data = (await response.json()) as GoogleTextSearchResponse;
    const place = data.places?.[0];
    const photoName = place?.photos?.[0]?.name;

    if (!place || !photoName) {
      placeImageCache.set(cacheKey, null);
      return null;
    }

    const result: PlaceImageResult = {
      googlePlaceId: place.id,
      imageUrl: buildPlacePhotoProxyUrl(photoName, maxWidth),
      rating: place.rating,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    };

    placeImageCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`[Places] Failed to resolve image for ${recommendation.name}`, error);
    placeImageCache.set(cacheKey, null);
    return null;
  }
}

export async function enrichRecommendationsWithPlaceImages(
  recommendations: AiRecommendation[],
  input: AiRecommendationInput,
) {
  const maxWidth = input.mode === "nearby" ? 360 : 900;

  return Promise.all(
    recommendations.map(async (recommendation) => {
      const placeImage = await resolvePlaceImage(
        recommendation,
        input,
        maxWidth,
      );

      if (!placeImage) return recommendation;

      return {
        ...recommendation,
        imageUrl: placeImage.imageUrl ?? recommendation.imageUrl,
        rating: recommendation.rating ?? placeImage.rating,
        lat: recommendation.lat ?? placeImage.lat,
        lng: recommendation.lng ?? placeImage.lng,
        googlePlaceId: placeImage.googlePlaceId,
      };
    }),
  );
}

export async function getPlacePhoto(c: Context) {
  if (!placesApiKey) {
    return c.text("Google Places API key is not configured.", 503);
  }

  const photoName = c.req.query("name");
  const rawMaxWidth = Number(c.req.query("maxWidth") || 900);
  const maxWidth = Math.min(Math.max(rawMaxWidth || 900, 120), 1600);

  if (!photoName || !photoName.startsWith("places/") || !photoName.includes("/photos/")) {
    return c.text("Invalid photo name.", 400);
  }

  const googlePhotoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${placesApiKey}`;
  const response = await fetch(googlePhotoUrl, {
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    return new Response("Place photo not available.", {
      status: response.status || 404,
    });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
    },
  });
}
