import { useState, useRef, useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import { validateApiKey } from '../../services/aiService';
import { syncToDrive } from '../../services/driveService';
import { normalizeTerms } from '../../services/storageService';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

function SettingsModal() {
  const {
    setSettingsOpen,
    showToast,
    showCustomConfirm
  } = useContext(UIContext);

  const {
    terms,
    setTerms,
    geminiApiKey,
    setGeminiApiKey
  } = useContext(DataContext);

  const [activeSettingsTab, setActiveSettingsTab] = useState('local'); // 'local' ou 'cloud'
  const [localKey, setLocalKey] = useState(geminiApiKey);
  const [isValidating, setIsValidating] = useState(false);
  
  // Google Drive state
  const [isSyncing, setIsSyncing] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    const cleanKey = localKey.trim();
    
    // If key is empty, revert to local offline dictionary
    if (!cleanKey) {
      setGeminiApiKey("");
      setSettingsOpen(false);
      showToast("Configurações salvas. Modo Local Offline Ativado.");
      return;
    }

    setIsValidating(true);
    try {
      // Perform simple validation ping using aiService
      await validateApiKey(cleanKey);
      setGeminiApiKey(cleanKey);
      setSettingsOpen(false);
      showToast("Conexão estabelecida! Cérebro de IA ativo com sucesso! 🎉");
    } catch (err) {
      console.error("API Key Validation error:", err);
      showToast("A chave fornecida parece inválida. Verifique e tente novamente.", true);
      setIsValidating(false);
    }
  };

  const dbManager = {
    exportData: async () => terms,
    importData: async (data) => {
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const validatedData = normalizeTerms(data);
        const mergedTerms = normalizeTerms({ ...terms, ...validatedData });
        setTerms(mergedTerms);
      } else {
        throw new Error("Formato inválido.");
      }
    }
  };

  const handleExport = async () => {
    try {
      const data = await dbManager.exportData();
      const jsonData = JSON.stringify(data, null, 2);
      
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: 'studyflow_backup.json',
          data: jsonData,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          url: result.uri,
          title: 'Backup StudyFlow'
        });
      } else {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studyflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      showToast("Dados exportados!");
    } catch (error) {
      showToast("Erro ao exportar dados.");
    }
  };
  const exportData = handleExport;

  const handleNativeImport = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({ 
          types: ['application/json'], 
          multiple: false,
          readData: true // <-- Crucial para ler sem problemas de permissão
        });
        
        const fileData = result.files[0]?.data;
        if (!fileData) return;
        
        // Converte Base64 para texto preservando a acentuação UTF-8
        const response = await fetch(`data:application/json;base64,${fileData}`);
        const jsonText = await response.text();
        const parsedData = JSON.parse(jsonText);
        
        await dbManager.importData(parsedData);
        showToast("Dados importados com sucesso!");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error("Erro na importacao:", error);
        showToast("Erro ao importar backup. Verifique o arquivo.");
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 10MB size limit validation to prevent browser crashes
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showToast("Arquivo muito grande (máx 10MB).", true);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        if (typeof importedData === 'object' && importedData !== null && !Array.isArray(importedData)) {
          const validatedData = normalizeTerms(importedData);
          const skipped = Object.keys(importedData).length - Object.keys(validatedData).length;
          const mergedTerms = normalizeTerms({ ...terms, ...validatedData });
          setTerms(mergedTerms);
          
          const importedCount = Object.keys(validatedData).length;
          showToast(`${importedCount} termo(s) importado(s)${skipped > 0 ? `, ${skipped} ignorado(s) (formato inválido)` : ''}!`);
          setSettingsOpen(false);
        } else {
          showToast("Formato de arquivo inválido. Esperado um objeto JSON.", true);
        }
      } catch {
        showToast("Erro ao processar o arquivo JSON.", true);
      }
      e.target.value = ""; // Reset input
    };
    reader.readAsText(file);
  };

  const handleClearDb = async () => {
    const confirmed = await showCustomConfirm(
      <><i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--accent-pink)' }} /> Limpar Banco de Dados</>,
      "ATENÇÃO: Isso apagará TODOS os seus termos cadastrados! Deseja continuar?",
      true
    );
    if (confirmed) {
      setTerms({});
      setSettingsOpen(false);
      showToast("Banco de dados local limpo.");
    }
  };

  const handleSyncGoogleDrive = async () => {
    setIsSyncing(true);
    try {
      await syncToDrive(terms);
      showToast("Backup enviado para a nuvem com sucesso! ☁️🎉");
      setSettingsOpen(false);
    } catch (err) {
      console.error("Erro na sincronização nativa:", err);
      showToast(err.message || "Erro ao sincronizar dados com o Google Drive.", true);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="modal-overlay open" id="settings-modal" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-sliders" aria-hidden="true"></i> Configurações do StudyFlow
          </h3>
          <i 
            className="fa-solid fa-xmark close-btn" 
            id="close-settings-btn"
            onClick={() => setSettingsOpen(false)}
          ></i>
        </div>

        <div className="settings-tabs">
          <button
            className={`filter-tab${activeSettingsTab === 'local' ? ' active' : ''}`}
            onClick={() => setActiveSettingsTab('local')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px' }}
            disabled={isValidating || isSyncing}
          >
            <i className="fa-solid fa-sliders" style={{ marginRight: '0.5rem' }}></i> Opções Gerais
          </button>
          <button
            className={`filter-tab${activeSettingsTab === 'cloud' ? ' active' : ''}`}
            onClick={() => setActiveSettingsTab('cloud')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px' }}
            disabled={isValidating || isSyncing}
          >
            <i className="fa-solid fa-cloud" style={{ marginRight: '0.5rem' }}></i> Nuvem & Sincronização
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '0.5rem' }}>
          {activeSettingsTab === 'local' ? (
            <>
              {/* Decoupled AI/Gemini Section (Wizard Layout) */}
              <div className="form-group">
                <label className="form-label" htmlFor="settings-gemini-key">Ativar Cérebro de IA</label>
                
                <div className="wizard-instructions" style={{ 
                  margin: '0.25rem 0 1rem 0', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '6px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '0.85rem', 
                  lineHeight: '1.4' 
                }}>
                  <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.5rem' }}>
                    🧠 Como ativar recursos inteligentes da IA:
                  </strong>
                  <ol style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-secondary)' }}>
                    <li style={{ marginBottom: '0.4rem' }}>
                      Obtenha sua chave de API gratuita no{' '}
                      <a 
                        href="https://aistudio.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: '600' }}
                      >
                        Google AI Studio <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.75rem' }}></i>
                      </a>.
                    </li>
                    <li style={{ marginBottom: '0.4rem' }}>Cole a chave gerada no campo abaixo.</li>
                    <li>Clique no botão "Salvar Configurações" para testar a conexão e ativar os resumos automáticos.</li>
                  </ol>
                </div>

                <input
                  type="password"
                  className="form-input"
                  id="settings-gemini-key"
                  placeholder="Cole sua chave API (AIzaSy...) aqui..."
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  disabled={isValidating}
                />
                <div className="help-text">
                  Com a IA ativa, o StudyFlow cria definições didáticas automáticas para qualquer termo adicionado e sugere conexões inteligentes de estudo no Mapa Mental.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Banco de Dados Local</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="filter-tab" 
                    id="export-db-btn" 
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '6px' }}
                    onClick={handleExport}
                    disabled={isValidating}
                  >
                    <i className="fa-solid fa-file-export" aria-hidden="true"></i> Exportar JSON
                  </button>
                  <button 
                    className="filter-tab" 
                    id="import-db-btn" 
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '6px' }}
                    onClick={handleNativeImport}
                    disabled={isValidating}
                  >
                    <i className="fa-solid fa-file-import" aria-hidden="true"></i> Importar JSON
                  </button>
                  <input 
                    type="file" 
                    id="import-db-input" 
                    accept=".json" 
                    ref={fileInputRef}
                    style={{ display: 'none' }} 
                    onChange={handleImportFileChange}
                  />
                </div>
                <div className="help-text">
                  Você pode fazer backup de todos os seus termos e anotações e importá-los em outro computador.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ações de Banco</label>
                <button
                  className="filter-tab btn-danger"
                  id="clear-db-btn"
                  style={{ padding: '0.6rem', borderRadius: '6px', borderColor: 'rgba(236,72,153,0.3)' }}
                  onClick={handleClearDb}
                  disabled={isValidating}
                >
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> Apagar Todos os Termos Salvos
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
              <div style={{ 
                padding: '1.5rem 1.25rem', 
                borderRadius: '8px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--border-color)',
                textAlign: 'center'
              }}>
                <i className="fa-solid fa-cloud" style={{ fontSize: '2.5rem', color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'block' }}></i>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Sincronização com Google Drive</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Faça backup seguro dos seus cartões e mapas no seu Google Drive.
                </p>
              </div>

              <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', padding: '0.75rem', borderRadius: '6px' }}
                onClick={handleSyncGoogleDrive}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Sincronizando...</>
                ) : (
                  <><i className="fa-brands fa-google"></i> Sincronizar com Google Drive</>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            id="cancel-settings-btn" 
            onClick={() => setSettingsOpen(false)}
            disabled={isValidating || isSyncing}
          >
            Cancelar
          </button>
          
          {activeSettingsTab === 'local' && (
            <button 
              className="btn-primary" 
              id="save-settings-btn" 
              onClick={handleSave}
              disabled={isValidating}
              style={{ minWidth: '160px', justifyContent: 'center' }}
            >
              {isValidating ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i> Validando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
