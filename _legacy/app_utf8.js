// State Management
let state = {
  terms: {},
  geminiApiKey: "",
  activeTab: "dashboard",
  selectedTermKey: null,
  filters: {
    search: "",
    category: "all"
  },
  quiz: {
    questions: [],
    currentIndex: 0,
    score: 0,
    userAnswered: false,
    selectedOptionIdx: null
  },
  flashcards: {
    cards: [],
    currentIndex: 0,
    isFlipped: false
  },
  mindmap: {
    draggedNodeId: null,
    dragOffset: { x: 0, y: 0 },
    activeConnSource: null,
    pan: { x: 0, y: 0 },
    zoom: 1,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    physicsEnabled: false,
    selectedNodeId: null,
    animationFrameId: null
  }
};

// Toast timeout reference for cancellation
let toastTimeoutId = null;

// Modal concurrency guard
let _modalOpen = false;

// Shared category color map (DRY ÔÇö used in detail panels)
const CATEGORY_COLORS = {
  "ciencias": { color: "var(--accent-green)", bg: "rgba(16, 185, 129, 0.1)" },
  "humanas": { color: "var(--accent-purple)", bg: "rgba(139, 92, 246, 0.1)" },
  "exatas": { color: "var(--accent-blue)", bg: "rgba(79, 172, 254, 0.1)" },
  "linguagens": { color: "var(--accent-pink)", bg: "rgba(236, 72, 153, 0.1)" },
  "tecnologia": { color: "var(--accent-cyan)", bg: "rgba(0, 242, 254, 0.1)" },
  "custom": { color: "var(--accent-orange)", bg: "rgba(245, 158, 11, 0.1)" }
};

// Utility: Escape HTML to prevent XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Utility: Debounce function to limit rapid calls
function debounce(fn, delay) {
  let timerId;
  return function(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// P7: Focus trap utility for modals (accessibility)
function trapFocus(modalElement) {
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = modalElement.querySelectorAll(focusableSelectors);
  if (focusableElements.length === 0) return () => {};

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handler(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  modalElement.addEventListener('keydown', handler);
  // Focus the first focusable element
  setTimeout(() => firstFocusable.focus(), 100);
  // Return cleanup function
  return () => modalElement.removeEventListener('keydown', handler);
}

// Custom modal helpers for confirms and prompts
function showCustomConfirm(title, message, isDanger = false) {
  // Guard: prevent concurrent modals
  if (_modalOpen) return Promise.resolve(false);
  _modalOpen = true;

  return new Promise((resolve) => {
    elements.confirmModalTitle.innerHTML = title;
    elements.confirmModalMessage.innerHTML = message;
    
    if (isDanger) {
      elements.confirmConfirmBtn.className = "btn-primary btn-danger";
    } else {
      elements.confirmConfirmBtn.className = "btn-primary";
    }
    
    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onKeydown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    
    let releaseFocusTrap;
    function cleanup() {
      elements.confirmConfirmBtn.removeEventListener("click", onConfirm);
      elements.confirmCancelBtn.removeEventListener("click", onCancel);
      elements.closeConfirmModalBtn.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKeydown);
      if (releaseFocusTrap) releaseFocusTrap();
      elements.confirmModal.classList.remove("open");
      _modalOpen = false;
    }
    
    elements.confirmConfirmBtn.addEventListener("click", onConfirm);
    elements.confirmCancelBtn.addEventListener("click", onCancel);
    elements.closeConfirmModalBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKeydown);
    
    elements.confirmModal.classList.add("open");
    releaseFocusTrap = trapFocus(elements.confirmModal);
  });
}

function showCustomPrompt(title, label, placeholder = "") {
  // Guard: prevent concurrent modals
  if (_modalOpen) return Promise.resolve(null);
  _modalOpen = true;

  return new Promise((resolve) => {
    elements.promptModalTitle.innerHTML = title;
    elements.promptModalLabel.innerHTML = label;
    elements.promptModalInput.value = "";
    elements.promptModalInput.placeholder = placeholder;
    
    const onConfirm = () => {
      const val = elements.promptModalInput.value.trim();
      cleanup();
      resolve(val);
    };
    const onCancel = () => {
      cleanup();
      resolve(null);
    };
    const onKeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
      if (e.key === "Escape") {
        onCancel();
      }
    };
    
    let releaseFocusTrap;
    function cleanup() {
      elements.promptConfirmBtn.removeEventListener("click", onConfirm);
      elements.promptCancelBtn.removeEventListener("click", onCancel);
      elements.closePromptModalBtn.removeEventListener("click", onCancel);
      elements.promptModalInput.removeEventListener("keydown", onKeydown);
      if (releaseFocusTrap) releaseFocusTrap();
      elements.promptModal.classList.remove("open");
      _modalOpen = false;
    }
    
    elements.promptConfirmBtn.addEventListener("click", onConfirm);
    elements.promptCancelBtn.addEventListener("click", onCancel);
    elements.closePromptModalBtn.addEventListener("click", onCancel);
    elements.promptModalInput.addEventListener("keydown", onKeydown);
    
    elements.promptModal.classList.add("open");
    releaseFocusTrap = trapFocus(elements.promptModal);
    
    // Auto-focus input after transition
    setTimeout(() => {
      elements.promptModalInput.focus();
    }, 150);
  });
}

// Initial Sample Terms (loaded if LocalStorage is empty)
const SAMPLE_TERMS_KEYS = ["fotossintese", "celula", "dna", "democracia", "algoritmo", "metafora", "inteligencia artificial", "energia"];

// DOM Elements
const elements = {
  // Navigation
  navItems: document.querySelectorAll(".nav-item"),
  tabContents: document.querySelectorAll(".tab-content"),
  apiStatusDot: document.getElementById("api-status-dot"),
  apiStatusText: document.getElementById("api-status-text"),
  openSettingsBtn: document.getElementById("open-settings-btn"),
  
  // Dashboard
  dumpTextarea: document.getElementById("dump-textarea"),
  addTermBtn: document.getElementById("add-term-btn"),
  categoryFilterTabs: document.getElementById("category-filter-tabs"),
  searchInput: document.getElementById("search-input"),
  termsGrid: document.getElementById("terms-grid"),
  
  // Detail Panel
  detailPanel: document.getElementById("detail-panel"),
  detailTitle: document.getElementById("detail-title"),
  detailCategory: document.getElementById("detail-category"),
  detailDefinition: document.getElementById("detail-definition"),
  detailNotesInput: document.getElementById("detail-notes-input"),
  detailConnectionsList: document.getElementById("detail-connections-list"),
  closeDetailBtn: document.getElementById("close-detail-btn"),
  editDefinitionBtn: document.getElementById("edit-definition-btn"),
  regenerateAiBtn: document.getElementById("regenerate-ai-btn"),
  deleteTermBtn: document.getElementById("delete-term-btn"),
  saveNotesBtn: document.getElementById("save-notes-btn"),
  
  // Flashcards
  flashcardStage: document.getElementById("flashcard-stage"),
  flashcardElement: document.getElementById("flashcard-element"),
  fcFrontCategory: document.getElementById("flashcard-front-category"),
  fcFrontTerm: document.getElementById("flashcard-front-term"),
  fcBackCategory: document.getElementById("flashcard-back-category"),
  fcBackDefinition: document.getElementById("flashcard-back-definition"),
  fcCounter: document.getElementById("fc-counter"),
  fcPrevBtn: document.getElementById("fc-prev-btn"),
  fcNextBtn: document.getElementById("fc-next-btn"),
  fcBtnWrong: document.getElementById("fc-btn-wrong"),
  fcBtnCorrect: document.getElementById("fc-btn-correct"),
  
  // Quiz
  quizCard: document.getElementById("quiz-card"),
  quizProgress: document.getElementById("quiz-progress"),
  quizScore: document.getElementById("quiz-score"),
  quizQuestionText: document.getElementById("quiz-question-text"),
  quizOptionsContainer: document.getElementById("quiz-options-container"),
  quizNextBtn: document.getElementById("quiz-next-btn"),
  
  // Mind Map
  mindmapSvg: document.getElementById("mindmap-svg"),
  viewportGroup: document.getElementById("viewport-group"),
  linksGroup: document.getElementById("links-group"),
  nodesGroup: document.getElementById("nodes-group"),
  mmResetBtn: document.getElementById("mm-reset-btn"),
  mmClearLinksBtn: document.getElementById("mm-clear-links-btn"),
  mmPhysicsBtn: document.getElementById("mm-physics-btn"),
  mmAiSuggestBtn: document.getElementById("mm-ai-suggest-btn"),
  mmZoomInBtn: document.getElementById("mm-zoom-in"),
  mmZoomOutBtn: document.getElementById("mm-zoom-out"),
  mmZoomResetBtn: document.getElementById("mm-zoom-reset"),
  mmDetailPanel: document.getElementById("mm-detail-panel"),
  closeMmDetailBtn: document.getElementById("close-mm-detail-btn"),
  mmDetailTitle: document.getElementById("mm-detail-title"),
  mmDetailCategory: document.getElementById("mm-detail-category"),
  mmDetailDefinition: document.getElementById("mm-detail-definition"),
  mmDetailNotes: document.getElementById("mm-detail-notes"),
  mmDetailStudyBtn: document.getElementById("mm-detail-study-btn"),
  
  // Custom Modals
  confirmModal: document.getElementById("confirm-modal"),
  closeConfirmModalBtn: document.getElementById("close-confirm-modal-btn"),
  confirmModalTitle: document.getElementById("confirm-modal-title"),
  confirmModalMessage: document.getElementById("confirm-modal-message"),
  confirmConfirmBtn: document.getElementById("confirm-confirm-btn"),
  confirmCancelBtn: document.getElementById("confirm-cancel-btn"),
  
  promptModal: document.getElementById("prompt-modal"),
  closePromptModalBtn: document.getElementById("close-prompt-modal-btn"),
  promptModalTitle: document.getElementById("prompt-modal-title"),
  promptModalLabel: document.getElementById("prompt-modal-label"),
  promptModalInput: document.getElementById("prompt-modal-input"),
  promptConfirmBtn: document.getElementById("prompt-confirm-btn"),
  promptCancelBtn: document.getElementById("prompt-cancel-btn"),

  // Modals
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsBtn: document.getElementById("close-settings-btn"),
  cancelSettingsBtn: document.getElementById("cancel-settings-btn"),
  saveSettingsBtn: document.getElementById("save-settings-btn"),
  settingsGeminiKey: document.getElementById("settings-gemini-key"),
  exportDbBtn: document.getElementById("export-db-btn"),
  importDbBtn: document.getElementById("import-db-btn"),
  importDbInput: document.getElementById("import-db-input"),
  clearDbBtn: document.getElementById("clear-db-btn"),
  
  editDefModal: document.getElementById("edit-def-modal"),
  closeEditDefBtn: document.getElementById("close-edit-def-btn"),
  cancelEditDefBtn: document.getElementById("cancel-edit-def-btn"),
  saveEditDefBtn: document.getElementById("save-edit-def-btn"),
  editDefTermInput: document.getElementById("edit-def-term"),
  editDefCategorySelect: document.getElementById("edit-def-category"),
  editDefTextarea: document.getElementById("edit-def-textarea"),
  
  addConnModal: document.getElementById("add-conn-modal"),
  closeConnBtn: document.getElementById("close-conn-btn"),
  cancelConnBtn: document.getElementById("cancel-conn-btn"),
  saveConnBtn: document.getElementById("save-conn-btn"),
  connSelect: document.getElementById("conn-select")
};

