import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import QuickDumpInput from './QuickDumpInput';
import BoardControls from './BoardControls';
import TermsGrid from './TermsGrid';
import DetailPanel from './DetailPanel';

function Dashboard() {
  const { activeTab, selectedTermKey, setActiveTab } = useContext(UIContext);

  return (
    <section className={`tab-content${activeTab === 'dashboard' ? ' active' : ''}`} id="tab-dashboard">
      {/* Quick Dump Input */}
      <QuickDumpInput />

      {/* Mobile-only navigation shortcut button */}
      <div className="mobile-only-btn">
        <button 
          className="btn-primary mobile-nav-btn" 
          onClick={() => setActiveTab('all-terms')}
        >
          <i className="fa-solid fa-layer-group" aria-hidden="true"></i>
          <span>Ver todos os cartões</span>
          <i className="fa-solid fa-chevron-right mobile-nav-chevron" aria-hidden="true"></i>
        </button>
      </div>

      {/* Filters & Search Controls - Desktop only */}
      <div className="desktop-only-dashboard">
        <BoardControls />
      </div>

      {/* Terms Board Grid & Detail View Container - Desktop only */}
      <div className="board-content-wrapper desktop-only-dashboard">
        {/* Grid of Term Cards */}
        <TermsGrid limit={6} />

        {/* Detail Side Panel (Sliding) */}
        <DetailPanel key={selectedTermKey || 'empty'} />
      </div>
    </section>
  );
}

export default Dashboard;

