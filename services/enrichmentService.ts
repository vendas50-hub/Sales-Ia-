
// services/enrichmentService.ts

// Simula uma busca em bases de dados (LinkedIn, Receita Federal, Google News)
export const enrichCompanyData = async (companyName: string, providedContext: string): Promise<string> => {
  // Delay para parecer que está "pensando/buscando"
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Lógica de "Dedução" (Simulando a IA entendendo o setor pelo nome)
  let detectedSector = "Indústria Geral";
  let painPoints = "Eficiência e Custo";

  const lowerName = companyName.toLowerCase();
  
  if (lowerName.includes('construtora') || lowerName.includes('engenharia') || lowerName.includes('incorporadora') || lowerName.includes('eletric')) {
    detectedSector = "Construção Civil / Infraestrutura Elétrica";
    painPoints = "Prazo de entrega, Certificação de materiais (NBR 5410), Multa por atraso de obra";
  } 
  else if (lowerName.includes('automacao') || lowerName.includes('controle') || lowerName.includes('tech') || lowerName.includes('system')) {
    detectedSector = "Automação Industrial & Painéis";
    painPoints = "Precisão técnica, Organização de cabos (Cable management), Durabilidade de componentes";
  }
  else if (lowerName.includes('alimentos') || lowerName.includes('food') || lowerName.includes('bebidas') || lowerName.includes('agro')) {
    detectedSector = "Indústria Alimentícia (Sanitário)";
    painPoints = "Normas de higiene (Inox), Parada de linha crítica, Contaminação, Lavagem frequente";
  }
  else if (lowerName.includes('quimica') || lowerName.includes('farm') || lowerName.includes('lab')) {
    detectedSector = "Indústria Química/Farmacêutica";
    painPoints = "Corrosão severa, Segurança do trabalho, Normas rígidas (ASTM/ANSI)";
  }
  else if (lowerName.includes('solar') || lowerName.includes('renovavel') || lowerName.includes('energia')) {
    detectedSector = "Energia Solar / Renováveis";
    painPoints = "Proteção UV (Vida útil 25 anos), Conectores MC4, Agilidade na instalação";
  }

  // Monta o "Dossiê" que será passado para o Cérebro de Vendas
  return `
    DADOS ENRIQUECIDOS (Auto-Detectado):
    - Empresa: ${companyName}
    - Provável Setor: ${detectedSector}
    - Dores Comuns do Setor: ${painPoints}
    
    CONTEXTO ESPECÍFICO DO LEAD (Informado pelo SDR):
    "${providedContext}"
  `;
};
