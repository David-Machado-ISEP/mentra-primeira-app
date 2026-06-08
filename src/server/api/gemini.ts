import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY não está definida no ficheiro .env");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
});

const GEMINI_MODELS = {
  text: "gemini-2.5-flash-lite",
  recommendations: "gemini-2.5-flash-lite",
  albumMemory: "gemini-2.5-flash-lite",
  itinerary: "gemini-2.5-flash-lite",
  translation: "gemini-2.5-flash-lite",
  vision: "gemini-2.5-flash",
  menuVision: "gemini-2.5-flash",
} as const;

/**
 * Flag experimental para testar a classificação automática das fotos nas Memórias.
 *
 * Para desligar sem remover código:
 * - no .env: ENABLE_MEMORY_AI_CLASSIFICATION=false
 * - ou alterar o valor por defeito para false.
 */
export const ENABLE_MEMORY_AI_CLASSIFICATION =
//Trocar entre false e true para ativar/desativar a classificação automática das fotos nas Memórias
  process.env.ENABLE_MEMORY_AI_CLASSIFICATION !== "false";

export const MEMORY_IMAGE_CATEGORIES = [
  "food",
  "outdoor",
  "landmark",
  "city",
  "shopping",
  "nightlife",
  "transport",
  "people",
  "general",
] as const;

export type MemoryImageCategory = (typeof MEMORY_IMAGE_CATEGORIES)[number];

export interface MemoryImageAnalysis {
  description: string;
  category: MemoryImageCategory;
  tags: string[];
  confidence: number;
}

const isMemoryImageCategory = (value: string): value is MemoryImageCategory =>
  (MEMORY_IMAGE_CATEGORIES as readonly string[]).includes(value);

const clampConfidence = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) return 0.5;
  return Math.min(1, Math.max(0, numberValue));
};

const extractJsonObject = (value: string): string | null => {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return value.slice(firstBrace, lastBrace + 1);
};

const normalizeMemoryImageAnalysis = (
  parsed: Partial<MemoryImageAnalysis>,
): MemoryImageAnalysis => {
  const rawCategory = String(parsed.category ?? "general")
    .trim()
    .toLowerCase();
  const category = isMemoryImageCategory(rawCategory)
    ? rawCategory
    : "general";
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const description =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : "Fotografia captada durante a viagem.";

  return {
    description,
    category,
    tags,
    confidence: clampConfidence(parsed.confidence),
  };
};

export async function askGeminiText(prompt: string): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.text,    contents: prompt,
  });

  return response.text ?? "Não consegui gerar uma resposta.";
}

export async function describeImageWithGemini(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.vision,    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `
És o Travel Whisperer, um assistente turístico para smart glasses.

O utilizador acabou de tirar uma fotografia e quer saber o que está a ver.

Responde em português de Portugal.
Dá uma descrição breve, natural e útil.
Fala como um guia turístico discreto.
Não sejas demasiado técnico.
Se reconheceres um monumento, estádio, rua, restaurante ou local turístico, explica o contexto.
Se não tiveres a certeza, diz que parece ser algo, sem inventar.
            `,
          },
        ],
      },
    ],
  });

  return response.text ?? "Não consegui descrever a imagem.";
}



export async function analyzeImageForMemoryWithGemini(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<MemoryImageAnalysis | null> {
  if (!ENABLE_MEMORY_AI_CLASSIFICATION) {
    return null;
  }

  if (!apiKey) {
    console.warn(
      "[Gemini] Memory AI classification skipped: GEMINI_API_KEY não está configurada.",
    );
    return null;
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.vision,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `
És o Travel Whisperer, um assistente turístico para smart glasses.

Analisa esta fotografia para a página de Memórias de uma app de viagem.

Devolve apenas JSON válido, sem markdown, sem texto antes e sem texto depois.

Categorias permitidas:
- food: comida, bebida, pratos, restaurantes, cafés, menus
- outdoor: natureza, praia, mar, parques, jardins, miradouros, paisagens
- landmark: monumentos, museus, igrejas, castelos, palácios, locais históricos
- city: ruas, praças, edifícios, arquitetura urbana, cidade
- shopping: lojas, mercados, centros comerciais, souvenirs
- nightlife: bares, discotecas, concertos, noite, festa
- transport: estação, metro, comboio, autocarro, aeroporto, táxi
- people: pessoas, grupo, selfie, retrato
- general: quando não houver uma categoria clara

Formato obrigatório:
{
  "description": "descrição curta em português de Portugal, adequada para uma memória de viagem",
  "category": "food | outdoor | landmark | city | shopping | nightlife | transport | people | general",
  "tags": ["tag-curta-1", "tag-curta-2", "tag-curta-3"],
  "confidence": 0.0
}

Regras:
- Usa português de Portugal na description.
- Usa tags curtas, preferencialmente em inglês simples ou termos turísticos comuns.
- Não inventes locais específicos se não tiveres a certeza.
- Se a imagem for ambígua, usa category "general" e confidence baixo.
            `,
          },
        ],
      },
    ],
  });

  const rawText = response.text?.trim() ?? "";
  const jsonText = extractJsonObject(rawText);

  if (!jsonText) {
    console.warn("[Gemini] Memory AI classification returned non-JSON text:", rawText);
    return {
      description: rawText || "Fotografia captada durante a viagem.",
      category: "general",
      tags: [],
      confidence: 0.35,
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<MemoryImageAnalysis>;
    return normalizeMemoryImageAnalysis(parsed);
  } catch (error) {
    console.warn("[Gemini] Failed to parse memory AI classification JSON", error);
    return null;
  }
}

