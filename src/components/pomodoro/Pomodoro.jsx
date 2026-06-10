import { useState, useEffect, useContext, useRef } from 'react';
import { UIContext } from '../../context/UIContext';

const POMO_MODES = [
  { id: 'work', label: 'Foco (25m)' },
  { id: 'shortBreak', label: 'Pausa Curta (5m)' },
  { id: 'longBreak', label: 'Pausa Longa (15m)' },
];

const getPomoTimeForMode = (mode) => {
  if (mode === 'shortBreak') return 5 * 60;
  if (mode === 'longBreak') return 15 * 60;
  return 25 * 60;
};

function Pomodoro() {
  const { showToast, activeTab } = useContext(UIContext);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const [pomoMode, setPomoMode] = useState('work');
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60);
  const [pomoIsRunning, setPomoIsRunning] = useState(false);
  const [pomoCycles, setPomoCycles] = useState(0);

  const totalSeconds = pomoMode === 'shortBreak' ? 5 * 60 : pomoMode === 'longBreak' ? 15 * 60 : 25 * 60;
  const strokeDashoffset = 565.48 - (pomoTimeLeft / totalSeconds) * 565.48;

  // Format time (MM:SS)
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const playPomoSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
    } catch (err) {
      console.error("Could not play audio notification", err);
    }
  };

  useEffect(() => {
    let timer = null;
    if (pomoIsRunning) {
      timer = setInterval(() => {
        setPomoTimeLeft((prev) => {
          if (prev <= 1) {
            setPomoIsRunning(false);
            playPomoSound();
            if (pomoMode === 'work') {
              setPomoCycles((c) => c + 1);
              showToast("Ciclo de foco concluído! Bom trabalho.");
            } else {
              showToast("Intervalo concluído! Hora de voltar aos estudos.");
            }
            return getPomoTimeForMode(pomoMode);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pomoIsRunning, pomoMode, showToast]);

  const handleStart = () => {
    setPomoIsRunning(true);
  };

  const handlePause = () => {
    setPomoIsRunning(false);
  };

  const handleReset = () => {
    setPomoIsRunning(false);
    setPomoTimeLeft(totalSeconds);
  };

  const changePomoMode = (mode) => {
    setPomoMode(mode);
    setPomoIsRunning(false);
    setPomoTimeLeft(getPomoTimeForMode(mode));
  };

  return (
    <section className={`tab-content${activeTab === 'pomodoro' ? ' active' : ''}`} id="tab-pomodoro">
      <div className="pomodoro-wrapper">
        <div className="pomodoro-card">
          <div className="pomodoro-header">
            <div className="pomodoro-icon-container">
              <i className="fa-solid fa-hourglass-half pomodoro-icon-glow" aria-hidden="true"></i>
            </div>
            <h2>Foco Pomodoro</h2>
            <p>Gerencie seus ciclos de estudo e descanso para máxima produtividade.</p>
          </div>

          <div className="pomodoro-modes">
            {POMO_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`filter-tab${pomoMode === mode.id ? ' active' : ''}`}
                data-pomo-mode={mode.id}
                onClick={() => changePomoMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="pomodoro-display-container">
            <svg className="pomodoro-ring" viewBox="0 0 200 200" role="img" aria-label="Indicador de progresso do temporizador Pomodoro" style={{ overflow: 'visible' }}>
              <circle className="ring-bg" cx="100" cy="100" r="90" />
              <circle
                className="ring-progress"
                id="pomo-progress-circle"
                cx="100"
                cy="100"
                r="90"
                strokeDasharray="565.48"
                strokeDashoffset={strokeDashoffset}
                style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
              />
            </svg>
            <div className="pomodoro-time-text" id="pomodoro-timer-display">{formatTime(pomoTimeLeft)}</div>
          </div>

          <div className="pomodoro-controls">
            {!pomoIsRunning ? (
              <button className="btn-primary" id="pomodoro-start-btn" onClick={handleStart}>
                <i className="fa-solid fa-play" aria-hidden="true"></i> Iniciar
              </button>
            ) : (
              <button className="btn-secondary" id="pomodoro-pause-btn" onClick={handlePause}>
                <i className="fa-solid fa-pause" aria-hidden="true"></i> Pausar
              </button>
            )}
            <button className="btn-secondary" id="pomodoro-reset-btn" onClick={handleReset}>
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Reiniciar
            </button>
          </div>

          <div className="pomodoro-stats">
            <span>Pomodoros concluídos: <strong id="pomodoro-cycle-count">{pomoCycles}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Pomodoro;
