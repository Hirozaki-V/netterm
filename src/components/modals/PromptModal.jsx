import { useState, useEffect, useRef, useContext } from 'react';
import { UIContext } from '../../context/UIContext';

function PromptModal() {
  const { customModal, handleModalConfirm, handleModalCancel } = useContext(UIContext);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Focus input when modal mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    handleModalConfirm(inputValue.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleModalCancel();
    }
  };

  return (
    <div className="modal-overlay open z-[70]" id="prompt-modal" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" id="prompt-modal-title">
            {customModal.title}
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-prompt-modal-btn"
            onClick={handleModalCancel}
          ></i>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label 
              className="form-label" 
              htmlFor="prompt-modal-input" 
              id="prompt-modal-label"
            >
              {customModal.label}
            </label>
            <input 
              type="text" 
              className="form-input" 
              id="prompt-modal-input" 
              placeholder={customModal.placeholder || '...'} 
              value={inputValue}
              ref={inputRef}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" id="prompt-cancel-btn" onClick={handleModalCancel}>Cancelar</button>
          <button className="btn-primary" id="prompt-confirm-btn" onClick={handleConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export default PromptModal;
