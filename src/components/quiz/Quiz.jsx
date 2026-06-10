import { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { escapeHTML } from '../../utils/security';

function Quiz() {
  const { terms, showToast } = useContext(AppContext);

  const termKeys = Object.keys(terms);
  const isQuizAvailable = termKeys.length >= 4;

  // Function to build questions
  const generateQuizQuestions = (allKeys, maxQuestions = 10) => {
    const questionsList = [];
    const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
    const quizLength = Math.min(shuffledKeys.length, maxQuestions);

    for (let i = 0; i < quizLength; i++) {
      const correctKey = shuffledKeys[i];
      const correctItem = terms[correctKey];
      
      // Question Type: 0 = Given Definition find Name, 1 = Given Name find Definition
      const qType = Math.random() > 0.5 ? 0 : 1;
      
      // Pick 3 distractor terms
      const distractors = allKeys
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

      questionsList.push({
        type: qType,
        targetKey: correctKey,
        questionText: qType === 0 
          ? `Qual é o termo correspondente à seguinte definição?<br><br><em>"${escapeHTML(correctItem.definition)}"</em>` 
          : `Qual é o significado correto do termo: <strong>${escapeHTML(correctItem.term)}</strong>?`,
        options: options
      });
    }

    return questionsList;
  };

  // --- Quiz Engine States ---
  const [questions, setQuestions] = useState(() => {
    return isQuizAvailable ? generateQuizQuestions(termKeys, 10) : [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswered, setUserAnswered] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);

  const handleStartQuiz = () => {
    if (!isQuizAvailable) return;
    const generated = generateQuizQuestions(termKeys, 10);
    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setUserAnswered(false);
    setSelectedOptionIdx(null);
  };

  const handleOptionClick = (idx, isCorrect) => {
    if (userAnswered) return;
    setUserAnswered(true);
    setSelectedOptionIdx(idx);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      showToast("Parabéns! Resposta correta.");
    } else {
      showToast("Hum, não foi dessa vez.", true);
    }
  };

  const handleNext = () => {
    setUserAnswered(false);
    setSelectedOptionIdx(null);
    setCurrentIndex((prev) => prev + 1);
  };

  if (!isQuizAvailable) {
    return (
      <section className="tab-content active" id="tab-quiz">
        <div className="quiz-wrapper">
          <div className="quiz-card" id="quiz-card">
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <i className="fa-solid fa-triangle-exclamation empty-icon" style={{ color: 'var(--accent-orange)' }}></i>
              <h4 className="empty-title">Termos Insuficientes</h4>
              <p className="empty-desc">
                Você precisa de pelo menos <strong>4 termos cadastrados</strong> para gerar perguntas de múltipla escolha.
                Atualmente você tem apenas {termKeys.length}.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isFinished = questions.length > 0 && currentIndex >= questions.length;

  return (
    <section className="tab-content active" id="tab-quiz">
      <div className="quiz-wrapper">
        <div className="quiz-card" id="quiz-card">
          {isFinished ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <i className="fa-solid fa-trophy" style={{ fontSize: '3rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }} aria-hidden="true"></i>
              <h3>Quiz Concluído!</h3>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                Você acertou <strong>{score}</strong> de <strong>{questions.length}</strong> perguntas.
              </p>
              <button 
                className="btn-primary" 
                id="quiz-replay-btn" 
                style={{ margin: '1.5rem auto 0 auto' }}
                onClick={handleStartQuiz}
              >
                Jogar Novamente
              </button>
            </div>
          ) : questions.length > 0 ? (
            <>
              <div className="quiz-header">
                <span className="quiz-progress" id="quiz-progress">
                  Pergunta {currentIndex + 1} de {questions.length}
                </span>
                <span className="quiz-score" id="quiz-score">
                  Acertos: {score}
                </span>
              </div>

              <div className="quiz-question-container">
                <p 
                  className="quiz-question" 
                  id="quiz-question-text"
                  dangerouslySetInnerHTML={{ __html: questions[currentIndex].questionText }}
                ></p>
              </div>

              <div className="quiz-options" id="quiz-options-container">
                {questions[currentIndex].options.map((opt, idx) => {
                  let optClass = "quiz-option";
                  let bulletContent = <span>{String.fromCharCode(65 + idx)}</span>;

                  if (userAnswered) {
                    if (opt.isCorrect) {
                      optClass += " correct";
                      bulletContent = <i className="fa-solid fa-check" aria-hidden="true"></i>;
                    } else if (idx === selectedOptionIdx) {
                      optClass += " wrong";
                      bulletContent = <i className="fa-solid fa-xmark" aria-hidden="true"></i>;
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={optClass}
                      onClick={() => handleOptionClick(idx, opt.isCorrect)}
                    >
                      <span className="option-bullet">{bulletContent}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="quiz-footer">
                {userAnswered && (
                  <button 
                    className="btn-primary" 
                    id="quiz-next-btn"
                    onClick={handleNext}
                  >
                    {currentIndex === questions.length - 1 ? 'Finalizar Quiz' : 'Próxima Pergunta'}
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="quiz-question-container">
              <p className="quiz-question" id="quiz-question-text">Preparando as perguntas...</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Quiz;

