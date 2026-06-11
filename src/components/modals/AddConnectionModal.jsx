import { useState, useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';

function AddConnectionModal() {
  const {
    setAddConnModalOpen,
    selectedTermKey,
    addConnectionCallback,
    setAddConnectionCallback,
    activeConnections
  } = useContext(UIContext);

  const {
    terms,
    addConnection
  } = useContext(DataContext);

  const [eligibleTerms] = useState(() => {
    if (!selectedTermKey || !terms[selectedTermKey]) return [];
    const currentItem = terms[selectedTermKey];
    const currentConnections = activeConnections || currentItem.connections || [];
    return Object.keys(terms).filter(
      (key) => key !== selectedTermKey && !currentConnections.includes(key)
    );
  });

  const [selectedDestKey, setSelectedDestKey] = useState(() => {
    if (!selectedTermKey || !terms[selectedTermKey]) return '';
    const currentItem = terms[selectedTermKey];
    const currentConnections = activeConnections || currentItem.connections || [];
    const eligible = Object.keys(terms).filter(
      (key) => key !== selectedTermKey && !currentConnections.includes(key)
    );
    return eligible.length > 0 ? eligible[0] : '';
  });

  if (!selectedTermKey || !terms[selectedTermKey]) {
    return <div className="modal-overlay" id="add-conn-modal" role="dialog" aria-modal="true"></div>;
  }

  const handleSave = () => {
    if (!selectedDestKey) return;
    if (addConnectionCallback) {
      addConnectionCallback(selectedDestKey);
      setAddConnectionCallback(null);
    } else {
      addConnection(selectedTermKey, selectedDestKey);
    }
    setAddConnModalOpen(false);
  };

  return (
    <div className="modal-overlay open" id="add-conn-modal" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-link" aria-hidden="true"></i> Conectar Termo
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-conn-btn"
            onClick={() => setAddConnModalOpen(false)}
          ></i>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label" htmlFor="conn-select">Selecione o termo para criar conexão:</label>
            <select 
              className="form-select" 
              id="conn-select"
              value={selectedDestKey}
              onChange={(e) => setSelectedDestKey(e.target.value)}
            >
              {eligibleTerms.map(key => (
                <option key={key} value={key}>
                  {terms[key].term}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" id="cancel-conn-btn" onClick={() => setAddConnModalOpen(false)}>Cancelar</button>
          <button className="btn-primary" id="save-conn-btn" onClick={handleSave}>Adicionar Conexão</button>
        </div>
      </div>
    </div>
  );
}

export default AddConnectionModal;