// Initialize App
window.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEventListeners();
  updateApiStatusUI();
  renderTermsGrid();

  // M3: Close detail panel on mobile "Back" gesture
  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.detailOpen) {
      // Do nothing ÔÇö we're going back to the detail-open state
    } else {
      if (elements.detailPanel.classList.contains("open")) {
        elements.detailPanel.classList.remove("open");
        state.selectedTermKey = null;
      }
    }
  });
});

// Load state from LocalStorage
function loadData() {
  // Load Gemini API Key
  const savedKey = localStorage.getItem("studyflow_api_key");
  state.geminiApiKey = (savedKey !== null && savedKey !== "") ? savedKey : "";
  elements.settingsGeminiKey.value = state.geminiApiKey;
  
  // Load Terms
  const savedTerms = localStorage.getItem("studyflow_terms");
  if (savedTerms) {
    try {
      state.terms = JSON.parse(savedTerms);
    } catch (e) {
      console.error("Error parsing local storage terms", e);
      state.terms = {};
    }
  } else {
    // Populate with initial sample terms from BUILTIN_DICTIONARY
    state.terms = {};
    SAMPLE_TERMS_KEYS.forEach(key => {
      if (BUILTIN_DICTIONARY[key]) {
        state.terms[key] = {
          term: BUILTIN_DICTIONARY[key].term,
          definition: BUILTIN_DICTIONARY[key].definition,
          category: BUILTIN_DICTIONARY[key].category,
          connections: [...BUILTIN_DICTIONARY[key].connections],
          notes: "",
          x: Math.random() * 400 + 100, // Random positions for mindmap
          y: Math.random() * 250 + 80,
          createdAt: Date.now()
        };
      }
    });
    saveData();
  }
}

// Save state to LocalStorage
function saveData() {
  localStorage.setItem("studyflow_terms", JSON.stringify(state.terms));
  localStorage.setItem("studyflow_api_key", state.geminiApiKey);
}

// Update the Gemini API status bar
function updateApiStatusUI() {
  if (state.geminiApiKey.trim() !== "") {
    elements.apiStatusDot.className = "status-dot active";
    elements.apiStatusText.innerText = "API Gemini Ativa (Nuvem)";
    elements.apiStatusDot.style.boxShadow = "0 0 8px var(--accent-cyan)";
  } else {
    elements.apiStatusDot.className = "status-dot local";
    elements.apiStatusText.innerText = "Modo Local (Dicion├írio T├®cnico)";
    elements.apiStatusDot.style.boxShadow = "0 0 8px var(--accent-green)";
  }
}

