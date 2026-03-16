// services/mockDb.ts
import { ClientProfile } from '../types';

// Estado Global
let clients: ClientProfile[] = [];
let globalSettings = {
  termotubosContext: "Termotubos: Especialista em soluções de proteção e organização de cabos. Foco em Tubos Termoretráteis, Malhas Expansíveis, Abraçadeiras e Identificação. Atendemos indústrias, montadores de painéis e setor automotivo com agilidade e produtos certificados.",
  uploadedFiles: ["Catalogo_Geral_2024.pdf"]
};

// --- MÉTODOS DE BANCO DE DADOS ---

export const db = {
  getClients: () => clients,
  addClient: (c: ClientProfile) => clients.push(c),
  updateClient: (c: ClientProfile) => {
    const idx = clients.findIndex(cli => cli.id === c.id);
    if (idx !== -1) clients[idx] = c;
  },
  getSettings: () => globalSettings,
  updateSettings: (s: any) => { globalSettings = { ...globalSettings, ...s }; }
};

// --- ESTATÍSTICAS (KPIs REAIS) ---
export const getDashboardStats = () => {
  // Filtra steps que REALMENTE aconteceram (sent ou completed)
  const executedSteps = clients.flatMap(c => c.cadence_phases).flatMap(p => p.steps).filter(s => s.status === 'sent' || s.status === 'completed');
  
  const totalTouches = executedSteps.length;
  const totalResponses = executedSteps.filter(s => s.response).length;

  // Top Objeções (Tags)
  const tagCounts: Record<string, number> = {};
  executedSteps.forEach(s => {
    s.response?.tags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
  });
  
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  // Empresas com mais atividade
  const topCompanies = [...clients]
      .map(c => ({
          name: c.company,
          touches: c.cadence_phases.flatMap(p => p.steps).filter(s => s.status === 'sent' || s.status === 'completed').length
      }))
      .sort((a, b) => b.touches - a.touches)
      .slice(0, 5);

  return {
    totalClients: clients.length,
    totalTouches,
    totalResponses,
    conversionRate: totalTouches > 0 ? ((totalResponses / totalTouches) * 100).toFixed(1) : "0.0",
    topTags,
    topCompanies
  };
};