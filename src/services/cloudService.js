/* global google */

/**
 * Cloud Service - Google Drive API v3 (BYOK Flow)
 * Integrates with Google Drive using user-provided credentials or environments.
 * Scope: https://www.googleapis.com/auth/drive.file (Restricted scope)
 */

let tokenClient = null;

/**
 * Validates that no secret keys or client secrets are hardcoded in the client ID.
 * @param {string} clientId 
 */
function auditCredentials(clientId) {
  if (!clientId || clientId.trim() === "") {
    throw new Error("Credentials Audit Failed: Google Client ID is missing.");
  }
  const sensitivePatterns = [
    /AIzaSy[A-Za-z0-9-_]{33}/, // Google API Key pattern
    /^[A-Za-z0-9-_]{24}\.[A-Za-z0-9-_]{6}\.[A-Za-z0-9-_]{27}$/ // generic jwt/secret patterns
  ];
  for (const pattern of sensitivePatterns) {
    if (pattern.test(clientId)) {
      throw new Error("Credentials Audit Failed: Potentially sensitive secret detected in client ID.");
    }
  }
}

/**
 * Initializes the Google Identity Services token client.
 * 
 * @param {string} clientId - The client ID.
 * @param {function} onTokenReceived - Success callback.
 * @param {function} onError - Error callback.
 */
export function initTokenClient(clientId, onTokenReceived, onError) {
  if (typeof google === 'undefined') {
    const error = new Error("Google Identity Services script is not loaded.");
    if (onError) onError(error);
    throw error;
  }

  // Ensure client ID is provided either from args or environment variables, NEVER hardcoded
  const activeClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;

  try {
    auditCredentials(activeClientId);
  } catch (auditError) {
    if (onError) onError(auditError);
    throw auditError;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: activeClientId,
    scope: 'https://www.googleapis.com/auth/drive.file', // Strict drive.file scope
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
}

/**
 * Initiates the Google OAuth2 authentication flow.
 * Attempts to request access token silently first if possible (by checking saved state),
 * otherwise opens the native consent popup.
 * 
 * @param {string} clientId - The user-provided Client ID.
 * @returns {Promise<string>} Access Token
 */
export function authorizeCloudService(clientId) {
  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
        initTokenClient(
          clientId,
          (token) => resolve(token),
          (err) => reject(err)
        );
      }
      
      if (!tokenClient) {
        return reject(new Error("Token client not initialized. Make sure Client ID is provided."));
      }

      // Check if we can request silently (no prompt).
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Uploads a backup file to Google Drive.
 * Scoped to drive.file, so it can only access files created by this app.
 * 
 * @param {object} termsData - Terms payload to backup.
 * @param {string} token - OAuth2 Access Token.
 * @returns {Promise<object>} REST Response.
 */
export async function uploadBackup(termsData, token) {
  if (!token) throw new Error("Invalid or expired OAuth2 token.");

  const fileName = 'studyflow_byok_backup.json';
  const fileContent = JSON.stringify(termsData, null, 2);
  const boundary = 'studyflow_byok_upload_boundary';

  // 1. Search for existing file within drive.file scope
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}'+and+trashed=false&fields=files(id,name)`;
  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchResponse.ok) {
    throw new Error("Failed to query backups in Google Drive.");
  }

  const searchData = await searchResponse.json();
  const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

  let url;
  let method;
  let headers = { Authorization: `Bearer ${token}` };
  let body;

  if (existingFile) {
    // Update existing file content (PATCH)
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    method = 'PATCH';
    headers['Content-Type'] = 'application/json';
    body = fileContent;
  } else {
    // Create new file (POST Multipart)
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    method = 'POST';
    headers['Content-Type'] = `multipart/related; boundary=${boundary}`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json'
    };

    body = `--${boundary}\r\n` +
           `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
           `${JSON.stringify(metadata)}\r\n` +
           `--${boundary}\r\n` +
           `Content-Type: application/json\r\n\r\n` +
           `${fileContent}\r\n` +
           `--${boundary}--`;
  }

  const response = await fetch(url, { method, headers, body });
  if (!response.ok) {
    throw new Error("Failed to write backup to Google Drive.");
  }

  return await response.json();
}

/**
 * Downloads a backup file from Google Drive.
 * 
 * @param {string} token - OAuth2 Access Token.
 * @returns {Promise<object|null>} Restore payload or null.
 */
export async function downloadBackup(token) {
  if (!token) throw new Error("Invalid or expired OAuth2 token.");

  const fileName = 'studyflow_byok_backup.json';
  
  // 1. Search for backup file
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}'+and+trashed=false&fields=files(id,name)`;
  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchResponse.ok) {
    throw new Error("Failed to query backups in Google Drive.");
  }

  const searchData = await searchResponse.json();
  const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

  if (!existingFile) return null;

  // 2. Fetch media content
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to download backup content from Google Drive.");
  }

  return await response.json();
}
