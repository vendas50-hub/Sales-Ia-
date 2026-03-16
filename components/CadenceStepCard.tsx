// components/CadenceStepCard.tsx
import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, Linkedin, Copy, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { CadenceStep, ChannelType, ModuleTone } from '../types';

interface Props {
  step: CadenceStep;
  onRegisterResponse: (stepId: string, type: 'positive' | 'negative') => void;
}

export const CadenceStepCard: React.FC<Props> = ({ step, onRegisterResponse }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getIcon = () => {
    switch (step.channel) {
      case ChannelType.EMAIL: return <Mail className="w-5 h-5 text-blue-400" />;
      case ChannelType.WHATSAPP: return <MessageSquare className="w-5 h-5 text-green-400" />;
      case ChannelType.PHONE: return <Phone className="w-5 h-5 text-purple-400" />;
      case ChannelType.LINKEDIN: return <Linkedin className="w-5 h-5 text-sky-400" />;
      default: return <Mail className="w-5 h-5" />;
    }
  };

  const getBorderColor = () => {
     switch (step.tone_applied) {
       case 'tecnico': return 'border-l-blue-500';
       case 'urgencia': return 'border-l-red-500';
       case 'empatico': return 'border-l-green-500';
       case 'challenger': return 'border-l-orange-500';
       default: return 'border-l-gray-600';
     }
  };

  return (
    <div className={`bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm hover:border-slate-500 transition-all border-l-4 ${getBorderColor()} relative group`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-slate-900 rounded-full border border-slate-700">{getIcon()}</div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DIA {step.day} • {step.channel}</span>
            <div className="flex gap-2">
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold tracking-wider">
                  {step.tone_applied}
                </span>
            </div>
          </div>
          <h3 className="font-bold text-slate-100 text-sm mt-1">{step.type}</h3>
        </div>
      </div>

      {step.subject && (
        <div className="mb-3 pb-2 border-b border-slate-700/50">
          <span className="text-xs font-bold text-slate-500 mr-2">ASSUNTO:</span>
          <span className="text-sm font-medium text-slate-200">{step.subject}</span>
        </div>
      )}

      <div className="bg-slate-900/50 p-3 rounded text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed border border-slate-700/50">
        {step.body}
      </div>

      {/* Footer de Ação */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => navigator.clipboard.writeText(step.body)}
          className="text-slate-400 hover:text-orange-400 text-xs flex items-center gap-1"
        >
          <Copy size={14} /> Copiar
        </button>
        
        <div className="flex gap-2">
            <button 
              onClick={() => onRegisterResponse(step.id, 'positive')}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
            >
              <CheckCircle size={12} /> Respondeu
            </button>
            <button 
              onClick={() => onRegisterResponse(step.id, 'negative')}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
            >
              <XCircle size={12} /> Sem retorno
            </button>
        </div>
      </div>
    </div>
  );
};
