import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import QuickDumpInput from './QuickDumpInput';
import BoardControls from './BoardControls';
import TermsGrid from './TermsGrid';
import DetailPanel from './DetailPanel';

function Dashboard() {
  const { activeTab, selectedTermKey } = useContext(AppContext);

  return (
    <section className={`tab-content${activeTab === 'dashboard' ? ' active' : ''}`} id="tab-dashboard">
      {/* Quick Dump Input */}
      <QuickDumpInput />

      {/* Filters & Search Controls */}
      <BoardControls />

      {/* Terms Board Grid & Detail View Container */}
      <div className="board-content-wrapper">
        {/* Grid of Term Cards */}
        <TermsGrid limit={6} />

        {/* Detail Side Panel (Sliding) */}
        <DetailPanel key={selectedTermKey || 'empty'} />
      </div>
    </section>
  );
}

export default Dashboard;

