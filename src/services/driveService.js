/* global google */

/**
 * Serviço de integração com o Google Drive (BYOC) para backup e sincronização.
 * Utiliza o Google Identity Services (OAuth2) nativo e a API REST v3 do Google Drive.
 * Grava dados no escopo isolado appDataFolder para segurança e privacidade do usuário.
 */

let tokenClient = null;
let initializedClientId = null;

/**
 * Inicializa o cliente de token do Google Identity Services.
 * 
 * @param {string} [clientId] - O Client ID do Google OAuth2.
 * @param {function} onTokenReceived - Callback executado quando o token de acesso é gerado.
 * @param {function} onError - Callback executado em caso de erro na autorização.
 */
export function initTokenClient(clientId, onTokenReceived, onError) {
  if (typeof google === 'undefined') {
    throw new Error("O script do Google Identity Services não foi carregado no index.html.");
  }

  // Utiliza o Client ID da variável de ambiente ou o configurado pelo usuário
  const activeClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!activeClientId || 
      activeClientId.trim() === "" || 
      activeClientId.includes("SEU_CLIENT_ID_DO_GOOGLE") || 
      activeClientId.includes("YOUR_CLIENT_ID") ||
      activeClientId === "placeholder") {
    const error = new Error("Erro de Autenticação: Configure seu Google Client ID nas configurações.");
    if (onError) onError(error);
    throw error;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: activeClientId,
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    callback: (response) => {
      if (response.error) {
        if (onError) onError(new Error(response.error));
        return;
      }
      if (onTokenReceived) {
        onTokenReceived(response.access_token);
      }
    },
  });

  initializedClientId = activeClientId;
}

/**
 * Dispara o popup de login/autorização do Google OAuth2 para obter um token de acesso.
 * 
 * @param {string} [clientId] - O Client ID do Google OAuth2 configurado.
 * @returns {Promise<string>} Retorna o access token do Google.
 */
export function loginWithGoogle(clientId) {
  return new Promise((resolve, reject) => {
    try {
      const activeClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!tokenClient || (activeClientId && activeClientId !== initializedClientId)) {
        initTokenClient(
          activeClientId,
          (token) => resolve(token),
          (err) => reject(err)
        );
      }
      
      if (!tokenClient) {
        return reject(new Error("Erro de Autenticação: Configure seu Google Client ID nas configurações."));
      }

      // Requisita o token abrindo o popup nativo de consentimento
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Localiza o arquivo de backup 'studyflow_backup.json' na pasta oculta appDataFolder do Google Drive.
 * 
 * @param {string} token - Token de acesso OAuth2 válido.
 * @returns {Promise<object|null>} Retorna metadados do arquivo { id, name } ou null.
 */
async function findBackupFile(token) {
  const url = `https://www.googleapis.com/drive/v3/files?q=name='studyflow_backup.json'+and+'appDataFolder'+in+parents&spaces=appDataFolder&fields=files(id,name)`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error("Erro ao consultar backups no Google Drive.");
  }
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Envia o backup dos termos para o Google Drive.
 * Se o arquivo já existir, atualiza seu conteúdo (PATCH). Caso contrário, cria um novo (POST Multipart).
 * 
 * @param {object} termsData - O dicionário de termos do IndexedDB.
 * @param {string} token - Token de acesso OAuth2.
 * @returns {Promise<object>} Retorna os metadados do arquivo salvo.
 */
export async function uploadBackupToDrive(termsData, token) {
  if (!token) throw new Error("Token de acesso inválido ou expirado.");

  const existingFile = await findBackupFile(token);
  const fileContent = JSON.stringify(termsData, null, 2);
  const boundary = 'studyflow_upload_boundary';

  let url;
  let method;
  let headers = {
    Authorization: `Bearer ${token}`
  };
  let body;

  if (existingFile) {
    // Atualiza o conteúdo do arquivo existente (PATCH)
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    method = 'PATCH';
    headers['Content-Type'] = 'application/json';
    body = fileContent;
  } else {
    // Cria um novo arquivo usando o padrão multipart (POST)
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    method = 'POST';
    headers['Content-Type'] = `multipart/related; boundary=${boundary}`;

    const metadata = {
      name: 'studyflow_backup.json',
      parents: ['appDataFolder']
    };

    body = `--${boundary}\r\n` +
           `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
           `${JSON.stringify(metadata)}\r\n` +
           `--${boundary}\r\n` +
           `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
           `${fileContent}\r\n` +
           `--${boundary}--`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Drive Upload Error Details:", errorText);
    throw new Error("Falha ao salvar dados no Google Drive.");
  }

  return await response.json();
}

/**
 * Baixa o conteúdo do backup 'studyflow_backup.json' do Google Drive.
 * 
 * @param {string} token - Token de acesso OAuth2.
 * @returns {Promise<object|null>} Retorna o JSON dos termos restaurados ou null se não houver backup.
 */
export async function downloadBackupFromDrive(token) {
  if (!token) throw new Error("Token de acesso inválido ou expirado.");

  const existingFile = await findBackupFile(token);
  if (!existingFile) {
    return null; // Nenhum backup encontrado no Drive
  }

  const url = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Falha ao ler dados do backup no Google Drive.");
  }

  return await response.json();
}
