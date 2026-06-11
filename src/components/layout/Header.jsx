import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';

function Header() {
  const {
    setSelectedTermKey,
    setSettingsOpen,
    setMobileMenuOpen,
    mobileMenuOpen,
    setMobileDrawerOpen,
    setEditDefModalOpen,
    setAddConnModalOpen
  } = useContext(UIContext);

  const { geminiApiKey } = useContext(DataContext);

  const handleLogoClick = () => {
    setMobileMenuOpen(true);
    setSelectedTermKey(null);
    setSettingsOpen(false);
    setMobileDrawerOpen(false);
    setEditDefModalOpen(false);
    setAddConnModalOpen(false);
  };

  const isApiActive = geminiApiKey.trim() !== "";

  return (
    <header>
      <div 
        className="logo-container" 
        role="button" 
        tabIndex={0} 
        aria-label="Ir para o Dashboard" 
        style={{ cursor: 'pointer' }}
        onClick={handleLogoClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleLogoClick();
          }
        }}
      >
        <div className="logo-icon">
          <i className="fa-solid fa-book-open" aria-hidden="true"></i>
        </div>
        <span className="logo-text">StudyFlow</span>
      </div>

      <div className="status-badge" id="api-status-badge">
        <span 
          className={`status-dot ${isApiActive ? 'active' : 'local'}`} 
          id="api-status-dot"
          style={{ boxShadow: isApiActive ? '0 0 8px var(--accent-cyan)' : '0 0 8px var(--accent-green)' }}
        ></span>
        <span id="api-status-text">
          {isApiActive ? 'API Gemini Ativa (Nuvem)' : 'Modo Local (Dicionário Técnico)'}
        </span>
      </div>

      <div className="header-actions">
        <button 
          className={`icon-btn mobile-menu-btn${mobileMenuOpen ? ' active' : ''}`} 
          id="mobile-menu-toggle" 
          title="Menu" 
          aria-label="Abrir menu de navegação"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true"></i>
        </button>
        <button 
          className="icon-btn" 
          id="open-settings-btn" 
          title="Configurações e Chave API"
          onClick={() => setSettingsOpen(true)}
        >
          <i className="fa-solid fa-gear" aria-hidden="true"></i>
        </button>
      </div>
    </header>
  );
}

export default Header;

