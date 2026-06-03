# 📚 StudyFlow

> **Capture, organize e estude qualquer tema com inteligência.**

StudyFlow é uma aplicação web interativa e premium para estudantes de qualquer área do conhecimento. Basta digitar um termo durante a aula — o app busca automaticamente, resume e organiza tudo para estudo posterior.

---

## ✨ Funcionalidades

- **📥 Entrada Rápida de Termos** — Digite um ou vários termos (separados por vírgula ou Enter) e adicione instantaneamente
- **🔍 Glossário Integrado** — 30+ termos pré-carregados em Ciências, Humanas, Exatas, Linguagens e Tecnologia
- **🤖 Resumos com IA (Gemini API)** — Conecte sua chave da API do Google Gemini para obter resumos gerados por IA de qualquer conceito
- **🃏 Flashcards** — Revise seus termos com cartões 3D interativos de estudo
- **🧠 Modo Quiz** — Teste seus conhecimentos com perguntas de múltipla escolha geradas automaticamente
- **🕸️ Mapa Mental** — Visualize conexões entre termos em um grafo SVG interativo
- **💾 Offline / LocalStorage** — Tudo salvo localmente no navegador — sem conta ou servidor necessário
- **📱 Totalmente Responsivo** — Funciona perfeitamente em desktop, tablet e celular
- **🌙 Modo Escuro** — Design premium com glassmorphism inspirado em cyberpunk

---

## 🚀 Como Usar

Sem instalação necessária! É uma aplicação pura HTML/CSS/JavaScript.

### Opção 1: Abrir Localmente
1. Clone ou baixe este repositório
2. Abra `index.html` em qualquer navegador moderno
3. Comece a adicionar termos!

```bash
git clone https://github.com/Hirozaki-V/netterm.git
cd netterm
# Abra index.html no seu navegador
```

### Opção 2: GitHub Pages
Acesse diretamente em: **https://hirozaki-v.github.io/netterm**

---

## 🔑 Chave da API Gemini (Opcional)

Para resumos automáticos com IA:
1. Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Gere uma chave de API gratuita
3. Abra o app → clique no ⚙️ ícone de Configurações → cole sua chave
4. Agora qualquer novo termo digitado receberá um resumo gerado pela IA!

---

## 📁 Estrutura do Projeto

```
studyflow/
├── index.html       # Estrutura e layout do app
├── style.css        # Tema escuro premium com glassmorphism e responsividade
├── app.js           # Lógica central: estado, armazenamento, API Gemini, flashcards, quiz, mapa mental
├── dictionary.js    # Glossário integrado com 30+ termos multidisciplinares
└── README.md        # Este arquivo
```

---

## 🎓 Exemplo de Uso

Você está em uma aula de Biologia e o professor menciona **"Fotossíntese"**, **"DNA"** e **"Evolução"**. Basta digitar na barra de entrada e pressionar Enter — o app:
1. Encontra a definição no glossário integrado (ou busca na IA do Gemini)
2. Categoriza o termo (Ciências, Humanas, etc.)
3. Mostra termos relacionados e conexões
4. Salva tudo para você estudar depois com Flashcards ou Quiz

---

## 🛠️ Tecnologias

- **HTML5** — Estrutura semântica com acessibilidade (ARIA)
- **CSS3** — Custom properties, glassmorphism, transforms 3D, animações, design responsivo
- **Vanilla JavaScript** — Zero dependências, roda em qualquer lugar
- **Google Gemini API** — Resumos opcionais com IA
- **LocalStorage** — Dados persistentes sem backend

---

## 📄 Licença

MIT License — livre para usar, modificar e compartilhar.

---

Feito com 💙 para estudantes de todas as áreas.
