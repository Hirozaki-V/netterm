import { useState, useEffect, useContext, useRef } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import { CATEGORY_COLORS, getCategoryLabel } from '../../utils/constants';

function DetailPanel() {
  const {
    selectedTermKey,
    setSelectedTermKey,
    setEditDefModalOpen,
    setAddConnModalOpen,
    showCustomPrompt,
    showToast,
    showCustomConfirm,
    setActiveConnections,
    setAddConnectionCallback
  } = useContext(UIContext);

  const {
    terms,
    setTerms,
    updateTermNotes,
    deleteTerm,
    geminiApiKey,
    fetchGeminiSummary
  } = useContext(DataContext);

  const item = selectedTermKey ? terms[selectedTermKey] : null;
  const [localDefinition, setLocalDefinition] = useState(item ? (item.definition || '') : '');
  const [localNotes, setLocalNotes] = useState(item ? (item.notes || '') : '');
  const [localConnections, setLocalConnections] = useState(item ? (item.connections || []) : []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (item) {
      setLocalDefinition(item.definition || '');
      setLocalNotes(item.notes || '');
      setLocalConnections(item.connections || []);
      setHasUnsavedChanges(false);
    }
  }, [item?.definition, item?.notes, JSON.stringify(item?.connections)]);

  useEffect(() => {
    setActiveConnections(localConnections);
    return () => {
      setActiveConnections(null);
      setAddConnectionCallback(null);
    };
  }, [localConnections, setActiveConnections, setAddConnectionCallback]);

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const selectedRef = useRef(selectedTermKey);
  useEffect(() => {
    selectedRef.current = selectedTermKey;
  }, [selectedTermKey]);

  // Support mobile back gesture handling if open
  useEffect(() => {
    if (selectedTermKey && window.innerWidth <= 1024) {
      if (!history.state?.detailOpen) {
        history.pushState({ detailOpen: true }, "");
      }
      
      const handlePopState = (e) => {
        if (!e.state || !e.state.detailOpen) {
          if (hasUnsavedChangesRef.current) {
            history.pushState({ detailOpen: true }, "");
            handleClosePanel();
          } else {
            setSelectedTermKey(null);
          }
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        setTimeout(() => {
          if (!selectedRef.current && history.state?.detailOpen) {
            history.back();
          }
        }, 50);
      };
    }
  }, [selectedTermKey, setSelectedTermKey]);

  if (!item) {
    return <div className="detail-panel" id="detail-panel"></div>;
  }

  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS["custom"];
  const catLabel = getCategoryLabel(item.category);

  const saveAllChanges = (nextDefinition, nextConnections) => {
    const trimmedDef = nextDefinition.trim();
    setTerms((prev) => {
      if (!prev[selectedTermKey]) return prev;
      const next = { ...prev };
      const oldConnections = prev[selectedTermKey].connections || [];
      
      oldConnections.forEach(connKey => {
        if (!nextConnections.includes(connKey) && next[connKey]) {
          next[connKey] = {
            ...next[connKey],
            connections: (next[connKey].connections || []).filter(c => c !== selectedTermKey)
          };
        }
      });
      
      nextConnections.forEach(connKey => {
        if (!oldConnections.includes(connKey) && next[connKey]) {
          const conns = next[connKey].connections || [];
          if (!conns.includes(selectedTermKey)) {
            next[connKey] = {
              ...next[connKey],
              connections: [...conns, selectedTermKey]
            };
          }
        }
      });
      
      next[selectedTermKey] = {
        ...next[selectedTermKey],
        definition: trimmedDef,
        connections: nextConnections
      };
      return next;
    });
    showToast("Alterações salvas com sucesso!");
    setHasUnsavedChanges(false);
  };

  const handleSaveNotes = () => {
    updateTermNotes(selectedTermKey, localNotes);
    saveAllChanges(localDefinition, localConnections);
  };

  const closeDetailPanel = () => {
    if (window.innerWidth <= 1024 && history.state?.detailOpen) {
      history.back();
    } else {
      setSelectedTermKey(null);
    }
  };

  async function handleClosePanel() {
    if (hasUnsavedChangesRef.current) {
      const result = await showCustomConfirm(
        "Alterações não salvas",
        "Você tem alterações não salvas. Deseja salvar antes de sair?",
        {
          confirmText: "Salvar",
          thirdButtonText: "Sair sem salvar",
          cancelText: "Cancelar"
        }
      );

      if (result === true) {
        updateTermNotes(selectedTermKey, localNotes);
        saveAllChanges(localDefinition, localConnections);
        closeDetailPanel();
      } else if (result === 'discard') {
        setHasUnsavedChanges(false);
        closeDetailPanel();
      }
    } else {
      closeDetailPanel();
    }
  }

  const handleRegenerateAi = async () => {
    if (!geminiApiKey || !geminiApiKey.trim()) {
      showToast("Por favor, configure uma chave da API do Gemini nas configurações.", true);
      return;
    }
    const contextPrompt = await showCustomPrompt(
      "Dica para a IA",
      <>Deseja fornecer algum contexto ou dica para guiar o Gemini sobre <strong>"{item.term}"</strong>?</>,
      "Deixe em branco para busca geral..."
    );
    if (contextPrompt === null) return; // User cancelled

    showToast(`Consultando Gemini para "${item.term}"...`);
    
    // Set temp loading state
    setTerms((prev) => {
      if (!prev[selectedTermKey]) return prev;
      return {
        ...prev,
        [selectedTermKey]: {
          ...prev[selectedTermKey],
          definition: "Consultando inteligência artificial do Gemini... Aguarde."
        }
      };
    });

    try {
      const aiResult = await fetchGeminiSummary(item.term, contextPrompt);
      if (aiResult) {
        setTerms((prev) => {
          if (!prev[selectedTermKey]) return prev;
          const next = { ...prev };
          const originalConnections = next[selectedTermKey].connections || [];
          next[selectedTermKey] = {
            ...next[selectedTermKey],
            term: aiResult.term || item.term,
            definition: aiResult.definition || "Sem definição disponível.",
            category: aiResult.category || item.category,
            connections: [...originalConnections]
          };
          
          // Merge suggested connections bidirectionally
          if (Array.isArray(aiResult.connections)) {
            aiResult.connections.forEach(connSlug => {
              const cleanedConn = connSlug.toLowerCase().trim();
              if (next[cleanedConn] && cleanedConn !== selectedTermKey) {
                const connsA = next[selectedTermKey].connections || [];
                const connsB = next[cleanedConn].connections || [];

                if (!connsA.includes(cleanedConn)) {
                  next[selectedTermKey].connections = [...connsA, cleanedConn];
                }
                if (!connsB.includes(selectedTermKey)) {
                  next[cleanedConn] = {
                    ...next[cleanedConn],
                    connections: [...connsB, selectedTermKey]
                  };
                }
              }
            });
          }
          return next;
        });
        showToast("Termo atualizado com sucesso!");
      } else {
        throw new Error("Resposta da IA vazia ou inválida.");
      }
    } catch (err) {
      console.error(err);
      setTerms((prev) => {
        if (!prev[selectedTermKey]) return prev;
        return {
          ...prev,
          [selectedTermKey]: {
            ...prev[selectedTermKey],
            definition: `Erro ao consultar API do Gemini.\n\nDetalhes: ${err.message}\n\nVerifique se a chave de API nas configurações está correta.`
          }
        };
      });
      showToast("Erro ao consultar o Gemini.", true);
    }
  };

  return (
    <>
      <div 
        className="detail-backdrop" 
        id="detail-backdrop"
        onClick={handleClosePanel}
      ></div>
      <div className={`detail-panel open`} id="detail-panel">
      <div className="detail-header">
        <div className="detail-title-wrapper">
          <h3 className="detail-title" id="detail-title">{item.term}</h3>
          <span 
            className="detail-category-badge" 
            id="detail-category"
            style={{
              color: catStyle.color,
              background: catStyle.bg,
              border: `1px solid ${catStyle.color}`
            }}
          >
            {catLabel}
          </span>
        </div>
        <button 
          className="icon-btn" 
          id="close-detail-btn" 
          title="Fechar painel"
          onClick={handleClosePanel}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <span className="section-label">Significado / Resumo</span>
          <textarea
            className="w-full bg-transparent border border-transparent hover:border-slate-700/50 focus:border-[var(--accent-cyan)] focus:bg-[rgba(255,255,255,0.01)] rounded-md p-2 transition-all resize-none outline-none text-[0.95rem] text-[var(--text-secondary)] leading-relaxed cursor-text"
            id="detail-definition"
            value={localDefinition}
            onChange={(e) => {
              setLocalDefinition(e.target.value);
              setHasUnsavedChanges(true);
            }}
            rows={4}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button 
              className="filter-tab" 
              id="edit-definition-btn" 
              style={{ borderRadius: '6px', padding: '0.3rem 0.6rem' }}
              onClick={() => setEditDefModalOpen(true)}
            >
              <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar Significado
            </button>
            <button
              className="filter-tab"
              id="regenerate-ai-btn"
              style={{ borderRadius: '6px', padding: '0.3rem 0.6rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
              onClick={handleRegenerateAi}
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Consultar IA do Gemini
            </button>
          </div>
        </div>

        <div className="detail-section">
          <span className="section-label">Anotações da Aula</span>
          <textarea
            className="notes-textarea"
            id="detail-notes-input"
            placeholder="Escreva anotações importantes ditas pelo professor ou exemplos práticos discutidos em sala de aula..."
            value={localNotes}
            onChange={(e) => {
              setLocalNotes(e.target.value);
              setHasUnsavedChanges(true);
            }}
          ></textarea>
        </div>

        <div className="detail-section">
          <span className="section-label">Termos Relacionados</span>
          <div className="detail-connections-list" id="detail-connections-list">
            {localConnections && localConnections.map((connKey) => {
              const connItem = terms[connKey];
              if (!connItem) return null;
              return (
                <div 
                  key={connKey} 
                  className="connection-pill"
                  onClick={() => setSelectedTermKey(connKey)}
                >
                  <span>{connItem.term}</span>
                  <i 
                    className="fa-solid fa-xmark connection-delete" 
                    title="Romper conexão"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalConnections(prev => prev.filter(c => c !== connKey));
                      setHasUnsavedChanges(true);
                    }}
                  ></i>
                </div>
              );
            })}
            <div 
              className="connection-pill add-connection-btn"
              onClick={() => {
                const eligible = Object.keys(terms).filter(
                  (key) => key !== selectedTermKey && !localConnections.includes(key)
                );
                if (eligible.length > 0) {
                  setAddConnectionCallback(() => (destKey) => {
                    setLocalConnections(prev => {
                      if (!prev.includes(destKey)) {
                        return [...prev, destKey];
                      }
                      return prev;
                    });
                    setHasUnsavedChanges(true);
                  });
                  setAddConnModalOpen(true);
                } else {
                  showToast("Não há outros termos disponíveis para conectar.", true);
                }
              }}
            >
              <i className="fa-solid fa-plus" aria-hidden="true"></i> Conectar...
            </div>
          </div>
        </div>
      </div>

      <div className="detail-actions" style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(12, 14, 24, 0.4)' }}>
        <button 
          className="btn-secondary btn-danger" 
          id="delete-term-btn"
          onClick={() => deleteTerm(selectedTermKey)}
        >
          <i className="fa-solid fa-trash-can" aria-hidden="true"></i> Excluir Termo
        </button>
        <button 
          className="btn-primary" 
          id="save-notes-btn" 
          style={{ flex: 1.5 }}
          onClick={handleSaveNotes}
        >
          <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar Alterações
        </button>
      </div>
    </div>
    </>
  );
}

export default DetailPanel;
