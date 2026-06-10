import { useState, useRef, useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import { DataContext } from '../../context/DataContext';
import { validateApiKey } from '../../services/aiService';
import { loginWithGoogle, uploadBackupToDrive, downloadBackupFromDrive } from '../../services/driveService';
import { normalizeTerms } from '../../services/storageService';

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
    setGeminiApiKey,
    googleClientId,
    setGoogleClientId
  } = useContext(DataContext);

  const [activeSettingsTab, setActiveSettingsTab] = useState('local'); // 'local' ou 'cloud'
  const [localKey, setLocalKey] = useState(geminiApiKey);
  const [localGoogleClientId, setLocalGoogleClientId] = useState(googleClientId || '');
  const [isValidating, setIsValidating] = useState(false);
  
  // Google Drive state
  const [googleToken, setGoogleToken] = useState(null);
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

  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(terms, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `studyflow_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Backup exportado com sucesso!");
    } catch {
      showToast("Erro ao exportar banco de dados.", true);
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

  const handleConnectGoogle = async () => {
    const cleanClientId = localGoogleClientId.trim();
    if (!cleanClientId) {
      showToast("Por favor, preencha o seu Google Client ID.", true);
      return;
    }

    setGoogleClientId(cleanClientId);
    setIsSyncing(true);
    try {
      const token = await loginWithGoogle(cleanClientId);
      setGoogleToken(token);
      showToast("Conectado ao Google Drive com sucesso! 🎉");
    } catch (err) {
      console.error("OAuth Connection Error:", err);
      showToast(err.message || "Não foi possível conectar com o Google Drive.", true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleToken(null);
    showToast("Google Drive desconectado.");
  };

  const handleUploadBackup = async () => {
    if (!googleToken) return;
    setIsSyncing(true);
    try {
      await uploadBackupToDrive(terms, googleToken);
      showToast("Backup enviado para a nuvem com sucesso! ☁️");
    } catch (err) {
      console.error("Upload Error:", err);
      showToast("Erro ao enviar o backup para a nuvem.", true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBackup = async () => {
    if (!googleToken) return;

    const confirmed = await showCustomConfirm(
      <><i className="fa-solid fa-cloud-arrow-down" style={{ color: 'var(--accent-orange)' }} /> Restaurar da Nuvem</>,
      "Deseja restaurar o backup da nuvem? Isso mesclará as informações do Google Drive com as locais.",
      false
    );
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const cloudData = await downloadBackupFromDrive(googleToken);
      if (cloudData && typeof cloudData === 'object') {
        const validatedData = normalizeTerms(cloudData);
        const skipped = Object.keys(cloudData).length - Object.keys(validatedData).length;
        const mergedTerms = normalizeTerms({ ...terms, ...validatedData });
        setTerms(mergedTerms);

        const restoredCount = Object.keys(validatedData).length;
        showToast(`${restoredCount} termos restaurados e sincronizados!${skipped > 0 ? ` (${skipped} inválidos ignorados)` : ''} 🎉`);
        setSettingsOpen(false);
      } else {
        showToast("Nenhum arquivo de backup encontrado no Google Drive.", true);
      }
    } catch (err) {
      console.error("Restore Error:", err);
      showToast("Erro ao baixar dados da nuvem.", true);
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
                    onClick={handleImportClick}
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
            <>
              {/* Cloud Sincronização Section */}
              {!googleToken ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="settings-google-client-id">Google Client ID (OAuth 2.0)</label>
                    <input
                      type="text"
                      className="form-input"
                      id="settings-google-client-id"
                      placeholder="Cole seu ID do cliente (ex: 123456-abc.apps.googleusercontent.com)..."
                      value={localGoogleClientId}
                      onChange={(e) => setLocalGoogleClientId(e.target.value)}
                      disabled={isSyncing}
                    />
                    
                    <div className="wizard-instructions" style={{ 
                      marginTop: '0.75rem', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '6px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      border: '1px solid var(--border-color)', 
                      fontSize: '0.85rem', 
                      lineHeight: '1.45' 
                    }}>
                      <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.4rem' }}>
                        ☁️ Como criar seu Google Client ID:
                      </strong>
                      <ol style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-secondary)' }}>
                        <li style={{ marginBottom: '0.3rem' }}>
                          Acesse o{' '}
                          <a 
                            href="https://console.cloud.google.com/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: '600' }}
                          >
                            Google Cloud Console <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.75rem' }}></i>
                          </a>.
                        </li>
                        <li style={{ marginBottom: '0.3rem' }}>Configure a tela de consentimento OAuth e adicione seu e-mail como usuário de teste.</li>
                        <li style={{ marginBottom: '0.3rem' }}>Crie uma credencial de <strong>ID do cliente OAuth</strong> para aplicativo da Web.</li>
                        <li>Nas Origens JavaScript autorizadas, adicione: <code>http://localhost:5173</code>, <code>http://localhost:5174</code> e <code>http://localhost:3000</code>.</li>
                      </ol>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
                    onClick={handleConnectGoogle}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Conectando...</>
                    ) : (
                      <><i className="fa-brands fa-google"></i> Conectar ao Google Drive</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="form-group">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    marginBottom: '1.25rem', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '6px', 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid var(--accent-green)' 
                  }}>
                    <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-green)', fontSize: '1.3rem' }} aria-hidden="true"></i>
                    <div style={{ fontSize: '0.85rem', textAlign: 'left', flex: 1 }}>
                      <strong style={{ color: 'var(--accent-green)', display: 'block', marginBottom: '0.1rem' }}>Conectado!</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>Armazenando backups na pasta oculta do app.</span>
                    </div>
                    <button
                      className="filter-tab"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', border: '1px solid rgba(236, 72, 153, 0.4)', color: 'var(--accent-pink)' }}
                      onClick={handleDisconnectGoogle}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i> Sair
                    </button>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Client ID em uso</label>
                    <input
                      type="text"
                      className="form-input"
                      value={googleClientId}
                      disabled
                      style={{ opacity: 0.6 }}
                    />
                  </div>

                  <label className="form-label">Ações de Sincronização</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      className="filter-tab"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', justifyContent: 'center', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                      onClick={handleUploadBackup}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i> Enviando backup...</>
                      ) : (
                        <><i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: '0.5rem' }}></i> Enviar Dados para Nuvem</>
                      )}
                    </button>

                    <button
                      className="filter-tab"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', justifyContent: 'center', borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }}
                      onClick={handleDownloadBackup}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i> Baixando backup...</>
                      ) : (
                        <><i className="fa-solid fa-cloud-arrow-down" style={{ marginRight: '0.5rem' }}></i> Mesclar Dados da Nuvem</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
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
