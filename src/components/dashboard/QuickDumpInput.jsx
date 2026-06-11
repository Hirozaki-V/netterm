import { useState, useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';

function QuickDumpInput() {
  const { showToast, setIsTyping } = useContext(UIContext);
  const { processDumpInput } = useContext(DataContext);
  const [inputValue, setInputValue] = useState('');
  const input = inputValue;
  const setInput = setInputValue;

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      showToast("Por favor, insira pelo menos um termo válido.", true);
      return;
    }
    processDumpInput(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="quick-dump-container">
      {/* Layout Desktop: Textarea + Botão lateral/abaixo */}
      <div className="dump-box desktop-only-dump">
        <div className="dump-input-wrapper">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setTimeout(() => setIsTyping(false), 250)}
            placeholder="Digite um termo, conceito ou anotação rápida..."
            style={{ minHeight: '120px', padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', width: '100%' }}
            className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] focus:border-[var(--accent-cyan)] outline-none resize-none transition-colors"
          />
          <button className="btn-primary" id="add-term-btn" onClick={handleSubmit}>
            <i className="fa-solid fa-bolt" aria-hidden="true"></i> Processar
          </button>
        </div>
        <div className="dump-tip">
          <span>Dica: Use <code>Enter</code> para processar e <code>Shift + Enter</code> para pular linha.</span>
        </div>
      </div>

      {/* Layout Mobile: Chat input pill (Minimalista e Rápido) */}
      <div className="mobile-only-dump">
        <div className="chat-input-pill">
          <i className="fa-solid fa-bolt chat-input-icon" aria-hidden="true"></i>
          <input
            type="text"
            id="dump-input-mobile"
            placeholder="Adicionar termos (separados por vírgula)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setTimeout(() => setIsTyping(false), 250)}
          />
          <button className="send-btn" onClick={handleSubmit} aria-label="Processar termos">
            <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
          </button>
        </div>
        <div className="dump-tip-mobile">
          <i className="fa-solid fa-info-circle" aria-hidden="true"></i> Separe por vírgula para cadastrar vários termos de uma vez
        </div>
      </div>
    </div>
  );
}

export default QuickDumpInput;
