/**
 * Serviço de Inteligência Artificial desacoplado para o StudyFlow.
 * Esta camada encapsula as chamadas de API, facilitando a substituição
 * ou suporte a múltiplos provedores de IA (como ChatGPT, Claude, etc.) no futuro.
 */

/**
 * Valida uma chave de API do Gemini fazendo uma requisição mínima (ping).
 * 
 * @param {string} apiKey - A chave de API do usuário.
 * @returns {Promise<boolean>} Retorna true se for válida, ou lança um erro com os detalhes.
 */
export async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("A chave de API está em branco.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [{
        text: "Retorne apenas a palavra OK"
      }]
    }],
    generationConfig: {
      maxOutputTokens: 5
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = "Falha ao validar chave.";
    try {
      const errData = await response.json();
      if (errData.error && errData.error.message) {
        errMsg = errData.error.message;
      }
    } catch {
      // Ignora erro de parse
    }
    throw new Error(errMsg);
  }

  return true;
}

/**
 * Obtém a definição e resumo didático de um termo a partir da IA.
 * 
 * @param {string} term - O nome do termo ou conceito.
 * @param {string} [context=""] - Dica ou contexto fornecido pelo usuário para refinar o significado.
 * @param {string} apiKey - A chave de API ativa.
 * @returns {Promise<object>} Objeto JSON com as chaves: term, definition, category, connections.
 */
export async function fetchGeminiSummary(term, context = "", apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Chave de API não configurada.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  let systemPrompt = `Você é um tutor didático multidisciplinar, especialista em diversas áreas do conhecimento.
  Crie um resumo explicativo simplificado porém cientificamente correto sobre o termo/conceito: "${term}".`;
  
  if (context && context.trim() !== "") {
    systemPrompt += `\nUSE ESTE CONTEXTO/DICA PARA DIRECIONAR A EXPLICAÇÃO: "${context.trim()}". Por exemplo, se o termo for ambíguo, explique especificamente com base neste significado.`;
  }
  
  systemPrompt += `\nATENÇÃO IMPORTANTE SOBRE O IDIOMA: O valor da chave "term" no JSON de resposta deve ser EXATAMENTE o termo solicitado ("${term}"), respeitando o idioma original e grafia enviados pelo usuário (por exemplo, se o usuário enviar "Word" ou "Kernel", o valor de "term" deve ser exatamente "Word" ou "Kernel", nunca traduzido para "Palavra" ou "Núcleo"). Se o termo for estrangeiro, você deve explicar a tradução em português exclusivamente dentro do campo "definition".
  Classifique o termo em apenas uma destas categorias aceitas: "ciencias", "humanas", "exatas", "linguagens", "tecnologia", "custom".
  Forneça uma lista de até 3 palavras-chave/termos minúsculos fortemente relacionados.
  A resposta DEVE ser estritamente em formato JSON válido, respeitando o seguinte esquema de chaves:
  {
    "term": "O mesmo termo original solicitado",
    "definition": "Sua explicação em português (limite de 3 parágrafos curtos, cerca de 80-120 palavras)",
    "category": "categoria-escolhida",
    "connections": ["termo-relacionado-1", "termo-relacionado-2"]
  }
  Retorne APENAS o JSON puro. Não englobe com blocos de marcação de markdown (como \`\`\`json).`;

  const payload = {
    contents: [{
      parts: [{
        text: systemPrompt
      }]
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error && errData.error.message) {
        errMsg = errData.error.message;
      }
    } catch {
      // Ignora erro de parse
    }
    throw new Error(errMsg);
  }

  const responseData = await response.json();
  try {
    if (responseData.candidates && responseData.candidates[0] &&
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts &&
        responseData.candidates[0].content.parts[0] &&
        responseData.candidates[0].content.parts[0].text) {
      const jsonText = responseData.candidates[0].content.parts[0].text.trim();
      return JSON.parse(jsonText);
    }
  } catch (parseErr) {
    console.error("Failed to parse Gemini response JSON:", parseErr);
    throw new Error("Resposta da API em formato inválido.", { cause: parseErr });
  }
  throw new Error("Resposta da API vazia ou inválida.");
}

/**
 * Sugere conexões entre termos cadastrados baseado em semântica e contexto.
 * 
 * @param {Array<string>} keys - Array de chaves (slugs) dos termos disponíveis.
 * @param {object} terms - Dicionário completo de termos indexado por slug.
 * @param {string} apiKey - A chave de API ativa.
 * @returns {Promise<Array>} Retorna um array de pares sugeridos, ex: [["termoA", "termoB"], ...].
 */
export async function fetchAiConnections(keys, terms, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Chave de API não configurada.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const termsList = keys.map(k => `ID: "${k}" - Termo: "${terms[k].term}"`).join("\n");
  
  const systemPrompt = `Você é um tutor didático especialista em criar mapas mentais de aprendizado.
  Abaixo está uma lista de termos de estudo atualmente salvos pelo estudante.
  Seu objetivo é analisar os termos e sugerir quais deles possuem uma forte relação direta de aprendizado (ex: causa e efeito, parte-todo, conceito relacionado).
  Retorne as relações sugeridas na forma de pares de IDs.
  A resposta DEVE ser estritamente em formato JSON válido, respeitando o seguinte esquema de chaves:
  {
    "connections": [
      ["id-termo-1", "id-termo-2"],
      ["id-termo-3", "id-termo-4"]
    ]
  }
  Sugira apenas relações que façam real sentido conceitual e limite a no máximo 1.5 vezes o número total de termos.
  Retorne APENAS o JSON puro. Não englobe com blocos de marcação de markdown (como \`\`\`json).

  Lista de Termos:
  ${termsList}`;

  const payload = {
    contents: [{
      parts: [{
        text: systemPrompt
      }]
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const responseData = await response.json();
  try {
    if (responseData.candidates && responseData.candidates[0] &&
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts &&
        responseData.candidates[0].content.parts[0] &&
        responseData.candidates[0].content.parts[0].text) {
      const jsonText = responseData.candidates[0].content.parts[0].text.trim();
      const parsed = JSON.parse(jsonText);
      return parsed.connections || [];
    }
  } catch (parseErr) {
    console.error("Failed to parse Gemini AI Connections response JSON:", parseErr);
    throw new Error("Resposta da API em formato inválido.", { cause: parseErr });
  }
  return [];
}