// Set up UI Event Handlers
function setupEventListeners() {
  // Tab Navigation
  elements.navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
    // Keyboard accessibility: Enter and Space activate tabs
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const tabId = item.getAttribute("data-tab");
        switchTab(tabId);
      }
    });
  });

  // Settings Modal toggles
  elements.openSettingsBtn.addEventListener("click", () => {
    elements.settingsGeminiKey.value = state.geminiApiKey;
    elements.settingsModal.classList.add("open");
  });
  elements.closeSettingsBtn.addEventListener("click", () => elements.settingsModal.classList.remove("open"));
  elements.cancelSettingsBtn.addEventListener("click", () => elements.settingsModal.classList.remove("open"));
  
  elements.saveSettingsBtn.addEventListener("click", () => {
    state.geminiApiKey = elements.settingsGeminiKey.value.trim();
    saveData();
    updateApiStatusUI();
    elements.settingsModal.classList.remove("open");
    // Show notification alert
    showToast("Configura├º├Áes salvas com sucesso!");
  });

  // Export DB
  elements.exportDbBtn.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.terms, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `studyflow_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Import DB
  elements.importDbBtn.addEventListener("click", () => {
    elements.importDbInput.click();
  });
  elements.importDbInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // S5: File size limit (10MB max) to prevent browser freeze
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      showToast("Arquivo muito grande (m├íx 10MB).", true);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        if (typeof importedData === 'object' && importedData !== null && !Array.isArray(importedData)) {
          // Validate each entry has required fields before merging
          const validatedData = {};
          let skipped = 0;
          Object.keys(importedData).forEach(key => {
            const item = importedData[key];
            if (item && typeof item === 'object' && typeof item.term === 'string' && typeof item.definition === 'string') {
              validatedData[key] = {
                term: item.term,
                definition: item.definition,
                category: typeof item.category === 'string' ? item.category : 'custom',
                connections: Array.isArray(item.connections) ? item.connections.filter(c => typeof c === 'string') : [],
                notes: typeof item.notes === 'string' ? item.notes : '',
                x: typeof item.x === 'number' ? item.x : Math.random() * 400 + 100,
                y: typeof item.y === 'number' ? item.y : Math.random() * 250 + 80,
                createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now()
              };
            } else {
              skipped++;
            }
          });
          state.terms = { ...state.terms, ...validatedData };
          saveData();
          renderTermsGrid();
          const imported = Object.keys(validatedData).length;
          showToast(`${imported} termo(s) importado(s)${skipped > 0 ? `, ${skipped} ignorado(s) (formato inv├ílido)` : ''}!`);
        } else {
          showToast("Formato de arquivo inv├ílido. Esperado um objeto JSON.", true);
        }
      } catch (err) {
        showToast("Erro ao processar o arquivo JSON.", true);
      }
      // B5 fix: reset input so re-importing the same file triggers 'change'
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  // Clear DB
  elements.clearDbBtn.addEventListener("click", async () => {
    const confirmed = await showCustomConfirm(
      `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-pink);"></i> Limpar Banco de Dados`,
      "ATEN├ç├âO: Isso apagar├í TODOS os seus termos cadastrados! Deseja continuar?",
      true
    );
    if (confirmed) {
      state.terms = {};
      saveData();
      renderTermsGrid();
      elements.settingsModal.classList.remove("open");
      showToast("Banco de dados local limpo.");
    }
  });

  // Add Term Event Handlers
  elements.addTermBtn.addEventListener("click", processDumpInput);
  elements.dumpTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processDumpInput();
    }
  });

  // Search input change (debounced for performance)
  const debouncedSearch = debounce((value) => {
    state.filters.search = value.toLowerCase().trim();
    renderTermsGrid();
  }, 200);
  elements.searchInput.addEventListener("input", (e) => {
    debouncedSearch(e.target.value);
  });

  // Filter category tabs
  elements.categoryFilterTabs.addEventListener("click", (e) => {
    const target = e.target.closest(".filter-tab");
    if (!target) return;
    
    elements.categoryFilterTabs.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
    target.classList.add("active");
    
    state.filters.category = target.getAttribute("data-filter");
    renderTermsGrid();
  });

  // Close Detail side drawer
  elements.closeDetailBtn.addEventListener("click", () => {
    elements.detailPanel.classList.remove("open");
    state.selectedTermKey = null;
  });

  // Edit Definition Modal Toggles
  elements.editDefinitionBtn.addEventListener("click", () => {
    if (!state.selectedTermKey || !state.terms[state.selectedTermKey]) return;
    const item = state.terms[state.selectedTermKey];
    elements.editDefTermInput.value = item.term;
    elements.editDefCategorySelect.value = item.category || "custom";
    elements.editDefTextarea.value = item.definition;
    elements.editDefModal.classList.add("open");
  });
  elements.closeEditDefBtn.addEventListener("click", () => elements.editDefModal.classList.remove("open"));
  elements.cancelEditDefBtn.addEventListener("click", () => elements.editDefModal.classList.remove("open"));
  elements.saveEditDefBtn.addEventListener("click", () => {
    const key = state.selectedTermKey;
    if (!key || !state.terms[key]) return;
    
    state.terms[key].category = elements.editDefCategorySelect.value;
    state.terms[key].definition = elements.editDefTextarea.value.trim();
    
    saveData();
    elements.editDefModal.classList.remove("open");
    openDetailPanel(key); // Refresh detail panel
    renderTermsGrid();    // Refresh grid
  });
  
  // Regenerate term using Gemini API
  elements.regenerateAiBtn.addEventListener("click", regenerateTermWithAi);

  // Save Notes and Details changes
  elements.saveNotesBtn.addEventListener("click", () => {
    const key = state.selectedTermKey;
    if (!key || !state.terms[key]) return;
    
    state.terms[key].notes = elements.detailNotesInput.value;
    saveData();
    renderTermsGrid();
    showToast("Notas da aula salvas!");
  });

  // Delete Term (uses unified deleteTerm)
  elements.deleteTermBtn.addEventListener("click", () => {
    const key = state.selectedTermKey;
    if (!key) return;
    deleteTerm(key);
  });

  // Connect terms modal
  elements.closeConnBtn.addEventListener("click", () => elements.addConnModal.classList.remove("open"));
  elements.cancelConnBtn.addEventListener("click", () => elements.addConnModal.classList.remove("open"));
  elements.saveConnBtn.addEventListener("click", () => {
    const sourceKey = state.selectedTermKey;
    const destKey = elements.connSelect.value;
    if (!sourceKey || !destKey || sourceKey === destKey) return;
    
    // Bidirectional connection
    if (!state.terms[sourceKey].connections.includes(destKey)) {
      state.terms[sourceKey].connections.push(destKey);
    }
    if (!state.terms[destKey].connections.includes(sourceKey)) {
      state.terms[destKey].connections.push(sourceKey);
    }
    
    saveData();
    elements.addConnModal.classList.remove("open");
    openDetailPanel(sourceKey); // refresh
    showToast("Conex├úo estabelecida!");
  });

  // Flashcards Flipping
  elements.flashcardStage.addEventListener("click", () => {
    elements.flashcardElement.classList.toggle("flipped");
    state.flashcards.isFlipped = !state.flashcards.isFlipped;
  });

  // Flashcards Study Score Buttons
  elements.fcBtnCorrect.addEventListener("click", (e) => {
    e.stopPropagation(); // Stop flipping
    showToast("Muito bem! Cart├úo memorizado.");
    advanceFlashcard(1);
  });
  elements.fcBtnWrong.addEventListener("click", (e) => {
    e.stopPropagation(); // Stop flipping
    showToast("Vamos refor├ºar esse depois.");
    advanceFlashcard(1);
  });

  // Flashcards Navigation
  elements.fcPrevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    advanceFlashcard(-1);
  });
  elements.fcNextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    advanceFlashcard(1);
  });

  // Quiz Navigation
  elements.quizNextBtn.addEventListener("click", () => {
    elements.quizNextBtn.style.display = "none";
    state.quiz.currentIndex++;
    renderQuizQuestion();
  });

  // Mind map custom buttons
  elements.mmResetBtn.addEventListener("click", () => {
    arrangeMindmapNodesCircle();
    renderMindmap();
    showToast("Mapa mental reorganizado em c├¡rculo.");
  });

  elements.mmClearLinksBtn.addEventListener("click", async () => {
    const confirmed = await showCustomConfirm(
      `<i class="fa-solid fa-link-slash" style="color: var(--accent-pink);"></i> Limpar Conex├Áes`,
      "Deseja apagar todas as conex├Áes entre termos? Isso n├úo apagar├í os termos em si.",
      true
    );
    if (confirmed) {
      Object.keys(state.terms).forEach(k => {
        state.terms[k].connections = [];
      });
      saveData();
      renderMindmap();
      showToast("Conex├Áes limpas.");
    }
  });

  elements.mmPhysicsBtn.addEventListener("click", () => {
    togglePhysics();
  });

  elements.mmAiSuggestBtn.addEventListener("click", () => {
    suggestConnectionsWithAi();
  });

  // Zoom controls
  elements.mmZoomInBtn.addEventListener("click", () => adjustZoom(1.2));
  elements.mmZoomOutBtn.addEventListener("click", () => adjustZoom(0.8));
  elements.mmZoomResetBtn.addEventListener("click", () => resetZoomPan());

  // Details panel controls
  elements.closeMmDetailBtn.addEventListener("click", () => {
    elements.mmDetailPanel.classList.remove("open");
    state.mindmap.selectedNodeId = null;
    renderMindmap();
  });

  elements.mmDetailStudyBtn.addEventListener("click", () => {
    const key = state.mindmap.selectedNodeId;
    if (!key) return;
    switchTab("flashcards");
    const idx = state.flashcards.cards.indexOf(key);
    if (idx !== -1) {
      state.flashcards.currentIndex = idx;
      renderFlashcard();
    }
  });

  // SVG Pan / Drag / Click connection logic
  setupSvgHandlers();

  // Mobile sidebar toggle with backdrop
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  const sidebar = document.querySelector(".app-sidebar-nav");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (mobileToggle) mobileToggle.classList.remove("active");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("visible");
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (mobileToggle) mobileToggle.classList.add("active");
    if (sidebarBackdrop) sidebarBackdrop.classList.add("visible");
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
    // Close sidebar when tapping backdrop
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener("click", closeSidebar);
    }
    // Close sidebar when a nav item is clicked on mobile
    elements.navItems.forEach(item => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
          closeSidebar();
        }
      });
    });
  }
}

// Switch between App Tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Clean up mindmap states when leaving the tab
  if (tabId !== "mindmap") {
    stopPhysics();
    if (elements.mmDetailPanel) {
      elements.mmDetailPanel.classList.remove("open");
    }
    state.mindmap.selectedNodeId = null;
  }
  
  // Update nav UI
  elements.navItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update tabs views
  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });

  // Specific tab initializations
  if (tabId === "flashcards") {
    initFlashcards();
  } else if (tabId === "quiz") {
    initQuiz();
  } else if (tabId === "mindmap") {
    initMindmap();
  }
}

// Show toast notifications
function showToast(message, isError = false) {
  let toast = document.getElementById("studyflow-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "studyflow-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "2rem";
    toast.style.right = "2rem";
    toast.style.padding = "0.75rem 1.5rem";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "0.9rem";
    toast.style.fontWeight = "600";
    toast.style.color = "var(--bg-primary)";
    toast.style.zIndex = "1000";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    toast.style.transition = "all 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    document.body.appendChild(toast);
  }
  
  toast.style.background = isError 
    ? "linear-gradient(135deg, #ef4444 0%, #ec4899 100%)" 
    : "linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%)";
  toast.innerText = message;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  // Cancel any previous timeout to prevent premature hiding
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toastTimeoutId = null;
  }, 3000);
}

// ----------------------------------------------------
// DUMP & PROCESS CONTROLLERS
// ----------------------------------------------------

