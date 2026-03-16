// services/aiBrain.ts
import { GoogleGenAI, Type } from "@google/genai";
import { CadencePhase, CadenceStep, ChannelType, ModuleTone, ScriptVariant, ClientProfile } from '../types';
import { db } from './database';
import { buildConversationHistory } from '../utils/historyBuilder'; // Correct import for buildConversationHistory

// Removed global apiKey constant. process.env.API_KEY will be used directly during instantiation.

// --- TEMPLATES LOCAIS (Fallback - Apenas para Fluxo Normal) ---
const LOCAL_VARIANTS = {
  price: (ctx: any, obj: string) => [
    { type: 'consultivo', title: "Investigação", body: `Oi ${ctx.name}. Entendo a questão do preço.\n\nSe tirarmos o valor da frente por um minuto: tecnicamente, o material atende o que a engenharia precisa? Ou estamos comparando produtos diferentes?` },
    { type: 'valor', title: "Custo vs Preço", body: `${ctx.name}, faz sentido. Mas cuidado com a 'economia burra'.\n\nNossos tubos duram 3x mais. Fiz uma conta rápida: em 2 anos, você economiza 20% no OPEX. Posso te mandar essa planilha?` },
    { type: 'direto', title: "Negociação", body: `Entendido, ${ctx.name}.\n\nPara chegarmos no target que você precisa, conseguimos ajustar o prazo de pagamento ou o volume? Onde temos flexibilidade?` }
  ],
  timing: (ctx: any, obj: string) => [
    { type: 'consultivo', title: "Escuta Ativa", body: `Tranquilo, ${ctx.name}. Imaginei que estivessem na correria.\n\nQual seria a melhor data para retomarmos sem atrapalhar sua operação?` },
    { type: 'valor', title: "Nutrição Técnica", body: `Sem problemas. Vou congelar o processo aqui.\n\nPara não perdermos contato, posso te enviar mensalmente apenas as atualizações de tabela do Aço? Assim você não é pego de surpresa.` },
    { type: 'criativo', title: "Humor/Leveza", body: `Combinado. Vou colocar um lembrete para te chamar em 30 dias.\n\nSe precisar de tubos antes disso (ou se houver uma emergência na obra), meu celular é esse aqui. Abs!` }
  ],
  generic: (ctx: any, obj: string) => [
      { type: 'consultivo', title: "Diagnóstico", body: `Olá ${ctx.name}. Você mencionou "${obj}".\n\nComo isso impacta sua linha de produção hoje? Estamos falando de um risco de parada iminente ou apenas ajuste de estoque?` },
      { type: 'direto', title: "Próximos Passos", body: `${ctx.name}, entendido sobre "${obj}".\n\nBaseado nisso, faz sentido continuarmos a conversa ou prefere retomar semestre que vem?` },
      { type: 'valor', title: "Case Similar", body: `${ctx.name}, a empresa X teve exatamente esse cenário de "${obj}".\n\nResolvemos com estoque consignado. Segue o case em anexo.` }
  ]
};