export async function translateTextWithGemini(
  text: string,
  targetLanguage: string,
): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.translation,
        contents: `
You are a translation engine for a smart glasses travel assistant.

Translate the following text to ${targetLanguage}.

Rules:
- Return only the translated sentence.
- Do not explain.
- Do not add quotation marks.
- Keep the meaning natural and conversational.
- If the text is already in ${targetLanguage}, return it naturally in ${targetLanguage}.

Text:
${text}
    `,
  });

  return response.text?.trim() || "Translation failed";
}


export async function translateMenuImageWithGemini(
  imageBase64: string,
  targetLanguage = "Português",
  mimeType = "image/jpeg",
): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.menuVision,    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `
You are a restaurant menu translator for smart glasses.

Read the restaurant menu from the image and translate it into ${targetLanguage}.

Rules:
- Return only the translated menu text.
- Keep the structure clear and easy to listen to.
- If there are dish names, ingredients, prices, or sections, preserve them as clearly as possible.
- If some text is unreadable, say that part is unreadable instead of inventing.
- Keep the response concise and useful for audio playback.
            `,
          },
        ],
      },
    ],
  });

  return response.text?.trim() || "Não consegui traduzir o menu.";
}

export interface AiRecommendationInput {
  mode?: "personalized" | "nearby";
  city: string;
  location?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
    placeName?: string;
    displayName?: string;
    city?: string;
    country?: string;
  } | null;
  userProfile?: {
    name?: string;
    assistantStyle?: string;
    detailLevel?: string;
  };
  preferences: {
    interests: string[];
    travelPace: string;
    budget: string;
  };
  learnedInterestScores: Record<string, number>;
  likedPlaces: string[];
  dismissedPlaces: string[];
  selectedCategory?: string | null;
  alreadyShownRecommendations?: string[];
  currentTripId?: string | null;
  visitedPlaces?: string[];
  refreshSeed?: number;
}

export interface AiRecommendation {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedTime: string;
  budget: string;
  interests: string[];
  reason: string;
  exploration: boolean;
  image?: string;
  imageUrl?: string;
  rating?: number;
  distance?: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
}