async function processDumpInput() {
  const rawInput = elements.dumpTextarea.value.trim();
  if (!rawInput) return;

  // Clear input
  elements.dumpTextarea.value = "";
  
  // Split terms by commas, semicolons or lines
  const rawTerms = rawInput.split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length > 0);
  if (rawTerms.length === 0) return;

  showToast(`Processando ${rawTerms.length} termo(s)...`);

  for (let termText of rawTerms) {
    // Parse term and potential context (e.g. "Word (Office)" or "Word: Office")
    const match = termText.match(/^([^(:\n]+)(?:\(([^)]+)\)|:([^\n]+))?$/);
    let cleanTerm = termText;
    let context = "";
    if (match) {
      cleanTerm = match[1].trim();
      context = (match[2] || match[3] || "").trim();
    }

    const slug = termText.toLowerCase().replace(/[^a-z0-9├á-├║\s/-]/gi, '').trim();
    if (!slug) continue;
    
    // Check if it already exists
    if (state.terms[slug]) {
      continue;
    }

    // Set temp loading term state
    state.terms[slug] = {
      term: cleanTerm,
      definition: "Processando informa├º├Áes...",
      category: "custom",
      connections: [],
      notes: "",
      x: Math.random() * 400 + 100,
      y: Math.random() * 250 + 80,
      createdAt: Date.now(),
      loading: true
    };
    renderTermsGrid();

    // Check BUILTIN Glossary first (using cleanTerm slug)
    const cleanSlug = cleanTerm.toLowerCase().replace(/[^a-z0-9├á-├║\s/-]/gi, '').trim();
    const cleanLookup = cleanSlug.replace(/-/g, ' ');
    let matchedKey = null;
    
    if (BUILTIN_DICTIONARY[cleanSlug]) {
      matchedKey = cleanSlug;
    } else {
      matchedKey = Object.keys(BUILTIN_DICTIONARY).find(key => 
        key === cleanLookup || cleanLookup.includes(key) || key.includes(cleanLookup)
      );
    }

    if (matchedKey) {
      // Local Glossary Match
      const glossaryItem = BUILTIN_DICTIONARY[matchedKey];
      state.terms[slug] = {
        term: glossaryItem.term,
        definition: glossaryItem.definition,
        category: glossaryItem.category,
        connections: [...glossaryItem.connections],
        notes: "",
        x: Math.random() * 400 + 100,
        y: Math.random() * 250 + 80,
        createdAt: Date.now()
      };
      
      // Let's resolve connections if their keys exist in state
      state.terms[slug].connections = glossaryItem.connections.filter(c => state.terms[c] !== undefined);
      // Link back as well
      state.terms[slug].connections.forEach(connKey => {
        if (state.terms[connKey] && !state.terms[connKey].connections.includes(slug)) {
          state.terms[connKey].connections.push(slug);
        }
      });
      
      // P2: saveData removed here ÔÇö batch save at end of function
      renderTermsGrid();
    } else if (state.geminiApiKey.trim() !== "") {
      // API Gemini Call with context!
      try {
        const aiResult = await fetchGeminiSummary(cleanTerm, context);
        if (aiResult) {
          state.terms[slug] = {
            term: aiResult.term || cleanTerm,
            definition: aiResult.definition || "Sem defini├º├úo dispon├¡vel.",
            category: aiResult.category || "custom",
            connections: [],
            notes: "",
            x: Math.random() * 400 + 100,
            y: Math.random() * 250 + 80,
            createdAt: Date.now()
          };
          
          // Map related suggestions to existing terms if possible
          if (Array.isArray(aiResult.connections)) {
            aiResult.connections.forEach(connSlug => {
              const cleanedConn = connSlug.toLowerCase().trim();
              if (state.terms[cleanedConn]) {
                if (!state.terms[slug].connections.includes(cleanedConn)) {
                  state.terms[slug].connections.push(cleanedConn);
                }
                if (!state.terms[cleanedConn].connections.includes(slug)) {
                  state.terms[cleanedConn].connections.push(slug);
                }
              }
            });
          }
          
          // P2: saveData removed here ÔÇö batch save at end of function
          renderTermsGrid();
        } else {
          throw new Error("Empty Response");
        }
      } catch (err) {
        console.error("Gemini API Error", err);
        state.terms[slug] = {
          term: cleanTerm,
          definition: "N├úo foi poss├¡vel resumir online. Clique em 'Editar Significado' para escrever o resumo voc├¬ mesmo.",
          category: "custom",
          connections: [],
          notes: "",
          x: Math.random() * 400 + 100,
          y: Math.random() * 250 + 80,
          createdAt: Date.now()
        };
        // P2: saveData removed here ÔÇö batch save at end of function
        renderTermsGrid();
        showToast(`Erro na API ao resumir "${cleanTerm}". Modo Local Ativado.`, true);
      }
    } else {
      // Local default for custom unknown words
      state.terms[slug] = {
        term: cleanTerm,
        definition: "Defini├º├úo n├úo cadastrada no dicion├írio offline. Clique em 'Editar Significado' para resumir.",
        category: "custom",
        connections: [],
        notes: "",
        x: Math.random() * 400 + 100,
        y: Math.random() * 250 + 80,
        createdAt: Date.now()
      };
    }
  }

  // Batch save and render once after processing all terms
  saveData();
  renderTermsGrid();
  showToast("Termos processados!");
}

// Fetch summaries directly from client-side Gemini API
async function fetchGeminiSummary(term, context = "") {
  const apiKey = state.geminiApiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  let systemPrompt = `Voc├¬ ├® um tutor did├ítico multidisciplinar, especialista em diversas ├íreas do conhecimento.
  Crie um resumo explicativo simplificado por├®m cientificamente correto sobre o termo/conceito: "${term}".`;
  
  if (context.trim() !== "") {
    systemPrompt += `\nUSE ESTE CONTEXTO/DICA PARA DIRECIONAR A EXPLICA├ç├âO: "${context.trim()}". Por exemplo, se o termo for amb├¡guo, explique especificamente com base neste significado.`;
  }
  
  systemPrompt += `\nATEN├ç├âO IMPORTANTE SOBRE O IDIOMA: O valor da chave "term" no JSON de resposta deve ser EXATAMENTE o termo solicitado ("${term}"), respeitando o idioma original e grafia enviados pelo usu├írio (por exemplo, se o usu├írio enviar "Word" ou "Kernel", o valor de "term" deve ser exatamente "Word" ou "Kernel", nunca traduzido para "Palavra" ou "N├║cleo"). Se o termo for estrangeiro, voc├¬ deve explicar a tradu├º├úo em portugu├¬s exclusivamente dentro do campo "definition".
  Classifique o termo em apenas uma destas categorias aceitas: "ciencias", "humanas", "exatas", "linguagens", "tecnologia", "custom".
  Forne├ºa uma lista de at├® 3 palavras-chave/termos min├║sculos fortemente relacionados.
  A resposta DEVE ser estritamente em formato JSON v├ílido, respeitando o seguinte esquema de chaves:
  {
    "term": "O mesmo termo original solicitado",
    "definition": "Sua explica├º├úo em portugu├¬s (limite de 3 par├ígrafos curtos, cerca de 80-120 palavras)",
    "category": "categoria-escolhida",
    "connections": ["termo-relacionado-1", "termo-relacionado-2"]
  }
  Retorne APENAS o JSON puro. N├úo englobe com blocos de marca├º├úo de markdown (como \`\`\`json).`;

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
    } catch (_) {}
    throw new Error(errMsg);
  }

  const responseData = await response.json();
  
  // Parse response with robust error handling
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
    throw new Error("Resposta da API em formato inv├ílido.");
  }
  return null;
}

// ----------------------------------------------------
// BOARD RENDERING (DASHBOARD)
// ----------------------------------------------------

