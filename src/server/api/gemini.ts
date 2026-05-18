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