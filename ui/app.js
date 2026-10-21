/**
 * GARNET UI PROTOTYPE — MAIN APPLICATION LOGIC
 * Manages phone simulator, navigation, state store, inspector and overlays.
 */

const GarnetApp = {
  currentPromptId: "HOME-01",
  currentState: "default",
  activeOverlay: null,
  history: [],
  theme: "dark",
  preset: "iphone",
  motion: "normal",
  viewerSide: "ruby",

  init() {
    this.buildSidebar();
    this.setupEventListeners();
    this.startDualClocks();
    this.navigatePrompt("HOME-01", "default");
  },

  // Build the hierarchical accordion sidebar of all 17 prompt categories
  buildSidebar() {
    const container = document.getElementById("sidebar-scroll");
    if (!container) return;

    let html = "";
    GARNET_DATA.categories.forEach((cat) => {
      html += `
        <div class="category-group" id="cat-${cat.id}">
          <div class="category-header" onclick="GarnetApp.toggleCategory('${cat.id}')">
            <span>${cat.title}</span>
            <span class="category-chevron">▼</span>
          </div>
          <div class="prompt-list">
            ${cat.prompts
              .map(
                (p) => `
              <div class="prompt-item" id="item-${p.id}" onclick="GarnetApp.navigatePrompt('${p.id}')">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${p.title}</span>
                <span class="prompt-id">${p.id}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  toggleCategory(catId) {
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      el.classList.toggle("collapsed");
    }
  },

  // Search filter across all prompts
  filterPrompts(query) {
    const q = query.toLowerCase().trim();
    GARNET_DATA.categories.forEach((cat) => {
      let anyMatch = false;
      cat.prompts.forEach((p) => {
        const itemEl = document.getElementById(`item-${p.id}`);
        const match =
          !q ||
          p.id.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q);
        if (itemEl) {
          itemEl.style.display = match ? "flex" : "none";
        }
        if (match) anyMatch = true;
      });
      const catEl = document.getElementById(`cat-${cat.id}`);
      if (catEl) {
        catEl.style.display = anyMatch ? "block" : "none";
        if (q && anyMatch) catEl.classList.remove("collapsed");
      }
    });
  },

  // Find prompt definition by ID
  findPrompt(promptId) {
    for (const cat of GARNET_DATA.categories) {
      for (const p of cat.prompts) {
        if (p.id === promptId) return p;
      }
    }
    return null;
  },

  // Primary Navigation
  navigatePrompt(promptId, state = null) {
    const promptData = this.findPrompt(promptId);
    if (!promptData) return;

    // Track history for back navigation
    if (this.currentPromptId !== promptId) {
      this.history.push({ promptId: this.currentPromptId, state: this.currentState });
    }

    this.currentPromptId = promptId;
    this.currentState = state || (promptData.states && promptData.states[0]) || "default";

    // Update active highlight in sidebar
    document.querySelectorAll(".prompt-item").forEach((el) => el.classList.remove("active"));
    const activeEl = document.getElementById(`item-${promptId}`);
    if (activeEl) {
      activeEl.classList.add("active");
      // Scroll into view if needed
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Render screen inside phone viewport
    this.renderCurrentScreen();

    // Update Inspector dock
    this.updateInspector(promptData);
  },

  navigateBack() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.navigatePrompt(prev.promptId, prev.state);
    } else {
      this.navigatePrompt("HOME-01");
    }
  },

  setState(stateName) {
    this.currentState = stateName;
    this.renderCurrentScreen();
    this.updateStateChips();
  },

  renderCurrentScreen() {
    const viewport = document.getElementById("phone-viewport");
    if (!viewport) return;

    // If there is an active overlay on top of this screen, render both
    let html = GARNET_SCREENS.render(this.currentPromptId, this.currentState);

    if (this.activeOverlay) {
      html += GARNET_SCREENS.render(this.activeOverlay, "default");
    }

    viewport.innerHTML = html;
  },

  openOverlay(overlayPromptId) {
    this.activeOverlay = overlayPromptId;
    this.renderCurrentScreen();
  },

  closeOverlay(event) {
    if (event) event.stopPropagation();
    this.activeOverlay = null;
    this.renderCurrentScreen();
  },

  handleOpenLetter(title) {
    this.navigatePrompt("OPEN-05");
  },

  updateInspector(promptData) {
    document.getElementById("insp-id").innerText = promptData.id;
    document.getElementById("insp-title").innerText = promptData.title;
    document.getElementById("insp-route").innerText = promptData.route || "Global Screen";
    document.getElementById("insp-prompt").innerText = promptData.prompt;

    // Guardrails
    const guardrailBox = document.getElementById("insp-guardrails");
    if (promptData.guardrails && promptData.guardrails.length > 0) {
      guardrailBox.innerHTML = promptData.guardrails
        .map(
          (g) => `
        <div class="guardrail-pill">🔒 ${g}</div>
      `,
        )
        .join("");
    } else {
      guardrailBox.innerHTML =
        '<div class="caption-text">Standard Garnet product guardrails apply.</div>';
    }

    this.updateStateChips(promptData);
  },

  updateStateChips(promptData = null) {
    const data = promptData || this.findPrompt(this.currentPromptId);
    const container = document.getElementById("insp-states");
    if (!container || !data || !data.states) return;

    container.innerHTML = data.states
      .map(
        (s) => `
      <span class="state-chip ${this.currentState === s ? "active" : ""}" onclick="GarnetApp.setState('${s}')">
        ${s}
      </span>
    `,
      )
      .join("");
  },

  // In-App Toast notice
  showToast(message) {
    const existing = document.querySelector(".toast-notice");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast-notice";
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: var(--garnet);">✦</span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-tertiary); cursor: pointer;">✕</button>
    `;

    const viewport = document.getElementById("phone-viewport");
    if (viewport) {
      viewport.appendChild(toast);
      setTimeout(() => {
        if (toast && toast.parentElement) toast.remove();
      }, 4000);
    }
  },

  // Status Bar Dual Clocks (Addis Ababa GMT+3 & London GMT/BST)
  startDualClocks() {
    const updateTime = () => {
      const now = new Date();
      // Formatter for Addis Ababa
      const addisTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Africa/Addis_Ababa",
        hour: "2-digit",
        minute: "2-digit",
      });
      const londonTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
      });

      const timeEl = document.getElementById("status-time");
      if (timeEl) timeEl.innerText = addisTime;

      const dualEl = document.getElementById("status-dual");
      if (dualEl)
        dualEl.innerHTML = `<span>Addis ${addisTime}</span> · <span>LDN ${londonTime}</span>`;
    };

    updateTime();
    setInterval(updateTime, 10000);
  },

  // Studio Controls
  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("btn-theme-dark").classList.toggle("active", theme === "dark");
    document.getElementById("btn-theme-light").classList.toggle("active", theme === "light");
  },

  setPreset(preset) {
    this.preset = preset;
    const frame = document.getElementById("device-frame");
    if (!frame) return;

    frame.className = "device-frame";
    if (preset === "compact") frame.classList.add("device-preset-compact");
    if (preset === "android") frame.classList.add("device-preset-android");
    if (preset === "unframed") document.getElementById("stage-area").classList.add("unframed-mode");
    else document.getElementById("stage-area").classList.remove("unframed-mode");

    document.querySelectorAll(".preset-btn").forEach((btn) => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`btn-preset-${preset}`);
    if (activeBtn) activeBtn.classList.add("active");
  },

  setMotion(motion) {
    this.motion = motion;
    document.documentElement.setAttribute("data-motion", motion);
    document.getElementById("btn-motion-normal").classList.toggle("active", motion === "normal");
    document.getElementById("btn-motion-reduced").classList.toggle("active", motion === "reduced");
  },

  setSide(side) {
    this.viewerSide = side;
    document.documentElement.style.setProperty(
      "--viewer-accent",
      side === "ruby" ? "var(--ruby)" : "var(--sapphire)",
    );
    document.getElementById("btn-side-ruby").classList.toggle("active", side === "ruby");
    document.getElementById("btn-side-sapphire").classList.toggle("active", side === "sapphire");
    this.renderCurrentScreen();
  },

  setupEventListeners() {
    const searchInput = document.getElementById("prompt-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterPrompts(e.target.value);
      });
    }
  },
};

// Auto-boot when DOM ready
document.addEventListener("DOMContentLoaded", () => {
  GarnetApp.init();
});
