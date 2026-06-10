import { useState, useContext, useMemo } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import { getCategoryLabel } from '../../utils/constants';
import ReactMarkdown from 'react-markdown';

function Quiz() {
  const { showToast } = useContext(UIContext);
  const { terms } = useContext(DataContext);

  const termKeys = Object.keys(terms);
  const isQuizAvailable = termKeys.length >= 4;

  // --- Quiz Config State ---
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'results'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswered, setUserAnswered] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  
  // Track user answers for the final review breakdown
  const [quizHistory, setQuizHistory] = useState([]);

  // Extract categories dynamically from current terms, deduplicating by mapped label
  const activeCategories = useMemo(() => {
    const labelToKey = {};
    Object.values(terms).forEach(t => {
      const catKey = t.category || 'custom';
      const label = getCategoryLabel(catKey);
      if (!labelToKey[label]) {
        labelToKey[label] = catKey;
      }
    });
    return ['all', ...Object.values(labelToKey)];
  }, [terms]);

  // --- Generate Quiz Engine ---
  const handleStartQuiz = (category, count) => {
    let targets = termKeys;
    if (category !== 'all') {
      targets = termKeys.filter(k => terms[k].category === category);
    }

    if (targets.length === 0) {
      showToast("Não há termos cadastrados nesta categoria.", true);
      return;
    }

    const shuffledTargets = [...targets].sort(() => Math.random() - 0.5);
    const finalCount = Math.min(shuffledTargets.length, count);
    const questionList = [];

    for (let i = 0; i < finalCount; i++) {
      const correctKey = shuffledTargets[i];
      const correctItem = terms[correctKey];
      
      // Question Type: 0 = Given Definition find Term, 1 = Given Term find Definition
      const qType = Math.random() > 0.5 ? 0 : 1;
      
      // Pick 3 distractors from ALL keys in the database to guarantee we always have 4 options
      const distractors = termKeys
        .filter((k) => k !== correctKey)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [];
      
      // Add correct option
      options.push({
        key: correctKey,
        text: qType === 0 ? correctItem.term : correctItem.definition,
        isCorrect: true
      });
      
      // Add distractors
      distractors.forEach((dk) => {
        options.push({
          key: dk,
          text: qType === 0 ? terms[dk].term : terms[dk].definition,
          isCorrect: false
        });
      });

      // Shuffle options
      options.sort(() => Math.random() - 0.5);

      questionList.push({
        type: qType,
        targetKey: correctKey,
        termName: correctItem.term,
        definitionText: correctItem.definition,
        notesText: correctItem.notes,
        questionText: qType === 0 
          ? `Qual é o termo correspondente à seguinte definição?\n\n*"${correctItem.definition}"*` 
          : `Qual é o significado correto do termo: **${correctItem.term}**?`,
        options: options
      });
    }

    setQuestions(questionList);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswered(false);
    setSelectedOptionIdx(null);
    setQuizHistory([]);
    setGameState('playing');
  };

  const handleOptionClick = (idx, option) => {
    if (userAnswered) return;
    setUserAnswered(true);
    setSelectedOptionIdx(idx);

    const currentQuestion = questions[currentIndex];
    const isCorrect = option.isCorrect;

    // Save history
    setQuizHistory((prev) => [
      ...prev,
      {
        questionText: currentQuestion.questionText,
        termName: currentQuestion.termName,
        correctText: currentQuestion.type === 0 ? currentQuestion.termName : currentQuestion.definitionText,
        definitionText: currentQuestion.definitionText,
        notesText: currentQuestion.notesText,
        selectedText: option.text,
        isCorrect,
        qType: currentQuestion.type
      }
    ]);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      showToast("Resposta correta! 🎉");
    } else {
      showToast("Hum, não foi dessa vez. Verifique a correta!", true);
    }
  };

  const handleNext = () => {
    if (currentIndex === questions.length - 1) {
      setGameState('results');
    } else {
      setUserAnswered(false);
      setSelectedOptionIdx(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setGameState('setup');
  };

  if (!isQuizAvailable) {
    return (
      <section className="tab-content active" id="tab-quiz">
        <div className="quiz-wrapper">
          <div className="quiz-card" id="quiz-card">
            <div className="empty-state" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <i className="fa-solid fa-circle-exclamation empty-icon" style={{ color: 'var(--accent-pink)', fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
              <h4 className="empty-title" style={{ fontSize: '1.25rem', fontWeight: '600' }}>Termos Insuficientes</h4>
              <p className="empty-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5', maxWidth: '380px', margin: '0.5rem auto 0 auto' }}>
                Você precisa de pelo menos <strong>4 termos cadastrados</strong> para gerar perguntas de múltipla escolha.
                Atualmente você possui apenas {termKeys.length}. Adicione mais termos no Dashboard!
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Generate rating content based on percentage score
  const getRating = () => {
    const pct = (score / questions.length) * 100;
    if (pct === 100) return { icon: "fa-trophy", color: "var(--accent-cyan)", title: "Excelente! Domínio Absoluto 🏆", desc: "Você domina 100% destes conceitos! Seu progresso acadêmico está fantástico." };
    if (pct >= 75) return { icon: "fa-star", color: "var(--accent-purple)", title: "Muito bom! Continue assim 🌟", desc: "Você demonstrou excelente entendimento! Só faltou um detalhe para o topo." };
    if (pct >= 50) return { icon: "fa-book-open", color: "var(--accent-orange)", title: "Bom progresso! Precisa de revisão 📖", desc: "Você acertou a maioria, mas alguns termos ainda geram dúvida. Vale revisar as notas." };
    return { icon: "fa-solid fa-dumbbell", color: "var(--accent-pink)", title: "Não desanime! Vamos praticar 💪", desc: "Use a seção de flashcards e revise suas anotações para reforçar a fixação." };
  };

  return (
    <section className="tab-content active" id="tab-quiz">
      <div className="quiz-wrapper">
        <div className="quiz-card" id="quiz-card">
          
          {/* ─── SCREEN 1: SETUP ─── */}
          {gameState === 'setup' && (
            <div className="quiz-setup-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <i className="fa-solid fa-graduation-cap" style={{ fontSize: '3rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'block' }}></i>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>Treino de Memorização</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Escolha suas preferências para iniciar o quiz de fixação.</p>
              </div>

              {/* Category selector */}
              <div className="form-group">
                <label className="form-label">Filtrar por Categoria</label>
                <div className="quiz-cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {activeCategories.map(cat => {
                    const count = cat === 'all' 
                      ? termKeys.length 
                      : termKeys.filter(k => terms[k].category === cat).length;
                    const isSelectable = count > 0;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`filter-tab${selectedCategory === cat ? ' active' : ''}`}
                        onClick={() => isSelectable && setSelectedCategory(cat)}
                        style={{ 
                          padding: '0.5rem', 
                          borderRadius: '8px', 
                          fontSize: '0.8rem', 
                          justifyContent: 'center', 
                          opacity: isSelectable ? 1 : 0.4,
                          cursor: isSelectable ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {cat === 'all' ? 'Todos' : getCategoryLabel(cat)} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of questions selector */}
              <div className="form-group">
                <label className="form-label">Quantidade de Perguntas</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[5, 10, 15, 20].map(num => {
                    // Maximum questions is total matching terms
                    const maxAvailable = selectedCategory === 'all'
                      ? termKeys.length
                      : termKeys.filter(k => terms[k].category === selectedCategory).length;
                    
                    const isSelectable = maxAvailable >= 1; // can play with fewer targets, clamp below
                    const isActive = questionCount === num;
                    
                    return (
                      <button
                        key={num}
                        type="button"
                        className={`filter-tab${isActive ? ' active' : ''}`}
                        onClick={() => isSelectable && setQuestionCount(num)}
                        style={{ 
                          flex: 1, 
                          padding: '0.6rem', 
                          borderRadius: '8px', 
                          justifyContent: 'center',
                          opacity: isSelectable ? 1 : 0.4
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', minHeight: '48px', justifyContent: 'center', marginTop: '0.5rem' }}
                onClick={() => {
                  const maxAvailable = selectedCategory === 'all'
                    ? termKeys.length
                    : termKeys.filter(k => terms[k].category === selectedCategory).length;
                  const finalCount = Math.min(questionCount, maxAvailable);
                  handleStartQuiz(selectedCategory, finalCount);
                }}
              >
                <i className="fa-solid fa-play" style={{ marginRight: '0.5rem' }}></i> Iniciar Estudo
              </button>
            </div>
          )}

          {/* ─── SCREEN 2: PLAYING ─── */}
          {gameState === 'playing' && questions.length > 0 && (
            <>
              {/* Progress Bar */}
              <div className="quiz-progress-wrapper" style={{ margin: '-1.25rem -1.25rem 1.25rem -1.25rem', overflow: 'hidden', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', height: '6px', width: '100%', position: 'relative' }}>
                  <div style={{
                    background: 'var(--gradient-cyber)',
                    height: '100%',
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                    boxShadow: '0 0 10px rgba(0, 242, 254, 0.5)',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}></div>
                </div>
              </div>

              <div className="quiz-header" style={{ marginBottom: '1.25rem' }}>
                <span className="quiz-progress" id="quiz-progress" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Questão {currentIndex + 1} de {questions.length}
                </span>
                <span className="quiz-score" id="quiz-score" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>
                  Acertos: {score}
                </span>
              </div>

              <div className="quiz-question-container" style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div className="quiz-question" id="quiz-question-text" style={{ fontSize: '1.05rem', lineHeight: '1.5' }}>
                  <ReactMarkdown>{questions[currentIndex].questionText}</ReactMarkdown>
                </div>
              </div>

              <div className="quiz-options" id="quiz-options-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {questions[currentIndex].options.map((opt, idx) => {
                  let optClass = "quiz-option";
                  let bulletContent = <span>{String.fromCharCode(65 + idx)}</span>;

                  if (userAnswered) {
                    if (opt.isCorrect) {
                      optClass += " correct";
                      bulletContent = <i className="fa-solid fa-circle-check" style={{ color: 'var(--bg-primary)' }}></i>;
                    } else if (idx === selectedOptionIdx) {
                      optClass += " wrong";
                      bulletContent = <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--bg-primary)' }}></i>;
                    } else {
                      optClass += " muted";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={optClass}
                      onClick={() => handleOptionClick(idx, opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        cursor: userAnswered ? 'default' : 'pointer',
                        textAlign: 'left',
                        minHeight: '48px',
                        transition: 'all 0.2s ease',
                      }}
                      disabled={userAnswered}
                    >
                      <span className="option-bullet" style={{ marginRight: '0.75rem' }}>{bulletContent}</span>
                      <span style={{ flex: 1 }}>
                        <ReactMarkdown components={{ p: 'span' }}>{opt.text}</ReactMarkdown>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="quiz-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', minHeight: '44px' }}>
                {userAnswered && (
                  <button 
                    className="btn-primary" 
                    id="quiz-next-btn"
                    onClick={handleNext}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px' }}
                  >
                    <span>{currentIndex === questions.length - 1 ? 'Ver Resultados' : 'Próxima'}</span>
                    <i className="fa-solid fa-arrow-right" style={{ marginLeft: '0.5rem' }} aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </>
          )}

          {/* ─── SCREEN 3: RESULTS & BREAKDOWN ─── */}
          {gameState === 'results' && (
            <div className="quiz-results-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Score summary panel */}
              <div style={{ textAlign: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                <i className={`fa-solid ${getRating().icon}`} style={{ fontSize: '3rem', color: getRating().color, marginBottom: '0.75rem', display: 'block' }} aria-hidden="true"></i>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{getRating().title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: '1.45', maxWidth: '420px', margin: '0.4rem auto 0 auto' }}>
                  {getRating().desc}
                </p>
                <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'baseline', gap: '0.25rem', padding: '0.4rem 1rem', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>{score}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {questions.length} acertos</span>
                </div>
              </div>

              {/* Review / Lesson Breakdown */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-list-check" style={{ color: 'var(--accent-cyan)' }}></i> Revisão das Questões
                </h4>
                
                <div className="quiz-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '38vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {quizHistory.map((hist, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        padding: '1rem', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border-color)',
                        background: hist.isCorrect ? 'rgba(16, 185, 129, 0.03)' : 'rgba(236, 72, 153, 0.03)',
                        borderColor: hist.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {hist.isCorrect ? (
                          <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-green)', marginTop: '0.15rem' }}></i>
                        ) : (
                          <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--accent-pink)', marginTop: '0.15rem' }}></i>
                        )}
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Questão {index + 1}</strong>
                      </div>

                      <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        <ReactMarkdown>{hist.questionText}</ReactMarkdown>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', paddingLeft: '1.25rem', borderLeft: '2px solid var(--border-color)' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Sua resposta: </span>
                          <span style={{ color: hist.isCorrect ? 'var(--accent-green)' : 'var(--accent-pink)', fontWeight: '500' }}>
                            {hist.selectedText}
                          </span>
                        </div>
                        {!hist.isCorrect && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Gabarito correto: </span>
                            <span style={{ color: 'var(--accent-green)', fontWeight: '500' }}>{hist.correctText}</span>
                          </div>
                        )}
                      </div>

                      {/* Display educational definition review */}
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong>Revisão de "{hist.termName}":</strong>
                        <p style={{ marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{hist.definitionText}</p>
                        {hist.notesText && (
                          <div style={{ marginTop: '0.4rem', padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid var(--accent-cyan)' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Suas notas:</strong>
                            <p style={{ margin: 0, fontSize: '0.78rem' }}>{hist.notesText}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  className="filter-tab" 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', justifyContent: 'center' }}
                  onClick={handleRestart}
                >
                  Configurações
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1.5, padding: '0.75rem', borderRadius: '8px', justifyContent: 'center' }}
                  onClick={() => handleStartQuiz(selectedCategory, questionCount)}
                >
                  Jogar Novamente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default Quiz;