function renderTermsGrid() {
  elements.termsGrid.innerHTML = "";
  
  // Filter Terms
  const filteredTerms = Object.keys(state.terms).filter(key => {
    const item = state.terms[key];
    const matchSearch = item.term.toLowerCase().includes(state.filters.search) || 
                        (item.definition || '').toLowerCase().includes(state.filters.search) ||
                        (item.notes || '').toLowerCase().includes(state.filters.search);
    
    const matchCategory = state.filters.category === "all" || item.category === state.filters.category;
    
    return matchSearch && matchCategory;
  });

  if (filteredTerms.length === 0) {
    elements.termsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open empty-icon"></i>
        <h4 class="empty-title">Nenhum termo por aqui!</h4>
        <p class="empty-desc">Experimente digitar termos na barra superior ou mude o filtro para visualizar outros cart├Áes.</p>
      </div>
    `;
    return;
  }

  // Sort terms by date created descending
  filteredTerms.sort((a, b) => state.terms[b].createdAt - state.terms[a].createdAt);

  filteredTerms.forEach(key => {
    const item = state.terms[key];
    const card = document.createElement("div");
    card.className = `term-card ${item.category || 'custom'}`;
    if (item.loading) card.classList.add("loading");
    card.setAttribute("data-key", key);

    const connectionsCount = item.connections ? item.connections.length : 0;
    const catLabel = getCategoryLabel(item.category);

    card.innerHTML = `
      <div>
        <div class="card-header">
          <h4 class="card-title">${escapeHTML(item.term)}</h4>
          <div class="card-actions">
            <button class="card-action-btn delete" data-delete-key="${escapeHTML(key)}" title="Excluir">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
        <p class="card-body">${escapeHTML(item.definition)}</p>
      </div>
      <div class="card-footer">
        <span class="card-category">${escapeHTML(catLabel)}</span>
        ${connectionsCount > 0 ? `
          <span class="card-connections-count" title="${connectionsCount} conex├Áes de termos">
            <i class="fa-solid fa-link"></i> ${connectionsCount}
          </span>
        ` : ''}
      </div>
    `;

    // Attach delete handler via data attribute (safer than inline onclick)
    const deleteBtn = card.querySelector('[data-delete-key]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTerm(key);
      });
    }

    // Click on card opens side drawer details
    card.addEventListener("click", () => {
      if (item.loading) return;
      openDetailPanel(key);
    });

    elements.termsGrid.appendChild(card);
  });
}

// Unified term deletion (S1 XSS-safe, B3 null-check, R3 single source of truth)
async function deleteTerm(key) {
  if (!state.terms[key]) return; // B3: null-check
  const termName = escapeHTML(state.terms[key].term); // S1: XSS-safe
  const confirmed = await showCustomConfirm(
    `<i class="fa-solid fa-trash-can" style="color: var(--accent-pink);"></i> Excluir Termo`,
    `Excluir o termo "${termName}"?`,
    true
  );
  if (confirmed) {
    Object.keys(state.terms).forEach(otherKey => {
      if (Array.isArray(state.terms[otherKey].connections)) {
        state.terms[otherKey].connections = state.terms[otherKey].connections.filter(c => c !== key);
      }
    });
    delete state.terms[key];
    saveData();
    if (state.selectedTermKey === key) {
      elements.detailPanel.classList.remove("open");
      state.selectedTermKey = null;
    }
    renderTermsGrid();
    showToast("Termo removido.");
  }
}

function getCategoryLabel(cat) {
  const dict = {
    "ciencias": "Ci├¬ncias",
    "humanas": "Humanas",
    "exatas": "Exatas",
    "linguagens": "Linguagens",
    "tecnologia": "Tecnologia",
    "custom": "Personalizado"
  };
  return dict[cat] || "Personalizado";
}

// ----------------------------------------------------
// DETAILS PANEL CONTROLLER
// ----------------------------------------------------

function openDetailPanel(key) {
  const item = state.terms[key];
  if (!item) return;

  state.selectedTermKey = key;
  elements.detailTitle.innerText = item.term;
  
  // Category indicator
  elements.detailCategory.innerText = getCategoryLabel(item.category);
  elements.detailCategory.className = `detail-category-badge`;
  
  // Specific category styling (uses shared CATEGORY_COLORS constant)
  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS["custom"];
  elements.detailCategory.style.color = catStyle.color;
  elements.detailCategory.style.background = catStyle.bg;
  elements.detailCategory.style.border = `1px solid ${catStyle.color}`;
  
  // Definition and lecture notes
  elements.detailDefinition.innerText = item.definition;
  elements.detailNotesInput.value = item.notes || "";
  
  // Render connected terms
  elements.detailConnectionsList.innerHTML = "";
  if (item.connections && item.connections.length > 0) {
    item.connections.forEach(connKey => {
      const connItem = state.terms[connKey];
      if (connItem) {
        const pill = document.createElement("div");
        pill.className = "connection-pill";
        pill.innerHTML = `
          <span>${escapeHTML(connItem.term)}</span>
          <i class="fa-solid fa-xmark connection-delete" title="Romper conex├úo"></i>
        `;
        // Delete connection handler via addEventListener (safer than inline onclick)
        const deleteIcon = pill.querySelector('.connection-delete');
        deleteIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          removeConnection(key, connKey);
        });
        pill.addEventListener("click", () => {
          openDetailPanel(connKey);
        });
        elements.detailConnectionsList.appendChild(pill);
      }
    });
  }
  
  // Add Connection Button
  const addBtn = document.createElement("div");
  addBtn.className = "connection-pill add-connection-btn";
  addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Conectar...`;
  addBtn.onclick = openAddConnectionDialog;
  elements.detailConnectionsList.appendChild(addBtn);

  // Open the panel
  elements.detailPanel.classList.add("open");

  // M3: Push history state so mobile "Back" can close this panel
  if (window.innerWidth <= 1024) {
    history.pushState({ detailOpen: true }, "");
  }
}

// Regenerate term using Gemini API
async function regenerateTermWithAi() {
  const key = state.selectedTermKey;
  if (!key || !state.terms[key]) return;
  
  if (!state.geminiApiKey || state.geminiApiKey.trim() === "") {
    showToast("Por favor, configure uma chave da API do Gemini nas configura├º├Áes.", true);
    return;
  }
  
  const originalTerm = state.terms[key].term;
  const context = await showCustomPrompt(
    `<i class="fa-solid fa-wand-magic-sparkles" style="color: var(--accent-cyan);"></i> Dica para a IA`,
    `Deseja fornecer algum contexto ou dica para guiar o Gemini sobre <strong>"${originalTerm}"</strong>? (Ex: 'ferramenta de office', 'em biologia', 'tecnologia', etc.)`,
    "Deixe em branco para busca geral..."
  );
  if (context === null) return; // User cancelled
  
  showToast(`Consultando Gemini para "${originalTerm}"...`);
  
  state.terms[key].definition = "Consultando intelig├¬ncia artificial do Gemini... Aguarde.";
  openDetailPanel(key);
  renderTermsGrid();
  
  try {
    const aiResult = await fetchGeminiSummary(originalTerm, context);
    if (aiResult) {
      state.terms[key].term = aiResult.term || originalTerm;
      state.terms[key].definition = aiResult.definition || "Sem defini├º├úo dispon├¡vel.";
      state.terms[key].category = aiResult.category || state.terms[key].category;
      
      if (Array.isArray(aiResult.connections)) {
        aiResult.connections.forEach(connSlug => {
          const cleanedConn = connSlug.toLowerCase().trim();
          if (state.terms[cleanedConn] && cleanedConn !== key) {
            if (!state.terms[key].connections.includes(cleanedConn)) {
              state.terms[key].connections.push(cleanedConn);
            }
            if (!state.terms[cleanedConn].connections.includes(key)) {
              state.terms[cleanedConn].connections.push(key);
            }
          }
        });
      }
      
      saveData();
      openDetailPanel(key);
      renderTermsGrid();
      showToast("Termo atualizado com sucesso!");
    } else {
      throw new Error("Resposta da IA vazia ou inv├ílida.");
    }
  } catch (err) {
    console.error("Gemini API Error during regeneration:", err);
    state.terms[key].definition = `Erro ao consultar API do Gemini.\n\nDetalhes: ${err.message}\n\nVerifique se a chave de API fornecida nas configura├º├Áes est├í correta.`;
    openDetailPanel(key);
    renderTermsGrid();
    showToast("Erro ao consultar o Gemini.", true);
  }
}

function openAddConnectionDialog() {
  const currentKey = state.selectedTermKey;
  if (!currentKey) return;

  // Clear options
  elements.connSelect.innerHTML = "";
  
  // Populate select options with all terms EXCEPT current and already connected terms
  const currentItem = state.terms[currentKey];
  let hasEligible = false;

  Object.keys(state.terms).forEach(key => {
    if (key !== currentKey && !currentItem.connections.includes(key)) {
      const option = document.createElement("option");
      option.value = key;
      option.text = state.terms[key].term;
      elements.connSelect.appendChild(option);
      hasEligible = true;
    }
  });

  if (!hasEligible) {
    showToast("N├úo h├í outros termos dispon├¡veis para conectar.", true);
    return;
  }

  elements.addConnModal.classList.add("open");
}

function removeConnection(termA, termB) {
  if (state.terms[termA]) {
    state.terms[termA].connections = state.terms[termA].connections.filter(c => c !== termB);
  }
  if (state.terms[termB]) {
    state.terms[termB].connections = state.terms[termB].connections.filter(c => c !== termA);
  }
  saveData();
  openDetailPanel(termA);
  showToast("Conex├úo removida.");
}

// ----------------------------------------------------
// STUDY MODULE: FLASHCARDS
// ----------------------------------------------------

function initFlashcards() {
  state.flashcards.cards = Object.keys(state.terms);
  state.flashcards.currentIndex = 0;
  state.flashcards.isFlipped = false;
  elements.flashcardElement.classList.remove("flipped");
  
  renderFlashcard();
}

function renderFlashcard() {
  const keys = state.flashcards.cards;
  if (keys.length === 0) {
    elements.flashcardStage.style.display = "none";
    elements.fcBtnCorrect.style.display = "none";
    elements.fcBtnWrong.style.display = "none";
    elements.fcPrevBtn.style.display = "none";
    elements.fcNextBtn.style.display = "none";
    elements.fcCounter.innerText = "Nenhum termo cadastrado.";
    
    // Add custom helper inside wrapper
    const wrapper = document.querySelector(".flashcards-wrapper");
    let helpMsg = document.getElementById("fc-help-msg");
    if (!helpMsg) {
      helpMsg = document.createElement("p");
      helpMsg.id = "fc-help-msg";
      helpMsg.className = "empty-desc";
      helpMsg.innerHTML = "Adicione palavras no seu Dashboard para poder gerar Flashcards de estudo!";
      wrapper.appendChild(helpMsg);
    }
    return;
  }

  elements.flashcardStage.style.display = "block";
  elements.fcBtnCorrect.style.display = "flex";
  elements.fcBtnWrong.style.display = "flex";
  elements.fcPrevBtn.style.display = "flex";
  elements.fcNextBtn.style.display = "flex";
  const helpMsg = document.getElementById("fc-help-msg");
  if (helpMsg) helpMsg.remove();

  const currentKey = keys[state.flashcards.currentIndex];
  const item = state.terms[currentKey];
  
  elements.fcFrontTerm.innerText = item.term;
  elements.fcFrontCategory.innerText = getCategoryLabel(item.category);
  elements.fcBackCategory.innerText = "Defini├º├úo - " + getCategoryLabel(item.category);
  
  // Combine definition and personal notes (escape user content to prevent XSS)
  let explanation = `<p>${escapeHTML(item.definition)}</p>`;
  if (item.notes) {
    explanation += `<div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 0.85rem; color: var(--accent-cyan); text-align: left;"><i class="fa-solid fa-pen"></i> <strong>Anota├º├Áes:</strong> ${escapeHTML(item.notes)}</div>`;
  }
  elements.fcBackDefinition.innerHTML = explanation;
  
  elements.fcCounter.innerText = `${state.flashcards.currentIndex + 1} / ${keys.length}`;
}

function advanceFlashcard(offset) {
  const count = state.flashcards.cards.length;
  if (count === 0) return;
  
  // Reset flipped state first with animation delay if flipped
  if (state.flashcards.isFlipped) {
    elements.flashcardElement.classList.remove("flipped");
    state.flashcards.isFlipped = false;
    setTimeout(() => {
      changeCardIndex();
    }, 200);
  } else {
    changeCardIndex();
  }

  function changeCardIndex() {
    state.flashcards.currentIndex = (state.flashcards.currentIndex + offset + count) % count;
    renderFlashcard();
  }
}

// ----------------------------------------------------
// STUDY MODULE: QUIZ
// ----------------------------------------------------

function initQuiz() {
  const keys = Object.keys(state.terms);
  if (keys.length < 4) {
    elements.quizCard.innerHTML = `
      <div class="empty-state" style="padding: 2rem 0;">
        <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: var(--accent-orange)"></i>
        <h4 class="empty-title">Termos Insuficientes</h4>
        <p class="empty-desc">Voc├¬ precisa de pelo menos <strong>4 termos cadastrados</strong> para gerar perguntas de m├║ltipla escolha. Atualmente voc├¬ tem apenas ${keys.length}.</p>
      </div>
    `;
    return;
  }

  // Restore initial HTML structure for active quiz
  elements.quizCard.innerHTML = `
    <div class="quiz-header">
      <span class="quiz-progress" id="quiz-progress">Pergunta 0 de 0</span>
      <span class="quiz-score" id="quiz-score">Acertos: 0</span>
    </div>
    <div class="quiz-question-container">
      <p class="quiz-question" id="quiz-question-text">Carregando pergunta...</p>
    </div>
    <div class="quiz-options" id="quiz-options-container"></div>
    <div class="quiz-footer">
      <button class="btn-primary" id="quiz-next-btn" style="display: none;">
        Pr├│xima Pergunta <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  `;

  // Re-hook pointers
  elements.quizProgress = document.getElementById("quiz-progress");
  elements.quizScore = document.getElementById("quiz-score");
  elements.quizQuestionText = document.getElementById("quiz-question-text");
  elements.quizOptionsContainer = document.getElementById("quiz-options-container");
  elements.quizNextBtn = document.getElementById("quiz-next-btn");
  elements.quizNextBtn.addEventListener("click", () => {
    elements.quizNextBtn.style.display = "none";
    state.quiz.currentIndex++;
    renderQuizQuestion();
  });

  // Setup 10 random questions
  state.quiz.questions = generateQuizQuestions(keys, 10);
  state.quiz.currentIndex = 0;
  state.quiz.score = 0;
  
  renderQuizQuestion();
}

function generateQuizQuestions(allKeys, maxQuestions) {
  const questions = [];
  const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
  const quizLength = Math.min(shuffledKeys.length, maxQuestions);

  for (let i = 0; i < quizLength; i++) {
    const correctKey = shuffledKeys[i];
    const correctItem = state.terms[correctKey];
    
    // Choose Question Type: 0 = Given Definition find Name, 1 = Given Name find Definition
    const qType = Math.random() > 0.5 ? 0 : 1;
    
    // Pick 3 distractors
    const distractors = allKeys.filter(k => k !== correctKey).sort(() => Math.random() - 0.5).slice(0, 3);
    
    const options = [];
    // Correct Option
    options.push({
      key: correctKey,
      text: qType === 0 ? correctItem.term : correctItem.definition,
      isCorrect: true
    });
    // Distractor Options
    distractors.forEach(dk => {
      options.push({
        key: dk,
        text: qType === 0 ? state.terms[dk].term : state.terms[dk].definition,
        isCorrect: false
      });
    });

    // Shuffle options
    options.sort(() => Math.random() - 0.5);

    questions.push({
      type: qType,
      targetKey: correctKey,
      questionText: qType === 0 
        ? `Qual ├® o termo correspondente ├á seguinte defini├º├úo?<br><br><em>"${escapeHTML(correctItem.definition)}"</em>` 
        : `Qual ├® o significado correto do termo: <strong>${escapeHTML(correctItem.term)}</strong>?`,
      options: options
    });
  }

  return questions;
}

function renderQuizQuestion() {
  const currentIdx = state.quiz.currentIndex;
  const questionsCount = state.quiz.questions.length;

  if (currentIdx >= questionsCount) {
    // Show End Screen
    elements.quizProgress.innerText = "Fim do Quiz!";
    elements.quizQuestionText.innerHTML = `
      <div style="text-align: center; padding: 1.5rem 0;">
        <i class="fa-solid fa-trophy" style="font-size: 3rem; color: var(--accent-cyan); margin-bottom: 1rem;"></i>
        <h3>Quiz Conclu├¡do!</h3>
        <p style="margin-top: 0.5rem; color: var(--text-secondary);">Voc├¬ acertou <strong>${state.quiz.score}</strong> de <strong>${questionsCount}</strong> perguntas.</p>
        <button class="btn-primary" id="quiz-replay-btn" style="margin: 1.5rem auto 0 auto;">Jogar Novamente</button>
      </div>
    `;
    // S2/R5: Use addEventListener instead of inline onclick
    const replayBtn = document.getElementById("quiz-replay-btn");
    if (replayBtn) replayBtn.addEventListener("click", initQuiz);
    elements.quizOptionsContainer.innerHTML = "";
    elements.quizNextBtn.style.display = "none";
    return;
  }

  state.quiz.userAnswered = false;
  state.quiz.selectedOptionIdx = null;
  
  elements.quizProgress.innerText = `Pergunta ${currentIdx + 1} de ${questionsCount}`;
  elements.quizScore.innerText = `Acertos: ${state.quiz.score}`;

  const currentQuestion = state.quiz.questions[currentIdx];
  elements.quizQuestionText.innerHTML = currentQuestion.questionText;
  
  elements.quizOptionsContainer.innerHTML = "";
  currentQuestion.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.innerHTML = `<span class="option-bullet">${String.fromCharCode(65 + idx)}</span> <span style="flex: 1;">${escapeHTML(opt.text)}</span>`;
    
    btn.addEventListener("click", () => {
      if (state.quiz.userAnswered) return;
      handleQuizAnswer(idx, opt.isCorrect, btn);
    });

    elements.quizOptionsContainer.appendChild(btn);
  });
}

