import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const POMO_MODES = [
  { id: 'work', label: 'Foco (25m)' },
  { id: 'shortBreak', label: 'Pausa Curta (5m)' },
  { id: 'longBreak', label: 'Pausa Longa (15m)' },
];

function Pomodoro() {
  const {
    pomoTimeLeft,
    setPomoTimeLeft,
    pomoMode,
    pomoIsRunning,
    setPomoIsRunning,
    pomoCycles,
    changePomoMode,
    activeTab
  } = useContext(AppContext);

  const totalSeconds = pomoMode === 'shortBreak' ? 5 * 60 : pomoMode === 'longBreak' ? 15 * 60 : 25 * 60;
  const strokeDashoffset = 565.48 - (pomoTimeLeft / totalSeconds) * 565.48;

  // Format time (MM:SS)
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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

