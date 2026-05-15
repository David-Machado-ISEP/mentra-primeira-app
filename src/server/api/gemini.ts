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