export async function generateRecommendationsWithGemini(
  input: AiRecommendationInput,
): Promise<AiRecommendation[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no servidor.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.recommendations,    contents: `
És o Travel Whisperer, um assistente turístico inteligente.

Gera recomendações personalizadas para um utilizador que está a visitar uma cidade.

Cidade atual:
${input.city}

Localização atual:
${JSON.stringify(input.location, null, 2)}

Perfil do utilizador:
${JSON.stringify(input.userProfile ?? {}, null, 2)}

Preferências iniciais:
${JSON.stringify(input.preferences, null, 2)}

Categoria/filtro selecionado na página Explorar:
${input.selectedCategory || "Nenhum"}

Perfil aprendido com likes/dislikes:
${JSON.stringify(input.learnedInterestScores, null, 2)}

Locais que o utilizador já gostou:
${JSON.stringify(input.likedPlaces, null, 2)}

Locais que o utilizador ignorou:
${JSON.stringify(input.dismissedPlaces, null, 2)}

Sugestões já mostradas no ecrã atual:
${JSON.stringify(input.alreadyShownRecommendations ?? [], null, 2)}

Locais já visitados ou guardados nesta viagem:
${JSON.stringify(input.visitedPlaces ?? [], null, 2)}

Contexto da viagem atual:
${input.currentTripId || "Sem viagem ativa"}

Pedido de nova ronda:
${input.refreshSeed ? `Sim. Seed: ${input.refreshSeed}` : "Não."}

Tarefa:
${
  input.mode === "nearby"
  ? `Gera exatamente 8 atrações, locais ou experiências a no máximo 5 km da localização atual indicada. Só deves sugerir locais realmente próximos nessa zona.`
  : `Gera exatamente 4 smart recommendations para esta cidade. Podem ser locais, micro-rotas ou experiências curtas, mas devem parecer personalizadas e úteis para uma viagem real.`
}

Regras:
- Usa o nome, assistantStyle e detailLevel do perfil para ajustar o tom e o nível de detalhe, sem mencionar que estás a usar esses dados.
- Se existir latitude/longitude, usa-as como contexto de proximidade.
- Se existir categoria/filtro selecionado diferente de "Próximos", tenta respeitar essa intenção.
- Se o modo for "nearby", todas as sugestões têm de estar a 5 km ou menos da localização atual.
- Se o modo for "nearby", o campo "distance" é obrigatório e deve representar a distância aproximada em km ou metros.
- Se o modo for "nearby", inclui sempre latitude e longitude reais aproximadas do local. Não sugiras um local cuja posição não consigas identificar.
- Se o modo for "personalized", dá prioridade a preferências, ritmo da viagem, orçamento, cidade atual e histórico aprendido.
- 3 recomendações devem combinar com as preferências e perfil aprendido.
- 1 recomendação deve ser exploratória, ou seja, ligeiramente diferente dos gostos habituais.
- Evita recomendar locais ignorados.
- Evita repetir locais gostados.
- Evita repetir locais já visitados ou guardados nesta viagem.
- Evita repetir qualquer sugestão já mostrada no ecrã atual.
- Se for uma nova ronda, evita também repetir qualquer nome presente nos locais ignorados, mesmo que tenha sido passado apenas para variar as sugestões.
- Cada sugestão deve ter no campo "name" o nome real e pesquisável de um local, zona ou experiência identificável na cidade, para permitir obter a fotografia correta através de uma API de lugares.
- Evita nomes genéricos inventados como "Rota dos sabores" sem indicar um local real reconhecível.
- Usa português de Portugal.
- As descrições devem ser curtas.
- Não inventes URLs de imagens. Se tiveres uma imagem estável e pública, podes preencher "imageUrl"; caso contrário, omite esse campo.
- Se souberes uma distância aproximada para nearby, podes preencher "distance"; caso contrário, omite.
- Se souberes rating real aproximado, podes preencher "rating"; caso contrário, omite.
- O campo "budget" deve ser apenas: "low", "medium" ou "high".
- O campo "interests" deve usar apenas estes valores quando fizer sentido:
  "monuments", "local_food", "nature", "architecture", "nightlife", "local_culture", "shopping", "photography", "adventure", "beaches", "hidden_gems".
- Interpreta os interesses da seguinte forma:
  - "monuments": história, monumentos, património, museus e locais históricos.
  - "local_food": gastronomia local, mercados, restaurantes típicos e cafés tradicionais.
  - "nature": parques, jardins, miradouros naturais e zonas verdes.
  - "architecture": arquitetura, edifícios marcantes, design urbano e ruas bonitas.
  - "nightlife": bares, música ao vivo, zonas animadas e experiências noturnas.
  - "local_culture": cultura local, tradições, bairros autênticos, eventos e vida quotidiana.
  - "shopping": lojas, mercados, comércio local e zonas comerciais.
  - "photography": miradouros, ruas bonitas, locais fotogénicos e vistas memoráveis.
  - "adventure": experiências ativas, caminhadas, atividades ao ar livre e descoberta.
  - "beaches": praias, costa, mar, zonas ribeirinhas e sunsets.
  - "hidden_gems": locais menos óbvios, experiências autênticas e sítios menos turísticos.
  - A recomendação exploratória deve ter "exploration": true.
- As outras devem ter "exploration": false.

Responde apenas com JSON válido, sem markdown, neste formato:

[
  {
    "id": "porto-mercado-bolhao",
    "name": "Mercado do Bolhão",
    "category": "Comida local",
    "description": "Mercado histórico com produtos tradicionais e ambiente típico do Porto.",
    "estimatedTime": "45-60 min",
    "budget": "medium",
    "interests": ["local_food", "hidden_gems"],
    "reason": "Combina com o teu interesse em comida local e experiências autênticas.",
    "exploration": false,
    "distance": "0.8 km",
    "rating": 4.7
  }
]
    `,
  });

  const rawText = response.text?.trim() || "[]";

  const cleanedText = rawText
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleanedText) as AiRecommendation[];
  } catch (error) {
    console.error("[Gemini Recommendations] Failed to parse JSON:", rawText);
    throw error;
  }
}



