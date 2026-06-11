import { useState, useContext, useEffect, useRef } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import { getCategoryLabel } from '../../utils/constants';
import { escapeHTML } from '../../utils/security';

function Flashcards() {
  const { showToast } = useContext(UIContext);
  const { terms } = useContext(DataContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const flipTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
      }
    };
  }, []);

  const cardKeys = Object.keys(terms);
  const count = cardKeys.length;

  const changeCardIndex = (offset) => {
    if (count === 0) return;
    const currentSafe = currentIndex >= count ? Math.max(0, count - 1) : currentIndex;
    if (isFlipped) {
      setIsFlipped(false);
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
      }
      flipTimeoutRef.current = setTimeout(() => {
        setCurrentIndex((currentSafe + offset + count) % count);
        flipTimeoutRef.current = null;
      }, 200);
    } else {
      setCurrentIndex((currentSafe + offset + count) % count);
    }
  };

  const handleCorrect = (e) => {
    e.stopPropagation();
    showToast("Muito bem! Cartão memorizado.");
    changeCardIndex(1);
  };

  const handleWrong = (e) => {
    e.stopPropagation();
    showToast("Vamos reforçar esse depois.");
    changeCardIndex(1);
  };

  if (count === 0) {
    return (
      <section className="tab-content active" id="tab-flashcards">
        <div className="flashcards-wrapper">
          <div className="flashcard-counter" id="fc-counter" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            Nenhum termo cadastrado.
          </div>
          <p className="empty-desc" style={{ textAlign: 'center' }}>
            Adicione palavras no seu Dashboard para poder gerar Flashcards de estudo!
          </p>
        </div>
      </section>
    );
  }

  const safeIndex = currentIndex >= count ? Math.max(0, count - 1) : currentIndex;
  const currentKey = cardKeys[safeIndex];
  const item = terms[currentKey] || { term: '', definition: '', category: 'custom' };
  const catLabel = getCategoryLabel(item.category);

  return (
    <section className="tab-content active" id="tab-flashcards">
      <div className="flashcards-wrapper">
        <div 
          className="flashcard-stage" 
          id="flashcard-stage"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`flashcard${isFlipped ? ' flipped' : ''}`} id="flashcard-element">
            {/* Front Side */}
            <div className="card-face front">
              <span className="flashcard-category" id="flashcard-front-category">{catLabel}</span>
              <h2 className="flashcard-term" id="flashcard-front-term">{item.term}</h2>
              <span className="flashcard-hint">
                <i className="fa-solid fa-rotate" aria-hidden="true"></i> Clique para revelar a definição
              </span>
            </div>
            {/* Back Side */}
            <div className="card-face back">
              <span className="flashcard-category" id="flashcard-back-category">Significado - {catLabel}</span>
              <div className="flashcard-definition" id="flashcard-back-definition">
                <p>{item.definition}</p>
                {item.notes && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                    fontSize: '0.85rem',
                    color: 'var(--accent-cyan)',
                    textAlign: 'left'
                  }}>
                    <i className="fa-solid fa-pen" aria-hidden="true"></i> <strong>Anotações:</strong> {item.notes}
                  </div>
                )}
              </div>
              <span className="flashcard-hint">
                <i className="fa-solid fa-rotate" aria-hidden="true"></i> Clique para ver o termo
              </span>
            </div>
          </div>
        </div>

        <div className="flashcard-controls">
          <button className="flashcard-btn wrong" id="fc-btn-wrong" onClick={handleWrong}>
            <i className="fa-solid fa-xmark" aria-hidden="true"></i> Ainda Não Sei
          </button>

          <div className="flashcard-navigation">
            <button className="icon-btn" id="fc-prev-btn" onClick={() => changeCardIndex(-1)}>
              <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <span className="flashcard-counter" id="fc-counter">{safeIndex + 1} / {count}</span>
            <button className="icon-btn" id="fc-next-btn" onClick={() => changeCardIndex(1)}>
              <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>

          <button className="flashcard-btn correct" id="fc-btn-correct" onClick={handleCorrect}>
            <i className="fa-solid fa-check" aria-hidden="true"></i> Já Aprendi!
          </button>
        </div>
      </div>
    </section>
  );
}

export default Flashcards;