function handleQuizAnswer(idx, isCorrect, clickedBtn) {
  state.quiz.userAnswered = true;
  state.quiz.selectedOptionIdx = idx;
  
  const currentQuestion = state.quiz.questions[state.quiz.currentIndex];
  
  // Highlight options
  const optionButtons = elements.quizOptionsContainer.querySelectorAll(".quiz-option");
  optionButtons.forEach((btn, buttonIdx) => {
    const isOptionCorrect = currentQuestion.options[buttonIdx].isCorrect;
    if (isOptionCorrect) {
      btn.classList.add("correct");
      btn.querySelector(".option-bullet").innerHTML = `<i class="fa-solid fa-check"></i>`;
    } else if (buttonIdx === idx) {
      btn.classList.add("wrong");
      btn.querySelector(".option-bullet").innerHTML = `<i class="fa-solid fa-xmark"></i>`;
    }
  });

  if (isCorrect) {
    state.quiz.score++;
    elements.quizScore.innerText = `Acertos: ${state.quiz.score}`;
    showToast("Parab├®ns! Resposta correta.");
  } else {
    showToast("Hum, n├úo foi dessa vez.", true);
  }

  elements.quizNextBtn.style.display = "flex";
}

// ----------------------------------------------------
// INTERACTIVE MIND MAP (SVG NODE GRAPH)
// ----------------------------------------------------

function initMindmap() {
  arrangeCoordinatesIfEmpty();
  
  // Reset select and pan on init
  if (elements.mmDetailPanel) {
    elements.mmDetailPanel.classList.remove("open");
  }
  state.mindmap.selectedNodeId = null;
  resetZoomPan();
  
  renderMindmap();
  stopPhysics();
}

function arrangeCoordinatesIfEmpty() {
  const keys = Object.keys(state.terms);
  let changed = false;
  
  keys.forEach((key, idx) => {
    const node = state.terms[key];
    if (node.x === undefined || node.y === undefined) {
      // Spiral positioning from center
      const angle = idx * 0.75;
      const radius = 50 + idx * 20;
      node.x = 400 + Math.cos(angle) * radius;
      node.y = 250 + Math.sin(angle) * radius;
      changed = true;
    }
  });

  if (changed) {
    saveData();
  }
}

function arrangeMindmapNodesCircle() {
  const keys = Object.keys(state.terms);
  const count = keys.length;
  const cx = 400;
  const cy = 250;
  const radius = Math.min(cx - 100, cy - 80, count * 15 + 80);

  keys.forEach((key, idx) => {
    const angle = (idx / count) * 2 * Math.PI;
    state.terms[key].x = cx + Math.cos(angle) * radius;
    state.terms[key].y = cy + Math.sin(angle) * radius;
  });
  saveData();
  renderMindmap();
}

