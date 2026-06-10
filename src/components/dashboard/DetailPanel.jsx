import { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { CATEGORY_COLORS, getCategoryLabel } from '../../utils/constants';

function DetailPanel() {
  const {
    terms,
    setTerms,
    selectedTermKey,
    setSelectedTermKey,
    updateTermNotes,
    deleteTerm,
    removeConnection,
    setEditDefModalOpen,
    setAddConnModalOpen,
    geminiApiKey,
    showCustomPrompt,
    fetchGeminiSummary,
    showToast
  } = useContext(AppContext);

  const item = selectedTermKey ? terms[selectedTermKey] : null;
  const [localNotes, setLocalNotes] = useState(item ? (item.notes || '') : '');

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
          setSelectedTermKey(null);
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

  const handleSaveNotes = () => {
    updateTermNotes(selectedTermKey, localNotes);
    showToast("Notas da aula salvas!");
  };

  const closeDetailPanel = () => {
    if (window.innerWidth <= 1024 && history.state?.detailOpen) {
      history.back();
    } else {
      setSelectedTermKey(null);
    }
  };

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
          onClick={closeDetailPanel}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div className="detail-body">
        <div className="detail-section">
          <span className="section-label">Significado / Resumo</span>
          <p className="detail-definition" id="detail-definition">{item.definition}</p>
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
            onChange={(e) => setLocalNotes(e.target.value)}
          ></textarea>
        </div>

        <div className="detail-section">
          <span className="section-label">Termos Relacionados</span>
          <div className="detail-connections-list" id="detail-connections-list">
            {item.connections && item.connections.map((connKey) => {
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
                      removeConnection(selectedTermKey, connKey);
                    }}
                  ></i>
                </div>
              );
            })}
            <div 
              className="connection-pill add-connection-btn"
              onClick={() => {
                const currentItem = terms[selectedTermKey];
                const currentConnections = currentItem.connections || [];
                const eligible = Object.keys(terms).filter(
                  (key) => key !== selectedTermKey && !currentConnections.includes(key)
                );
                if (eligible.length > 0) {
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
  );
}

export default DetailPanel;
