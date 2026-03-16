// components/PhaseCard.tsx
import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, Linkedin, Copy, Edit2, ChevronDown, ChevronUp, CheckCircle, XCircle, CornerDownRight, Zap, RefreshCcw, Loader2, Check } from 'lucide-react';
import { CadencePhase, CadenceStep, ChannelType, ScriptVariant } from '../types';

interface Props {
  phase: CadencePhase;
  onRegisterResponse: (stepId: string) => void;
  onNoResponse: (stepId: string) => void;
  onMarkAsSent: (stepId: string) => void;
  onEditStep: (stepId: string, newBody: string) => void;
  onRegenerateStep?: (stepId: string, instruction: string) => Promise<void>;
}

export const PhaseCard: React.FC<Props> = ({ phase, onRegisterResponse, onNoResponse, onMarkAsSent, onEditStep, onRegenerateStep }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [tempBody, setTempBody] = useState("");
  
  // State for Regeneration
  const [regenStepId, setRegenStepId] = useState<string | null>(null);
  const [regenInstruction, setRegenInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const getIcon = (channel: ChannelType) => {
    switch (channel) {
      case ChannelType.EMAIL: return <Mail size={14} className="text-blue-400" />;
      case ChannelType.WHATSAPP: return <MessageSquare size={14} className="text-green-400" />;
      case ChannelType.PHONE: return <Phone size={14} className="text-purple-400" />;
      case ChannelType.LINKEDIN: return <Linkedin size={14} className="text-sky-400" />;
      default: return <Mail size={14} className="text-slate-400" />;
    }
  };

  const handleStartEdit = (step: CadenceStep) => {
    setEditingStepId(step.id);
    setTempBody(step.body);
  };

  const handleSaveEdit = (stepId: string) => {
    onEditStep(stepId, tempBody);
    setEditingStepId(null);
  };

  const handleVariantSelect = (stepId: string, variant: ScriptVariant) => {
      onEditStep(stepId, variant.body);
  };

  const handleStartRegen = (stepId: string) => {
     if (regenStepId === stepId) {
        setRegenStepId(null); // Toggle off
     } else {
        setRegenStepId(stepId);
        setRegenInstruction("");
     }
  };

  const submitRegen = async (stepId: string) => {
     if (!onRegenerateStep) return;
     setIsRegenerating(stepId);
     await onRegenerateStep(stepId, regenInstruction);
     setIsRegenerating(null);
     setRegenStepId(null);
  };

  const hasResponse = phase.steps.some(s => s.response);

  return (
    <div className="w-[600px] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl mb-8 relative transition-all">
      {/* HEADER */}
      <div 
        className="bg-slate-800 p-4 flex justify-between items-center cursor-pointer border-b border-slate-700 hover:bg-slate-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${hasResponse ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">{phase.name}</h3>
            <p className="text-[10px] text-slate-500">
               {phase.steps.filter(s => s.status !== 'pending').length}/{phase.steps.length} Executados
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
      </div>

      {/* STEPS LIST */}
      {isExpanded && (
        <div className="p-4 space-y-6 bg-slate-950/30">
          {phase.steps.map((step, idx) => (
            <div key={step.id} className="relative group">
              
              {/* Linha Vertical Conectora */}
              {idx !== phase.steps.length - 1 && <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-slate-800 z-0"></div>}

              {/* CARD DE ENVIO (OUTBOUND) */}
              <div className={`p-4 rounded-xl border transition-all relative z-10 ${step.status === 'sent' ? 'bg-slate-900 border-slate-700' : 'bg-slate-800 border-slate-600 hover:border-orange-500/50 shadow-lg'}`}>
                
                {/* Header do Toque */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-700 shadow-sm">{getIcon(step.channel)}</div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">Dia {step.day} • {step.type}</span>
                        {/* Se não tiver variants, mostra tone normal. Se tiver, mostra indicador de IA */}
                        {!step.variants || step.variants.length === 0 ? (
                            <span className="text-[9px] text-orange-400 bg-orange-950/30 px-1.5 py-0.5 rounded border border-orange-500/20 uppercase font-bold">{step.tone}</span>
                        ) : (
                            <span className="flex items-center gap-1 text-[9px] text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
                                <Zap size={8} fill="currentColor"/> IA Options
                            </span>
                        )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigator.clipboard.writeText(step.body)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Copiar"><Copy size={14}/></button>
                    <button onClick={() => handleStartEdit(step)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Editar"><Edit2 size={14}/></button>
                  </div>
                </div>

                {/* --- SELETOR DE VARIANTES + REGENERAÇÃO --- */}
                {step.variants && step.variants.length > 0 && step.status === 'pending' && (
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar flex-1">
                            {step.variants.map((variant, vIdx) => {
                                const isActive = step.body === variant.body;
                                return (
                                    <button
                                        key={vIdx}
                                        onClick={() => handleVariantSelect(step.id, variant)}
                                        className={`text-[10px] px-3 py-1.5 rounded-full border capitalize transition-all whitespace-nowrap font-medium ${
                                            isActive 
                                            ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-900/50' 
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                        }`}
                                    >
                                        {variant.type === 'valor' ? '💰 Valor' : variant.type === 'direto' ? '🎯 Direto' : variant.type === 'criativo' ? '💡 Criativo' : '🧠 Consultivo'}
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* BOTÃO DE REGENERAÇÃO */}
                        {onRegenerateStep && (
                             <button 
                                onClick={() => handleStartRegen(step.id)}
                                className={`p-1.5 rounded border transition-colors ${regenStepId === step.id ? 'bg-slate-700 text-white border-slate-500' : 'bg-transparent text-slate-500 border-slate-700 hover:text-white hover:border-slate-500'}`}
                                title="Refazer com IA"
                             >
                                <RefreshCcw size={14} className={isRegenerating === step.id ? "animate-spin" : ""} />
                             </button>
                        )}
                    </div>
                )}

                {/* --- ÁREA DE INPUT DE REGENERAÇÃO --- */}
                {regenStepId === step.id && !isRegenerating && (
                    <div className="mb-4 bg-slate-950/50 border border-slate-700 rounded-lg p-3 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">O que você quer mudar?</label>
                        <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-slate-900 border border-slate-700 rounded text-xs p-2 text-white outline-none focus:border-blue-500"
                                placeholder="Ex: Foque mais no prazo de entrega..."
                                value={regenInstruction}
                                onChange={e => setRegenInstruction(e.target.value)}
                                autoFocus
                             />
                             <button 
                                onClick={() => submitRegen(step.id)}
                                disabled={!regenInstruction}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1 disabled:opacity-50"
                             >
                                Gerar
                             </button>
                        </div>
                    </div>
                )}
                
                {/* LOADER DE REGENERAÇÃO */}
                {isRegenerating === step.id && (
                     <div className="mb-4 bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex justify-center items-center gap-2 text-xs text-blue-400 animate-pulse">
                         <Loader2 size={16} className="animate-spin"/>
                         Criando novas opções...
                     </div>
                )}


                {/* Body */}
                {editingStepId === step.id ? (
                  <div>
                    <textarea 
                      className="w-full h-32 bg-slate-950 text-slate-200 text-sm p-3 rounded border border-orange-500 outline-none leading-relaxed"
                      value={tempBody}
                      onChange={e => setTempBody(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingStepId(null)} className="text-xs text-slate-500 px-3 py-1">Cancelar</button>
                        <button onClick={() => handleSaveEdit(step.id)} className="text-xs bg-orange-600 text-white px-3 py-1 rounded font-bold">Salvar</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{step.body}</p>
                )}

                {/* AÇÕES (AGORA VISÍVEIS EM PENDING E SENT) */}
                {(step.status === 'pending' || step.status === 'sent') && (
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/50">
                    <button onClick={() => onNoResponse(step.id)} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 hover:bg-slate-700 rounded transition-colors"><XCircle size={14}/> Sem Resposta</button>
                    
                    {step.status === 'pending' ? (
                       <button onClick={() => onMarkAsSent(step.id)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-4 py-1.5 rounded transition-all flex items-center gap-2 font-medium mx-2">
                           <Check size={14} /> Já Enviei
                       </button>
                    ) : (
                       <div className="text-xs bg-slate-900/50 border border-slate-800 text-slate-500 px-4 py-1.5 rounded flex items-center gap-2 font-medium mx-2 cursor-default">
                           <Check size={14} className="text-blue-500" /> Enviado (Aguardando)
                       </div>
                    )}

                    <button onClick={() => onRegisterResponse(step.id)} className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-green-900/20 flex items-center gap-2"><CheckCircle size={14}/> Registrar Resposta</button>
                  </div>
                )}
              </div>

              {/* RESPOSTA DO CLIENTE (INBOUND) - ANEXADA AO CARD */}
              {step.response && (
                <div className="ml-8 mt-[-10px] relative z-20 animate-in slide-in-from-left-4 fade-in duration-300">
                   <CornerDownRight className="absolute -left-6 top-6 text-slate-600" size={20}/>
                   <div className="bg-slate-800 border-l-4 border-l-green-500 rounded-r-xl rounded-bl-xl p-4 shadow-xl border-y border-r border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-green-400 uppercase bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                              Cliente Respondeu
                          </span>
                          <span className="text-[10px] text-slate-500">{new Date(step.response.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-white italic font-medium">"{step.response.summary}"</p>
                      <div className="flex gap-2 mt-3">
                          {step.response.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-600">{tag}</span>
                          ))}
                      </div>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {phase.status === 'completed' && <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-slate-600"></div>}
    </div>
  );
};