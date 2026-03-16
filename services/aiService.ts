// services/aiService.ts
import { AnalysisResult } from '../types';
import { MASTER_CADENCE_TEMPLATE } from '../data/knowledgeBase';

export async function generateSalesStrategy(promptText: string, mode: string): Promise<AnalysisResult> {
  // Simula processamento
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    analysis: "Análise simulada.",
    cadence: MASTER_CADENCE_TEMPLATE,
    insights: ["Insight simulado"]
  };
}
