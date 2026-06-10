import { useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { getCategoryLabel, CATEGORY_COLORS } from '../../utils/constants';

function MindMapDetailPanel({ selectedNodeId, onClose, onStudy }) {
  const { terms } = useContext(DataContext);
  
  const item = selectedNodeId ? terms[selectedNodeId] : null;

  if (!item) {
    return <div className="mindmap-detail-panel" id="mm-detail-panel"></div>;
  }

  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS["custom"];
  const catLabel = getCategoryLabel(item.category);

  return (
    <div className="mindmap-detail-panel open" id="mm-detail-panel">
      <div className="mm-detail-header">
        <div className="mm-detail-title-group">
          <h4 id="mm-detail-title">{item.term}</h4>
          <span
            className="detail-category-badge"
            id="mm-detail-category"
            style={{ 
              fontSize: '0.65rem', 
              padding: '0.1rem 0.4rem',
              color: catStyle.color,
              background: catStyle.bg,
              border: `1px solid ${catStyle.color}`
            }}
          >
            {catLabel}
          </span>
        </div>
        <button
          className="icon-btn close-mm-detail"
          id="close-mm-detail-btn"
          title="Fechar"
          style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div className="mm-detail-body">
        <div className="detail-section">
          <span className="section-label">Significado</span>
          <p id="mm-detail-definition">{item.definition}</p>
        </div>
        <div className="detail-section">
          <span className="section-label">Minhas Anotações</span>
          <p id="mm-detail-notes" style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            {item.notes ? item.notes : "Nenhuma anotação registrada neste termo."}
          </p>
        </div>
      </div>
      <div className="mm-detail-footer">
        <button
          className="btn-primary"
          id="mm-detail-study-btn"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
          onClick={onStudy}
        >
          <i className="fa-solid fa-clone" aria-hidden="true"></i> Ir para Flashcards
        </button>
      </div>
    </div>
  );
}

export default MindMapDetailPanel;

