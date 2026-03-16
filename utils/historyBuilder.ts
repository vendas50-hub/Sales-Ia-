// utils/historyBuilder.ts
import { ClientProfile } from '../types';
import { parseHistoryString } from './historyParser';

export const buildConversationHistory = (client: ClientProfile): string => {
  // 1. Contexto Inicial
  let transcript = `CONTEXTO INICIAL: ${client.context_history[0] || 'Não informado'}\n`;

  // 2. Histórico Manual (Notas de Contexto)
  const manualNotes = parseHistoryString(client.context_history[1]);
  if (manualNotes.length > 0) {
    transcript += "\n--- NOTAS DE HISTÓRICO MANUAL ---\n";
    manualNotes.forEach(note => {
      transcript += `[${note.date}] ${note.text}\n`;
    });
  }

  // 3. Histórico Automatizado (Fases de Cadência)
  // Pegamos apenas as últimas 2 fases para economizar tokens
  const recentPhases = client.cadence_phases.slice(-2); 

  if (recentPhases.length > 0) {
    transcript += "\n--- RESUMO DAS ÚLTIMAS INTERAÇÕES AUTOMATIZADAS ---\n";
    recentPhases.forEach((phase) => {
      phase.steps.forEach((step) => {
        if (step.status === 'sent' || step.status === 'completed') {
          // Formata a data se existir
          const dateStr = step.response?.date ? new Date(step.response.date).toLocaleDateString('pt-BR') : 'Data N/A';
          transcript += `[${dateStr}] Nós: ${step.body.substring(0, Math.min(step.body.length, 100))}...\n`;
        }
        if (step.response) {
          const dateStr = new Date(step.response.date).toLocaleDateString('pt-BR');
          const summarizedResponse = step.response.summary.substring(0, Math.min(step.response.summary.length, 150));
          transcript += `[${dateStr}] CLIENTE: "${summarizedResponse}" (Tags: ${step.response.tags.join(', ')})\n`;
        }
      });
    });
  }

  return transcript;
};