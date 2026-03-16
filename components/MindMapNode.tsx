// components/MindMapNode.tsx
import React from 'react';
import { Mail, MessageSquare, Phone, Linkedin } from 'lucide-react';
import { CadenceNode } from '../types';

interface Props {
  node: CadenceNode;
  childrenNodes: CadenceNode[]; // Os nós que derivam deste
  onSelect: (node: CadenceNode) => void;
  depth: number;
}

export const MindMapNode: React.FC<Props> = ({ node, childrenNodes, onSelect, depth }) => {
  
  const getIcon = () => {
    switch (node.channel) {
      case 'email': return <Mail size={16} />;
      case 'whatsapp': return <MessageSquare size={16} />;
      case 'phone': return <Phone size={16} />;
      case 'linkedin': return <Linkedin size={16} />;
      default: return <Mail size={16} />;
    }
  };

  const getStatusColor = () => {
    if (node.status === 'completed') return 'border-green-500 bg-green-500/10';
    if (node.status === 'sent') return 'border-orange-500 bg-orange-500/10';
    return 'border-slate-700 bg-slate-800';
  };

  return (
    <div className="flex flex-col items-center">
      {/* O CARD DO NÓ */}
      <div 
        onClick={() => onSelect(node)}
        className={`relative w-64 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 ${getStatusColor()}`}
      >
        <div className="flex justify-between items-center mb-2">
           <div className={`p-1.5 rounded-full ${node.channel === 'whatsapp' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
             {getIcon()}
           </div>
           <span className="text-[10px] uppercase font-bold text-slate-400">Dia {node.day}</span>
        </div>
        
        <h4 className="font-bold text-slate-200 text-sm mb-1">{node.type}</h4>
        <p className="text-xs text-slate-500 truncate">{node.body}</p>

        {node.response && (
           <div className="mt-2 pt-2 border-t border-slate-700/50 flex gap-1 flex-wrap">
              {node.response.tags?.map((tag: string) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                    {tag.replace('_', ' ')}
                  </span>
              ))}
           </div>
        )}
      </div>

      {/* LINHAS CONECTORAS (ÁRVORE) */}
      {childrenNodes.length > 0 && (
        <div className="flex flex-col items-center">
          {/* Linha vertical saindo do pai */}
          <div className="h-6 w-0.5 bg-slate-600"></div>
          
          {/* Barra horizontal se tiver multiplos filhos (ramificação) */}
          {childrenNodes.length > 1 && (
             <div className="h-0.5 bg-slate-600 w-full mb-0" style={{ width: `calc(100% - 20px)` }}></div>
          )}

          {/* Container dos filhos */}
          <div className="flex gap-4 items-start pt-0">
             {childrenNodes.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                   {/* Linha vertical entrando no filho */}
                   {childrenNodes.length > 1 && <div className="h-4 w-0.5 bg-slate-600 -mt-0.5 mb-0.5"></div>}
                   <MindMapNode 
                      node={child} 
                      childrenNodes={[]} // Recursividade simplificada para demo (idealmente passaria a arvore toda)
                      onSelect={onSelect}
                      depth={depth + 1}
                   />
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};