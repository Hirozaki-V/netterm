import { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function AddConnectionModal() {
  const {
    setAddConnModalOpen,
    selectedTermKey,
    terms,
    addConnection
  } = useContext(AppContext);

  const [eligibleTerms] = useState(() => {
    if (!selectedTermKey || !terms[selectedTermKey]) return [];
    const currentItem = terms[selectedTermKey];
    return Object.keys(terms).filter(
      (key) => key !== selectedTermKey && !currentItem.connections.includes(key)
    );
  });

  const [selectedDestKey, setSelectedDestKey] = useState(() => {
    if (!selectedTermKey || !terms[selectedTermKey]) return '';
    const currentItem = terms[selectedTermKey];
    const eligible = Object.keys(terms).filter(
      (key) => key !== selectedTermKey && !currentItem.connections.includes(key)
    );
    return eligible.length > 0 ? eligible[0] : '';
  });

  if (!selectedTermKey || !terms[selectedTermKey]) {
    return <div className="modal-overlay" id="add-conn-modal" role="dialog" aria-modal="true"></div>;
  }

  const handleSave = () => {
    if (!selectedDestKey) return;
    addConnection(selectedTermKey, selectedDestKey);
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

