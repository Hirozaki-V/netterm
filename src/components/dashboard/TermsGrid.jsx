import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import { getCategoryLabel } from '../../utils/constants';

function TermsGrid({ limit }) {
  const { setSelectedTermKey } = useContext(UIContext);
  const { terms, filters, deleteTerm } = useContext(DataContext);

  // 1. Filter terms based on search criteria and category
  const filteredKeys = Object.keys(terms).filter((key) => {
    const item = terms[key];
    if (!item || typeof item.term !== 'string') return false;

    const searchTerm = (filters.search || '').toLowerCase();
    const matchSearch =
      item.term.toLowerCase().includes(searchTerm) ||
      (item.definition || '').toLowerCase().includes(searchTerm) ||
      (item.notes || '').toLowerCase().includes(searchTerm);

    const matchCategory =
      filters.category === 'all' || item.category === filters.category;

    return matchSearch && matchCategory;
  });

  // 2. Sort keys by date created descending
  filteredKeys.sort((a, b) => (terms[b].createdAt || 0) - (terms[a].createdAt || 0));

  // 3. Apply limit if provided
  const displayedKeys = typeof limit === 'number' ? filteredKeys.slice(0, limit) : filteredKeys;

  if (displayedKeys.length === 0) {
    return (
      <div className="terms-grid-container">
        <div className="empty-state">
          <i className="fa-solid fa-folder-open empty-icon"></i>
          <h4 className="empty-title">Nenhum termo por aqui!</h4>
          <p className="empty-desc">
            Experimente digitar termos na barra superior ou mude o filtro para visualizar outros cartões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="terms-grid-container">
      <div className="terms-grid" id="terms-grid">
        {displayedKeys.map((key) => {
          const item = terms[key];
          const connectionsCount = item.connections ? item.connections.length : 0;
          const catLabel = getCategoryLabel(item.category);

          return (
            <div
              key={key}
              className={`term-card ${item.category || 'custom'}${item.loading ? ' loading' : ''}`}
              data-key={key}
              onClick={() => {
                if (!item.loading) {
                  setSelectedTermKey(key);
                }
              }}
            >
              <div>
                <div className="card-header">
                  <h4 className="card-title">{item.term}</h4>
                  <div className="card-actions">
                    <button
                      className="card-action-btn delete"
                      title="Excluir"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTerm(key);
                      }}
                    >
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
                <p className="card-body">{item.definition}</p>
              </div>
              <div className="card-footer">
                <span className="card-category">{catLabel}</span>
                {connectionsCount > 0 && (
                  <span className="card-connections-count" title={`${connectionsCount} conexões de termos`}>
                    <i className="fa-solid fa-link" aria-hidden="true"></i> {connectionsCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TermsGrid;
