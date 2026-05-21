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
  translation: "gemini-2.5-flash-lite",
  vision: "gemini-2.5-flash",
  menuVision: "gemini-2.5-flash",
} as const;

export async function askGeminiText(prompt: string): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: "model: GEMINI_MODELS.text,",
    contents: prompt,
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
    model: "model: GEMINI_MODELS.vision",
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


export async function translateTextWithGemini(
  text: string,
  targetLanguage: string,
): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: "model: GEMINI_MODELS.translation,",
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
    model: "model: GEMINI_MODELS.menuVision",
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
  preferences: {
    interests: string[];
    travelPace: string;
    budget: string;
  };
  learnedInterestScores: Record<string, number>;
  likedPlaces: string[];
  dismissedPlaces: string[];
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
}

export async function generateRecommendationsWithGemini(
  input: AiRecommendationInput,
): Promise<AiRecommendation[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no servidor.");
  }

  const response = await ai.models.generateContent({
    model: "model: GEMINI_MODELS.recommendations,",
    contents: `
És o Travel Whisperer, um assistente turístico inteligente.

Gera recomendações personalizadas para um utilizador que está a visitar uma cidade.

Cidade atual:
${input.city}

Preferências iniciais:
${JSON.stringify(input.preferences, null, 2)}

Perfil aprendido com likes/dislikes:
${JSON.stringify(input.learnedInterestScores, null, 2)}

Locais que o utilizador já gostou:
${JSON.stringify(input.likedPlaces, null, 2)}

Locais que o utilizador ignorou:
${JSON.stringify(input.dismissedPlaces, null, 2)}

Pedido de nova ronda:
${input.refreshSeed ? `Sim. Seed: ${input.refreshSeed}` : "Não."}

Tarefa:
${
  input.mode === "nearby"
    ? `Gera exatamente 4 atrações, locais ou experiências próximos da localização atual indicada. Dá prioridade a locais realmente próximos ou relevantes nessa zona.`
    : `Gera exatamente 4 recomendações reais ou plausíveis para esta cidade.`
}

Regras:
- Se o modo for "nearby", dá prioridade à proximidade da localização atual.
- 3 recomendações devem combinar com as preferências e perfil aprendido.
- 1 recomendação deve ser exploratória, ou seja, ligeiramente diferente dos gostos habituais.
- Evita recomendar locais ignorados.
- Evita repetir locais gostados.
- Se for uma nova ronda, evita também repetir qualquer nome presente nos locais ignorados, mesmo que tenha sido passado apenas para variar as sugestões.
- Usa português de Portugal.
- As descrições devem ser curtas.
- O campo "budget" deve ser apenas: "low", "medium" ou "high".
- O campo "interests" deve usar apenas estes valores quando fizer sentido:
  "monuments", "local_food", "nature", "shopping", "nightlife", "hidden_gems".
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
    "exploration": false
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
    model: "model: GEMINI_MODELS.albumMemory,",
    contents: `
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
