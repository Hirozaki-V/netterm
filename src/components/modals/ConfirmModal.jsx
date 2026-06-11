import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';

function ConfirmModal() {
  const { customModal, handleModalConfirm, handleModalCancel } = useContext(UIContext);

  const isOpen = customModal && customModal.type === 'confirm';

  if (!isOpen) {
    return <div className="modal-overlay z-[100]" id="confirm-modal" role="dialog" aria-modal="true"></div>;
  }

  return (
    <div className="modal-overlay open z-[100]" id="confirm-modal" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" id="confirm-modal-title">
            {customModal.title}
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-confirm-modal-btn"
            onClick={handleModalCancel}
          ></i>
        </div>
        <div className="modal-body">
          <p id="confirm-modal-message" style={{ lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {customModal.message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" id="confirm-cancel-btn" onClick={handleModalCancel}>
            {customModal.cancelText || "Cancelar"}
          </button>
          {customModal.thirdButtonText && (
            <button 
              className="btn-secondary" 
              id="confirm-third-btn" 
              style={{ marginRight: 'auto' }}
              onClick={() => handleModalConfirm('discard')}
            >
              {customModal.thirdButtonText}
            </button>
          )}
          <button 
            className={`btn-primary${customModal.isDanger ? ' btn-danger' : ''}`} 
            id="confirm-confirm-btn"
            onClick={() => handleModalConfirm(true)}
          >
            {customModal.confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
