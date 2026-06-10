import { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function EditDefinitionModal() {
  const {
    setEditDefModalOpen,
    selectedTermKey,
    terms,
    updateTermDefinition,
    showToast
  } = useContext(AppContext);

  const item = selectedTermKey ? terms[selectedTermKey] : null;

  const [localCategory, setLocalCategory] = useState(item ? (item.category || 'custom') : 'custom');
  const [localDefinition, setLocalDefinition] = useState(item ? (item.definition || '') : '');

  if (!item) {
    return <div className="modal-overlay" id="edit-def-modal" role="dialog" aria-modal="true"></div>;
  }

  const handleSave = () => {
    updateTermDefinition(selectedTermKey, localCategory, localDefinition);
    setEditDefModalOpen(false);
    showToast("Termo atualizado com sucesso!");
  };

  return (
    <div className="modal-overlay open" id="edit-def-modal" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar Significado
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-edit-def-btn"
            onClick={() => setEditDefModalOpen(false)}
          ></i>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label" htmlFor="edit-def-term">Nome do Termo</label>
            <input
              type="text"
              className="form-input"
              id="edit-def-term"
              readOnly
              value={item.term}
              style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-def-category">Categoria</label>
            <select 
              className="form-select" 
              id="edit-def-category"
              value={localCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
            >
              <option value="ciencias">Ciências</option>
              <option value="humanas">Humanas</option>
              <option value="exatas">Exatas</option>
              <option value="linguagens">Linguagens</option>
              <option value="tecnologia">Tecnologia</option>
              <option value="custom">Personalizados</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-def-textarea">Descrição / Definição</label>
            <textarea 
              className="notes-textarea" 
              id="edit-def-textarea" 
              style={{ minHeight: '100px' }}
              value={localDefinition}
              onChange={(e) => setLocalDefinition(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" id="cancel-edit-def-btn" onClick={() => setEditDefModalOpen(false)}>Cancelar</button>
          <button className="btn-primary" id="save-edit-def-btn" onClick={handleSave}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export default EditDefinitionModal;

