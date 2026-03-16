// App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Users, PieChart, Settings, Plus, UploadCloud, Save, GitBranch, AlertTriangle, ArrowRight, Loader2, Building, FileText, MessageSquare, TrendingUp, CheckSquare, StickyNote, Paperclip, X, Trash2, Edit3, RefreshCw, StopCircle, User, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { ClientProfile, CadencePhase, CadenceStep, ChannelType, ClientTask, ClientFile } from './types';
import { db, getDashboardStats } from './services/database'; // Import from new DB service
import { generateSmartPhase, regenerateStepVariants } from './services/aiBrain';
import { enrichCompanyData } from './services/enrichmentService';
import { PhaseCard } from './components/PhaseCard';
import { parseHistoryString } from './utils/historyParser'; // Import the new utility

function App() {
  const [activeTab, setActiveTab] = useState<'clients' | 'dashboard' | 'settings'>('clients');
  
  // Async State
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loadingApp, setLoadingApp] = useState(true);

  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [dashboardData, setDashboardData] = useState(getDashboardStats([]));
  
  // Settings State
  const [settings, setSettings] = useState({ termotubosContext: "", uploadedFiles: [] as string[] });
  const [tempContext, setTempContext] = useState("");

  // Loading State
  const [isGenerating, setIsGenerating] = useState(false);

  // File Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null); // Global knowledge base
  const clientFileInputRef = useRef<HTMLInputElement>(null); // Client specific

  // Task Input State
  const [newTaskInput, setNewTaskInput] = useState("");

  // Modal Novo Cliente
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ 
    name: '', 
    company: '', 
    phone: '', 
    leadContext: '', // Contexto extra (CNAE, Origem)
    conversationHistory: '' // Histórico da conversa (Novo)
  });
  const [isEnriching, setIsEnriching] = useState(false); // Estado de "Investigando..."

  // Modal Resposta
  const [responseModal, setResponseModal] = useState<{ open: boolean, stepId: string | null }>({ open: false, stepId: null });
  const [responseText, setResponseText] = useState("");
  const [newTag, setNewTag] = useState(""); 
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Modal Contexto / Pivot
  const [contextModal, setContextModal] = useState(false);
  const [newContextNoteText, setNewContextNoteText] = useState(""); // Input for new historical note
  const [newContextNoteDate, setNewContextNoteDate] = useState(new Date().toISOString().split('T')[0]); // Date for new note

  // State for editable client details in sidebar
  const [editClientDetails, setEditClientDetails] = useState({ name: '', company: '', phone: '' });
  const [isEditingBasicClientInfo, setIsEditingBasicClientInfo] = useState(false); // New state for basic client info edit mode
  const [isContextExpanded, setIsContextExpanded] = useState(false); // New state for full context block expansion
  // New states for individual history notes expansion
  // FIX: Correctly initialize useState with a Set object
  const [expandedSidebarNotes, setExpandedSidebarNotes] = useState<Set<number>>(new Set());
  const [expandedModalNotes, setExpandedModalNotes] = useState<Set<number>>(new Set());

  // Search state for client list
  // FIX: Declare searchTerm and setSearchTerm
  const [searchTerm, setSearchTerm] = useState('');

  const [newConversationText, setNewConversationText] = useState("");

  // Update editClientDetails when selectedClient changes
  useEffect(() => {
    if (selectedClient) {
      setEditClientDetails({
        name: selectedClient.name,
        company: selectedClient.company,
        phone: selectedClient.phone,
      });
      setIsEditingBasicClientInfo(false); // Reset edit mode when client changes
      setIsContextExpanded(false); // Collapse full context when client changes
      setExpandedSidebarNotes(new Set()); // Reset individual note expansion for new client
      setExpandedModalNotes(new Set()); // Reset individual note expansion for new client
    }
  }, [selectedClient]);

  // Load Data on Mount
  useEffect(() => {
    async function loadData() {
      setLoadingApp(true);
      try {
        const [loadedClients, loadedSettings] = await Promise.all([
          db.getClients(),
          db.getSettings()
        ]);
        setClients(loadedClients);
        setSettings(loadedSettings);
        setTempContext(loadedSettings.termotubosContext);
        setDashboardData(getDashboardStats(loadedClients));
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setLoadingApp(false);
      }
    }
    loadData();
  }, []);

  // Atualiza dashboard ao mudar tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      setDashboardData(getDashboardStats(clients));
    }
  }, [activeTab, clients]);

  // Filtered clients for the sidebar list
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If selected client is no longer in filtered list, deselect it
  useEffect(() => {
    if (selectedClient && !filteredClients.some(c => c.id === selectedClient.id)) {
      setSelectedClient(null);
    }
  }, [searchTerm, filteredClients, selectedClient]);


  // === HANDLERS ===

  const handleUpdateClientBasicDetails = async () => {
    if (!selectedClient) return;

    const updatedClient = {
      ...selectedClient,
      name: editClientDetails.name,
      company: editClientDetails.company,
      phone: editClientDetails.phone,
    };

    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);

    await db.updateClient(updatedClient);
    setIsEditingBasicClientInfo(false); // Exit edit mode after saving
  };


  const handleCreateClient = async () => {
    if (!newClientForm.name || !newClientForm.company) return;

    setIsEnriching(true); // Começa a "Pesquisa"

    try {
      // 1. O SISTEMA PESQUISA A EMPRESA (Simulação)
      const enrichedContext = await enrichCompanyData(newClientForm.company, newClientForm.leadContext);
      
      // DECIDE O GATILHO (Cold Start ou Histórico)
      const hasHistory = newClientForm.conversationHistory.trim().length > 0;
      const startTrigger = hasHistory 
        ? `[RETOMADA DE CONVERSA] O usuário informou o seguinte histórico prévio: "${newClientForm.conversationHistory}". Continue a conversa a partir daqui.`
        : "Início de Prospecção (Cold Start)";

      // PREPARA PERFIL TEMPORÁRIO PARA A IA (Para construir o histórico inicial)
      const tempProfile: any = {
          name: newClientForm.name,
          company: newClientForm.company,
          cadence_phases: [],
          context_history: [enrichedContext, hasHistory ? `HISTÓRICO: ${newClientForm.conversationHistory}` : ""]
      };

      // 2. IA GERA A PRIMEIRA ABORDAGEM
      const initialPhase = await generateSmartPhase(
        "root", 
        startTrigger, 
        [], 
        tempProfile,
        false
      );
      
      initialPhase.name = hasHistory ? "Fase 1: Retomada Inteligente" : "Fase 1: Abertura Contextual (IA)";

      const newClient: ClientProfile = {
        id: `cli_${Date.now()}`,
        name: newClientForm.name,
        company: newClientForm.company,
        phone: newClientForm.phone,
        context_history: tempProfile.context_history.filter(Boolean),
        cadence_phases: [initialPhase],
        tags: [],
        status: 'active',
        closingProbability: 25, // Default start
        notes: '',
        tasks: [],
        files: []
      };

      // Optimistic Update
      const updatedClients = [...clients, newClient];
      setClients(updatedClients);
      setSelectedClient(newClient);
      setShowNewClient(false);
      setNewClientForm({ name: '', company: '', phone: '', leadContext: '', conversationHistory: '' });

      // Async Save
      await db.addClient(newClient);

    } catch (error: any) {
      console.error("Erro ao criar", error);
      // Specific error message for quota exhaustion
      if (error?.error?.status === "RESOURCE_EXHAUSTED") {
        alert("ERRO DE COTA DA API: A IA atingiu o limite de uso. Por favor, verifique suas configurações de faturamento e cotas no Google Cloud Console. Para mais informações, consulte https://ai.google.dev/gemini-api/docs/rate-limits.");
      } else {
        alert("Erro ao criar novo cliente: " + (error.message || "Ocorreu um erro desconhecido."));
      }
    } finally {
      setIsEnriching(false);
    }
  };

  // --- REGENERA AS VARIANTES DE UM PASSO ---
  const handleRegenerateStep = async (stepId: string, instruction: string) => {
     if (!selectedClient) return;
     
     // FIX: Remove state updates for isRegenerating and regenStepId, these are managed by PhaseCard locally.
     // These lines caused errors because the state variables were not declared in App.tsx.

     try {
       const updatedPhases = [...selectedClient.cadence_phases];
       
       // Localiza o passo
       for (let i = 0; i < updatedPhases.length; i++) {
          const step = updatedPhases[i].steps.find(s => s.id === stepId);
          if (step) {
             // Chama IA para regenerar variantes, agora passando o cliente com as fases
             const newVariants = await regenerateStepVariants(step, instruction, selectedClient);
             
             if (newVariants && newVariants.length > 0) {
                 step.variants = newVariants;
                 step.body = newVariants[0].body; // Seta a primeira como padrão
                 step.tone = newVariants[0].type;
             }
             break;
          }
       }

       const updatedClient = { ...selectedClient, cadence_phases: updatedPhases };
       
       // Optimistic
       const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
       setClients(newClientsList);
       setSelectedClient(updatedClient);

       // Save
       await db.updateClient(updatedClient);
     } catch (error: any) {
        console.error("Erro ao regenerar passo", error);
        if (error?.error?.status === "RESOURCE_EXHAUSTED") {
          alert("ERRO DE COTA DA API: A IA atingiu o limite de uso ao tentar regenerar este passo. Por favor, verifique suas configurações de faturamento e cotas no Google Cloud Console. Para mais informações, consulte https://ai.google.dev/gemini-api/docs/rate-limits.");
        } else {
          alert("Erro ao regenerar passo: " + (error.message || "Ocorreu um erro desconhecido."));
        }
     } finally {
        // FIX: Remove state updates for isRegenerating and regenStepId, these are managed by PhaseCard locally.
     }
  };

  const handleRegisterResponse = async () => {
    if (!selectedClient || !responseModal.stepId) return;

    setIsGenerating(true); // START LOADING

    try {
      // Acha a fase e o passo EXATO
      const updatedPhases = [...selectedClient.cadence_phases];
      let activePhaseIndex = -1;

      // Varre para achar o passo clicado
      for(let i=0; i<updatedPhases.length; i++) {
          const stepIdx = updatedPhases[i].steps.findIndex(s => s.id === responseModal.stepId);
          if(stepIdx !== -1) {
              activePhaseIndex = i;
              // 1. Registra a resposta NO PASSO
              updatedPhases[i].steps[stepIdx].status = 'completed';
              updatedPhases[i].steps[stepIdx].response = {
                  date: new Date().toISOString(),
                  summary: responseText,
                  tags: selectedTags
              };
              // 2. Encerra a fase atual
              updatedPhases[i].status = 'completed';
              // 3. Pula os passos futuros dessa fase (já que a conversa mudou de rumo)
              for(let j=stepIdx+1; j<updatedPhases[i].steps.length; j++) {
                  updatedPhases[i].steps[j].status = 'skipped';
              }
              break;
          }
      }

      if(activePhaseIndex !== -1) {
          // Objeto temporário simulando o cliente já com a resposta registrada
          // Isso é crucial para que o historyBuilder pegue a resposta que acabamos de adicionar
          const tempClientProfile: ClientProfile = {
              ...selectedClient,
              cadence_phases: updatedPhases
          };

          // 4. GERA NOVA FASE (AGORA USANDO O AI BRAIN + HISTÓRICO COMPLETO)
          const nextPhase = await generateSmartPhase(
              updatedPhases[activePhaseIndex].id, 
              responseText, // Passa o texto real da objeção/resposta
              selectedTags, 
              tempClientProfile, // Passa perfil completo com histórico atualizado
              false // Não é silêncio
          );
          updatedPhases.push(nextPhase);

          // Salva
          const updatedClient = { ...selectedClient, cadence_phases: updatedPhases };
          // Increase probability on response
          updatedClient.closingProbability = Math.min((updatedClient.closingProbability || 25) + 15, 95);

          // Optimistic
          const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
          setClients(newClientsList);
          setSelectedClient(updatedClient);

          await db.updateClient(updatedClient);
      }
    } catch (error: any) {
      console.error("Erro ao registrar resposta e gerar nova cadência", error);
      // Specific error message for quota exhaustion
      if (error?.error?.status === "RESOURCE_EXHAUSTED") {
        alert("ERRO DE COTA DA API: A IA atingiu o limite de uso ao tentar gerar a próxima cadência. Por favor, verifique suas configurações de faturamento e cotas no Google Cloud Console. Para mais informações, consulte https://ai.google.dev/gemini-api/docs/rate-limits.");
      } else {
        alert("Erro ao registrar resposta e gerar nova cadência: " + (error.message || "Ocorreu um erro desconhecido."));
      }
    } finally {
      setIsGenerating(false); // STOP LOADING
      setResponseModal({ open: false, stepId: null });
      setResponseText("");
      setSelectedTags([]);
    }
  };

  const handleNoResponse = async (stepId: string) => {
    if (!selectedClient) return;
    const updatedPhases = [...selectedClient.cadence_phases];
    let needsUpdate = false;
    let lastSentMessageBody = ""; // Variável para armazenar o corpo da última mensagem

    for(let i=0; i<updatedPhases.length; i++) {
        const stepIdx = updatedPhases[i].steps.findIndex(s => s.id === stepId);
        if(stepIdx !== -1) {
            // Marca como "Enviado sem resposta"
            updatedPhases[i].steps[stepIdx].status = 'sent';
            lastSentMessageBody = updatedPhases[i].steps[stepIdx].body; // Captura a mensagem
            
            // VERIFICA SE A CADÊNCIA ACABOU EM SILÊNCIO
            const isLastStep = stepIdx === updatedPhases[i].steps.length - 1;
            
            if (isLastStep) {
                 updatedPhases[i].status = 'completed';
                 
                 // Temp profile
                 const tempClientProfile: ClientProfile = {
                     ...selectedClient,
                     cadence_phases: updatedPhases
                 };

                 // GERA FASE DE BREAK-UP / RECUPERAÇÃO VIA AI BRAIN
                 try {
                   const recoveryPhase = await generateSmartPhase(
                      updatedPhases[i].id, 
                      lastSentMessageBody, // AGORA PASSAMOS O BODY DA ÚLTIMA MENSAGEM ENVIADA
                      [], 
                      tempClientProfile, 
                      true // ATIVA MODO SILÊNCIO
                   );
                   updatedPhases.push(recoveryPhase);
                 } catch (error: any) {
                   console.error("Erro ao gerar fase de recuperação por silêncio", error);
                   if (error?.error?.status === "RESOURCE_EXHAUSTED") {
                     alert("ERRO DE COTA DA API: A IA atingiu o limite de uso ao tentar gerar uma fase de recuperação. Verifique suas cotas no Google Cloud Console.");
                   } else {
                     alert("Erro ao gerar fase de recuperação: " + (error.message || "Erro desconhecido."));
                   }
                 }
            }
            needsUpdate = true;
            break;
        }
    }
    
    if (needsUpdate) {
      const updatedClient = { ...selectedClient, cadence_phases: updatedPhases };
      
      const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
      setClients(newClientsList);
      setSelectedClient(updatedClient);

      await db.updateClient(updatedClient);
    }
  };

  const handleMarkAsSent = async (stepId: string) => {
    if (!selectedClient) return;
    const updatedPhases = [...selectedClient.cadence_phases];
    let needsUpdate = false;
    
    for(let i=0; i<updatedPhases.length; i++) {
        const stepIdx = updatedPhases[i].steps.findIndex(s => s.id === stepId);
        if(stepIdx !== -1) {
            // Apenas marca como enviado (aguardando retorno)
            updatedPhases[i].steps[stepIdx].status = 'sent';
            needsUpdate = true;
            break;
        }
    }
    
    if (needsUpdate) {
      const updatedClient = { ...selectedClient, cadence_phases: updatedPhases };
      
      const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
      setClients(newClientsList);
      setSelectedClient(updatedClient);

      await db.updateClient(updatedClient);
    }
  };

  const handleEditStep = async (stepId: string, newBody: string) => {
    if (!selectedClient) return;
    const updatedPhases = [...selectedClient.cadence_phases];
    
    for (let i = 0; i < updatedPhases.length; i++) {
      const step = updatedPhases[i].steps.find(s => s.id === stepId);
      if (step) {
        step.body = newBody;
        break;
      }
    }
    
    const updatedClient = { ...selectedClient, cadence_phases: updatedPhases };
    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);

    await db.updateClient(updatedClient);
  };

  // --- CONTEXT / PIVOT HANDLERS ---

  const handleOpenContextModal = () => {
    // Clear new note input and reset date when opening modal
    setNewContextNoteText(""); 
    setNewConversationText("");
    setNewContextNoteDate(new Date().toISOString().split('T')[0]); 
    setContextModal(true);
  };

  const handleAddContextNote = async () => { // Renamed from handleSaveContextOnly
    if (!selectedClient || (!newContextNoteText.trim() && !newConversationText.trim())) return;

    const newHistoryArray = [...selectedClient.context_history];
    let currentManualHistory = newHistoryArray.length > 1 ? newHistoryArray[1] : "HISTÓRICO: ";
    
    // Remove "HISTÓRICO: " prefix for manipulation
    if (currentManualHistory.startsWith("HISTÓRICO: ")) {
        currentManualHistory = currentManualHistory.substring("HISTÓRICO: ".length);
    }

    const formattedDate = newContextNoteDate.split('-').reverse().join('/'); // DD/MM/YYYY
    
    let newEntry = `[${formattedDate}]`;
    if (newContextNoteText.trim()) {
      newEntry += ` CONTEXTO: ${newContextNoteText.trim()}`;
    }
    if (newConversationText.trim()) {
      newEntry += `\nCONVERSA: ${newConversationText.trim()}`;
    }

    // Prepend new entry to existing history
    const updatedManualHistory = newEntry + (currentManualHistory.trim() ? "\n\n" + currentManualHistory.trim() : "");
    newHistoryArray[1] = "HISTÓRICO: " + updatedManualHistory;

    const updatedClient = { ...selectedClient, context_history: newHistoryArray };
    
    // Optimistic
    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);

    // Save
    await db.updateClient(updatedClient);
    setNewContextNoteText(""); // Clear input after adding
    setNewConversationText(""); // Clear conversation input after adding
    // Keep modal open to allow adding more notes
  };

  const handlePivotStrategy = async () => {
    if (!selectedClient || (!newContextNoteText.trim() && !newConversationText.trim())) return; // Pivot also requires a new note or conversation
    setIsGenerating(true);

    try {
      const newHistoryArray = [...selectedClient.context_history];
      let currentManualHistory = newHistoryArray.length > 1 ? newHistoryArray[1] : "HISTÓRICO: ";
      
      // Remove "HISTÓRICO: " prefix for manipulation
      if (currentManualHistory.startsWith("HISTÓRICO: ")) {
          currentManualHistory = currentManualHistory.substring("HISTÓRICO: ".length);
      }

      const formattedDate = newContextNoteDate.split('-').reverse().join('/'); // DD/MM/YYYY
      
      let newEntry = `[${formattedDate}] PIVOT:`;
      if (newContextNoteText.trim()) {
        newEntry += ` CONTEXTO: ${newContextNoteText.trim()}`;
      }
      if (newConversationText.trim()) {
        newEntry += `\nCONVERSA: ${newConversationText.trim()}`;
      }

      // Prepend new entry to existing history
      const updatedManualHistory = newEntry + (currentManualHistory.trim() ? "\n\n" + currentManualHistory.trim() : "");
      newHistoryArray[1] = "HISTÓRICO: " + updatedManualHistory;


      // 2. Encerra/Arquiva fases ativas antigas
      const updatedPhases = selectedClient.cadence_phases.map(p => {
          if (p.status === 'active') {
              // Marca os passos pendentes como pulados
              const updatedSteps = p.steps.map(s => s.status === 'pending' ? { ...s, status: 'skipped' } : s);
              return { ...p, status: 'completed', steps: updatedSteps } as CadencePhase;
          }
          return p;
      });

      const tempClientProfile: ClientProfile = {
          ...selectedClient,
          context_history: newHistoryArray, // Use updated history
          cadence_phases: updatedPhases
      };

      // 3. Gera Nova Fase Raiz (Pivot)
      const pivotTrigger = `[MUDANÇA DE CENÁRIO / PIVOT]: 
        ${newContextNoteText.trim() ? `CONTEXTO: ${newContextNoteText.trim()}` : ''}
        ${newConversationText.trim() ? `CONVERSA: ${newConversationText.trim()}` : ''}
        Ignore passos pendentes antigos e crie uma nova abordagem inicial baseada nisso.`;
      
      const newPhase = await generateSmartPhase(
          "pivot_root_" + Date.now(),
          pivotTrigger,
          ["Pivot Estratégico", "Novo Cenário"],
          tempClientProfile,
          false
      );
      newPhase.name = "Fase Pivot: Nova Direção";
      
      updatedPhases.push(newPhase);

      // 4. Salva tudo
      const updatedClient = { 
          ...selectedClient, 
          context_history: newHistoryArray, // Save the updated history
          cadence_phases: updatedPhases,
          notes: (selectedClient.notes || "") + `\n[${formattedDate}] PIVOT: ${newContextNoteText.trim()} ${newConversationText.trim()}` // Add to general notes as well for redundancy
      };

      const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
      setClients(newClientsList);
      setSelectedClient(updatedClient);
      await db.updateClient(updatedClient);
      
    } catch (error: any) {
      console.error("Erro ao pivotar estratégia", error);
      if (error?.error?.status === "RESOURCE_EXHAUSTED") {
        alert("ERRO DE COTA DA API: A IA atingiu o limite de uso ao tentar pivotar a estratégia. Por favor, verifique suas configurações de faturamento e cotas no Google Cloud Console. Para mais informações, consulte https://ai.google.dev/gemini-api/docs/rate-limits.");
      } else {
        alert("Erro ao pivotar estratégia: " + (error.message || "Ocorreu um erro desconhecido."));
      }
    } finally {
      setIsGenerating(false);
      setNewContextNoteText(""); // Clear input
      setContextModal(false);
    }
  };

  // --- FUNCTIONAL SIDEBAR HANDLERS ---

  const handleUpdateNotes = async (newNotes: string) => {
    if (!selectedClient) return;
    const updatedClient = { ...selectedClient, notes: newNotes };
    
    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);

    // Debounce normally, but here simple async
    await db.updateClient(updatedClient);
  };

  const handleUpdateProbability = async (newVal: number) => {
    if (!selectedClient) return;
    const updatedClient = { ...selectedClient, closingProbability: newVal };
    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);
    await db.updateClient(updatedClient);
  };

  const handleAddTask = async () => {
    if (!selectedClient || !newTaskInput.trim()) return;
    const newTask: ClientTask = { 
        id: Date.now().toString(), 
        text: newTaskInput, 
        completed: false 
    };
    const currentTasks = selectedClient.tasks || [];
    const updatedClient = { ...selectedClient, tasks: [...currentTasks, newTask] };

    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);
    setNewTaskInput("");
    await db.updateClient(updatedClient);
  };

  const handleToggleTask = async (taskId: string) => {
    if (!selectedClient) return;
    const currentTasks = selectedClient.tasks || [];
    const updatedTasks = currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    const updatedClient = { ...selectedClient, tasks: updatedTasks };

    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);
    await db.updateClient(updatedClient);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedClient) return;
    const currentTasks = selectedClient.tasks || [];
    const updatedTasks = currentTasks.filter(t => t.id !== taskId);
    const updatedClient = { ...selectedClient, tasks: updatedTasks };

    const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(newClientsList);
    setSelectedClient(updatedClient);
    await db.updateClient(updatedClient);
  };

  const handleClientFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedClient) {
      const newFile: ClientFile = {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        date: new Date().toLocaleDateString()
      };
      
      const currentFiles = selectedClient.files || [];
      const updatedClient = { ...selectedClient, files: [...currentFiles, newFile] };
      
      const newClientsList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
      setClients(newClientsList);
      setSelectedClient(updatedClient);
      await db.updateClient(updatedClient);
      
      // Reset input
      event.target.value = '';
    }
  };

  // --- SETTINGS HANDLERS ---

  const handleSaveSettings = async () => {
    const newSettings = { ...settings, termotubosContext: tempContext };
    setSettings(newSettings);
    await db.updateSettings(newSettings);
    alert("Contexto e Configurações Salvos!");
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (settings.uploadedFiles.includes(file.name)) {
        alert("Este arquivo já foi indexado na base de conhecimento.");
        return;
      }
      const updatedFiles = [...settings.uploadedFiles, file.name];
      const newSettings = { ...settings, uploadedFiles: updatedFiles };
      setSettings(newSettings);
      await db.updateSettings(newSettings);
      event.target.value = '';
    }
  };

  const addTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags([...selectedTags, newTag]);
      setNewTag("");
    }
  };

  const toggleSidebarNoteExpansion = (index: number) => {
    const newSet = new Set(expandedSidebarNotes);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedSidebarNotes(newSet);
  };

  const toggleModalNoteExpansion = (index: number) => {
    const newSet = new Set(expandedModalNotes);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedModalNotes(newSet);
  };

  if (loadingApp) {
    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p>Conectando ao banco de dados...</p>
        </div>
    )
  }

  const parsedHistoryNotes = selectedClient ? parseHistoryString(selectedClient.context_history[1]) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
        <div className="p-2 bg-orange-600 rounded-xl mb-4"><Bot size={28} className="text-white"/></div>
        <button onClick={() => setActiveTab('clients')} className={`p-3 rounded-xl transition-all ${activeTab === 'clients' ? 'bg-slate-800 text-orange-400 border border-orange-500/30' : 'text-slate-500 hover:bg-slate-800'}`}><Users size={22}/></button>
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-slate-800 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:bg-slate-800'}`}><PieChart size={22}/></button>
        <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-500 hover:bg-slate-800'}`}><Settings size={22}/></button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 z-10">
           <div className="flex items-center gap-3">
             <h1 className="font-bold text-lg">NeuroSales Engine <span className="text-xs bg-orange-500 text-black px-1.5 py-0.5 rounded font-bold">V4.1 (Supabase)</span></h1>
             {selectedClient && activeTab === 'clients' && <span className="text-slate-500 text-sm">/ {selectedClient.name}</span>}
           </div>
           {activeTab === 'clients' && (
             <button onClick={() => setShowNewClient(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
               <Plus size={16}/> Novo Lead
             </button>
           )}
        </header>

        {/* --- TAB: CLIENTES (ÁRVORE) --- */}
        {activeTab === 'clients' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Lista Lateral */}
            <div className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto">
              {/* Search Bar */}
              <div className="p-4 border-b border-slate-800 relative">
                <Search size={16} className="absolute left-7 top-7 text-slate-500"/>
                <input 
                  type="text"
                  placeholder="Buscar contatos..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredClients.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 mt-10">
                      Nenhum cliente encontrado.
                  </div>
              )}
              {filteredClients.map(cli => (
                <div 
                  key={cli.id} 
                  onClick={() => setSelectedClient(cli)}
                  className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800 ${selectedClient?.id === cli.id ? 'bg-slate-800 border-l-4 border-l-orange-500' : ''}`}
                >
                  <h4 className="font-bold text-white">{cli.name}</h4>
                  <p className="text-xs text-slate-400">{cli.company}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-[10px] bg-slate-700 px-2 rounded text-slate-300">{cli.cadence_phases.length} Fases</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Área Visual (Canvas) */}
            <div className="flex-1 bg-slate-950 p-8 overflow-auto relative custom-scrollbar flex flex-col items-center">
               {!selectedClient ? (
                 <div className="mt-20 text-center opacity-30">
                   <GitBranch size={64} className="mx-auto mb-4"/>
                   <p>Selecione um cliente para ver o fluxo</p>
                 </div>
               ) : (
                 <div className="w-full max-w-2xl flex flex-col items-center pb-20">
                   {/* Contexto Enriquecido Badge + Botão de Edição - REMOVIDO DAQUI */}

                   {/* Renderiza as Fases em Sequência Vertical */}
                   {selectedClient.cadence_phases.map((phase) => (
                     <div key={phase.id} className="flex flex-col items-center">
                        <PhaseCard 
                          phase={phase} 
                          onRegisterResponse={(stepId) => setResponseModal({ open: true, stepId: stepId })}
                          onNoResponse={(stepId) => handleNoResponse(stepId)}
                          onMarkAsSent={(stepId) => handleMarkAsSent(stepId)}
                          onEditStep={handleEditStep}
                          onRegenerateStep={handleRegenerateStep} // Passa o handler aqui
                        />
                        {/* Seta conectora visual entre fases */}
                        <ArrowRight className="text-slate-600 rotate-90 mb-4"/>
                     </div>
                   ))}
                   
                   {/* Botão Final */}
                   <div className="opacity-50 text-xs text-slate-500 border border-slate-800 px-4 py-2 rounded-full">
                     Fim do Fluxo Atual
                   </div>
                 </div>
               )}
            </div>

            {/* --- RIGHT SIDEBAR (NOVA ABA LATERAL) --- */}
            {selectedClient && (
              <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto flex flex-col gap-8 shadow-2xl z-10">
                
                {/* 0. Informações do Cliente */}
                <div>
                   <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center justify-between">
                     <div className="flex items-center gap-2"><User size={14}/> Informações do Cliente</div>
                     {!isEditingBasicClientInfo && (
                        <button 
                            onClick={() => setIsEditingBasicClientInfo(true)} 
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Editar informações básicas"
                        >
                            <Edit3 size={14}/>
                        </button>
                     )}
                   </h3>
                   {isEditingBasicClientInfo ? (
                     <div className="space-y-3">
                       <div>
                         <label className="text-[10px] text-slate-600 uppercase block mb-1">Nome do Contato</label>
                         <input 
                           className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                           value={editClientDetails.name}
                           onChange={(e) => setEditClientDetails({...editClientDetails, name: e.target.value})}
                         />
                       </div>
                       <div>
                         <label className="text-[10px] text-slate-600 uppercase block mb-1">Empresa</label>
                         <input 
                           className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                           value={editClientDetails.company}
                           onChange={(e) => setEditClientDetails({...editClientDetails, company: e.target.value})}
                         />
                       </div>
                       <div>
                         <label className="text-[10px] text-slate-600 uppercase block mb-1">Telefone / WhatsApp</label>
                         <input 
                           className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                           value={editClientDetails.phone}
                           onChange={(e) => setEditClientDetails({...editClientDetails, phone: e.target.value})}
                         />
                       </div>
                       <div className="flex gap-2 mt-2">
                           <button 
                             onClick={() => setIsEditingBasicClientInfo(false)}
                             className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-xs font-bold flex items-center justify-center gap-2"
                           >
                             Cancelar
                           </button>
                           <button 
                             onClick={handleUpdateClientBasicDetails}
                             className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded text-xs font-bold flex items-center justify-center gap-2"
                           >
                             <Save size={14}/> Salvar Detalhes
                           </button>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-2">
                        <p className="text-sm text-white"><span className="text-slate-500 text-[10px] uppercase block">Nome do Contato</span>{selectedClient.name}</p>
                        <p className="text-sm text-white"><span className="text-slate-500 text-[10px] uppercase block">Empresa</span>{selectedClient.company}</p>
                        <p className="text-sm text-white"><span className="text-slate-500 text-[10px] uppercase block">Telefone / WhatsApp</span>{selectedClient.phone}</p>
                     </div>
                   )}
                </div>

                {/* Contexto Enriquecido + Histórico (MOVIDO DAQUI) */}
                {selectedClient.context_history && selectedClient.context_history.length > 0 && (
                     <div className="w-full space-y-2 relative group/ctx">
                        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <FileText size={14}/> Contexto e Histórico
                           </div>
                           <div className="flex items-center gap-1">
                             <button 
                                onClick={handleOpenContextModal}
                                className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-white transition-colors bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-full"
                                title="Gerenciar detalhes do contexto e pivotar estratégia"
                             >
                               <Edit3 size={10}/> Gerenciar
                             </button>
                             <button onClick={() => setIsContextExpanded(!isContextExpanded)} className="text-slate-500 hover:text-white transition-colors">
                               {isContextExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                             </button>
                           </div>
                        </h3>
                        {/* Contexto da Empresa (Geralmente Index 0) */}
                        {selectedClient.context_history[0] && (
                            <div className="bg-slate-950/50 border border-slate-800 p-3 rounded-lg text-[10px] text-slate-400 font-mono whitespace-pre-wrap">
                                {isContextExpanded ? 
                                    selectedClient.context_history[0] :
                                    selectedClient.context_history[0].split('\n').slice(0, 2).join('\n') + '...'
                                }
                            </div>
                        )}
                        {/* Contexto do Histórico (Index 1) */}
                        {parsedHistoryNotes.length > 0 && (
                             <div className={`space-y-3 transition-all duration-300 ${isContextExpanded ? 'max-h-96 overflow-auto' : 'max-h-20 overflow-hidden'}`}
                                style={!isContextExpanded ? { maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' } : {}}
                             >
                                {parsedHistoryNotes.map((note, index) => (
                                    <div key={index} className={`bg-blue-900/10 border p-3 rounded-lg text-[10px] font-mono relative transition-all duration-200 ${note.isPivot ? 'border-red-800/30 text-red-300' : 'border-blue-800/30 text-blue-300'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-white">{note.date}</span>
                                            <button 
                                                onClick={() => toggleSidebarNoteExpansion(index)}
                                                className="text-slate-500 hover:text-white transition-colors"
                                            >
                                                {expandedSidebarNotes.has(index) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                            </button>
                                        </div>
                                        <div className={`whitespace-pre-wrap ${expandedSidebarNotes.has(index) ? '' : 'max-h-6 overflow-hidden'}`}>
                                            {note.text}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )}
                     </div>
                   )}
                
                {/* 1. Probabilidade de Fechamento */}
                <div>
                   <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                     <TrendingUp size={14}/> Probabilidade de Fechamento
                   </h3>
                   <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-lg">
                       <input 
                         type="range"
                         min="0"
                         max="100"
                         step="5"
                         value={selectedClient.closingProbability || 0}
                         onChange={(e) => handleUpdateProbability(parseInt(e.target.value))}
                         className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg [&::-webkit-slider-thumb]:bg-orange-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none"
                       />
                       <div className="text-center mt-2 text-sm font-bold text-white">
                           {selectedClient.closingProbability || 0}%
                       </div>
                   </div>
                </div>

                {/* 2. Lembretes de Ações */}
                <div>
                   <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                     <CheckSquare size={14}/> Próximas Ações
                   </h3>
                   <div className="space-y-2 mb-3">
                      {(selectedClient.tasks || []).map(task => (
                          <div key={task.id} className="flex items-start gap-3 p-3 bg-slate-950/50 rounded border border-slate-800/50 hover:bg-slate-900 transition-colors group">
                            <input 
                                type="checkbox" 
                                className="mt-1 bg-slate-900 border-slate-700 rounded cursor-pointer accent-orange-500" 
                                checked={task.completed}
                                onChange={() => handleToggleTask(task.id)}
                            />
                            <span className={`text-sm flex-1 break-words ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300 group-hover:text-white'}`}>
                                {task.text}
                            </span>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14}/>
                            </button>
                          </div>
                      ))}
                      {(selectedClient.tasks || []).length === 0 && (
                          <p className="text-xs text-slate-600 italic">Nenhuma ação pendente.</p>
                      )}
                   </div>
                   
                   {/* Add Task Input */}
                   <div className="flex gap-2">
                       <input 
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                          placeholder="Adicionar nova tarefa..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                       />
                       <button 
                          onClick={handleAddTask}
                          disabled={!newTaskInput.trim()}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded text-sm disabled:opacity-50"
                       >
                          +
                       </button>
                   </div>
                </div>

                {/* 3. Uploads e Análises */}
                <div>
                   <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                     <Paperclip size={14}/> Arquivos e Análises
                   </h3>
                   <div className="space-y-2">
                      {(selectedClient.files || []).map((file, idx) => (
                          <div key={idx} className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center gap-3 hover:border-slate-600 cursor-pointer transition-colors group relative">
                             <div className="bg-blue-500/10 p-2 rounded text-blue-400 group-hover:bg-blue-500/20"><FileText size={16}/></div>
                             <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate" title={file.name}>{file.name}</p>
                                <p className="text-[10px] text-slate-500">{file.size} • {file.date}</p>
                             </div>
                          </div>
                      ))}
                      
                       <button 
                          onClick={() => clientFileInputRef.current?.click()}
                          className="w-full py-3 border border-dashed border-slate-700 rounded text-xs text-slate-500 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all flex justify-center items-center gap-2"
                       >
                          <UploadCloud size={14}/> Adicionar Arquivo
                       </button>
                       <input 
                           type="file" 
                           ref={clientFileInputRef} 
                           className="hidden" 
                           onChange={handleClientFileUpload}
                       />
                   </div>
                </div>

                {/* 4. Notas Mentais */}
                <div className="flex-1 flex flex-col min-h-[200px]">
                   <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                     <StickyNote size={14}/> Notas Mentais
                   </h3>
                   <textarea 
                     className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 resize-none transition-all placeholder:text-slate-600"
                     placeholder="Digite suas observações, estratégias ocultas ou lembretes sobre este cliente..."
                     value={selectedClient.notes || ''}
                     onChange={(e) => handleUpdateNotes(e.target.value)}
                   />
                </div>

              </div>
            )}

          </div>
        )}

        {/* --- TAB: DASHBOARD (Métricas Reais) --- */}
        {activeTab === 'dashboard' && (
          <div className="p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Métricas de Carteira</h2>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Total Toques</h3>
                <p className="text-3xl font-bold text-white mt-1">{dashboardData.totalTouches}</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Retornos (Respostas)</h3>
                <p className="text-3xl font-bold text-green-400 mt-1">{dashboardData.totalResponses}</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Taxa Conversão</h3>
                <p className="text-3xl font-bold text-blue-400 mt-1">{dashboardData.conversionRate}%</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Empresas Ativas</h3>
                <p className="text-3xl font-bold text-white mt-1">{dashboardData.totalClients}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Top Objeções */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18}/> Principais Respostas / Objeções</h3>
                 <div className="space-y-3">
                   {dashboardData.topTags.map((tag, i) => (
                     <div key={i} className="flex justify-between items-center text-sm">
                       <span className="text-slate-300 capitalize">{tag.label}</span>
                       <div className="flex items-center gap-2 w-1/2">
                          <div className="h-2 bg-slate-700 rounded-full w-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${(tag.value / dashboardData.totalResponses) * 100}%` }}></div>
                          </div>
                          <span className="text-slate-500 text-xs w-6">{tag.value}</span>
                       </div>
                     </div>
                   ))}
                   {dashboardData.topTags.length === 0 && <p className="text-slate-500 text-sm">Sem dados ainda.</p>}
                 </div>
              </div>

              {/* Empresas com Mais Toques */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18}/> Top Empresas (Volume de Toques)</h3>
                 <div className="space-y-3">
                   {dashboardData.topCompanies.map((comp, i) => (
                     <div key={i} className="flex justify-between p-3 bg-slate-800 rounded">
                        <span className="text-white font-medium">{comp.name}</span>
                        <span className="text-slate-400 text-sm">{comp.touches} toques</span>
                     </div>
                   ))}
                   {dashboardData.topCompanies.length === 0 && <p className="text-slate-500 text-sm">Sem dados ainda.</p>}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: SETTINGS (Configurações Reais) --- */}
        {activeTab === 'settings' && (
          <div className="p-8 max-w-4xl mx-auto">
             <h2 className="text-2xl font-bold mb-6">Base de Conhecimento Termotubos</h2>
             
             <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 mb-6">
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Contexto da Empresa (Prompt do Sistema)</label>
                <textarea 
                  className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 text-sm outline-none focus:border-orange-500"
                  value={tempContext}
                  onChange={e => setTempContext(e.target.value)}
                />
                <div className="flex justify-end mt-4">
                  <button onClick={handleSaveSettings} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded font-bold flex items-center gap-2">
                    <Save size={16}/> Salvar Memória
                  </button>
                </div>
             </div>

             <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
                <h3 className="font-bold text-white mb-4">Arquivos Indexados</h3>
                <div className="space-y-2">
                  {settings.uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                       <span className="text-sm text-slate-300">{file}</span>
                       <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded">Ativo</span>
                    </div>
                  ))}
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-800 transition-colors relative"
                  >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.txt"
                    />
                    <UploadCloud size={24} className="mb-2"/>
                    <p className="text-sm">Carregar Arquivo da Base (PDF, DOCX, TXT)</p>
                    <span className="text-[10px] mt-1 text-slate-600">Simula envio para o Knowledge Base</span>
                  </div>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* --- MODAIS --- */}
      
      {/* CONTEXTO & PIVOT MODAL */}
      {contextModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-[600px] shadow-2xl relative">
              <h3 className="font-bold text-xl text-white mb-4 flex items-center gap-2">
                  <Edit3 size={20} className="text-orange-500"/> 
                  Adicionar Nota ao Histórico / Pivotar Estratégia
              </h3>
              
              <p className="text-xs text-slate-400 mb-6">
                  Adicione novas informações ao histórico ou, se necessário, mude completamente a direção da cadência.
              </p>

              {/* Display of current full manual history */}
              {parsedHistoryNotes.length > 0 ? (
                  <div className="mb-4 bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 h-32 overflow-y-auto whitespace-pre-wrap space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Histórico de Interações Existente:</label>
                      {parsedHistoryNotes.map((note, index) => (
                                    <div key={index} className={`bg-slate-900 border p-3 rounded-lg text-[10px] font-mono relative transition-all duration-200 ${note.isPivot ? 'border-red-800/30 text-red-300' : 'border-blue-800/30 text-blue-300'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-white">{note.date}</span>
                                            <button 
                                                onClick={() => toggleModalNoteExpansion(index)}
                                                className="text-slate-500 hover:text-white transition-colors"
                                            >
                                                {expandedModalNotes.has(index) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                            </button>
                                        </div>
                                        <div className={`whitespace-pre-wrap ${expandedModalNotes.has(index) ? '' : 'max-h-6 overflow-hidden'}`}>
                                            {note.text}
                                        </div>
                                    </div>
                                ))}
                  </div>
              ) : (
                <div className="mb-4 bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-500 h-16 flex items-center justify-center">
                   Nenhum histórico manual adicionado ainda.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                      <label className="text-xs font-bold text-orange-400 uppercase mb-1 block">
                          Novo Contexto / Estratégia:
                      </label>
                      <textarea 
                          className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-orange-500 resize-none transition-all"
                          placeholder="Ex: Cliente ficou com duvidas, fale que a malha encaixa no que ele precisa..."
                          value={newContextNoteText}
                          onChange={e => setNewContextNoteText(e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-blue-400 uppercase mb-1 block">
                          Nova Conversa / Mensagem:
                      </label>
                      <textarea 
                          className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500 resize-none transition-all"
                          placeholder="Ex: E ai conseguiu ver?..."
                          value={newConversationText}
                          onChange={e => setNewConversationText(e.target.value)}
                      />
                  </div>
              </div>

              <div className="mb-6 flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Data da Nota:</label>
                    <input 
                        type="date"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white outline-none focus:border-orange-500"
                        value={newContextNoteDate}
                        onChange={e => setNewContextNoteDate(e.target.value)}
                    />
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button 
                      onClick={() => setContextModal(false)}
                      className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                      Fechar
                  </button>
                  <button 
                      onClick={handleAddContextNote}
                      disabled={!newContextNoteText.trim() && !newConversationText.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold border border-slate-700 disabled:opacity-50 transition-all"
                  >
                      Adicionar Nota ao Histórico
                  </button>
                  <button 
                      onClick={handlePivotStrategy}
                      disabled={isGenerating || (!newContextNoteText.trim() && !newConversationText.trim())}
                      className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all"
                  >
                      {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                      Salvar & Reiniciar Cadência
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* NOVO CLIENTE (ATUALIZADO) */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-[500px] shadow-2xl relative overflow-hidden">
              
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 mb-6">
                 <div className="bg-orange-600 p-2 rounded-lg text-white">
                    <Plus size={20} />
                 </div>
                 <div>
                    <h3 className="font-bold text-xl text-white">Novo Lead</h3>
                    <p className="text-xs text-slate-400">A IA irá pesquisar dados da empresa para iniciar.</p>
                 </div>
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contato Principal</label>
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white outline-none focus:border-orange-500 transition-colors" 
                      placeholder="Nome do Decisor" 
                      value={newClientForm.name}
                      onChange={e => setNewClientForm({...newClientForm, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Empresa Alvo</label>
                    <div className="relative">
                       <Building size={16} className="absolute left-3 top-3.5 text-slate-600" />
                       <input 
                         className="w-full bg-slate-950 border border-slate-800 p-3 pl-10 rounded-lg text-white outline-none focus:border-orange-500 transition-colors" 
                         placeholder="Ex: Sigeral Automação Ltda" 
                         value={newClientForm.company}
                         onChange={e => setNewClientForm({...newClientForm, company: e.target.value})}
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Telefone / Whats</label>
                        <input 
                          className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white outline-none focus:border-orange-500" 
                          placeholder="(XX) 9..." 
                          value={newClientForm.phone}
                          onChange={e => setNewClientForm({...newClientForm, phone: e.target.value})}
                        />
                     </div>
                  </div>

                  {/* CAMPO DE CONTEXTO RICO */}
                  <div>
                    <label className="text-xs font-bold text-orange-400 uppercase mb-1 flex items-center gap-2">
                       <FileText size={12}/> Contexto do Lead (CNAE, Origem, Lista)
                    </label>
                    <textarea 
                      className="w-full h-20 bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-slate-300 outline-none focus:border-orange-500 resize-none" 
                      placeholder="Ex: Lead veio da Lista de Indústrias 2024..." 
                      value={newClientForm.leadContext}
                      onChange={e => setNewClientForm({...newClientForm, leadContext: e.target.value})}
                    />
                  </div>

                  {/* CAMPO DE HISTÓRICO (NOVO) */}
                  <div>
                     <label className="text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-2">
                        <MessageSquare size={12}/> Histórico / Já conversamos?
                     </label>
                     <textarea 
                       className="w-full h-20 bg-slate-950 border border-slate-800 p-3 rounded-lg text-sm text-slate-300 outline-none focus:border-blue-500 resize-none" 
                       placeholder="Cole aqui o último email ou resumo. Ex: 'Ele pediu para retomar em Janeiro...'" 
                       value={newClientForm.conversationHistory}
                       onChange={e => setNewClientForm({...newClientForm, conversationHistory: e.target.value})}
                     />
                  </div>
              </div>

              {/* Rodapé com Ações */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-800">
                 <button 
                    onClick={() => setShowNewClient(false)} 
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    disabled={isEnriching}
                 >
                    Cancelar
                 </button>
                 <button 
                    onClick={handleCreateClient} 
                    disabled={isEnriching || !newClientForm.name}
                    className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-lg font-bold shadow-lg shadow-orange-900/30 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isEnriching ? (
                      <>
                        <Loader2 className="animate-spin" size={18}/>
                        <span className="text-sm">Analisando Empresa...</span>
                      </>
                    ) : (
                      <>Criar e Analisar</>
                    )}
                 </button>
              </div>

              {/* Efeito visual de loading (Barra de progresso fake) */}
              {isEnriching && (
                 <div className="absolute bottom-0 left-0 h-1 bg-orange-500 animate-pulse w-full"></div>
              )}
           </div>
        </div>
      )}

      {/* REGISTRAR RESPOSTA (TAGS CUSTOMIZÁVEIS) */}
      {responseModal.open && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 w-[500px] shadow-2xl">
               <h3 className="font-bold text-lg mb-4 text-white">Registrar Resposta</h3>
               
               {/* Criar Tag */}
               <div className="mb-4">
                 <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Classificar Resposta</label>
                 <div className="flex gap-2 mb-2">
                   <input 
                     className="bg-slate-950 border border-slate-800 rounded p-2 text-sm flex-1 text-white outline-none" 
                     placeholder="Digite uma tag (ex: Preço Alto)..."
                     value={newTag}
                     onChange={e => setNewTag(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && addTag()}
                   />
                   <button onClick={addTag} className="bg-slate-800 px-3 rounded text-sm text-slate-300">+</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {selectedTags.map(tag => (
                     <span key={tag} className="bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                       {tag} <button onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} className="hover:text-black">x</button>
                     </span>
                   ))}
                 </div>
               </div>

               <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Resumo do que foi dito: <span className="text-slate-400">({responseText.length}/500)</span></label>
               <textarea 
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded p-3 text-sm text-white mb-4 outline-none"
                  placeholder="Resumo do que foi dito pelo cliente (seja conciso, 500 caracteres máx.)..."
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  maxLength={500} // Set max length for token optimization
               />

               <div className="flex justify-end gap-3">
                  <button onClick={() => setResponseModal({ open: false, stepId: null })} className="px-3 py-2 text-slate-400">Cancelar</button>
                  <button 
                     onClick={handleRegisterResponse} 
                     disabled={isGenerating}
                     className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded font-bold flex items-center gap-2"
                  >
                     {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <GitBranch size={16}/>}
                     {isGenerating ? "Criando Estratégia..." : "Gerar Próxima Cadência"}
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}

export default App;