// --- CONECTOR IA REAL (GEMINI) ---
async function fetchGeminiVariants(
  context: { name: string, company: string }, 
  lastResponse: string, 
  tags: string[], 
  companyContext: string, 
  fullHistory: string
): Promise<any> {
  
  // Create a new GoogleGenAI instance right before the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const prompt = `
    VOCÊ É: Engenheiro de Vendas Sênior da TERMOTUBOS.
    OBJETIVO: Continuar uma negociação complexa B2B industrial.
    SEU ESTILO: Simples, Humano, Proativo, Escuta Ativa. Odeia "juridiquês" ou texto robótico.

    DATA ATUAL: ${currentDate}

    CONTEXTO DA NOSSA EMPRESA (TERMOTUBOS):
    "${companyContext}"

    QUEM É O CLIENTE:
    Nome: ${context.name}
    Empresa: ${context.company}

    ============== MEMÓRIA DA CONVERSA (LEIA COM ATENÇÃO) ==============
    Aqui está tudo o que já conversamos até agora. Use isso para não ser repetitivo, citar pontos passados e manter a coerência técnica.
    
    [DIRETRIZ DE DATAS]: 
    - A última data registrada no histórico representa o último contato real.
    - Se essa data for de dias ou semanas atrás em relação à DATA ATUAL (${currentDate}), trate o próximo contato como RETOMADA DE CONVERSA (re-engagement).
    - RECONHEÇA o tempo passado e crie uma ponte de reabertura natural.
    - Não aja como se o último contato tivesse sido ontem se houver um gap temporal.
    
    HISTÓRICO:
    ${fullHistory}
    ====================================================================

    ESTADO ATUAL (GATILHO):
    O cliente acabou de responder: "${lastResponse}".
    Tags identificadas: ${tags.join(', ')}.

    TAREFA:
    Gere uma NOVA FASE de cadência (de 2 a 4 toques).
    Seja **extremamente conciso e direto** em cada script e título. Foque em **textos de vendas imediatamente utilizáveis** para o SDR.
    
    CRITÉRIOS DE ESTRATÉGIA:
    1. ANALISE O HISTÓRICO: Se o cliente disse "Fechado" ou "Obrigado", a próxima fase deve ser de "Pós-Venda" ou "Próximos Passos Burocráticos" (Dia 0 imediato).
    2. SE FOR FALTA DE INTERESSE/TIMING: Use intervalos longos (ex: Dia 30, Dia 60) para nutrição.
    3. SE FOR INTERESSE/COTAÇÃO: Use intervalos curtos (Dia 0, Dia 2) para garantir o fechamento.

    PARA CADA PASSO, GERE 3 VARIANTES DE SCRIPT:
    1. 'consultivo': Focado em perguntas/ajuda.
    2. 'direto': Objetivo, focado em ação.
    3. 'valor': Traz um insight técnico ou diferencial.

    Retorne JSON seguindo o schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1500, // Limita a saída de tokens para a fase completa, otimizado para menos consumo
        thinkingConfig: { thinkingBudget: 250 }, // Permite um raciocínio moderado
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phaseName: { type: Type.STRING, description: "Nome estratégico da fase (ex: Fechamento, Nutrição Longa, Pós-Venda)" },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER, description: "Dias a partir de hoje (0 = hoje, 30 = daqui um mês)" },
                  channel: { type: Type.STRING, enum: ["whatsapp", "email", "phone", "linkedin"] },
                  type: { type: Type.STRING, description: "Objetivo do passo (ex: Enviar Orçamento, Verificar Recebimento)" },
                  variants: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              type: { type: Type.STRING, enum: ["consultivo", "direto", "valor", "criativo"] },
                              title: { type: Type.STRING },
                              body: { type: Type.STRING }
                          },
                          required: ["type", "title", "body"]
                      }
                  }
                },
                required: ["day", "channel", "type", "variants"]
              }
            }
          },
          required: ["phaseName", "steps"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Empty response");
  } catch (e: any) {
    console.warn("Gemini API Error or Timeout in fetchGeminiVariants", e);
    // Re-throw if it's a specific quota error for App.tsx to handle
    if (e?.error?.status === "RESOURCE_EXHAUSTED") {
      throw e; 
    }
    return null; 
  }
}

