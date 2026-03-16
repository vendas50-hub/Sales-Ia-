// data/knowledgeBase.ts
import { SalesCadence, ChannelType } from '../types';

// Feature: Cadência Longa e Técnica (8 Toques)
export const MASTER_CADENCE_TEMPLATE: SalesCadence = {
  id: 'master_neuro_v1',
  strategy_name: "Protocolo Neuro-Sales: Persistência Estruturada (8 Toques)",
  steps: [
    { 
      id: 's1', day: 1, channel: ChannelType.EMAIL, tone_applied: 'tecnico', tone: 'tecnico', status: 'pending',
      type: "Ancoragem Técnica (Viés de Autoridade)", 
      subject: "Dúvida técnica sobre o projeto da {{empresa}}", 
      body: "Olá {{nome}}, estive analisando o cenário de [Setor] e vi que muitos engenheiros estão tendo problemas com [Dor Específica].\n\nQueria apenas validar se vocês seguem a norma [Norma Técnica] nos projetos atuais? Tenho um material comparativo aqui." 
    },
    { 
      id: 's2', day: 1, channel: ChannelType.LINKEDIN, tone_applied: 'empatico', tone: 'empatico', status: 'pending',
      type: "Conexão Soft (Sem Vender)", 
      body: "Oi {{nome}}, mandei um email técnico sobre normas agora pouco. Conectando aqui para não ser um estranho na sua caixa de entrada." 
    },
    { 
      id: 's3', day: 3, channel: ChannelType.WHATSAPP, tone_applied: 'empatico', tone: 'empatico', status: 'pending',
      type: "Áudio de Humanização", 
      body: "[ÁUDIO SUGERIDO]: 'Oi {{nome}}, aqui é o [Seu Nome]. Não quero ser o vendedor chato, só queria garantir que o material sobre a norma técnica chegou pra você. Faz sentido eu te mandar o link por aqui?'" 
    },
    { 
      id: 's4', day: 5, channel: ChannelType.PHONE, tone_applied: 'consultivo', tone: 'consultivo', status: 'pending',
      type: "Validação de Dor (SPIN)", 
      body: "Script: 'Não estou ligando para vender. Só quero entender: hoje o maior gargalo na obra é prazo de entrega ou certificação do material?'" 
    },
    { 
      id: 's5', day: 7, channel: ChannelType.EMAIL, tone_applied: 'prova_social', tone: 'prova_social', status: 'pending',
      type: "Prova Social (Gatilho de Similaridade)", 
      subject: "Como a [Concorrente] resolveu a ruptura", 
      body: "Vi que você não conseguiu responder. Só para deixar registrado: a [Empresa X] tinha o mesmo desafio e reduzimos o custo de parada em 15%." 
    },
    { 
      id: 's6', day: 10, channel: ChannelType.WHATSAPP, tone_applied: 'urgencia', tone: 'urgencia', status: 'pending',
      type: "Bump Curto", 
      body: "Oi {{nome}}. O projeto ainda está de pé ou posso arquivar?" 
    },
    { 
      id: 's7', day: 14, channel: ChannelType.EMAIL, tone_applied: 'challenger', tone: 'challenger', status: 'pending',
      type: "Desafio (Challenger Sale)", 
      subject: "O custo de não fazer nada", 
      body: "Muitas vezes adiar a compra do aço parece economia, mas com a flutuação do dólar, esperar 15 dias pode custar 8% a mais. Vale o risco?" 
    },
    { 
      id: 's8', day: 30, channel: ChannelType.EMAIL, tone_applied: 'empatico', tone: 'empatico', status: 'pending',
      type: "Break-up (Sandler - Retirada)", 
      subject: "Permissão para fechar o arquivo?", 
      body: "Oi {{nome}}. Como não tivemos retorno, estou assumindo que tubulação não é prioridade agora. Vou encerrar seu processo aqui para não te incomodar mais. Se mudar de ideia, estou aqui." 
    }
  ]
};

// Dados para o Dashboard Novo
export const DASHBOARD_DATA = {
  conversionRate: 18.4,
  bestTouchpoint: "Toque 3 (WhatsApp - Áudio)",
  totalResponses: 1240,
  responseTypes: [
    { label: "Objeção de Preço", value: 45, color: "bg-red-500" },
    { label: "Pediu Cotação", value: 30, color: "bg-green-500" },
    { label: "Sem Interesse Agora", value: 15, color: "bg-yellow-500" },
    { label: "Já tem Fornecedor", value: 10, color: "bg-blue-500" }
  ],
  touchpointPerformance: [
    { day: "D1", rate: 5 },
    { day: "D3", rate: 42 }, // O campeão
    { day: "D7", rate: 15 },
    { day: "D14", rate: 8 },
    { day: "D30", rate: 2 }
  ]
};