import { useState, useEffect, useCallback } from 'react';
import { AppContext } from './AppContext';
import BUILTIN_DICTIONARY from '../data/dictionary';
import { escapeHTML } from '../utils/security';
import { fetchGeminiSummary as fetchGeminiSummaryService } from '../services/aiService';
import {
  loadInitialData,
  saveTerms as saveTermsService,
  saveApiKey as saveApiKeyService
} from '../services/storageService';

const SAMPLE_TERMS_KEYS = ["fotossintese", "celula", "dna", "democracia", "algoritmo", "metafora", "inteligencia artificial", "energia"];

const getPomoTimeForMode = (mode) => {
  if (mode === 'shortBreak') return 5 * 60;
  if (mode === 'longBreak') return 15 * 60;
  return 25 * 60;
};

// Declared helper outside of component to prevent recreate and satisfy dependency constraints
const createSampleTerms = () => {
  const initialTerms = {};
  SAMPLE_TERMS_KEYS.forEach(key => {
    if (BUILTIN_DICTIONARY[key]) {
      initialTerms[key] = {
        term: BUILTIN_DICTIONARY[key].term,
        definition: BUILTIN_DICTIONARY[key].definition,
        category: BUILTIN_DICTIONARY[key].category,
        connections: [...BUILTIN_DICTIONARY[key].connections],
        notes: "",
        x: Math.random() * 400 + 100,
        y: Math.random() * 250 + 80,
        createdAt: Date.now()
      };
    }
  });
  return initialTerms;
};

