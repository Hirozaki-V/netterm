import { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function MobileDrawer() {
  const { mobileDrawerOpen, setMobileDrawerOpen, processDumpInput } = useContext(AppContext);
  const [drawerValue, setDrawerValue] = useState('');

  if (!mobileDrawerOpen) {
    return <div className="drawer-overlay" id="mobile-add-drawer" role="dialog" aria-modal="true"></div>;
  }

  const handleSubmit = () => {
    if (!drawerValue.trim()) return;
    processDumpInput(drawerValue);
    setDrawerValue('');
    setMobileDrawerOpen(false);
  };

  return (
    <div 
      className="drawer-overlay open" 
      id="mobile-add-drawer" 
      role="dialog" 
      aria-modal="true"
      onClick={(e) => {
        // Close if clicking outside the sheet (on the backdrop)
        if (e.target.id === 'mobile-add-drawer') {
          setMobileDrawerOpen(false);
        }
      }}
    >
      <div className="drawer">
        <div className="drawer-header">
          <h3 className="drawer-title">
            <i className="fa-solid fa-bolt" style={{ color: 'var(--accent-cyan)' }}></i> Cadastrar Termos
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-drawer-btn"
            onClick={() => setMobileDrawerOpen(false)}
          ></i>
        </div>
        <div className="drawer-body">
          <div className="form-group">
            <label className="form-label" htmlFor="drawer-textarea">
              Digite os termos (separados por vírgula ou Enter):
            </label>
            <textarea
              className="notes-textarea drawer-textarea"
              id="drawer-textarea"
              placeholder="Ex: Mitocôndria, Próton, Taylorismo, Algoritmo..."
              value={drawerValue}
              onChange={(e) => setDrawerValue(e.target.value)}
            ></textarea>
            <div className="help-text">
              Se você tiver uma chave da API do Gemini cadastrada nas configurações, os conceitos serão gerados por inteligência artificial. Caso contrário, buscaremos no dicionário local.
            </div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn-primary" id="drawer-add-btn" style={{ width: '100%' }} onClick={handleSubmit}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Adicionar Termos
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileDrawer;

