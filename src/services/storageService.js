import localforage from 'localforage';
import BUILTIN_DICTIONARY from '../data/dictionary';

// Configuração da instância localforage dedicada ao StudyFlow
localforage.config({
  name: 'StudyFlowDB',
  storeName: 'StudyFlowStore'
});

const SAMPLE_TERMS_KEYS = ["fotossintese", "celula", "dna", "democracia", "algoritmo", "metafora", "inteligencia artificial", "energia"];

export const slugifyKey = (key) =>
  String(key || '').toLowerCase().replace(/[^a-z0-9á-ú\s/-]/gi, '').trim();

export function normalizeTerms(rawTerms) {
  if (!rawTerms || typeof rawTerms !== 'object' || Array.isArray(rawTerms)) {
    return {};
  }

  const normalized = {};

  Object.entries(rawTerms).forEach(([key, item]) => {
    if (!item || typeof item !== 'object') return;

    const safeKey = slugifyKey(key);
    if (!safeKey || typeof item.term !== 'string' || typeof item.definition !== 'string') return;

    normalized[safeKey] = {
      term: item.term,
      definition: item.definition,
      category: typeof item.category === 'string' ? item.category : 'custom',
      connections: Array.isArray(item.connections)
        ? item.connections.map(slugifyKey).filter(Boolean)
        : [],
      notes: typeof item.notes === 'string' ? item.notes : '',
      x: Number.isFinite(item.x) ? item.x : Math.random() * 400 + 100,
      y: Number.isFinite(item.y) ? item.y : Math.random() * 250 + 80,
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
    };
  });

  Object.entries(normalized).forEach(([key, item]) => {
    item.connections = [...new Set(
      item.connections.filter((connKey) => connKey !== key && normalized[connKey])
    )];

    item.connections.forEach((connKey) => {
      const reciprocal = normalized[connKey].connections;
      if (!reciprocal.includes(key)) {
        normalized[connKey] = {
          ...normalized[connKey],
          connections: [...reciprocal, key]
        };
      }
    });
  });

  return normalized;
}

// Função utilitária para inicializar termos de amostra (offline dictionary)
const createSampleTerms = () => {
  const initialTerms = {};
  SAMPLE_TERMS_KEYS.forEach(key => {
    if (BUILTIN_DICTIONARY[key]) {
      initialTerms[key] = {
        term: BUILTIN_DICTIONARY[key].term,
        definition: BUILTIN_DICTIONARY[key].definition,
        category: BUILTIN_DICTIONARY[key].category,
        connections: [...BUILTIN_DICTIONARY[key].connections],
        notes: "",
        x: Math.random() * 400 + 100,
        y: Math.random() * 250 + 80,
        createdAt: Date.now()
      };
    }
  });
  return initialTerms;
};

/**
 * Carrega os termos, a chave de API e o Google Client ID salvas no IndexedDB de forma assíncrona.
 * Se o banco de dados estiver vazio, inicializa os termos padrão.
 * 
 * @returns {Promise<object>} Retorna um objeto { terms, geminiApiKey, googleClientId }.
 */
export async function loadInitialData() {
  try {
    const savedTerms = await localforage.getItem('studyflow_terms');
    const savedKey = await localforage.getItem('studyflow_api_key');
    const savedGoogleClientId = await localforage.getItem('studyflow_google_client_id');
      
    let terms = normalizeTerms(savedTerms);
    if (!terms || Object.keys(terms).length === 0) {
      terms = createSampleTerms();
      await localforage.setItem('studyflow_terms', terms);
    }
      
    return {
      terms,
      geminiApiKey: typeof savedKey === 'string' ? savedKey : '',
      googleClientId: typeof savedGoogleClientId === 'string' ? savedGoogleClientId : ''
    };
  } catch (error) {
    console.error("Erro ao carregar dados do IndexedDB:", error);
    return {
      terms: createSampleTerms(),
      geminiApiKey: '',
      googleClientId: ''
    };
  }
}

/**
 * Salva a lista de termos no IndexedDB de forma assíncrona.
 * 
 * @param {object} terms - Dicionário completo de termos.
 * @returns {Promise<void>}
 */
export async function saveTerms(terms) {
  try {
    await localforage.setItem('studyflow_terms', terms);
  } catch (error) {
    console.error("Erro ao salvar termos no IndexedDB:", error);
  }
}

/**
 * Salva a chave de API no IndexedDB de forma assíncrona.
 * 
 * @param {string} key - A chave de API do usuário.
 * @returns {Promise<void>}
 */
export async function saveApiKey(key) {
  try {
    if (key && key.trim()) {
      await localforage.setItem('studyflow_api_key', key.trim());
    } else {
      await localforage.removeItem('studyflow_api_key');
    }
  } catch (error) {
    console.error("Erro ao salvar chave de API no IndexedDB:", error);
  }
}

export async function saveGoogleClientId(clientId) {
  try {
    if (clientId && clientId.trim()) {
      await localforage.setItem('studyflow_google_client_id', clientId.trim());
    } else {
      await localforage.removeItem('studyflow_google_client_id');
    }
  } catch (error) {
    console.error("Erro ao salvar Google Client ID no IndexedDB:", error);
  }
}

/**
 * Salva o token de sessão do Google Drive no IndexedDB de forma assíncrona.
 * 
 * @param {string} token - O access_token do Google OAuth2.
 * @returns {Promise<void>}
 */
export async function saveGoogleToken(token) {
  try {
    if (token && token.trim()) {
      await localforage.setItem('studyflow_google_token', token.trim());
      await localforage.setItem('studyflow_google_token_time', Date.now());
    } else {
      await localforage.removeItem('studyflow_google_token');
      await localforage.removeItem('studyflow_google_token_time');
    }
  } catch (error) {
    console.error("Erro ao salvar Token do Google Drive no IndexedDB:", error);
  }
}

/**
 * Carrega o token de sessão do Google Drive do IndexedDB se for válido.
 * Consideramos válido se tiver menos de 50 minutos (3000 segundos).
 * 
 * @returns {Promise<string|null>} Retorna o token ou null.
 */
export async function loadGoogleToken() {
  try {
    const token = await localforage.getItem('studyflow_google_token');
    const tokenTime = await localforage.getItem('studyflow_google_token_time');
    if (token && tokenTime) {
      const elapsedMinutes = (Date.now() - tokenTime) / (1000 * 60);
      if (elapsedMinutes < 50) {
        return token;
      }
    }
    // Remove if expired
    await localforage.removeItem('studyflow_google_token');
    await localforage.removeItem('studyflow_google_token_time');
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Apaga todos os dados do banco de dados (termos e chaves).
 * 
 * @returns {Promise<void>}
 */
export async function clearDatabase() {
  try {
    await localforage.clear();
  } catch (error) {
    console.error("Erro ao limpar IndexedDB:", error);
  }
}