export function AppProvider({ children }) {
  const [terms, setTerms] = useState({});
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isDbLoading, setIsDbLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTermKey, setSelectedTermKey] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: 'all' });

  // --- UI Control States ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [editDefModalOpen, setEditDefModalOpen] = useState(false);
  const [addConnModalOpen, setAddConnModalOpen] = useState(false);

  // --- Toast state ---
  const [toast, setToast] = useState(null);
  
  // --- Custom Modals ---
  const [customModal, setCustomModal] = useState(null);

  // --- Pomodoro State ---
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60);
  const [pomoMode, setPomoMode] = useState('work');
  const [pomoIsRunning, setPomoIsRunning] = useState(false);
  const [pomoCycles, setPomoCycles] = useState(0);

  // --- Initial Database Loading Effect ---
  useEffect(() => {
    async function loadData() {
      const data = await loadInitialData();
      setTerms(data.terms);
      setGeminiApiKey(data.geminiApiKey);
      setIsDbLoading(false);
    }
    loadData();
  }, []);

  const initializeSampleTerms = async () => {
    const initial = createSampleTerms();
    setTerms(initial);
    await saveTermsService(initial);
  };

  const saveTermsData = (updater) => {
    setTerms((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveTermsService(next);
      return next;
    });
  };

  const saveApiKey = (key) => {
    setGeminiApiKey(key);
    saveApiKeyService(key);
  };

  // --- Toast Notification System ---
  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Promisified Modals ---
  const showCustomConfirm = useCallback((title, message, isDanger = false) => {
    return new Promise((resolve) => {
      setCustomModal({
        type: 'confirm',
        title,
        message,
        isDanger,
        resolve
      });
    });
  }, []);

  const showCustomPrompt = useCallback((title, label, placeholder = '') => {
    return new Promise((resolve) => {
      setCustomModal({
        type: 'prompt',
        title,
        label,
        placeholder,
        resolve
      });
    });
  }, []);

  const handleModalConfirm = (value) => {
    if (customModal) {
      customModal.resolve(value);
      setCustomModal(null);
    }
  };

  const handleModalCancel = () => {
    if (customModal) {
      customModal.resolve(customModal.type === 'confirm' ? false : null);
      setCustomModal(null);
    }
  };

  // --- Pomodoro Ticker Effect ---
  const playPomoSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
    } catch (err) {
      console.error("Could not play audio notification", err);
    }
  };

  useEffect(() => {
    let timer = null;
    if (pomoIsRunning) {
      timer = setInterval(() => {
        setPomoTimeLeft((prev) => {
          if (prev <= 1) {
            setPomoIsRunning(false);
            playPomoSound();
            if (pomoMode === 'work') {
              setPomoCycles((c) => c + 1);
              showToast("Ciclo de foco concluído! Bom trabalho.");
            } else {
              showToast("Intervalo concluído! Hora de voltar aos estudos.");
            }
            return getPomoTimeForMode(pomoMode);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pomoIsRunning, pomoMode, showToast]);

  const changePomoMode = (mode) => {
    setPomoMode(mode);
    setPomoIsRunning(false);
    setPomoTimeLeft(getPomoTimeForMode(mode));
  };

  // --- API Gemini fetch utility wrapper ---
  const fetchGeminiSummary = useCallback(async (term, context = "") => {
    return await fetchGeminiSummaryService(term, context, geminiApiKey);
  }, [geminiApiKey]);

  // --- Add Term / Quick Dump Processing ---
  const processDumpInput = async (rawInput) => {
    const rawInputText = rawInput.trim();
    if (!rawInputText) return;

    const rawTerms = rawInputText.split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length > 0);
    if (rawTerms.length === 0) return;

    showToast(`Processando ${rawTerms.length} termo(s)...`);

    for (let termText of rawTerms) {
      const match = termText.match(/^([^(:\n]+)(?:\(([^)]+)\)|:([^\n]+))?$/);
      let cleanTerm = termText;
      let context = "";
      if (match) {
        cleanTerm = match[1].trim();
        context = (match[2] || match[3] || "").trim();
      }

      const slug = termText.toLowerCase().replace(/[^a-z0-9á-ú\s/-]/gi, '').trim();
      if (!slug) continue;

      let exists = false;
      setTerms((prev) => {
        exists = !!prev[slug];
        return prev;
      });
      if (exists) continue;

      saveTermsData((prev) => {
        if (prev[slug]) return prev;
        return {
          ...prev,
          [slug]: {
            term: cleanTerm,
            definition: "Processando informações...",
            category: "custom",
            connections: [],
            notes: "",
            x: Math.random() * 400 + 100,
            y: Math.random() * 250 + 80,
            createdAt: Date.now(),
            loading: true
          }
        };
      });

      const cleanSlug = cleanTerm.toLowerCase().replace(/[^a-z0-9á-ú\s/-]/gi, '').trim();
      const cleanLookup = cleanSlug.replace(/-/g, ' ');
      
      const matchedKey = BUILTIN_DICTIONARY[cleanSlug]
        ? cleanSlug
        : Object.keys(BUILTIN_DICTIONARY).find(key => 
            key === cleanLookup || cleanLookup.includes(key) || key.includes(cleanLookup)
          );

      if (matchedKey) {
        const glossaryItem = BUILTIN_DICTIONARY[matchedKey];
        const glossaryConns = glossaryItem.connections || [];
        saveTermsData((prev) => {
          const next = { ...prev };
          next[slug] = {
            term: glossaryItem.term,
            definition: glossaryItem.definition,
            category: glossaryItem.category,
            connections: glossaryConns.filter(c => next[c] !== undefined),
            notes: "",
            x: Math.random() * 400 + 100,
            y: Math.random() * 250 + 80,
            createdAt: Date.now()
          };
          
          next[slug].connections.forEach(connKey => {
            if (next[connKey]) {
              const conns = next[connKey].connections || [];
              if (!conns.includes(slug)) {
                next[connKey] = {
                  ...next[connKey],
                  connections: [...conns, slug]
                };
              }
            }
          });
          return next;
        });
      } else if (geminiApiKey.trim() !== "") {
        try {
          const aiResult = await fetchGeminiSummary(cleanTerm, context);
          if (aiResult) {
            saveTermsData((prev) => {
              const next = { ...prev };
              next[slug] = {
                term: aiResult.term || cleanTerm,
                definition: aiResult.definition || "Sem definição disponível.",
                category: aiResult.category || "custom",
                connections: [],
                notes: "",
                x: Math.random() * 400 + 100,
                y: Math.random() * 250 + 80,
                createdAt: Date.now()
              };
              
              if (Array.isArray(aiResult.connections)) {
                aiResult.connections.forEach(connSlug => {
                  const cleanedConn = connSlug.toLowerCase().trim();
                  if (next[cleanedConn]) {
                    const connsA = next[slug].connections || [];
                    const connsB = next[cleanedConn].connections || [];

                    if (!connsA.includes(cleanedConn)) {
                      next[slug].connections = [...connsA, cleanedConn];
                    }
                    if (!connsB.includes(slug)) {
                      next[cleanedConn] = {
                        ...next[cleanedConn],
                        connections: [...connsB, slug]
                      };
                    }
                  }
                });
              }
              return next;
            });
          } else {
            throw new Error("Empty Response");
          }
        } catch (err) {
          console.error("Gemini API Error", err);
          saveTermsData((prev) => {
            return {
              ...prev,
              [slug]: {
                term: cleanTerm,
                definition: "Não foi possível resumir online. Clique em 'Editar Significado' para escrever o resumo você mesmo.",
                category: "custom",
                connections: [],
                notes: "",
                x: Math.random() * 400 + 100,
                y: Math.random() * 250 + 80,
                createdAt: Date.now()
              }
            };
          });
          showToast(`Erro na API ao resumir "${cleanTerm}". Modo Local Ativado.`, true);
        }
      } else {
        saveTermsData((prev) => {
          return {
            ...prev,
            [slug]: {
              term: cleanTerm,
              definition: "Definição não cadastrada no dicionário offline. Clique em 'Editar Significado' para resumir.",
              category: "custom",
              connections: [],
              notes: "",
              x: Math.random() * 400 + 100,
              y: Math.random() * 250 + 80,
              createdAt: Date.now()
            }
          };
        });
      }
    }

    showToast("Termos processados!");
  };

  // --- Deletion and Term Actions ---
  const deleteTerm = async (key) => {
    let termName = "";
    setTerms((prev) => {
      if (prev[key]) {
        termName = prev[key].term;
      }
      return prev;
    });
    if (!termName) return;

    const confirmed = await showCustomConfirm(
      `<i class="fa-solid fa-trash-can" style="color: var(--accent-pink);"></i> Excluir Termo`,
      `Excluir o termo "${escapeHTML(termName)}"?`,
      true
    );
    
    if (confirmed) {
      saveTermsData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach(otherKey => {
          const conns = next[otherKey].connections || [];
          if (conns.includes(key)) {
            next[otherKey] = {
              ...next[otherKey],
              connections: conns.filter(c => c !== key)
            };
          }
        });
        delete next[key];
        return next;
      });
      
      if (selectedTermKey === key) {
        setSelectedTermKey(null);
      }
      showToast("Termo removido.");
    }
  };

  const updateTermDefinition = (key, category, definition) => {
    if (!terms[key]) return;
    const updated = {
      ...terms,
      [key]: {
        ...terms[key],
        category,
        definition: definition.trim()
      }
    };
    saveTermsData(updated);
  };

  const updateTermNotes = (key, notes) => {
    if (!terms[key]) return;
    const updated = {
      ...terms,
      [key]: {
        ...terms[key],
        notes
      }
    };
    saveTermsData(updated);
  };

  const addConnection = (sourceKey, destKey) => {
    if (!terms[sourceKey] || !terms[destKey] || sourceKey === destKey) return;
    const connsA = terms[sourceKey].connections || [];
    const connsB = terms[destKey].connections || [];

    const updated = {
      ...terms,
      [sourceKey]: {
        ...terms[sourceKey],
        connections: connsA.includes(destKey) ? connsA : [...connsA, destKey]
      },
      [destKey]: {
        ...terms[destKey],
        connections: connsB.includes(sourceKey) ? connsB : [...connsB, sourceKey]
      }
    };

    saveTermsData(updated);
    showToast("Conexão estabelecida!");
  };

  const removeConnection = (termA, termB) => {
    if (!terms[termA] || !terms[termB]) return;
    const connsA = terms[termA].connections || [];
    const connsB = terms[termB].connections || [];

    const updated = {
      ...terms,
      [termA]: {
        ...terms[termA],
        connections: connsA.filter(c => c !== termB)
      },
      [termB]: {
        ...terms[termB],
        connections: connsB.filter(c => c !== termA)
      }
    };

    saveTermsData(updated);
    showToast("Conexão removida.");
  };

  return (
    <AppContext.Provider value={{
      terms,
      setTerms: saveTermsData,
      isDbLoading,
      geminiApiKey,
      setGeminiApiKey: saveApiKey,
      activeTab,
      setActiveTab,
      selectedTermKey,
      setSelectedTermKey,
      filters,
      setFilters,
      
      // UI open/closes
      settingsOpen,
      setSettingsOpen,
      mobileMenuOpen,
      setMobileMenuOpen,
      mobileDrawerOpen,
      setMobileDrawerOpen,
      editDefModalOpen,
      setEditDefModalOpen,
      addConnModalOpen,
      setAddConnModalOpen,

      // Toast alerts
      toast,
      showToast,

      // Promisified Custom Modals
      customModal,
      showCustomConfirm,
      showCustomPrompt,
      handleModalConfirm,
      handleModalCancel,

      // Pomodoro
      pomoTimeLeft,
      setPomoTimeLeft,
      pomoMode,
      pomoIsRunning,
      setPomoIsRunning,
      pomoCycles,
      setPomoCycles,
      changePomoMode,

      // Gemini/Actions
      fetchGeminiSummary,
      processDumpInput,
      deleteTerm,
      updateTermDefinition,
      updateTermNotes,
      addConnection,
      removeConnection,
      initializeSampleTerms
    }}>
      {children}
    </AppContext.Provider>
  );
}
