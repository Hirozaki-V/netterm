# StudyFlow 🧠

**StudyFlow** é uma ferramenta de estudo e memorização completa, interativa e altamente responsiva construída com React e Vite. O sistema foi projetado para estudantes, concurseiros e universitários que desejam organizar termos, conceitos e anotações com auxílio de inteligência artificial e visualizações avançadas.

## 🚀 Funcionalidades Principais

### 1. ⚡ Input Rápido e Minimalista
O Dashboard foca em produtividade com uma caixa de texto ágil para "despejo de conceitos". Basta digitar a palavra ou frase que deseja aprender e pressionar "Enter". O modo offline salva os dados imediatamente, e o modo IA preenche significados automáticos!

### 2. 🤖 Cérebro de IA Integrado (BYOK - Google Gemini)
Ao conectar sua chave gratuita de API do **Google AI Studio (Gemini)** nas configurações, o StudyFlow se transforma! Adicionar uma palavra faz com que o sistema procure seu significado, associe a categorias (Exatas, Humanas, Linguagens, Ciências, etc) e crie links inteligentes de estudo com outras matérias que você já possui. 

### 3. 🕸️ Conexões e Mapas Mentais
Termos não vivem isolados. Você pode interligar termos manualmente ou deixar a IA sugerir conexões. Acesse a aba **Mapa Mental** para visualizar uma teia interativa dos seus conhecimentos, permitindo arrastar, aplicar zoom e analisar dependências conceituais como num "segundo cérebro".

### 4. 🗂️ Grid Inteligente e Painel de Detalhes
Visualização através de *cards neon glassmorphism*. Ao clicar em um card, um painel lateral exibe a definição expandida e permite **Anotações Livres da Aula** (espaço para seus resumos), além da possibilidade de editar o significado, reconectar itens, e acionar o Gemini para re-analisar o termo.

### 5. 🎴 Modo Flashcards
Estude e memorize os termos usando um sistema nativo de cartões virtuais estilo "Frente e Verso". Teste sua memória marcando as respostas como "Ainda Não Sei" ou "Já Aprendi", ideal para revisões diárias espaçadas.

### 6. 📝 Quiz de Conhecimento
Coloque seu aprendizado em jogo num Quiz de múltipla escolha gerado em tempo real com base no seu banco de dados atual! 

### 7. ⏱️ Timer Pomodoro Embutido
Foco absoluto! Um timer pomodoro integrado diretamente na aplicação permite criar ciclos de estudo produtivo e descanso sem precisar usar aplicativos de terceiros.

### 8. ☁️ Segurança e Sincronização em Nuvem (Google Drive)
O app roda de forma nativa e rápida através de IndexedDB (modo Local e Offline 100%). Mas, não perca seus dados:
* **Exportação/Importação Local:** Exporte seus dados como um arquivo `.json` a qualquer momento.
* **Google Drive Sync (BYOC):** Cadastre seu *Client ID do Google OAuth* para habilitar a conexão segura em nuvem e sincronize seus backups diretamente numa pasta invisível (AppDataFolder) do seu Drive, sem comprometer a privacidade de outros arquivos!

### 9. 📱 Mobile-First e Responsividade
Experiência completamente otimizada para Desktop, Tablets e Dispositivos Móveis (Celulares). A aplicação apresenta drawers nativos em celulares, layouts redimensionados em grids auto-fluidos e modais responsivos cobrindo 100% da tela quando necessário.

---

## 🛠️ Tecnologias Utilizadas

- **React.js** (Context API para Estado)
- **Vite**
- **IndexedDB** (Armazenamento offline ultra-rápido via LocalForage)
- **Google OAuth2 & Drive API** (Integração Cloud)
- **Google Gemini SDK** (Modelos `@google/genai`)
- **D3.js** (Renderização dinâmica em grafos de Mapas Mentais)
- **Vanilla CSS3** (Design Glassmorphism de alta estética, sem frameworks engessados)

## 📦 Como rodar localmente

1. Clone este repositório
2. Rode `npm install` no diretório raiz
3. Rode `npm run dev` para subir o servidor na porta 5173/5174.
4. Acesse o IP Local ou localhost listado no console!
