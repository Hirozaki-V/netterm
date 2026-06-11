import { useContext } from 'react';
import { UIContext } from './context/UIContext';
import { DataContext } from './context/DataContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import Flashcards from './components/flashcards/Flashcards';
import Quiz from './components/quiz/Quiz';
import MindMap from './components/mindmap/MindMap';
import Pomodoro from './components/pomodoro/Pomodoro';
import SettingsModal from './components/modals/SettingsModal';
import EditDefinitionModal from './components/modals/EditDefinitionModal';
import AddConnectionModal from './components/modals/AddConnectionModal';
import ConfirmModal from './components/modals/ConfirmModal';
import PromptModal from './components/modals/PromptModal';
import FabButton from './components/modals/FabButton';
import MobileDrawer from './components/modals/MobileDrawer';
import BoardControls from './components/dashboard/BoardControls';
import TermsGrid from './components/dashboard/TermsGrid';
import DetailPanel from './components/dashboard/DetailPanel';

function App() {
  const { 
    toast, 
    mobileMenuOpen, 
    setMobileMenuOpen,
    activeTab,
    setActiveTab,
    settingsOpen,
    editDefModalOpen,
    addConnModalOpen,
    customModal,
    selectedTermKey,
    setMobileDrawerOpen,
    isTyping
  } = useContext(UIContext);

  const currentView = activeTab;
  const setCurrentView = setActiveTab;
  const setShowQuickDump = setMobileDrawerOpen;

  const { isDbLoading } = useContext(DataContext);

  const toastStyle = {
    position: 'fixed',
    top: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'max-content',
    maxWidth: '90vw',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--bg-primary)',
    zIndex: 1000,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    background: toast?.isError 
      ? 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)' 
      : 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%)'
  };

  if (isDbLoading) {
    return (
      <div className="db-loading-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family)',
        gap: '1rem'
      }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '3.5rem', color: 'var(--accent-cyan)' }}></i>
        <h3 style={{ margin: 0, fontWeight: 500, letterSpacing: '0.5px' }}>Carregando seu ambiente de estudos...</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acessando banco de dados local seguro...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <Header onHomeClick={() => setCurrentView('dashboard')} />

      {/* Application Body */}
      <div className="app-container">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Sidebar overlay backdrop for mobile */}
        <div 
          className={`sidebar-backdrop${mobileMenuOpen ? ' visible' : ''}`} 
          id="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        ></div>

        {/* Main Workspace */}
        <main>
          {/* 1. DASHBOARD TAB */}
          <Dashboard />

          {/* Nova aba: Todos os Termos */}
          {activeTab === 'all-terms' && (
            <section className="tab-content active" id="tab-all-terms">
              <BoardControls />
              <div className="board-content-wrapper">
                <TermsGrid />
                <DetailPanel key={selectedTermKey || 'all-empty'} />
              </div>
            </section>
          )}

          {/* 2. FLASHCARDS TAB */}
          {activeTab === 'flashcards' && <Flashcards />}

          {/* 3. QUIZ TAB */}
          {activeTab === 'quiz' && <Quiz />}

          {/* 4. MIND MAP TAB */}
          {activeTab === 'mindmap' && <MindMap />}

          {/* 5. POMODORO TIMER TAB */}
          <Pomodoro />
        </main>
      </div>

      {/* Modals */}
      {settingsOpen && <SettingsModal />}
      {editDefModalOpen && <EditDefinitionModal />}
      {addConnModalOpen && <AddConnectionModal />}
      {customModal && customModal.type === 'confirm' && <ConfirmModal />}
      {customModal && customModal.type === 'prompt' && <PromptModal />}

      {/* Mobile FAB & Drawer */}
      {currentView === 'dashboard' && !isTyping && <FabButton onClick={() => setShowQuickDump(true)} />}
      <MobileDrawer />

      {/* Toast Notification Alert */}
      {toast && (
        <div style={toastStyle} id="studyflow-toast">
          {toast.message}
        </div>
      )}
    </>
  );
}

export default App;

