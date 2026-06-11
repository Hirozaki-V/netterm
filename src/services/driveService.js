import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

/**
 * Sincroniza os termos atuais com o Google Drive usando o plugin nativo do Capacitor.
 * 
 * @param {object} termsData - Dicionário de termos do IndexedDB.
 * @returns {Promise<object>} Retorna os metadados do arquivo salvo.
 */
export async function syncToDrive(termsData) {
  const maxAttempts = 3;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // a) Inicializa o plugin de autenticação nativa do Google
      await GoogleSignIn.initialize({
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scopes: ['https://www.googleapis.com/auth/drive.appdata']
      });

      // b) Abre a janela nativa de contas do Android e executa o login/autorização
      const result = await GoogleSignIn.signIn();

      // c) Obtém o token de acesso da autenticação nativa
      const accessToken = result.accessToken;
      if (!accessToken) {
        throw new Error("Não foi possível obter o token de acesso da autenticação nativa.");
      }

      // d) e e) Monta o corpo multipart/related necessário para o upload do Drive
      const boundary = 'studyflow_backup_boundary';
      const metadata = {
        name: 'studyflow_backup.json',
        parents: ['appDataFolder']
      };
      const fileContent = JSON.stringify(termsData, null, 2);

      const body = `--${boundary}\r\n` +
                   `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                   `${JSON.stringify(metadata)}\r\n` +
                   `--${boundary}\r\n` +
                   `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                   `${fileContent}\r\n` +
                   `--${boundary}--`;

      // f) Faz o upload usando fetch para a API REST do Google Drive (upload multipart)
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body,
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Drive Upload Attempt ${attempt} Error Details:`, errorText);
        throw new Error("Falha ao salvar dados no Google Drive.");
      }

      return await response.json();
    } catch (error) {
      console.warn(`Erro na tentativa de sincronização ${attempt}/${maxAttempts}:`, error);
      if (attempt === maxAttempts) {
        // Isto fará o erro exato do Google saltar no ecrã do seu telemóvel apenas no erro final!
        alert("ERRO GOOGLE (Tentativa final): " + JSON.stringify(error.message || error));
        throw error;
      }
      // Aguarda o tempo do delay antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
}