export interface ItineraryOptimizationInputItem {
  id: string;
  name: string;
  category?: string;
  description?: string;
  estimatedTime?: string;
  budget?: string;
  interests?: string[];
  reason?: string;
  currentOrder?: number;
}

export interface ItineraryOptimizationOutputItem {
  id: string;
  optimizedOrder: number;
  optimizedPeriod: "morning" | "afternoon" | "night";
  aiOptimizationReason: string;
}

const normalizeItineraryPeriod = (
  value: unknown,
): ItineraryOptimizationOutputItem["optimizedPeriod"] => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["morning", "manha", "manhã"].includes(normalized)) {
    return "morning";
  }

  if (["afternoon", "tarde"].includes(normalized)) {
    return "afternoon";
  }

  if (["night", "noite"].includes(normalized)) {
    return "night";
  }

  return "afternoon";
};

export async function optimizeItineraryWithGemini(input: {
  destination?: string;
  items: ItineraryOptimizationInputItem[];
}): Promise<ItineraryOptimizationOutputItem[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no servidor.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.itinerary,
    contents: `
És o Travel Whisperer, um assistente turístico que organiza roteiros de viagem.

Destino:
${input.destination || "Destino não especificado"}

Locais a organizar:
${JSON.stringify(input.items, null, 2)}

Tarefa:
Organiza estes locais pela melhor ordem para uma visita no mesmo dia.
Considera o tipo de atividade, duração estimada, orçamento, interesses, ritmo da experiência e melhor altura do dia.

Regras:
- Mantém exatamente os mesmos ids recebidos.
- Não inventes locais novos.
- Usa optimizedOrder começando em 1.
- Usa optimizedPeriod apenas com um destes valores: "morning", "afternoon", "night".
- A razão deve ser curta, útil e em português de Portugal.
- Devolve apenas JSON válido, sem markdown.

Formato obrigatório:
{
  "items": [
    {
      "id": "id-do-local",
      "optimizedOrder": 1,
      "optimizedPeriod": "morning",
      "aiOptimizationReason": "Boa primeira paragem por ser uma visita curta e mais agradável cedo."
    }
  ]
}
    `,
  });

  const rawText = response.text?.trim() || "{}";
  const jsonText = extractJsonObject(rawText) || rawText;
  const parsed = JSON.parse(jsonText) as {
    items?: Array<Partial<ItineraryOptimizationOutputItem>>;
  };

  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return items
    .filter((item) => typeof item.id === "string" && item.id.trim())
    .map((item, index) => ({
      id: String(item.id),
      optimizedOrder:
        typeof item.optimizedOrder === "number" &&
        Number.isFinite(item.optimizedOrder)
          ? item.optimizedOrder
          : index + 1,
      optimizedPeriod: normalizeItineraryPeriod(item.optimizedPeriod),
      aiOptimizationReason:
        typeof item.aiOptimizationReason === "string" &&
        item.aiOptimizationReason.trim()
          ? item.aiOptimizationReason.trim()
          : "Sugestão gerada para equilibrar o roteiro e a melhor altura da visita.",
    }))
    .sort((a, b) => a.optimizedOrder - b.optimizedOrder);
}

export interface AlbumMemoryInput {
  albumName: string;
  photoCount: number;
  photoTimes: string[];
}

export async function generateAlbumMemoryWithGemini(
  input: AlbumMemoryInput,
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no servidor.");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.albumMemory,    contents: `
És o Travel Whisperer, um assistente de viagem para smart glasses.

Gera uma memória curta e natural para um álbum de viagem.

Dados do álbum:
- Nome do álbum: ${input.albumName}
- Número de fotografias: ${input.photoCount}
- Horas/momentos das fotografias: ${input.photoTimes.join(", ")}

Regras:
- Escreve em português de Portugal.
- Não inventes locais específicos se eles não forem fornecidos.
- Faz parecer uma memória de viagem organizada.
- Máximo 3 frases.
- Tom natural, simples e agradável.
- Não uses markdown.
- Não uses listas.

Resposta:
    `,
  });

  return (
    response.text?.trim() ||
    "Este álbum reúne momentos capturados durante a viagem, organizados como uma memória visual da experiência."
  );
}
