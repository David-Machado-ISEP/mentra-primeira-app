import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY não está definida no ficheiro .env");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
});

export async function askGeminiText(prompt: string): Promise<string> {
  if (!apiKey) {
    return "Erro: GEMINI_API_KEY não está configurada no servidor.";
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
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
  city: string;
  preferences: {
    interests: string[];
    travelPace: string;
    budget: string;
  };
  learnedInterestScores: Record<string, number>;
  likedPlaces: string[];
  dismissedPlaces: string[];
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
    model: "gemini-2.5-flash",
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

Tarefa:
Gera exatamente 4 recomendações reais ou plausíveis para esta cidade.

Regras:
- 3 recomendações devem combinar com as preferências e perfil aprendido.
- 1 recomendação deve ser exploratória, ou seja, ligeiramente diferente dos gostos habituais.
- Não recomendes locais ignorados.
- Evita repetir locais gostados.
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