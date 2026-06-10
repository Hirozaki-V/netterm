import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'fa-table-columns', label: 'Dashboard' },
  { id: 'flashcards', icon: 'fa-clone', label: 'Flashcards' },
  { id: 'quiz', icon: 'fa-graduation-cap', label: 'Quiz de Fixação' },
  { id: 'mindmap', icon: 'fa-circle-nodes', label: 'Mapa de Conexões' },
  { id: 'pomodoro', icon: 'fa-clock', label: 'Foco Pomodoro' },
];

function Sidebar() {
  const { activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen } = useContext(AppContext);

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (window.innerWidth <= 1024) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <aside className={`app-sidebar-nav${mobileMenuOpen ? ' open' : ''}`}>
      <nav className="nav-menu" role="navigation" aria-label="Menu principal">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`nav-item${item.id === activeTab ? ' active' : ''}`}
            data-tab={item.id}
            role="button"
            tabIndex={0}
            aria-label={item.label}
            onClick={() => handleNavClick(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavClick(item.id);
              }
            }}
          >
            <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="dump-tip" style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center' }}>
        Feito para estudantes 🎓
      </div>
    </aside>
  );
}

export default Sidebar;