// --- NOVA FUNÇÃO: GERA VARIANTE PARA BREAKUP/RECUPERAÇÃO ---
async function fetchGeminiBreakupVariants(
  clientProfile: ClientProfile, 
  lastSentMessageBody: string, 
  companyContext: string, 
  fullHistory: string
): Promise<any> {
  
  // Create a new GoogleGenAI instance right before the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const prompt = `
    VOCÊ É: Engenheiro de Vendas Sênior da TERMOTUBOS.
    OBJETIVO: Gerar uma fase de RECUPERAÇÃO ou BREAKUP.
    SEU ESTILO: Simples, Humano, Proativo, Escuta Ativa. Odeia "juridiquês" ou texto robótico.

    DATA ATUAL: ${currentDate}

    CONTEXTO DA NOSSA EMPRESA (TERMOTUBOS):
    "${companyContext}"

    QUEM É O CLIENTE:
    Nome: ${clientProfile.name}
    Empresa: ${clientProfile.company}

    ============== MEMÓRIA DA CONVERSA (LEIA COM ATENÇÃO) ==============
    Aqui está tudo o que já conversamos até agora. Use isso para não ser repetitivo, citar pontos passados e manter a coerência técnica.
    
    [DIRETRIZ DE DATAS]: 
    - A última data registrada no histórico representa o último contato real.
    - Se essa data for de dias ou semanas atrás em relação à DATA ATUAL (${currentDate}), trate o próximo contato como RETOMADA DE CONVERSA (re-engagement).
    - RECONHEÇA o tempo passado e crie uma ponte de reabertura natural.
    
    HISTÓRICO:
    ${fullHistory}
    ====================================================================

    ESTADO ATUAL (GATILHO - SILÊNCIO DO CLIENTE):
    O cliente não respondeu à última mensagem que enviamos.
    A ÚLTIMA MENSAGEM QUE ENVIAMOS FOI: "${lastSentMessageBody}".

    TAREFA:
    Gere uma NOVA FASE de cadência (de 2 a 3 toques) focada em QUEBRAR O SILÊNCIO ou FAZER UM BREAKUP ESTRATÉGICO.
    Seja **extremamente conciso e direto** em cada script e título. Foque em **textos de vendas imediatamente utilizáveis** para o SDR.
    
    CRITÉRIOS DE ESTRATÉGIA PARA SILÊNCIO:
    1. Quebrar o Padrão: A mensagem deve ser diferente do usual.
    2. Retirada Estratégica: Dar a opção do cliente "desistir" para ver se ele se manifesta.
    3. Valor Final: Oferecer um último valor/insight antes de arquivar.
    4. Intervalos: Use intervalos médios a longos (Dia 2, Dia 5, Dia 10).

    PARA CADA PASSO, GERE 3 VARIANTES DE SCRIPT:
    1. 'consultivo': Focado em perguntas/ajuda.
    2. 'direto': Objetivo, focado em ação.
    3. 'criativo': Quebra de padrão, humor, ou abordagem inesperada.

    Retorne JSON seguindo o schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1500, // Aumentado para garantir espaço para estratégias de breakup criativas
        thinkingConfig: { thinkingBudget: 250 }, // Budget aumentado para melhor raciocínio
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phaseName: { type: Type.STRING, description: "Nome estratégico da fase (ex: Recuperação de Silêncio, Breakup Estratégico)" },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER, description: "Dias a partir de hoje (0 = hoje, 2 = daqui dois dias)" },
                  channel: { type: Type.STRING, enum: ["whatsapp", "email", "phone", "linkedin"] },
                  type: { type: Type.STRING, description: "Objetivo do passo (ex: Última Cartada, Quebra de Padrão)" },
                  variants: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              type: { type: Type.STRING, enum: ["consultivo", "direto", "valor", "criativo"] },
                              title: { type: Type.STRING },
                              body: { type: Type.STRING }
                          },
                          required: ["type", "title", "body"]
                      }
                  }
                },
                required: ["day", "channel", "type", "variants"]
              }
            }
          },
          required: ["phaseName", "steps"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Empty response");
  } catch (e: any) {
    console.warn("Gemini API Error or Timeout in fetchGeminiBreakupVariants", e);
    // SEMPRE lança erro aqui para evitar fallback de template.
    throw e; 
  }
}

