import localforage from 'localforage';
import BUILTIN_DICTIONARY from '../data/dictionary';

// Configuração da instância localforage dedicada ao StudyFlow
localforage.config({
  name: 'StudyFlowDB',
  storeName: 'StudyFlowStore'
});

const SAMPLE_TERMS_KEYS = ["fotossintese", "celula", "dna", "democracia", "algoritmo", "metafora", "inteligencia artificial", "energia"];

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
 * Carrega os termos e a chave de API salvas no IndexedDB de forma assíncrona.
 * Se o banco de dados estiver vazio, inicializa os termos padrão.
 * 
 * @returns {Promise<object>} Retorna um objeto { terms, geminiApiKey }.
 */
export async function loadInitialData() {
  try {
    const savedTerms = await localforage.getItem('studyflow_terms');
    const savedKey = await localforage.getItem('studyflow_api_key');
    
    let terms = savedTerms;
    if (!terms || Object.keys(terms).length === 0) {
      terms = createSampleTerms();
      await localforage.setItem('studyflow_terms', terms);
    }
    
    return {
      terms,
      geminiApiKey: savedKey || ''
    };
  } catch (error) {
    console.error("Erro ao carregar dados do IndexedDB:", error);
    return {
      terms: createSampleTerms(),
      geminiApiKey: ''
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
    await localforage.setItem('studyflow_api_key', key);
  } catch (error) {
    console.error("Erro ao salvar chave de API no IndexedDB:", error);
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
