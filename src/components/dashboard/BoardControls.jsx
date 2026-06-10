import { useContext } from 'react';
import { DataContext } from '../../context/DataContext';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'ciencias', label: 'Ciências' },
  { id: 'humanas', label: 'Humanas' },
  { id: 'exatas', label: 'Exatas' },
  { id: 'linguagens', label: 'Linguagens' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'custom', label: 'Personalizados' },
];

function BoardControls() {
  const { filters, setFilters } = useContext(DataContext);

  const handleCategoryChange = (catId) => {
    setFilters((prev) => ({ ...prev, category: catId }));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, search: val }));
  };

  return (
    <div className="board-controls">
      <div className="filter-tabs" id="category-filter-tabs">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={`filter-tab${filter.id === filters.category ? ' active' : ''}`}
            data-filter={filter.id}
            onClick={() => handleCategoryChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="search-wrapper">
        <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>
        <input
          type="text"
          className="search-input"
          id="search-input"
          placeholder="Buscar palavra ou conceito..."
          aria-label="Buscar termos"
          value={filters.search}
          onChange={handleSearchChange}
        />
      </div>
    </div>
  );
}

export default BoardControls;