// --- REGENERAÇÃO DE PASSO ÚNICO ---
export const regenerateStepVariants = async (
  step: CadenceStep,
  instruction: string,
  clientProfile: ClientProfile
): Promise<ScriptVariant[]> => {
  
  // Create a new GoogleGenAI instance right before the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Quick check for API key presence (using process.env.API_KEY directly now)
  if (!process.env.API_KEY || process.env.API_KEY.length < 5) {
     return [{ type: 'direto', title: 'Fallback Manual', body: `(IA Indisponível - Chave API ausente/inválida) Use esta instrução para reescrever: ${instruction}` }];
  }

  // Agora busca settings via DB async
  const globalSettings = await db.getSettings();
  const companyContext = globalSettings.termotubosContext || "Somos especialistas em tubos e conexões industriais.";
  
  // Constrói histórico
  const historyStr = buildConversationHistory(clientProfile);
  const enrichedLeadData = clientProfile.context_history ? `\n\n[DADOS DO LEAD]:\n${clientProfile.context_history.join('\n')}` : "";

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const prompt = `
    ATUE COMO: Engenheiro de Vendas Sênior da TERMOTUBOS.
    TAREFA: Gere 3 novas variantes de script para o passo abaixo. Seja **extremamente conciso e direto ao ponto**, gerando textos de vendas **imediatamente utilizáveis** pelo SDR.

    DATA ATUAL: ${currentDate}

    CONTEXTO DA EMPRESA: "${companyContext}"
    ${enrichedLeadData}
    
    HISTÓRICO DA CONVERSA:
    [DIRETRIZ DE DATAS]: 
    - A última data registrada no histórico representa o último contato real.
    - Se essa data for de dias ou semanas atrás em relação à DATA ATUAL (${currentDate}), trate o próximo contato como RETOMADA DE CONVERSA (re-engagement).
    - RECONHEÇA o tempo passado e crie uma ponte de reabertura natural.

    ${historyStr}

    DETALHES DO PASSO ATUAL QUE SERÁ REFEITO:
    - Canal: ${step.channel}
    - Objetivo Original: ${step.type}
    - Texto Atual: "${step.body}"

    [IMPORTANTE] INSTRUÇÃO DO USUÁRIO (O que ele quer mudar/focar):
    "${instruction}"

    GERE 3 VARIANTES DE SCRIPT:
    1. 'consultivo'
    2. 'direto'
    3. 'valor'
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 600, // Limita a saída de tokens para as variantes de um único passo, otimizado para menos consumo
          thinkingConfig: { thinkingBudget: 50 }, // Permite um raciocínio mínimo
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          type: { type: Type.STRING, enum: ["consultivo", "direto", "valor", "criativo"] },
                          title: { type: Type.STRING },
                          body: { type: Type.STRING }
                      },
                      required: ["type", "title", "body"]
                  }
              }
            }
          }
        }
    });
    
    if (response.text) {
        const json = JSON.parse(response.text);
        return json.variants || [];
    }
    return [];

  } catch (error: any) {
    console.error("Erro ao regenerar passo em aiBrain.ts", error);
    // Re-throw if it's a specific quota error for App.tsx to handle
    if (error?.error?.status === "RESOURCE_EXHAUSTED") {
      throw error; 
    }
    // Fallback for other API failures
    return [{ 
      type: 'direto', 
      title: 'Erro na IA (Geral)', 
      body: `(A IA falhou ao gerar as variantes. Edite abaixo).\n\nInstrução original: "${instruction}"\n\nConteúdo do passo original: "${step.body}"` 
    }];
  }
};

// --- FUNÇÃO PRINCIPAL EXPORTADA ---
export const generateSmartPhase = async (
  prevPhaseId: string, 
  responseSummary: string, // Quando isSilenceMode=true, este será o body da última mensagem enviada
  tags: string[], 
  clientProfile: ClientProfile, // AGORA RECEBE O PERFIL COMPLETO
  isSilenceMode: boolean = false
): Promise<CadencePhase> => {
  
  // Quick check for API key presence (using process.env.API_KEY directly now)
  const isApiKeyAvailable = process.env.API_KEY && process.env.API_KEY.length > 5;

  const globalSettings = await db.getSettings();
  const companyContext = globalSettings.termotubosContext || "Somos especialistas em tubos e conexões industriais.";

  // Compila o histórico usando a utility
  const historyTranscript = buildConversationHistory(clientProfile);

  let stepsData: any[] = [];
  let phaseName = "Fase de Resposta";

  // 1. Tenta IA
  if (isApiKeyAvailable) {
    try {
      if (isSilenceMode) {
        // MODO SILÊNCIO: Gerar fase de Recuperação/Breakup
        const aiResult = await fetchGeminiBreakupVariants(
          clientProfile,
          responseSummary, // Aqui, responseSummary é o body da última mensagem enviada
          companyContext,
          historyTranscript
        );

        if (aiResult && aiResult.steps) {
          phaseName = aiResult.phaseName || "Fase de Recuperação (IA)";
          stepsData = aiResult.steps;
        } else {
             // Se a IA retornar algo inválido, lançamos erro para não cair em template vazio
             throw new Error("A IA retornou uma estrutura inválida para a fase de recuperação.");
        }

      } else {
        // MODO NORMAL: Gerar fase de continuação de conversa
        const aiResult = await fetchGeminiVariants(
          { name: clientProfile.name, company: clientProfile.company },
          responseSummary, 
          tags, 
          companyContext, 
          historyTranscript // Passa o texto compilado
        );

        if (aiResult && aiResult.steps) {
          phaseName = aiResult.phaseName || "Estratégia Personalizada (IA)";
          stepsData = aiResult.steps;
        }
      }
    } catch (e: any) {
      // CRÍTICO: Se estivermos em modo silêncio (breakup), NÃO queremos fallback de template.
      // O usuário prefere um erro explícito para tentar novamente via IA.
      if (isSilenceMode) {
          throw e;
      }
      
      // Se for erro de COTA no modo normal, também lançamos para o App tratar.
      if (e?.error?.status === "RESOURCE_EXHAUSTED") {
        throw e;
      }
      console.warn("Fallback triggered: Error in AI generation for smart phase", e);
      // Fluxo normal continua para fallback abaixo
    }
  } else {
      // Se não tiver chave API e for modo Breakup, lançar erro (não usar template).
      if (isSilenceMode) {
          throw new Error("Chave de API ausente. Impossível gerar Breakup personalizado por IA.");
      }
  }

  // 2. Fallback (Apenas para Fluxo de Resposta Normal)
  if (stepsData.length === 0) {
     if (isSilenceMode) {
         // Se chegamos aqui e é silêncio, significa que a IA falhou e não capturamos no try/catch (o que não deve acontecer pela lógica acima)
         // Ou simplesmente não gerou passos. Lançamos erro para evitar template "Protocolo de Recuperação (Fallback)".
         throw new Error("Não foi possível gerar a fase de recuperação via IA. Verifique sua conexão ou cota e tente novamente.");
     } else {
        // Fallback simples para quando o cliente RESPONDEU mas a IA falhou
        const category = tags.some(t => t.toLowerCase().includes('preço')) ? 'price' : 'timing';
        const variantGen = LOCAL_VARIANTS[category as keyof typeof LOCAL_VARIANTS] || LOCAL_VARIANTS.generic;
        const vars = variantGen(clientProfile, responseSummary);
        
        phaseName = category === 'price' ? "Fase: Quebra de Objeção (Valor - Fallback)" : "Fase: Nutrição (Fallback)";
        stepsData = [
          { day: 0, channel: 'whatsapp', type: 'Resposta Imediata', variants: vars },
          { day: 3, channel: 'email', type: 'Follow-up Técnico', variants: vars }, 
        ];
     }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    parentId: prevPhaseId,
    name: phaseName,
    status: 'active',
    steps: stepsData.map((s: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      day: s.day, 
      channel: s.channel,
      type: s.type,
      body: s.variants && s.variants.length > 0 ? s.variants[0].body : (s.body || ""),
      variants: s.variants, 
      tone: s.variants && s.variants.length > 0 ? s.variants[0].type : 'consultivo',
      status: 'pending'
    })) as CadenceStep[]
  };
};