function renderMindmap() {
  elements.linksGroup.innerHTML = "";
  elements.nodesGroup.innerHTML = "";

  const keys = Object.keys(state.terms);
  if (keys.length === 0) return;

  const activeSrc = state.mindmap.activeConnSource;
  const selectedNode = state.mindmap.selectedNodeId;

  // 1. Draw Connection Lines
  const drawnPairs = new Set();
  keys.forEach(sourceKey => {
    const sourceNode = state.terms[sourceKey];
    if (sourceNode.connections) {
      sourceNode.connections.forEach(destKey => {
        const destNode = state.terms[destKey];
        if (destNode) {
          const pairId = [sourceKey, destKey].sort().join("-");
          if (!drawnPairs.has(pairId)) {
            drawnPairs.add(pairId);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", sourceNode.x);
            line.setAttribute("y1", sourceNode.y);
            line.setAttribute("x2", destNode.x);
            line.setAttribute("y2", destNode.y);
            
            // Highlight connections if node is active
            let isHighlighted = (activeSrc === sourceKey || activeSrc === destKey || selectedNode === sourceKey || selectedNode === destKey);
            
            line.setAttribute("class", `mindmap-link ${isHighlighted ? 'highlighted' : ''}`);
            elements.linksGroup.appendChild(line);
          }
        }
      });
    }
  });

  // 2. Draw Nodes
  keys.forEach(key => {
    const node = state.terms[key];
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    let gClass = "mindmap-node " + (node.category || "custom");
    if (key === selectedNode) gClass += " selected";
    if (key === activeSrc) gClass += " active-source";
    
    nodeGroup.setAttribute("class", gClass);
    nodeGroup.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    nodeGroup.setAttribute("data-id", key);

    // Compute capsule text & layout
    let displayName = node.term;
    if (displayName.includes("(")) {
      displayName = displayName.split("(")[0].trim();
    }
    if (displayName.length > 15) {
      displayName = displayName.substring(0, 13) + "..";
    }

    const padX = 20;
    const textWidth = Math.max(70, displayName.length * 7 + 10);
    const rectW = textWidth + padX;
    const rectH = 32;
    const rectX = -rectW / 2;
    const rectY = -rectH / 2;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", rectX);
    rect.setAttribute("y", rectY);
    rect.setAttribute("width", rectW);
    rect.setAttribute("height", rectH);

    // Text Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("dy", "4");
    text.textContent = displayName;

    nodeGroup.appendChild(rect);
    nodeGroup.appendChild(text);

    // Event listeners for Drag & Drop
    nodeGroup.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only drag left-click
      e.stopPropagation();
      state.mindmap.draggedNodeId = key;
      
      const rectBound = elements.mindmapSvg.getBoundingClientRect();
      const zoom = state.mindmap.zoom;
      const pan = state.mindmap.pan;
      
      const mouseSvgX = (e.clientX - rectBound.left - pan.x) / zoom;
      const mouseSvgY = (e.clientY - rectBound.top - pan.y) / zoom;
      
      state.mindmap.dragOffset = {
        x: mouseSvgX - node.x,
        y: mouseSvgY - node.y
      };
    });

    nodeGroup.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.mindmap.activeConnSource !== null) {
        handleMindmapNodeClick(key);
      } else {
        openMindmapDetail(key);
      }
    });

    nodeGroup.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      switchTab("dashboard");
      openDetailPanel(key);
    });

    elements.nodesGroup.appendChild(nodeGroup);
  });
}

function handleMindmapNodeClick(clickedKey) {
  const activeSrc = state.mindmap.activeConnSource;
  
  if (activeSrc === null) {
    state.mindmap.activeConnSource = clickedKey;
    showToast(`Conectando de "${state.terms[clickedKey].term}". Clique em outro termo para conectar/desconectar.`);
    renderMindmap();
  } else if (activeSrc === clickedKey) {
    state.mindmap.activeConnSource = null;
    renderMindmap();
  } else {
    const sourceNode = state.terms[activeSrc];
    const destNode = state.terms[clickedKey];
    
    if (sourceNode.connections.includes(clickedKey)) {
      sourceNode.connections = sourceNode.connections.filter(c => c !== clickedKey);
      destNode.connections = destNode.connections.filter(c => c !== activeSrc);
      showToast("Conex├úo removida.");
    } else {
      sourceNode.connections.push(clickedKey);
      destNode.connections.push(activeSrc);
      showToast("Conex├úo criada!");
    }
    
    saveData();
    state.mindmap.activeConnSource = null;
    renderMindmap();
  }
}

function openMindmapDetail(key) {
  state.mindmap.selectedNodeId = key;
  const item = state.terms[key];
  if (!item) return;

  elements.mmDetailTitle.innerText = item.term;
  elements.mmDetailCategory.innerText = getCategoryLabel(item.category);
  
  // Style category badge (uses shared CATEGORY_COLORS constant)
  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS["custom"];
  elements.mmDetailCategory.style.color = catStyle.color;
  elements.mmDetailCategory.style.background = catStyle.bg;
  elements.mmDetailCategory.style.border = `1px solid ${catStyle.color}`;

  elements.mmDetailDefinition.innerText = item.definition;
  elements.mmDetailNotes.innerText = item.notes ? item.notes : "Nenhuma anota├º├úo registrada neste termo.";
  
  elements.mmDetailPanel.classList.add("open");
  renderMindmap();
}

function setupSvgHandlers() {
  let dragAnimFrameId = null;
  let lastPinchDist = 0; // For pinch-to-zoom

  // ÔöÇÔöÇ Helper: get SVG coordinates from client coords ÔöÇÔöÇ
  function clientToSvg(clientX, clientY) {
    const rect = elements.mindmapSvg.getBoundingClientRect();
    const zoom = state.mindmap.zoom;
    const pan = state.mindmap.pan;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }

  // ÔöÇÔöÇ Helper: start dragging a node ÔöÇÔöÇ
  function startNodeDrag(key, clientX, clientY) {
    state.mindmap.draggedNodeId = key;
    const svg = clientToSvg(clientX, clientY);
    state.mindmap.dragOffset = {
      x: svg.x - state.terms[key].x,
      y: svg.y - state.terms[key].y
    };
  }

  // ÔöÇÔöÇ Helper: move node to new client position ÔöÇÔöÇ
  function moveNodeTo(clientX, clientY) {
    const key = state.mindmap.draggedNodeId;
    if (!key) return;
    const svg = clientToSvg(clientX, clientY);
    state.terms[key].x = Math.max(20, Math.min(1500, svg.x - state.mindmap.dragOffset.x));
    state.terms[key].y = Math.max(20, Math.min(1000, svg.y - state.mindmap.dragOffset.y));
    updateNodeSvgPosition(key);
  }

  // ÔöÇÔöÇ Helper: start panning ÔöÇÔöÇ
  function startPan(clientX, clientY) {
    state.mindmap.isPanning = true;
    state.mindmap.panStart = {
      x: clientX - state.mindmap.pan.x,
      y: clientY - state.mindmap.pan.y
    };
    elements.mindmapSvg.style.cursor = "grabbing";
  }

  // ÔöÇÔöÇ Helper: update pan position ÔöÇÔöÇ
  function updatePan(clientX, clientY) {
    state.mindmap.pan = {
      x: clientX - state.mindmap.panStart.x,
      y: clientY - state.mindmap.panStart.y
    };
    applyViewportTransform();
  }

  // ÔöÇÔöÇ Helper: end all drag/pan operations ÔöÇÔöÇ
  function endInteraction() {
    if (state.mindmap.isPanning) {
      state.mindmap.isPanning = false;
      elements.mindmapSvg.style.cursor = "grab";
    }
    if (state.mindmap.draggedNodeId) {
      state.mindmap.draggedNodeId = null;
      saveData();
    }
    lastPinchDist = 0;
  }

  // ÔòÉÔòÉÔòÉ MOUSE EVENTS ÔòÉÔòÉÔòÉ

  // Mouse Down on canvas background triggers panning
  elements.mindmapSvg.addEventListener("mousedown", (e) => {
    if (e.target === elements.mindmapSvg || e.target.id === "viewport-group" || e.target.tagName === "svg") {
      startPan(e.clientX, e.clientY);
    }
  });

  // Mouse wheel zoom
  elements.mindmapSvg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    adjustZoom(zoomFactor);
  }, { passive: false });

  // MouseMove for Dragging & Panning
  document.addEventListener("mousemove", (e) => {
    if (state.mindmap.isPanning) {
      updatePan(e.clientX, e.clientY);
    } else if (state.mindmap.draggedNodeId) {
      if (dragAnimFrameId) cancelAnimationFrame(dragAnimFrameId);
      dragAnimFrameId = requestAnimationFrame(() => {
        moveNodeTo(e.clientX, e.clientY);
        dragAnimFrameId = null;
      });
    }
  });

  // MouseUp terminates actions
  document.addEventListener("mouseup", endInteraction);

  // ÔòÉÔòÉÔòÉ TOUCH EVENTS (M1 + M2) ÔòÉÔòÉÔòÉ

  // Touch start ÔÇö detect node drag vs canvas pan vs pinch-zoom
  elements.mindmapSvg.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      // M2: Pinch-to-zoom start
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // Check if touching a node
      const nodeGroup = touch.target.closest(".mindmap-node");
      if (nodeGroup) {
        e.preventDefault();
        const key = nodeGroup.getAttribute("data-id");
        if (key) startNodeDrag(key, touch.clientX, touch.clientY);
      } else if (touch.target === elements.mindmapSvg || touch.target.id === "viewport-group" || touch.target.closest("svg")) {
        e.preventDefault();
        startPan(touch.clientX, touch.clientY);
      }
    }
  }, { passive: false });

  // Touch move ÔÇö drag node, pan canvas, or pinch-zoom
  elements.mindmapSvg.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && lastPinchDist > 0) {
      // M2: Pinch-to-zoom
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist > 0) {
        const factor = newDist / lastPinchDist;
        adjustZoom(factor);
      }
      lastPinchDist = newDist;
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (state.mindmap.isPanning) {
        e.preventDefault();
        updatePan(touch.clientX, touch.clientY);
      } else if (state.mindmap.draggedNodeId) {
        e.preventDefault();
        if (dragAnimFrameId) cancelAnimationFrame(dragAnimFrameId);
        dragAnimFrameId = requestAnimationFrame(() => {
          moveNodeTo(touch.clientX, touch.clientY);
          dragAnimFrameId = null;
        });
      }
    }
  }, { passive: false });

  // Touch end ÔÇö finalize
  document.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) lastPinchDist = 0;
    if (e.touches.length === 0) endInteraction();
  });
  document.addEventListener("touchcancel", endInteraction);

  // Clicking empty SVG background clears selection & closes detail panel
  elements.mindmapSvg.addEventListener("click", (e) => {
    if (e.target === elements.mindmapSvg || e.target.id === "viewport-group" || e.target.tagName === "svg") {
      if (state.mindmap.activeConnSource !== null) {
        state.mindmap.activeConnSource = null;
      }
      elements.mmDetailPanel.classList.remove("open");
      state.mindmap.selectedNodeId = null;
      renderMindmap();
    }
  });
}

