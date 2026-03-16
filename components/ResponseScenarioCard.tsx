import React from 'react';
import { ResponseScenario } from '../types';
import { GitFork, Copy, Check } from 'lucide-react';

interface Props {
  scenario: ResponseScenario;
}

const ResponseScenarioCard: React.FC<Props> = ({ scenario }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(scenario.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-800 text-slate-50 rounded-lg p-5 mb-4 border border-slate-700">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <GitFork className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="font-bold text-orange-400">{scenario.scenarioName}</h3>
            <p className="text-xs text-slate-400">{scenario.description}</p>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="text-slate-500 hover:text-white transition-colors"
          title="Copiar Script"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
      <div className="bg-slate-900/50 p-3 rounded text-sm text-slate-300 whitespace-pre-wrap font-mono border border-slate-700/50">
        {scenario.script}
      </div>
    </div>
  );
};

export default ResponseScenarioCard;