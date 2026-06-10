import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function ConfirmModal() {
  const { customModal, handleModalConfirm, handleModalCancel } = useContext(AppContext);

  const isOpen = customModal && customModal.type === 'confirm';

  if (!isOpen) {
    return <div className="modal-overlay" id="confirm-modal" role="dialog" aria-modal="true"></div>;
  }

  return (
    <div className="modal-overlay open" id="confirm-modal" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" id="confirm-modal-title" dangerouslySetInnerHTML={{ __html: customModal.title }}>
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-confirm-modal-btn"
            onClick={handleModalCancel}
          ></i>
        </div>
        <div className="modal-body">
          <p id="confirm-modal-message" style={{ lineHeight: 1.5, color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: customModal.message }}>
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" id="confirm-cancel-btn" onClick={handleModalCancel}>Cancelar</button>
          <button 
            className={`btn-primary${customModal.isDanger ? ' btn-danger' : ''}`} 
            id="confirm-confirm-btn"
            onClick={() => handleModalConfirm(true)}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