function updateNodeSvgPosition(key) {
  const node = state.terms[key];
  const g = elements.nodesGroup.querySelector(`g[data-id="${key}"]`);
  if (g) {
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
  }
  renderLinksRealtime(key);
}

function renderLinksRealtime(movedKey) {
  elements.linksGroup.innerHTML = "";
  const keys = Object.keys(state.terms);
  const activeSrc = state.mindmap.activeConnSource;
  const selectedNode = state.mindmap.selectedNodeId;
  const drawnPairs = new Set();

  keys.forEach(sourceKey => {
    const sourceNode = state.terms[sourceKey];
    if (!Array.isArray(sourceNode.connections)) return;
    sourceNode.connections.forEach(destKey => {
      const destNode = state.terms[destKey];
      if (destNode) {
        const pairId = [sourceKey, destKey].sort().join("-");
        if (!drawnPairs.has(pairId)) {
          drawnPairs.add(pairId);
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", sourceNode.x);
          line.setAttribute("y1", sourceNode.y);
          line.setAttribute("x2", destNode.x);
          line.setAttribute("y2", destNode.y);
          
          let isHighlighted = (activeSrc === sourceKey || activeSrc === destKey || selectedNode === sourceKey || selectedNode === destKey);
          line.setAttribute("class", `mindmap-link ${isHighlighted ? 'highlighted' : ''}`);
          elements.linksGroup.appendChild(line);
        }
      }
    });
  });
}

// P1: Optimized physics update ÔÇö updates existing DOM positions without full re-render
function updateAllNodePositions() {
  const keys = Object.keys(state.terms);
  keys.forEach(key => {
    const node = state.terms[key];
    const g = elements.nodesGroup.querySelector(`g[data-id="${key}"]`);
    if (g) {
      g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    }
  });
  // Update all link positions
  renderLinksRealtime();
}

function applyViewportTransform() {
  const pan = state.mindmap.pan;
  const zoom = state.mindmap.zoom;
  elements.viewportGroup.setAttribute("transform", `translate(${pan.x}, ${pan.y}) scale(${zoom})`);
}

function adjustZoom(factor) {
  state.mindmap.zoom = Math.max(0.3, Math.min(3, state.mindmap.zoom * factor));
  applyViewportTransform();
}

function resetZoomPan() {
  state.mindmap.zoom = 1;
  state.mindmap.pan = { x: 0, y: 0 };
  applyViewportTransform();
}

function togglePhysics() {
  if (state.mindmap.physicsEnabled) {
    stopPhysics();
  } else {
    startPhysics();
  }
}

function startPhysics() {
  if (state.mindmap.animationFrameId) return;
  
  Object.keys(state.terms).forEach(key => {
    const node = state.terms[key];
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  });

  state.mindmap.physicsEnabled = true;
  elements.mmPhysicsBtn.innerHTML = `<i class="fa-solid fa-wind" style="color: var(--accent-green);"></i> F├¡sica: Ativa`;
  elements.mmPhysicsBtn.classList.add("active");

  function physicsLoop() {
    if (!state.mindmap.physicsEnabled) return;
    tickPhysics();
    // P1: Update existing DOM positions instead of recreating all SVG elements
    updateAllNodePositions();
    state.mindmap.animationFrameId = requestAnimationFrame(physicsLoop);
  }

  state.mindmap.animationFrameId = requestAnimationFrame(physicsLoop);
}

function stopPhysics() {
  state.mindmap.physicsEnabled = false;
  if (state.mindmap.animationFrameId) {
    cancelAnimationFrame(state.mindmap.animationFrameId);
    state.mindmap.animationFrameId = null;
  }
  if (elements.mmPhysicsBtn) {
    elements.mmPhysicsBtn.innerHTML = `<i class="fa-solid fa-wind"></i> F├¡sica: Desativada`;
    elements.mmPhysicsBtn.classList.remove("active");
  }
  saveData();
}

function tickPhysics() {
  const keys = Object.keys(state.terms);
  const cx = 400;
  const cy = 250;
  
  const forces = {};
  keys.forEach(key => {
    forces[key] = { fx: 0, fy: 0 };
    const node = state.terms[key];
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  });

  // 1. Repel nodes
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const keyA = keys[i];
      const keyB = keys[j];
      const nodeA = state.terms[keyA];
      const nodeB = state.terms[keyB];
      
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distSq = dx * dx + dy * dy + 0.01;
      const dist = Math.sqrt(distSq);
      
      if (dist < 280) {
        const force = 1600 / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        forces[keyA].fx -= fx;
        forces[keyA].fy -= fy;
        forces[keyB].fx += fx;
        forces[keyB].fy += fy;
      }
    }
  }

  // 2. Attract connected nodes
  const connectedPairs = new Set();
  keys.forEach(keyA => {
    const nodeA = state.terms[keyA];
    if (!Array.isArray(nodeA.connections)) return;
    nodeA.connections.forEach(keyB => {
      const nodeB = state.terms[keyB];
      if (!nodeB) return;
      
      const pairId = [keyA, keyB].sort().join("-");
      if (connectedPairs.has(pairId)) return;
      connectedPairs.add(pairId);
      
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      
      const restLength = 130;
      const K_spring = 0.03;
      const displacement = dist - restLength;
      const force = displacement * K_spring;
      
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      forces[keyA].fx += fx;
      forces[keyA].fy += fy;
      forces[keyB].fx -= fx;
      forces[keyB].fy -= fy;
    });
  });

  // 3. Central gravity and movement update
  keys.forEach(key => {
    const node = state.terms[key];
    
    if (key === state.mindmap.draggedNodeId) {
      node.vx = 0;
      node.vy = 0;
      return;
    }
    
    const dx = cx - node.x;
    const dy = cy - node.y;
    forces[key].fx += dx * 0.01;
    forces[key].fy += dy * 0.01;

    node.vx = (node.vx + forces[key].fx) * 0.8;
    node.vy = (node.vy + forces[key].fy) * 0.8;

    node.x += node.vx;
    node.y += node.vy;

    // Boundary constraints
    node.x = Math.max(30, Math.min(1000, node.x));
    node.y = Math.max(30, Math.min(600, node.y));
  });
}

async function suggestConnectionsWithAi() {
  if (!state.geminiApiKey || state.geminiApiKey.trim() === "") {
    showToast("Por favor, configure uma chave da API do Gemini nas configura├º├Áes.", true);
    return;
  }

  const keys = Object.keys(state.terms);
  if (keys.length < 2) {
    showToast("Adicione pelo menos 2 termos para gerar conex├Áes.", true);
    return;
  }

  showToast("IA analisando termos e sugerindo conex├Áes...");
  elements.mmAiSuggestBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-cyan);"></i> Conectando...`;
  elements.mmAiSuggestBtn.disabled = true;

  try {
    const connections = await fetchAiConnections(keys);
    if (connections && connections.length > 0) {
      let addedCount = 0;
      connections.forEach(([keyA, keyB]) => {
        const nodeA = state.terms[keyA];
        const nodeB = state.terms[keyB];
        if (nodeA && nodeB && keyA !== keyB) {
          if (!nodeA.connections.includes(keyB)) {
            nodeA.connections.push(keyB);
            addedCount++;
          }
          if (!nodeB.connections.includes(keyA)) {
            nodeB.connections.push(keyA);
          }
        }
      });
      
      saveData();
      renderMindmap();
      showToast(`IA gerou ${addedCount} nova(s) conex├úo(├Áes) de estudos!`);
    } else {
      showToast("A IA n├úo encontrou novas conex├Áes ├│bvias entre esses termos.");
    }
  } catch (err) {
    console.error("AI connection suggest error:", err);
    showToast("Erro ao conectar termos por IA: " + err.message, true);
  } finally {
    elements.mmAiSuggestBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color: var(--accent-cyan);"></i> Conectar com IA`;
    elements.mmAiSuggestBtn.disabled = false;
  }
}

async function fetchAiConnections(keys) {
  const apiKey = state.geminiApiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const termsList = keys.map(k => `ID: "${k}" - Termo: "${state.terms[k].term}"`).join("\n");
  
  const systemPrompt = `Voc├¬ ├® um tutor did├ítico especialista em criar mapas mentais de aprendizado.
  Abaixo est├í uma lista de termos de estudo atualmente salvos pelo estudante.
  Seu objetivo ├® analisar os termos e sugerir quais deles possuem uma forte rela├º├úo direta de aprendizado (ex: causa e efeito, parte-todo, conceito relacionado).
  Retorne as rela├º├Áes sugeridas na forma de pares de IDs.
  A resposta DEVE ser estritamente em formato JSON v├ílido, respeitando o seguinte esquema de chaves:
  {
    "connections": [
      ["id-termo-1", "id-termo-2"],
      ["id-termo-3", "id-termo-4"]
    ]
  }
  Sugira apenas rela├º├Áes que fa├ºam real sentido conceitual e limite a no m├íximo 1.5 vezes o n├║mero total de termos.
  Retorne APENAS o JSON puro. N├úo englobe com blocos de marca├º├úo de markdown (como \`\`\`json).

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
    throw new Error("Resposta da API em formato inv├ílido.");
  }
  return [];
}

