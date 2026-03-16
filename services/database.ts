import { supabase } from './supabaseClient';
import { ClientProfile, GlobalSettings } from '../types';

// Default Settings Fallback
const DEFAULT_SETTINGS: GlobalSettings = {
  termotubosContext: "Termotubos: Especialista em soluções de proteção e organização de cabos. Foco em Tubos Termoretráteis, Malhas Expansíveis, Abraçadeiras e Identificação. Atendemos indústrias, montadores de painéis e setor automotivo com agilidade e produtos certificados.",
  uploadedFiles: ["Catalogo_Geral_2024.pdf"]
};

export const db = {
  // --- CLIENTS ---
  
  getClients: async (): Promise<ClientProfile[]> => {
    const { data, error } = await supabase
      .from('clients')
      .select('content');

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return data.map((row: any) => row.content as ClientProfile);
  },

  addClient: async (client: ClientProfile): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .insert({ id: client.id, content: client });

    if (error) console.error('Error adding client:', error);
  },

  updateClient: async (client: ClientProfile): Promise<void> => {
    const { error } = await supabase
      .from('clients')
      .update({ content: client })
      .eq('id', client.id);

    if (error) console.error('Error updating client:', error);
  },

  // --- SETTINGS ---

  getSettings: async (): Promise<GlobalSettings> => {
    const { data, error } = await supabase
      .from('settings')
      .select('content')
      .eq('id', 'global')
      .single();

    if (error || !data) {
      // If not found, return default (and maybe try to create it)
      if (error && error.code !== 'PGRST116') console.error('Error fetching settings:', error);
      return DEFAULT_SETTINGS;
    }

    return data.content as GlobalSettings;
  },

  updateSettings: async (settings: GlobalSettings): Promise<void> => {
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'global', content: settings });

    if (error) console.error('Error updating settings:', error);
  }
};

// --- ESTATÍSTICAS (KPIs) ---
// Agora é uma função pura que recebe os clientes
export const getDashboardStats = (clients: ClientProfile[]) => {
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