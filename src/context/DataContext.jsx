import { createContext, useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { UIContext } from './UIContext';
import { escapeHTML } from '../utils/security';
import BUILTIN_DICTIONARY from '../data/dictionary';
import { fetchGeminiSummary as fetchGeminiSummaryService } from '../services/aiService';
import {
  loadInitialData,
  saveTerms as saveTermsService,
  saveApiKey as saveApiKeyService,
  saveGoogleClientId as saveGoogleClientIdService,
  slugifyKey
} from '../services/storageService';

export const DataContext = createContext();

const SAMPLE_TERMS_KEYS = ["fotossintese", "celula", "dna", "democracia", "algoritmo", "metafora", "inteligencia artificial", "energia"];

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

export function DataProvider({ children }) {
  const [terms, setTerms] = useState({});
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: 'all' });

  const { showToast, showCustomConfirm, selectedTermKey, setSelectedTermKey } = useContext(UIContext);

  const saveQueueRef = useRef(Promise.resolve());
  const isLoadedRef = useRef(false);

  // --- Initial Database Loading Effect ---
  useEffect(() => {
    async function loadData() {
      const data = await loadInitialData();
      setTerms(data.terms);
      setGeminiApiKey(data.geminiApiKey);
      setGoogleClientId(data.googleClientId || '');
      setIsDbLoading(false);
    }
    loadData();
  }, []);

  const saveGoogleClientId = useCallback((clientId) => {
    setGoogleClientId(clientId);
    saveGoogleClientIdService(clientId);
  }, []);

  const persistTerms = useCallback((next) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(() => saveTermsService(next));
  }, []);

  // Safe and pure enfileiramento de salvamento via useEffect (1.3)
  useEffect(() => {
    if (!isDbLoading) {
      if (isLoadedRef.current) {
        persistTerms(terms);
      } else {
        isLoadedRef.current = true;
      }
    }
  }, [terms, isDbLoading, persistTerms]);

  const initializeSampleTerms = useCallback(async () => {
    const initial = createSampleTerms();
    setTerms(initial);
  }, []);

  const saveTermsData = useCallback((updater) => {
    setTerms((prev) => {
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  }, []);

  const saveApiKey = useCallback((key) => {
    setGeminiApiKey(key);
    saveApiKeyService(key);
  }, []);

  // --- API Gemini fetch utility wrapper ---
  const fetchGeminiSummary = useCallback(async (term, context = "") => {
    return await fetchGeminiSummaryService(term, context, geminiApiKey);
  }, [geminiApiKey]);

  // --- Add Term / Quick Dump Processing ---
  const processDumpInput = useCallback(async (rawInput) => {
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

      const slug = slugifyKey(cleanTerm);
      if (!slug || rawTerms.indexOf(termText) !== rawTerms.findIndex(t => {
        const m = t.match(/^([^(:\n]+)(?:\(([^)]+)\)|:([^\n]+))?$/);
        return slugifyKey(m ? m[1].trim() : t) === slug;
      })) continue;

      saveTermsData((prev) => {
        if (prev[slug]) return prev;
        return {
          ...prev,
          [slug]: {
            term: escapeHTML(cleanTerm),
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

      const cleanSlug = slugifyKey(cleanTerm);
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
            term: escapeHTML(glossaryItem.term),
            definition: escapeHTML(glossaryItem.definition),
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
                term: escapeHTML(aiResult.term || cleanTerm),
                definition: escapeHTML(aiResult.definition || "Sem definição disponível."),
                category: aiResult.category || "custom",
                connections: [],
                notes: "",
                x: Math.random() * 400 + 100,
                y: Math.random() * 250 + 80,
                createdAt: Date.now()
              };
              
              if (Array.isArray(aiResult.connections)) {
                aiResult.connections.forEach(connSlug => {
                  const cleanedConn = slugifyKey(connSlug);
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
          // Silent fallback on API error to avoid key leakage
          saveTermsData((prev) => {
            return {
              ...prev,
              [slug]: {
                term: escapeHTML(cleanTerm),
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
              term: escapeHTML(cleanTerm),
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
  }, [geminiApiKey, fetchGeminiSummary, saveTermsData, showToast]);

  // --- Deletion and Term Actions ---
  // Safe and pure deleteTerm action (1.2)
  const deleteTerm = useCallback(async (key) => {
    const targetTerm = terms[key];
    if (!targetTerm) return;
    const termName = targetTerm.term;

    const confirmed = await showCustomConfirm(
      <><i className="fa-solid fa-trash-can" style={{ color: 'var(--accent-pink)' }} /> Excluir Termo</>,
      <>Excluir o termo "{termName}"?</>,
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
  }, [terms, selectedTermKey, setSelectedTermKey, showCustomConfirm, saveTermsData, showToast]);

  const updateTermDefinition = useCallback((key, category, definition) => {
    saveTermsData((prev) => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          category,
          definition: escapeHTML(definition.trim())
        }
      };
    });
  }, [saveTermsData]);

  const updateTermNotes = useCallback((key, notes) => {
    saveTermsData((prev) => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          notes: escapeHTML(notes)
        }
      };
    });
  }, [saveTermsData]);

  const addConnection = useCallback((sourceKey, destKey) => {
    saveTermsData((prev) => {
      if (!prev[sourceKey] || !prev[destKey] || sourceKey === destKey) return prev;
      const connsA = prev[sourceKey].connections || [];
      const connsB = prev[destKey].connections || [];

      return {
        ...prev,
        [sourceKey]: {
          ...prev[sourceKey],
          connections: connsA.includes(destKey) ? connsA : [...connsA, destKey]
        },
        [destKey]: {
          ...prev[destKey],
          connections: connsB.includes(sourceKey) ? connsB : [...connsB, sourceKey]
        }
      };
    });
    showToast("Conexão estabelecida!");
  }, [saveTermsData, showToast]);

  const removeConnection = useCallback((termA, termB) => {
    saveTermsData((prev) => {
      if (!prev[termA] || !prev[termB]) return prev;
      const connsA = prev[termA].connections || [];
      const connsB = prev[termB].connections || [];

      return {
        ...prev,
        [termA]: {
          ...prev[termA],
          connections: connsA.filter(c => c !== termB)
        },
        [termB]: {
          ...prev[termB],
          connections: connsB.filter(c => c !== termA)
        }
      };
    });
    showToast("Conexão removida.");
  }, [saveTermsData, showToast]);

  const value = useMemo(() => ({
    terms,
    setTerms: saveTermsData,
    isDbLoading,
    geminiApiKey,
    setGeminiApiKey: saveApiKey,
    googleClientId,
    setGoogleClientId: saveGoogleClientId,
    filters,
    setFilters,
    fetchGeminiSummary,
    processDumpInput,
    deleteTerm,
    updateTermDefinition,
    updateTermNotes,
    addConnection,
    removeConnection,
    initializeSampleTerms
  }), [
    terms,
    saveTermsData,
    isDbLoading,
    geminiApiKey,
    saveApiKey,
    googleClientId,
    saveGoogleClientId,
    filters,
    fetchGeminiSummary,
    processDumpInput,
    deleteTerm,
    updateTermDefinition,
    updateTermNotes,
    addConnection,
    removeConnection,
    initializeSampleTerms
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
