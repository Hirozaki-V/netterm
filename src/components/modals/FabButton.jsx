import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function FabButton() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useContext(AppContext);

  return (
    <button 
      className="fab-btn" 
      id="fab-add-term-btn" 
      title="Adicionar Termos" 
      aria-label="Adicionar termos para estudo"
      onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
    >
      <i className="fa-solid fa-plus" aria-hidden="true"></i>
    </button>
  );
}

export default FabButton;

