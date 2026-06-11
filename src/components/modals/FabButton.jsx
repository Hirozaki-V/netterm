import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';

function FabButton({ onClick }) {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useContext(UIContext);

  return (
    <button 
      className="fab-btn" 
      id="fab-add-term-btn" 
      title="Adicionar Termos" 
      aria-label="Adicionar termos para estudo"
      onClick={onClick || (() => setMobileDrawerOpen(!mobileDrawerOpen))}
    >
      <i className="fa-solid fa-plus" aria-hidden="true"></i>
    </button>
  );
}

export default FabButton;

