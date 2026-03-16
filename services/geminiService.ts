// services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedCadence, TermotubosContext } from "../types";

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Removed global instantiation

const SYSTEM_INSTRUCTION = `
**IDENTIDADE E CONTEXTO:**
Você é o Especialista Sênior em Vendas e Engenharia de Cadências da **TERMOTUBOS**.
Sua missão é criar fluxos de prospecção e resposta para clientes industriais e B2B.
Você respira o mercado de tubos, conexões e soluções térmicas/industriais.

**SUA BASE DE CONHECIMENTO:**
1. Neurovendas: Cérebro Reptiliano vs. Neocórtex.
2. Cialdini: Autoridade, Escassez, Prova Social, Compromisso.
3. SPIN Selling & Challenger Sale: Foco na dor do cliente.
4. Copywriting B2B: Breve, direto, sem formalidade excessiva.

**REGRAS DE OURO:**
* Nunca pareça desesperado.
* Postura de consultor técnico/especialista.
* Se o cliente ignorou, a culpa é da abordagem.

**TAREFA:**
Gerar uma estrutura de cadência completa (7 toques) e cenários de resposta baseados no gatilho do usuário.
O retorno DEVE ser estritamente em JSON seguindo o schema fornecido.
`;

export const generateCadence = async (
  trigger: string,
  context: TermotubosContext
): Promise<GeneratedCadence> => {
  // Create a new GoogleGenAI instance right before the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    **CONTEXTO DA EMPRESA (TERMOTUBOS):**
    * O que vendemos: ${context.products}
    * Diferencial: ${context.differential}
    * Público Alvo: ${context.targetAudience}

    **GATILHO DO VENDEDOR:**
    "${trigger}"

    Gere a cadência de 7 toques e a árvore de respostas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: {
              type: Type.STRING,
              description: "Explicação da estratégia psicológica usada em 1 linha.",
            },
            steps: {
              type: Type.ARRAY,
              description: "A lista de 7 toques da cadência.",
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER, description: "Dia do toque (ex: 1, 3, 6...)" },
                  type: { 
                    type: Type.STRING, 
                    enum: ["EMAIL", "CALL", "WHATSAPP"],
                    description: "Tipo do canal de comunicação." 
                  },
                  title: { type: Type.STRING, description: "Título descritivo do toque (ex: Toque 01: Abertura)" },
                  subject: { type: Type.STRING, description: "Assunto do e-mail (se aplicável, deixe vazio para Call/WhatsApp se não houver título)" },
                  body: { type: Type.STRING, description: "O script completo da mensagem ou roteiro de ligação." },
                },
                required: ["day", "type", "title", "body"],
              },
            },
            responses: {
              type: Type.ARRAY,
              description: "Cenários de resposta (Árvore de Respostas).",
              items: {
                type: Type.OBJECT,
                properties: {
                  scenarioName: { type: Type.STRING, description: "Nome do cenário (ex: Cenário A)" },
                  description: { type: Type.STRING, description: "Descrição de quando ocorre (ex: Respondeu no toque 1-3)" },
                  script: { type: Type.STRING, description: "O script de resposta." },
                },
                required: ["scenarioName", "description", "script"],
              },
            },
          },
          required: ["strategy", "steps", "responses"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedCadence;
    } else {
      throw new Error("No response text received from Gemini.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};