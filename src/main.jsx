import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { UIProvider } from './context/UIContext.jsx';
import { DataProvider } from './context/DataContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UIProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </UIProvider>
  </React.StrictMode>
);

