// types.ts

export enum ChannelType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  PHONE = 'phone',
  LINKEDIN = 'linkedin'
}

export type ModuleTone = 'challenger' | 'sandler' | 'spin' | 'cialdini' | 'voss' | 'consultivo' | 'tecnico' | 'empatico' | 'prova_social' | 'urgencia' | 'direto' | 'valor' | 'criativo';

// Estrutura de Variação (A Escolha)
export interface ScriptVariant {
  type: ModuleTone;
  title: string;
  body: string;
}

// Estrutura de Resposta Anexada ao Toque
export interface StepResponse {
  date: string;
  summary: string;
  tags: string[]; 
}

export interface CadenceStep {
  id: string;
  day: number;
  channel: ChannelType;
  type: string; // Nome da Técnica (ex: "Desarmamento")
  subject?: string;
  body: string; // O Script FINAL escolhido
  variants?: ScriptVariant[]; // AS 3 OPÇÕES GERADAS
  tone: ModuleTone;
  status: 'pending' | 'sent' | 'skipped' | 'completed'; // 'sent' = executado sem resposta
  response?: StepResponse; // A resposta do cliente fica AQUI
  // Compatibility
  tone_applied?: ModuleTone;
}

export interface CadencePhase {
  id: string;
  parentId: string | null;
  name: string;
  steps: CadenceStep[];
  status: 'active' | 'completed' | 'waiting';
  // Legacy
  response?: any;
}

export interface ClientTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface ClientFile {
  name: string;
  size: string;
  date: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  company: string;
  phone: string;
  context_history: string[]; 
  cadence_phases: CadencePhase[]; 
  tags: string[]; 
  status: 'active' | 'won' | 'lost';
  closingProbability?: number;
  notes?: string;
  tasks?: ClientTask[];
  files?: ClientFile[];
}

export interface GlobalSettings {
  termotubosContext: string;
  uploadedFiles: string[];
}

// --- LEGACY TYPES (Kept for build compatibility) ---

export interface InteractionResponse {
  date: string;
  summary: string;
  tags: string[]; 
  stepIndexTriggered: number;
}

export interface TermotubosContext {
  products: string;
  differential: string;
  targetAudience: string;
}

export interface ResponseScenario {
  scenarioName: string;
  description: string;
  script: string;
}

export interface GeneratedCadence {
  strategy: string;
  steps: any[];
  responses: ResponseScenario[];
}

export interface AppState {
  clients: ClientProfile[];
  documents: any[];
}

export interface SalesCadence {
  id: string;
  strategy_name: string;
  steps: CadenceStep[];
}

export interface AnalysisResult {
  analysis: string;
  cadence: SalesCadence;
  insights: string[];
}

export interface CadenceNode extends CadenceStep {
  response?: any;
}