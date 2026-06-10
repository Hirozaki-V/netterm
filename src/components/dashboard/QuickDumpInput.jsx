import { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function QuickDumpInput() {
  const { processDumpInput, showToast } = useContext(AppContext);
  const [inputValue, setInputValue] = useState('');

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
      <div className="dump-box">
        <div className="dump-input-wrapper">
          <textarea
            className="dump-textarea"
            id="dump-textarea"
            placeholder="Insira termos aqui... (Ex: Fotossíntese, Democracia, Algoritmo, Metáfora) - Pressione Enter para adicionar!"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
          <button className="btn-primary" id="add-term-btn" onClick={handleSubmit}>
            <i className="fa-solid fa-bolt" aria-hidden="true"></i> Processar
          </button>
        </div>
        <div className="dump-tip">
          <span><i className="fa-solid fa-lightbulb" aria-hidden="true"></i> Você pode jogar vários termos separados por vírgula.</span>
          <span>Pressione <code>Shift + Enter</code> para nova linha.</span>
        </div>
      </div>
    </div>
  );
}

export default QuickDumpInput;

