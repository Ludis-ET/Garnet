/**
 * GARNET UI PROTOTYPE — SCREEN RENDERERS
 * Generates pixel-perfect HTML for every single prompt and state.
 */

const GARNET_SCREENS = {
  // SVG Generator for the Original Garnet Octahedral Crystal
  renderCrystalSVG(variant = "default", size = 120) {
    return `
      <div class="crystal-art-wrap" style="width:${size}px; height:${Math.round(size * 1.08)}px;">
        <svg class="crystal-svg" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="crystalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#9A7BFF" stop-opacity="0.8"/>
              <stop offset="60%" stop-color="#7B55F0" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#7B55F0" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="rubyStream" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FF6B8B"/>
              <stop offset="100%" stop-color="#D7264A"/>
            </linearGradient>
            <linearGradient id="sapphireStream" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7FE3FF"/>
              <stop offset="100%" stop-color="#2F66F5"/>
            </linearGradient>
            <linearGradient id="coreViolet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#CBB5FF"/>
              <stop offset="50%" stop-color="#9A7BFF"/>
              <stop offset="100%" stop-color="#6037DB"/>
            </linearGradient>
            <linearGradient id="facetHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.05"/>
            </linearGradient>
          </defs>
          <!-- Soft Background Aura -->
          <circle cx="50" cy="55" r="45" fill="url(#crystalGlow)" />
          <!-- Left Facet (Ruby Influence) -->
          <polygon points="50,10 18,48 50,75" fill="url(#rubyStream)" opacity="0.85" />
          <!-- Right Facet (Sapphire Influence) -->
          <polygon points="50,10 82,48 50,75" fill="url(#sapphireStream)" opacity="0.85" />
          <!-- Bottom Left Facet -->
          <polygon points="18,48 50,100 50,75" fill="#9E1636" opacity="0.9" />
          <!-- Bottom Right Facet -->
          <polygon points="82,48 50,100 50,75" fill="#1A3FA8" opacity="0.9" />
          <!-- Central Crown / Core -->
          <polygon points="50,10 32,48 50,75" fill="url(#coreViolet)" opacity="0.95" />
          <polygon points="50,10 68,48 50,75" fill="url(#coreViolet)" opacity="0.9" />
          <!-- Specular Glass Highlights -->
          <polygon points="50,10 32,48 50,35" fill="url(#facetHighlight)" />
          <line x1="50" y1="10" x2="50" y2="100" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="0.75" />
          <line x1="18" y1="48" x2="82" y2="48" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="0.75" />
        </svg>
        <div class="crystal-plinth"></div>
      </div>
    `;
  },

  // Collectible Figure Plinths Slot
  renderFigureSlots(poseRuby = "wave", poseSapphire = "wave", unavailable = false) {
    if (unavailable) {
      return `
        <div class="figures-row">
          <div class="figure-plinth-slot">
            <div class="figure-render" style="border: 1px dashed rgba(232, 83, 111, 0.4); background: rgba(232, 83, 111, 0.05);">
              <span style="font-size: 20px;">💎</span>
              <span class="figure-caption">Ruby Side</span>
            </div>
          </div>
          <div class="figure-plinth-slot">
            <div class="figure-render" style="border: 1px dashed rgba(91, 140, 255, 0.4); background: rgba(91, 140, 255, 0.05);">
              <span style="font-size: 20px;">💎</span>
              <span class="figure-caption">Sapphire Side</span>
            </div>
          </div>
        </div>
      `;
    }
    return `
      <div class="figures-row">
        <div class="figure-plinth-slot">
          <div class="figure-render ruby-figure">
            <span class="figure-silhouette">❤️</span>
            <span class="figure-caption">Ruby · ${poseRuby}</span>
          </div>
        </div>
        <div class="figure-plinth-slot">
          <div class="figure-render sapphire-figure">
            <span class="figure-silhouette">💙</span>
            <span class="figure-caption">Sapphire · ${poseSapphire}</span>
          </div>
        </div>
      </div>
    `;
  },

  // Gem Capsule Generator
  renderCapsule(
    type = "ruby",
    status = "Sealed",
    prompt = "Open when you miss me",
    sender = "Noah",
  ) {
    return `
      <div class="gem-capsule-card" onclick="GarnetApp.handleOpenLetter('${prompt}')">
        <div class="capsule-icon-wrap">
          <div class="capsule-gem ${type}">
            <div class="capsule-seam"></div>
            <span style="font-size: 16px;">💌</span>
          </div>
        </div>
        <div class="section-title" style="font-size: 17px; margin-bottom: 4px;">"${prompt}"</div>
        <div class="caption-text" style="margin-bottom: 8px;">From ${sender}</div>
        <span class="badge ${status === "Ready to open" ? "badge-simulated" : "badge-provisional"}">${status}</span>
      </div>
    `;
  },

  // Bottom Navigation Bar
  renderTabBar(activeTab = "home") {
    const tabs = [
      { id: "home", label: "Home", icon: "✦", prompt: "HOME-01" },
      { id: "days", label: "Days", icon: "◫", prompt: "DAYS-01" },
      { id: "us", label: "Us", icon: "♡", prompt: "US-01" },
      { id: "moments", label: "Moments", icon: "✧", prompt: "OPEN-01" },
      { id: "world", label: "Our World", icon: "◎", prompt: "WORLD-01" },
    ];

    return `
      <nav class="bottom-tab-bar">
        ${tabs
          .map(
            (t) => `
          <div class="tab-item ${activeTab === t.id ? "active" : ""}" onclick="GarnetApp.navigatePrompt('${t.prompt}')">
            <span class="tab-icon">${t.icon}</span>
            <span>${t.label}</span>
            ${t.id === "us" ? '<span class="tab-badge-dot"></span>' : ""}
          </div>
        `,
          )
          .join("")}
      </nav>
    `;
  },

  // Common Mobile Header
  renderHeader(title, subtitle = null, showBack = false, showAvatar = true) {
    return `
      <header style="padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${
            showBack
              ? `
            <button onclick="GarnetApp.navigateBack()" style="background: none; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer; padding: 4px;">‹</button>
          `
              : ""
          }
          <div>
            <h1 class="section-title" style="font-size: 20px; font-weight: 600;">${title}</h1>
            ${subtitle ? `<div class="caption-text">${subtitle}</div>` : ""}
          </div>
        </div>
        ${
          showAvatar
            ? `
          <div onclick="GarnetApp.openOverlay('HOME-05')" style="width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--ruby); background: linear-gradient(135deg, #FF6B8B, #D7264A); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #FFF; cursor: pointer;">
            S
          </div>
        `
            : ""
        }
      </header>
    `;
  },

  // Master Screen Dispatcher
  render(promptId, state = "default") {
    switch (promptId) {
      // 01 · Welcome and Account
      case "AUTH-01":
        return this.screenAuth01(state);
      case "AUTH-02":
        return this.screenAuth02(state);
      case "AUTH-03":
        return this.screenAuth03(state);
      case "AUTH-04":
        return this.screenAuth04(state);
      case "AUTH-05":
        return this.screenAuth05(state);
      case "AUTH-06":
        return this.screenAuth06(state);
      case "AUTH-07":
        return this.screenAuth07(state);
      case "AUTH-08":
        return this.screenAuth08(state);

      // 02 · Pairing
      case "PAIR-01":
        return this.screenPair01(state);
      case "PAIR-02":
        return this.screenPair02(state);
      case "PAIR-03":
        return this.screenPair03(state);
      case "PAIR-04":
        return this.screenPair04(state);
      case "PAIR-05":
        return this.screenPair05(state);
      case "PAIR-06":
        return this.screenPair06(state);
      case "PAIR-07":
        return this.screenPair07(state);

      // 03 · Identity & Setup
      case "SETUP-01":
      case "SETUP-02":
        return this.screenSetup02(state);
      case "SETUP-03":
        return this.screenSetup03(state);
      case "SETUP-04":
        return this.screenSetup04(state);
      case "SETUP-05":
        return this.screenSetup05(state);
      case "SETUP-06":
        return this.screenSetup06(state);
      case "SETUP-07":
        return this.screenSetup07(state);
      case "SETUP-08":
        return this.screenSetup08(state);

      // 04 · Before Long Distance
      case "PRE-01":
        return this.screenPre01(state);
      case "PRE-02":
        return this.screenPre02(state);
      case "PRE-05":
        return this.screenPre05(state);
      case "PRE-07":
        return this.screenPre07(state);
      case "PRE-08":
        return this.screenPre08(state);
      case "PRE-09":
        return this.screenPre09(state);
      case "PRE-10":
        return this.screenPre10(state);

      // 05 · Home
      case "HOME-01":
        return this.screenHome01(state);
      case "HOME-02":
        return this.screenHome02(state);
      case "HOME-03":
        return this.screenHome03(state);
      case "HOME-04":
        return this.screenHome04(state);
      case "HOME-05":
        return this.screenHome05(state);

      // 06 · Days & Logging
      case "DAYS-01":
        return this.screenDays01(state);
      case "DAYS-02":
        return this.screenDays02(state);
      case "DAYS-03":
        return this.screenDays03(state);
      case "DAYS-04":
        return this.screenDays04(state);
      case "DAYS-05":
        return this.screenDays05(state);
      case "DAYS-06":
        return this.screenDays06(state);
      case "DAYS-07":
        return this.screenDays07(state);
      case "DAYS-08":
        return this.screenDays08(state);
      case "DAYS-09":
        return this.screenDays09(state);
      case "DAYS-10":
        return this.screenDays10(state);
      case "DAYS-11":
        return this.screenDays11(state);

      // 07 · Us: Emotional Connection
      case "US-01":
        return this.screenUs01(state);
      case "US-02":
        return this.screenUs02(state);
      case "US-03":
        return this.screenUs03(state);
      case "US-04":
        return this.screenUs04(state);
      case "US-05":
        return this.screenUs05(state);
      case "US-06":
        return this.screenUs06(state);
      case "US-07":
        return this.screenUs07(state);
      case "US-08":
        return this.screenUs08(state);
      case "US-09":
        return this.screenUs09(state);
      case "US-10":
        return this.screenUs10(state);

      // 08 · Chat
      case "CHAT-00":
        return this.screenChat00(state);
      case "CHAT-01":
        return this.screenChat01(state);
      case "CHAT-02":
        return this.screenChat02(state);
      case "CHAT-03":
        return this.screenChat03(state);
      case "CHAT-04":
        return this.screenChat04(state);
      case "CHAT-05":
        return this.screenChat05(state);
      case "CHAT-06":
        return this.screenChat06(state);
      case "CHAT-07":
        return this.screenChat07(state);
      case "CHAT-08":
        return this.screenChat08(state);
      case "CHAT-09":
        return this.screenChat09(state);

      // 09 · Open When
      case "OPEN-01":
        return this.screenOpen01(state);
      case "OPEN-02":
        return this.screenOpen02(state);
      case "OPEN-03":
        return this.screenOpen03(state);
      case "OPEN-04":
        return this.screenOpen04(state);
      case "OPEN-05":
        return this.screenOpen05(state);
      case "OPEN-06":
        return this.screenOpen06(state);
      case "OPEN-07":
        return this.screenOpen07(state);
      case "OPEN-08":
        return this.screenOpen08(state);

      // 10 · Memories
      case "MEM-01":
        return this.screenMem01(state);
      case "MEM-02":
        return this.screenMem02(state);
      case "MEM-03":
        return this.screenMem03(state);
      case "MEM-04":
        return this.screenMem04(state);
      case "MEM-05":
        return this.screenMem05(state);
      case "MEM-06":
        return this.screenMem06(state);
      case "MEM-07":
        return this.screenMem07(state);
      case "MEM-08":
        return this.screenMem08(state);
      case "MEM-09":
        return this.screenMem09(state);
      case "MEM-10":
        return this.screenMem10(state);

      // 11 · Events & Chapters
      case "EVT-01":
        return this.screenEvt01(state);
      case "EVT-02":
        return this.screenEvt02(state);
      case "EVT-03":
        return this.screenEvt03(state);
      case "EVT-04":
        return this.screenEvt04(state);
      case "EVT-05":
        return this.screenEvt05(state);
      case "EVT-06":
        return this.screenEvt06(state);
      case "EVT-07":
        return this.screenEvt07(state);
      case "EVT-08":
        return this.screenEvt08(state);
      case "EVT-09":
        return this.screenEvt09(state);

      // 12 · Surprises
      case "SUR-01":
        return this.screenSur01(state);
      case "SUR-02":
        return this.screenSur02(state);
      case "SUR-03":
        return this.screenSur03(state);
      case "SUR-04":
        return this.screenSur04(state);
      case "SUR-05":
        return this.screenSur05(state);
      case "SUR-06":
        return this.screenSur06(state);
      case "SUR-07":
        return this.screenSur07(state);

      // 13 · Future & Our World
      case "WORLD-01":
        return this.screenWorld01(state);
      case "WORLD-02":
        return this.screenWorld02(state);
      case "WORLD-03":
        return this.screenWorld03(state);
      case "FUT-01":
        return this.screenFut01(state);
      case "FUT-02":
        return this.screenFut02(state);
      case "FUT-03":
        return this.screenFut03(state);
      case "PLACE-01":
        return this.screenPlace01(state);
      case "SONG-01":
        return this.screenSong01(state);

      // 14 · Search
      case "SEARCH-01":
        return this.screenSearch01(state);
      case "SEARCH-02":
        return this.screenSearch02(state);

      // 15 · Settings & Account
      case "SET-01":
        return this.screenSet01(state);
      case "SET-02":
        return this.screenSet02(state);
      case "SET-03":
        return this.screenSet03(state);
      case "SET-04":
        return this.screenSet04(state);
      case "SET-05":
        return this.screenSet05(state);
      case "SET-06":
        return this.screenSet06(state);
      case "SET-07":
        return this.screenSet07(state);
      case "SET-08":
        return this.screenSet08(state);
      case "SET-09":
        return this.screenSet09(state);
      case "SET-10":
        return this.screenSet10(state);
      case "SET-11":
        return this.screenSet11(state);
      case "SET-12":
        return this.screenSet12(state);
      case "SET-13":
        return this.screenSet13(state);
      case "SET-14":
        return this.screenSet14(state);
      case "SET-15":
        return this.screenSet15(state);
      case "SET-16":
        return this.screenSet16(state);
      case "SET-17":
        return this.screenSet17(state);

      // 16 · System Overlays & States
      case "SYS-01":
        return this.screenSys01(state);
      case "SYS-02":
        return this.screenSys02(state);
      case "SYS-03":
        return this.screenSys03(state);
      case "SYS-04":
        return this.screenSys04(state);
      case "SYS-05":
        return this.screenSys05(state);
      case "SYS-06":
        return this.screenSys06(state);

      // 17 · Notifications, Emails & Widgets Labs
      case "NOTIF-01":
        return this.screenNotif01(state);
      case "NOTIF-02":
        return this.screenNotif02(state);
      case "EMAIL-01":
        return this.screenEmail01(state);
      case "WIDGET-01":
        return this.screenWidget01(state);

      // Component Sheet
      case "COMP-01":
        return this.screenComp01(state);

      default:
        return `<div style="padding: 24px; text-align: center;">Screen ${promptId} is ready</div>`;
    }
  },

  /* ==========================================================================
     INDIVIDUAL SCREEN IMPLEMENTATIONS
     ========================================================================== */

  // AUTH-01 · Welcome
  screenAuth01(state) {
    const isUnavailable = state === "artwork-unavailable";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 24px 32px 24px; background: linear-gradient(180deg, #0D0B12 0%, #3D0E2A 50%, #0B1B4A 100%); text-align: center;">
        <div style="margin-top: 10px;">
          ${this.renderFigureSlots("wave", "wave", isUnavailable)}
          <div style="margin-top: -10px;">
            ${this.renderCrystalSVG("welcome", 130)}
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h1 class="display-title" style="font-size: 40px; margin-bottom: 6px;">Garnet</h1>
          <p class="body-text" style="color: var(--text-secondary); font-size: 16px;">Two lives. One space.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('AUTH-02')">Create account</button>
          <button class="btn-pill btn-secondary" onclick="GarnetApp.navigatePrompt('AUTH-03')">Sign in</button>
          <p class="caption-text" style="margin-top: 6px; color: var(--text-tertiary);">A private space for just the two of you.</p>
        </div>
      </div>
    `;
  },

  // AUTH-02 · Create account
  screenAuth02(state) {
    const isError = state === "inline-errors";
    const isSubmitting = state === "submitting";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; padding: 20px 24px; overflow-y: auto;">
        ${this.renderHeader("Create your account", null, true, false)}
        
        <div style="text-align: center; margin: 12px 0 20px 0;">
          <div class="brand-gem" style="margin: 0 auto 10px auto; width: 32px; height: 32px;"></div>
          <p class="caption-text">Start your private shared chapter</p>
        </div>

        <div class="input-group">
          <label class="input-label">Display name</label>
          <input class="input-field" type="text" placeholder="e.g. Selam" value="${state !== "empty" ? "Selam" : ""}" ${isSubmitting ? "disabled" : ""}/>
          ${isError ? '<div class="input-error">⚠️ Please enter a display name</div>' : ""}
        </div>

        <div class="input-group">
          <label class="input-label">Email</label>
          <input class="input-field" type="email" placeholder="you@example.com" value="${state !== "empty" ? "selam@example.test" : ""}" ${isSubmitting ? "disabled" : ""}/>
          ${isError ? '<div class="input-error">⚠️ Enter a valid email address</div>' : ""}
          ${state === "duplicate-email" ? '<div class="input-error">ℹ️ An account may already exist for this email. Try signing in.</div>' : ""}
        </div>

        <div class="input-group">
          <label class="input-label">Password</label>
          <input class="input-field" type="password" value="${state !== "empty" ? "••••••••••••" : ""}" ${isSubmitting ? "disabled" : ""}/>
          <div class="input-helper">At least 12 characters.</div>
        </div>

        <div class="input-group">
          <label class="input-label">Confirm password</label>
          <input class="input-field" type="password" value="${state !== "empty" ? "••••••••••••" : ""}" ${isSubmitting ? "disabled" : ""}/>
          ${isError ? '<div class="input-error">⚠️ Passwords do not match</div>' : ""}
        </div>

        <div style="margin-top: auto; padding-top: 16px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('AUTH-04')" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? "Creating account…" : "Create account"}
          </button>
          <div style="text-align: center; margin-top: 12px;">
            <a href="#" onclick="GarnetApp.navigatePrompt('AUTH-03')" class="caption-text" style="color: var(--text-secondary); text-decoration: none;">Already have an account? Sign in</a>
          </div>
        </div>
      </div>
    `;
  },

  // AUTH-03 · Sign in
  screenAuth03(state) {
    const isError = state === "incorrect-details";
    const isTooMany = state === "too-many-attempts";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 24px; text-align: center;">
        <div class="brand-gem" style="margin: 0 auto 16px auto; width: 36px; height: 36px;"></div>
        <h1 class="display-title" style="font-size: 32px; margin-bottom: 8px;">Welcome back</h1>
        <p class="body-text" style="margin-bottom: 24px;">Return to your shared space</p>

        ${
          isError
            ? `
          <div class="guardrail-pill" style="margin-bottom: 16px; background: rgba(248, 113, 113, 0.15);">
            Those details don't match. Try again.
          </div>
        `
            : ""
        }

        ${
          isTooMany
            ? `
          <div class="guardrail-pill" style="margin-bottom: 16px;">
            Please wait a moment before trying again.
          </div>
        `
            : ""
        }

        <div class="input-group" style="text-align: left;">
          <label class="input-label">Email</label>
          <input class="input-field" type="email" placeholder="you@example.com" value="${state !== "default" ? "selam@example.test" : ""}" />
        </div>

        <div class="input-group" style="text-align: left;">
          <div style="display: flex; justify-content: space-between;">
            <label class="input-label">Password</label>
            <a href="#" onclick="GarnetApp.navigatePrompt('AUTH-05')" class="caption-text" style="color: var(--garnet); text-decoration: none;">Forgot password?</a>
          </div>
          <input class="input-field" type="password" value="${state !== "default" ? "••••••••••••" : ""}" />
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <span class="body-text" style="font-size: 13px;">Keep me signed in</span>
          <input type="checkbox" checked style="accent-color: var(--garnet);" />
        </div>

        <button class="btn-pill btn-primary-garnet" style="margin-bottom: 12px;" onclick="GarnetApp.navigatePrompt('HOME-01')">Sign in</button>
        <button class="btn-pill btn-ghost" onclick="GarnetApp.navigatePrompt('AUTH-02')">Create account</button>
      </div>
    `;
  },

  // AUTH-04 · Verify email
  screenAuth04(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center;">
        <div class="capsule-gem garnet" style="width: 64px; height: 80px; margin-bottom: 24px;">
          <span style="font-size: 26px;">✉️</span>
        </div>
        <h1 class="display-title" style="font-size: 30px; margin-bottom: 10px;">Check your email</h1>
        <p class="body-text" style="margin-bottom: 20px;">
          We sent a verification link to <strong style="color: var(--text-primary);">s***@example.test</strong>. Open it on this phone to continue.
        </p>

        <span class="badge badge-simulated" style="margin-bottom: 28px;">Simulated — no email is sent</span>

        <button class="btn-pill btn-primary-garnet" style="margin-bottom: 12px;" onclick="GarnetApp.navigatePrompt('EMAIL-01')">
          Open email preview (demo)
        </button>
        <button class="btn-pill btn-secondary" style="margin-bottom: 12px;" onclick="GarnetApp.showToast('Verification email resent.')">
          Resend email
        </button>
        <button class="btn-pill btn-ghost" onclick="GarnetApp.navigatePrompt('PAIR-01')">Continue to Pairing</button>
      </div>
    `;
  },

  // AUTH-05 · Forgot password
  screenAuth05(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; padding: 24px;">
        ${this.renderHeader("Reset password", null, true, false)}
        <div style="margin: 20px 0;">
          <p class="body-text">Enter your email and we'll send a reset link if an account exists.</p>
        </div>

        <div class="input-group">
          <label class="input-label">Email</label>
          <input class="input-field" type="email" value="selam@example.test" />
        </div>

        <div style="margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('AUTH-06')">Send reset link</button>
        </div>
      </div>
    `;
  },

  // AUTH-06 · Reset password
  screenAuth06(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; padding: 24px;">
        ${this.renderHeader("Choose new password", null, false, false)}
        <div class="input-group" style="margin-top: 16px;">
          <label class="input-label">New password</label>
          <input class="input-field" type="password" value="••••••••••••" />
          <div class="input-helper">At least 12 characters.</div>
        </div>
        <div class="input-group">
          <label class="input-label">Confirm new password</label>
          <input class="input-field" type="password" value="••••••••••••" />
        </div>
        <div class="card-quiet" style="margin-bottom: 20px; font-size: 12px; color: var(--text-tertiary);">
          ℹ️ This signs you out on your other devices.
        </div>
        <div style="margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('AUTH-03')">Save new password</button>
        </div>
      </div>
    `;
  },

  // AUTH-07 · Session expired
  screenAuth07() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; background: #0D0B12;">
        <div class="brand-gem" style="margin-bottom: 20px; width: 36px; height: 36px;"></div>
        <h1 class="display-title" style="font-size: 28px; margin-bottom: 8px;">Please sign in again</h1>
        <p class="body-text" style="margin-bottom: 32px; color: var(--text-secondary);">
          For your privacy, you've been signed out on this device.
        </p>
        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('AUTH-03')">Sign in</button>
      </div>
    `;
  },

  // AUTH-08 · Sign out confirmation dialog
  screenAuth08() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; background: rgba(0,0,0,0.6);">
        <div class="card-quiet" style="background: var(--surface-primary); border-radius: 20px; padding: 24px; text-align: center;">
          <h2 class="section-title" style="margin-bottom: 8px;">Sign out?</h2>
          <p class="body-text" style="margin-bottom: 20px; font-size: 14px;">Drafts saved on this device stay here until you sign back in.</p>
          <div style="display: flex; gap: 10px;">
            <button class="btn-pill btn-secondary" onclick="GarnetApp.navigateBack()">Cancel</button>
            <button class="btn-pill btn-destructive" onclick="GarnetApp.navigatePrompt('AUTH-01')">Sign out</button>
          </div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     02 · PAIRING SCREENS
     ========================================================================== */

  // PAIR-01 · Create our space
  screenPair01(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 36px 24px 28px 24px; text-align: center;">
        <div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin: 40px 0 20px 0;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: var(--ruby); box-shadow: var(--glow-ruby);"></div>
            <div style="border-top: 2px dashed rgba(154, 123, 255, 0.4); width: 80px;"></div>
            <div class="brand-gem" style="width: 22px; height: 22px; opacity: 0.6;"></div>
            <div style="border-top: 2px dashed rgba(154, 123, 255, 0.4); width: 80px;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: var(--sapphire); box-shadow: var(--glow-sapphire);"></div>
          </div>

          <h1 class="display-title" style="font-size: 34px; margin-bottom: 12px;">Create our space</h1>
          <p class="body-text" style="font-size: 15px; color: var(--text-secondary); line-height: 1.6;">
            Garnet is for exactly two people. Invite your person, and only the two of you will see what you share.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('PAIR-02')">Invite my person</button>
          <button class="btn-pill btn-secondary" onclick="GarnetApp.navigatePrompt('PAIR-03')">I have an invitation</button>
          <p class="caption-text" style="color: var(--text-tertiary);">Invitations expire and work once.</p>
        </div>
      </div>
    `;
  },

  // PAIR-02 · Invitation generated
  screenPair02(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; text-align: center;">
        ${this.renderHeader("Your invitation", null, true, false)}

        <div style="margin: auto 0;">
          <div class="card-quiet" style="background: linear-gradient(135deg, rgba(232, 83, 111, 0.15) 0%, rgba(154, 123, 255, 0.15) 100%); border: 1px solid rgba(154, 123, 255, 0.35); padding: 28px 20px; border-radius: 20px;">
            <div class="caption-text" style="color: var(--garnet); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Single-use invitation code</div>
            <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #FFFFFF; margin-bottom: 12px;">
              GRNT-4KQ7
            </div>
            <div class="caption-text" style="color: var(--text-secondary);">Expires in 24 hours · works once</div>
          </div>

          <div style="margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); font-size: 13px;">
            <div class="status-indicator-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--garnet); animation: pulse 1.5s infinite;"></div>
            Waiting for your person to join…
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('PAIR-04')">Share invitation</button>
          <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Invitation code copied!')">Copy code</button>
          <span class="badge badge-simulated" style="margin: 4px auto 0 auto;">Simulated invitation</span>
        </div>
      </div>
    `;
  },

  // PAIR-03 · Join from invitation
  screenPair03(state) {
    const isInvalid = state === "invalid-expired";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; padding: 24px;">
        ${this.renderHeader("Join your person", null, true, false)}
        
        <div style="margin: 20px 0;">
          <p class="body-text">Ask your person for the code from their Garnet app.</p>
        </div>

        <div class="input-group">
          <label class="input-label">Invitation code</label>
          <div style="position: relative;">
            <input class="input-field" style="font-family: monospace; font-size: 20px; letter-spacing: 2px;" type="text" placeholder="GRNT-XXXX" value="${state === "typing" ? "GRNT-4KQ7" : ""}" />
            <button onclick="GarnetApp.showToast('Pasted from clipboard')" style="position: absolute; right: 8px; top: 8px; height: 32px; padding: 0 10px; background: rgba(255,255,255,0.08); border: none; border-radius: 8px; color: var(--text-secondary); font-size: 11px; cursor: pointer;">Paste</button>
          </div>
          ${
            isInvalid
              ? `
            <div class="guardrail-pill" style="margin-top: 12px;">
              This invite isn't valid anymore — ask your person for a new one.
            </div>
          `
              : ""
          }
        </div>

        <div style="margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('PAIR-04')">Continue</button>
        </div>
      </div>
    `;
  },

  // PAIR-04 · Review relationship identity
  screenPair04(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; text-align: center;">
        ${this.renderHeader("Review invitation", null, true, false)}

        <div style="margin: auto 0;">
          <div style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid var(--ruby); background: linear-gradient(135deg, #FF6B8B, #D7264A); display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px auto;">
            N
          </div>
          <h2 class="section-title" style="font-size: 24px; margin-bottom: 4px;">Noah</h2>
          <p class="body-text" style="color: var(--text-secondary); margin-bottom: 24px;">invited you to a private space for two.</p>

          <div class="card-quiet" style="text-align: left; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; gap: 10px; align-items: flex-start; font-size: 13px;">
              <span>🔒</span>
              <span>Only the two of you can see what's inside</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-start; font-size: 13px;">
              <span>🕊️</span>
              <span>You can leave at any time</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-start; font-size: 13px;">
              <span>🛡️</span>
              <span>Garnet never shares or sells your data</span>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('PAIR-05')">Accept and connect</button>
          <button class="btn-pill btn-secondary" onclick="GarnetApp.navigatePrompt('PAIR-01')">Decline</button>
          <div class="caption-text" style="color: var(--text-tertiary);">Only accept if you know this person.</div>
        </div>
      </div>
    `;
  },

  // PAIR-05 · Connected
  screenPair05(state) {
    const isUnavailable = state === "artwork-unavailable";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 48px 24px 32px 24px; text-align: center;">
        <div style="margin-top: 20px;">
          ${this.renderFigureSlots("happy", "happy", isUnavailable)}
          ${this.renderCrystalSVG("connected", 140)}
        </div>

        <div>
          <h1 class="display-title" style="font-size: 34px; margin-bottom: 10px;">You're connected. ❤️💙</h1>
          <p class="body-text" style="color: var(--text-secondary);">Let's set up your space.</p>
        </div>

        <div style="width: 100%;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SETUP-02')">Continue setup</button>
        </div>
      </div>
    `;
  },

  // PAIR-06 · Partner accepted (inviter side)
  screenPair06() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 24px;">
        <div class="card-quiet" style="background: linear-gradient(135deg, rgba(20,17,27,0.9), rgba(34,29,45,0.9)); padding: 28px 20px; text-align: center; border-radius: 24px; border: 1px solid var(--hairline);">
          <div style="display: flex; justify-content: center; gap: -8px; margin-bottom: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--ruby); background: #E8536F; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #FFF;">S</div>
            <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--sapphire); background: #5B8CFF; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #FFF; margin-left: -12px;">N</div>
          </div>
          <h2 class="section-title" style="font-size: 22px; margin-bottom: 8px;">Selam joined your space.</h2>
          <p class="body-text" style="margin-bottom: 24px; font-size: 14px;">Your private connection is active.</p>
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SETUP-02')">Continue setup</button>
        </div>
      </div>
    `;
  },

  // PAIR-07 · Conflict
  screenPair07() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;">
        <div class="brand-gem" style="margin-bottom: 20px; width: 40px; height: 40px;"></div>
        <h1 class="display-title" style="font-size: 28px; margin-bottom: 12px;">Already connected</h1>
        <p class="body-text" style="color: var(--text-secondary); margin-bottom: 32px;">
          You're already in a space with Noah. Garnet is for exactly two people.
        </p>
        <button class="btn-pill btn-primary-garnet" style="margin-bottom: 12px;" onclick="GarnetApp.navigatePrompt('HOME-01')">Go to my space</button>
        <button class="btn-pill btn-ghost" onclick="GarnetApp.navigatePrompt('SET-14')">Learn about leaving a space</button>
      </div>
    `;
  },

  /* ==========================================================================
     03 · IDENTITY & SETUP
     ========================================================================== */

  // SETUP-02 · Display name & Nickname
  screenSetup02(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          <!-- Progress -->
          <div style="display: flex; gap: 6px; margin-bottom: 24px;">
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
          </div>

          <h1 class="display-title" style="font-size: 28px; margin-bottom: 8px;">What should Noah call you?</h1>
          <p class="body-text" style="margin-bottom: 24px;">Set your name in this space.</p>

          <div class="input-group">
            <label class="input-label">Display name</label>
            <input class="input-field" type="text" value="Selam" />
          </div>

          <div class="input-group">
            <label class="input-label">Nickname (optional)</label>
            <input class="input-field" type="text" placeholder="e.g. My Love" value="${state === "with-nickname" ? "My Star" : ""}" />
            <div class="input-helper">Only your person sees this.</div>
          </div>

          <div class="card-quiet" style="margin-top: 20px; background: rgba(154, 123, 255, 0.08); border-color: rgba(154, 123, 255, 0.2);">
            <div class="caption-text" style="color: var(--garnet); margin-bottom: 4px;">Live notification preview</div>
            <div class="headline-text" style="font-size: 14px;">"A little thought from Selam."</div>
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SETUP-03')">Continue</button>
      </div>
    `;
  },

  // SETUP-03 · Avatar
  screenSetup03(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; text-align: center;">
        <div>
          <!-- Progress -->
          <div style="display: flex; gap: 6px; margin-bottom: 24px;">
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
          </div>

          <h1 class="display-title" style="font-size: 28px; margin-bottom: 8px;">Your picture</h1>
          <p class="body-text" style="margin-bottom: 32px;">Choose how you appear to Noah.</p>

          <div style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--ruby); background: linear-gradient(135deg, #FF6B8B, #D7264A); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 700; color: #FFF; margin: 0 auto 32px auto; box-shadow: var(--glow-ruby);">
            S
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; max-width: 280px; margin: 0 auto;">
            <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Photo library picker opened (simulated)')">Choose a photo</button>
            <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Camera opened (simulated)')">Take a photo</button>
            <button class="btn-pill btn-ghost">Use initials</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SETUP-04')">Continue</button>
          <button class="btn-pill btn-ghost" onclick="GarnetApp.navigatePrompt('SETUP-04')">Skip for now</button>
        </div>
      </div>
    `;
  },

  // SETUP-04 · Choose your side (U-22)
  screenSetup04(state) {
    const isRuby = state !== "sapphire-selected";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          <!-- Progress -->
          <div style="display: flex; gap: 6px; margin-bottom: 24px;">
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
          </div>

          <h1 class="display-title" style="font-size: 28px; margin-bottom: 6px;">Choose your side</h1>
          <p class="body-text" style="margin-bottom: 20px;">Your partner will be the other side. Together you're Garnet.</p>

          <div style="display: flex; gap: 14px;">
            <!-- Ruby Side Card -->
            <div class="card-quiet" style="flex: 1; padding: 18px 12px; text-align: center; border-radius: 18px; cursor: pointer; border: 2px solid ${isRuby ? "var(--ruby)" : "var(--hairline)"}; background: ${isRuby ? "rgba(232, 83, 111, 0.12)" : "var(--surface-primary)"}; box-shadow: ${isRuby ? "var(--glow-ruby)" : "none"};" onclick="GarnetApp.setState('ruby-selected')">
              <div class="figure-render ruby-figure" style="margin: 0 auto 10px auto; width: 64px; height: 80px;">
                <span class="figure-silhouette">❤️</span>
              </div>
              <div class="headline-text" style="font-size: 17px; margin-bottom: 4px;">Ruby</div>
              <div class="caption-text" style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">Warm, expressive, alive.</div>
              ${isRuby ? '<div style="margin-top: 10px; font-size: 11px; color: var(--ruby); font-weight: 600;">✓ Selected</div>' : ""}
            </div>

            <!-- Sapphire Side Card -->
            <div class="card-quiet" style="flex: 1; padding: 18px 12px; text-align: center; border-radius: 18px; cursor: pointer; border: 2px solid ${!isRuby ? "var(--sapphire)" : "var(--hairline)"}; background: ${!isRuby ? "rgba(91, 140, 255, 0.12)" : "var(--surface-primary)"}; box-shadow: ${!isRuby ? "var(--glow-sapphire)" : "none"};" onclick="GarnetApp.setState('sapphire-selected')">
              <div class="figure-render sapphire-figure" style="margin: 0 auto 10px auto; width: 64px; height: 80px;">
                <span class="figure-silhouette">💙</span>
              </div>
              <div class="headline-text" style="font-size: 17px; margin-bottom: 4px;">Sapphire</div>
              <div class="caption-text" style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">Calm, dreamy, spacious.</div>
              ${!isRuby ? '<div style="margin-top: 10px; font-size: 11px; color: var(--sapphire); font-weight: 600;">✓ Selected</div>' : ""}
            </div>
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SETUP-05')">Continue</button>
      </div>
    `;
  },

  // SETUP-05 · Timezone
  screenSetup05() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          <!-- Progress -->
          <div style="display: flex; gap: 6px; margin-bottom: 24px;">
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--garnet); border-radius: 2px;"></div>
            <div style="height: 4px; flex: 1; background: var(--hairline); border-radius: 2px;"></div>
          </div>

          <h1 class="display-title" style="font-size: 28px; margin-bottom: 8px;">Where's home right now?</h1>
          <p class="body-text" style="margin-bottom: 20px;">Garnet shows each moment in your own time, and your person's time when it helps.</p>

          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <div class="headline-text" style="font-size: 15px;">Addis Ababa (GMT+3)</div>
              <div class="caption-text">Auto-detected</div>
            </div>
            <span style="color: var(--success); font-weight: 600;">✓</span>
          </div>

          <div class="card-quiet" style="background: rgba(154, 123, 255, 0.08); border-color: rgba(154, 123, 255, 0.2);">
            <div class="caption-text" style="color: var(--garnet); margin-bottom: 6px;">Live example</div>
            <div class="headline-text" style="font-size: 16px; margin-bottom: 4px;">09:03 for you · 07:03 for Noah</div>
            <div class="caption-text">Noah's time updates automatically with UK daylight saving.</div>
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SETUP-08')">Continue</button>
      </div>
    `;
  },

  // SETUP-08 · Setup summary
  screenSetup08() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 28px 24px;">
        <div style="text-align: center;">
          ${this.renderCrystalSVG("summary", 100)}
          <h1 class="display-title" style="font-size: 30px; margin: 12px 0 6px 0;">You're all set</h1>
          <p class="body-text" style="margin-bottom: 24px;">Your space is ready for you both.</p>

          <div class="card-quiet" style="text-align: left; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="caption-text">Name & Nickname</div>
                <div class="body-text" style="color: var(--text-primary); font-weight: 500;">Selam (My Star)</div>
              </div>
              <span>›</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="caption-text">Your Side</div>
                <div class="body-text" style="color: var(--ruby); font-weight: 500;">Ruby (Warm red)</div>
              </div>
              <span>›</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="caption-text">Timezone</div>
                <div class="body-text" style="color: var(--text-primary); font-weight: 500;">Addis Ababa (GMT+3)</div>
              </div>
              <span>›</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="caption-text">Notifications</div>
                <div class="body-text" style="color: var(--text-primary); font-weight: 500;">Gentle lock-screen previews</div>
              </div>
              <span>›</span>
            </div>
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('HOME-01')">Go to our space</button>
      </div>
    `;
  },

  /* ==========================================================================
     04 · BEFORE LONG DISTANCE
     ========================================================================== */

  // PRE-01 · Pre-long-distance Home
  screenPre01(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Good evening, Selam", "Preparing together in Addis Ababa", false, true)}
        
        <div style="text-align: center; padding: 12px 20px;">
          <div style="margin-bottom: -10px;">
            ${this.renderFigureSlots("idle", "idle", false)}
          </div>
          ${this.renderCrystalSVG("pre", 110)}
          <h2 class="display-title" style="font-size: 26px; margin: 8px 0 4px 0;">Prepare your space together.</h2>
          <p class="caption-text">Before the miles begin, leave keepsakes for each other.</p>
        </div>

        <div style="padding: 0 20px 20px 20px;">
          <div class="card-quiet" style="margin-bottom: 16px;">
            <div class="headline-text" style="font-size: 15px; margin-bottom: 12px;">Pre-Departure Checklist</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                <span>Add important dates</span>
                <span style="color: var(--garnet);">✓ Added</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                <span>Prepare an Open When letter</span>
                <span style="color: var(--garnet);">✓ 1 Sealed</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                <span>Add a memory together</span>
                <span style="color: var(--text-tertiary);">Pending</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                <span>Plan "when we meet again"</span>
                <span style="color: var(--text-tertiary);">Pending</span>
              </div>
            </div>
          </div>

          <div class="card-quiet" style="background: linear-gradient(135deg, rgba(154, 123, 255, 0.15), rgba(232, 83, 111, 0.15)); border-color: rgba(154, 123, 255, 0.3); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('PRE-08')">
            <div>
              <div class="headline-text" style="font-size: 15px;">Start our long distance</div>
              <div class="caption-text">When you're ready to begin the next chapter</div>
            </div>
            <span>›</span>
          </div>
        </div>

        ${this.renderTabBar("home")}
      </div>
    `;
  },

  // PRE-08 · Start Long Distance — Intro
  screenPre08() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 24px; text-align: center; background: linear-gradient(180deg, #0D0B12 0%, #3D0E2A 50%, #0B1B4A 100%);">
        <div>
          ${this.renderFigureSlots("hug", "hug", false)}
          ${this.renderCrystalSVG("pre", 130)}
        </div>

        <div>
          <h1 class="display-title" style="font-size: 32px; margin-bottom: 12px;">Ready to begin our next chapter?</h1>
          <p class="body-text" style="color: var(--text-secondary); line-height: 1.6;">
            Your shared space is ready. When you both confirm, Garnet will begin your long-distance chapter.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('PRE-09')">I'm ready</button>
          <button class="btn-pill btn-secondary" onclick="GarnetApp.navigatePrompt('PRE-01')">Not yet</button>
        </div>
      </div>
    `;
  },

  // PRE-09 · Confirmation Status
  screenPre09(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 32px 24px; text-align: center;">
        ${this.renderHeader("Begin chapter", null, true, false)}

        <div style="margin: auto 0;">
          <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 24px;">
            <div>
              <div style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid var(--ruby); background: #E8536F; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #FFF; margin: 0 auto 8px auto;">S</div>
              <div class="headline-text" style="font-size: 14px;">You</div>
              <div style="color: var(--success); font-size: 12px; font-weight: 600;">Confirmed ✓</div>
            </div>
            <div>
              <div style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid var(--sapphire); background: #5B8CFF; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #FFF; margin: 0 auto 8px auto;">N</div>
              <div class="headline-text" style="font-size: 14px;">Noah</div>
              <div style="color: var(--warning); font-size: 12px; font-weight: 500;">Waiting…</div>
            </div>
          </div>

          <p class="body-text" style="color: var(--text-secondary); max-width: 280px; margin: 0 auto;">
            Garnet begins your chapter when you've both confirmed.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('PRE-10')">Simulate partner confirmed</button>
          <button class="btn-pill btn-ghost" onclick="GarnetApp.navigatePrompt('PRE-01')">Change my mind</button>
        </div>
      </div>
    `;
  },

  // PRE-10 · Transition
  screenPre10() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; background: radial-gradient(circle, #2C1338 0%, #0D0B12 80%);">
        ${this.renderCrystalSVG("ignited", 150)}
        <h1 class="display-title" style="font-size: 32px; margin: 24px 0 12px 0;">Our next chapter has begun. ❤️💙</h1>
        <p class="body-text" style="color: var(--text-secondary); margin-bottom: 32px;">Two lives. One space. Always close.</p>
        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('HOME-01')">Enter Home</button>
      </div>
    `;
  },

  /* ==========================================================================
     05 · HOME SCREEN
     ========================================================================== */

  // HOME-01 · Home Default & States
  screenHome01(state) {
    const isOffline = state === "offline-banner";
    const isSkeleton = state === "skeleton";
    const isArtworkUnavailable = state === "artwork-unavailable";

    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${
          isOffline
            ? `
          <div class="banner-alert" style="background: rgba(251, 191, 36, 0.15); border-color: rgba(251, 191, 36, 0.3); color: #FDE68A;">
            <span>📡 You're offline. Changes will sync later.</span>
          </div>
        `
            : ""
        }

        ${
          state === "permission-banner"
            ? `
          <div class="banner-alert">
            <span>Turn on gentle notifications?</span>
            <button onclick="GarnetApp.showToast('Permissions enabled')" style="background: none; border: none; color: var(--garnet); font-weight: 600; cursor: pointer;">Enable</button>
          </div>
        `
            : ""
        }

        <!-- Home Header -->
        <header style="padding: 14px 20px 4px 20px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h1 class="display-title" style="font-size: 26px;">Good morning, Selam</h1>
            <div class="caption-text" style="color: var(--text-secondary); font-size: 11px;">
              09:12 in Addis Ababa · 07:12 for Noah
            </div>
          </div>
          <div onclick="GarnetApp.openOverlay('HOME-05')" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--ruby); background: linear-gradient(135deg, #FF6B8B, #D7264A); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #FFF; cursor: pointer; box-shadow: var(--glow-ruby);">
            S
          </div>
        </header>

        <!-- Crystal Hero Area -->
        <div class="crystal-hero-container">
          ${
            isArtworkUnavailable
              ? `
            <div style="height: 120px; display: flex; align-items: center; justify-content: center; color: var(--garnet);">
              [Crystal Motif Stand-in]
            </div>
          `
              : `
            ${this.renderCrystalSVG("home", 130)}
          `
          }

          <!-- Quick Emotional Actions -->
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 14px;">
            <button class="btn-pill btn-secondary" style="flex: 1; padding: 0 10px; min-height: 40px; font-size: 12px; border-radius: 12px; background: rgba(20,17,27,0.7);" onclick="GarnetApp.openOverlay('US-02')">
              💭 Thought
            </button>
            <button class="btn-pill btn-secondary" style="flex: 1; padding: 0 10px; min-height: 40px; font-size: 12px; border-radius: 12px; background: rgba(20,17,27,0.7);" onclick="GarnetApp.openOverlay('US-03')">
              🥺 Missing You
            </button>
            <button class="btn-pill btn-secondary" style="flex: 1; padding: 0 10px; min-height: 40px; font-size: 12px; border-radius: 12px; background: rgba(20,17,27,0.7);" onclick="GarnetApp.openOverlay('US-04')">
              🫂 I Need You
            </button>
          </div>
        </div>

        <!-- Main Feed / Log button -->
        <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 14px;">
          <button class="btn-pill btn-primary-garnet" style="min-height: 46px;" onclick="GarnetApp.openOverlay('HOME-03')">
            ＋ Log something
          </button>

          <!-- Safe Waiting Item -->
          <div class="card-quiet" style="background: rgba(154, 123, 255, 0.1); border-color: rgba(154, 123, 255, 0.25); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('OPEN-01')">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 18px;">💜</span>
              <span style="font-size: 13px; font-weight: 500;">Something is waiting for you</span>
            </div>
            <span style="font-size: 12px; color: var(--garnet);">Open ›</span>
          </div>

          <!-- Upcoming Event -->
          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('EVT-01')">
            <div>
              <div class="caption-text" style="color: var(--sapphire);">Coming up in 4 days</div>
              <div class="headline-text" style="font-size: 14px;">Noah's Birthday · 14 Nov</div>
            </div>
            <span style="color: var(--sapphire);">🎂</span>
          </div>

          <!-- Today's Recent Moments Stream -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span class="headline-text" style="font-size: 15px;">Today</span>
              <a href="#" onclick="GarnetApp.navigatePrompt('DAYS-01')" class="caption-text" style="color: var(--garnet); text-decoration: none;">See all</a>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div class="card-quiet" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span>☕</span>
                  <div>
                    <div style="font-size: 13px; font-weight: 500;">First coffee at Tomoca</div>
                    <div class="caption-text">08:12 for you · 06:12 for Noah</div>
                  </div>
                </div>
                <span class="badge badge-only-you">Only you</span>
              </div>

              <div class="card-quiet" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span>🎙️</span>
                  <div>
                    <div style="font-size: 13px; font-weight: 500;">Morning thoughts (0:18)</div>
                    <div class="caption-text">08:45 for you</div>
                  </div>
                </div>
                <span class="badge badge-simulated">After reveal</span>
              </div>
            </div>
          </div>
        </div>

        ${this.renderTabBar("home")}
      </div>
    `;
  },

  // HOME-03 · Quick Log Sheet
  screenHome03() {
    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 class="section-title" style="font-size: 20px;">What's happening?</h2>
            <button onclick="GarnetApp.closeOverlay()" style="background: none; border: none; color: var(--text-tertiary); font-size: 16px; cursor: pointer;">✕</button>
          </div>

          <textarea class="input-field" style="height: 80px; padding: 12px; margin-bottom: 14px; resize: none;" placeholder="A small moment…"></textarea>

          <!-- Type chips -->
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 12px;">
            <span class="state-chip active">📝 Text</span>
            <span class="state-chip" onclick="GarnetApp.openOverlay('DAYS-07')">📷 Photo</span>
            <span class="state-chip" onclick="GarnetApp.openOverlay('DAYS-08')">🎙️ Voice</span>
            <span class="state-chip" onclick="GarnetApp.openOverlay('DAYS-09')">✨ Feeling</span>
            <span class="state-chip">📍 Place</span>
          </div>

          <!-- Footer details -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div class="caption-text" style="color: var(--text-secondary);">
              🔒 Visible to Noah after your days meet
            </div>
            <a href="#" class="caption-text" style="color: var(--garnet); text-decoration: none;">Change</a>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="caption-text" style="color: var(--text-tertiary);">Draft saved on this device</span>
            <button class="btn-pill btn-primary-garnet" style="width: auto; padding: 0 28px; min-height: 42px;" onclick="GarnetApp.showToast('Saved to your day.'); GarnetApp.closeOverlay();">
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // HOME-04 · Emotional Action Sheet
  screenHome04() {
    const signals = [
      {
        id: "US-02",
        icon: "💭",
        title: "Thought of You",
        desc: "A gentle touch across the distance",
      },
      {
        id: "US-03",
        icon: "🥺",
        title: "Missing You",
        desc: "Let Noah know they are on your mind",
      },
      { id: "US-04", icon: "🫂", title: "I Need You", desc: "Ask for warmth or grounding" },
      {
        id: "US-06",
        icon: "💬",
        title: "I Need to Talk",
        desc: "Ask to talk or ask Noah to just listen",
      },
      {
        id: "US-07",
        icon: "⏱️",
        title: "Please Check On Me",
        desc: "A gentle reminder later today",
      },
      {
        id: "US-08",
        icon: "🛡️",
        title: "I Can't Talk Yet",
        desc: "Not ready to talk yet, but still close",
      },
      { id: "US-09", icon: "❤️", title: "I'm Okay Now", desc: "Reassure Noah you are alright" },
    ];

    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          <h2 class="section-title" style="font-size: 20px; margin-bottom: 4px;">Send something to Noah</h2>
          <p class="caption-text" style="margin-bottom: 16px;">Signals are gentle communication, not pressure.</p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${signals
              .map(
                (s) => `
              <div class="card-quiet" style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px 14px;" onclick="GarnetApp.closeOverlay(); GarnetApp.openOverlay('${s.id}');">
                <span style="font-size: 24px;">${s.icon}</span>
                <div>
                  <div class="headline-text" style="font-size: 14px;">${s.title}</div>
                  <div class="caption-text">${s.desc}</div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  },

  // HOME-05 · Profile Menu Popover
  screenHome05() {
    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" style="max-height: 60%;" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          
          <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--hairline); margin-bottom: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--ruby); background: #E8536F; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #FFF;">S</div>
            <div>
              <div class="headline-text" style="font-size: 16px;">Selam</div>
              <div class="caption-text" style="color: var(--ruby);">Ruby · Addis Ababa</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div class="prompt-item" onclick="GarnetApp.closeOverlay(); GarnetApp.navigatePrompt('SET-01')">
              <span>⚙️ Settings</span>
              <span>›</span>
            </div>
            <div class="prompt-item" onclick="GarnetApp.closeOverlay(); GarnetApp.navigatePrompt('NOTIF-02')">
              <span>🔔 Notification preview lab</span>
              <span class="badge badge-simulated">Lab</span>
            </div>
            <div class="prompt-item" onclick="GarnetApp.closeOverlay(); GarnetApp.navigatePrompt('EMAIL-01')">
              <span>✉️ Email preview lab</span>
              <span class="badge badge-simulated">Lab</span>
            </div>
            <div class="prompt-item" onclick="GarnetApp.closeOverlay(); GarnetApp.navigatePrompt('WIDGET-01')">
              <span>📱 Widget preview gallery</span>
              <span class="badge badge-simulated">Lab</span>
            </div>
            <div class="prompt-item" onclick="GarnetApp.showToast('Demo data restored'); GarnetApp.closeOverlay();">
              <span>🔄 Reset demo data</span>
              <span class="badge badge-simulated">Prototype</span>
            </div>
            <div class="prompt-item" style="color: var(--danger); margin-top: 8px;" onclick="GarnetApp.closeOverlay(); GarnetApp.openOverlay('AUTH-08');">
              <span>Sign out</span>
              <span>›</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     06 · DAYS & LOGGING
     ========================================================================== */

  // DAYS-01 · Days Overview
  screenDays01(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Days", "Shared streams of moments", false, true)}

        <div style="padding: 0 20px 14px 20px; display: flex; gap: 8px;">
          <div class="studio-btn-group" style="width: 100%;">
            <button class="studio-btn active" style="flex: 1; justify-content: center;">List</button>
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.setState('calendar-month')">Calendar</button>
          </div>
        </div>

        <div style="padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 10px;">
          <!-- Day Row 1: Today -->
          <div class="card-quiet" style="cursor: pointer;" onclick="GarnetApp.navigatePrompt('DAYS-02')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="headline-text" style="font-size: 15px;">Today · Tue 3 Nov</span>
              <span class="badge badge-simulated">Your day so far</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">☕ First coffee</span>
              <span>·</span>
              <span style="font-size: 14px;">🎙️ Voice note</span>
            </div>
            <div class="caption-text" style="margin-top: 8px; color: var(--text-tertiary);">
              🔴 Selam logged · 🔵 Noah logged
            </div>
          </div>

          <!-- Day Row 2: Yesterday -->
          <div class="card-quiet" style="cursor: pointer;" onclick="GarnetApp.navigatePrompt('DAYS-04')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="headline-text" style="font-size: 15px;">Mon 2 Nov</span>
              <span class="badge" style="background: rgba(52, 211, 153, 0.15); color: var(--success);">Revealed ✓</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
              Merged recap: 7 moments shared across Addis & London
            </div>
          </div>

          <!-- Day Row 3: Sunday -->
          <div class="card-quiet" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="headline-text" style="font-size: 15px;">Sun 1 Nov</span>
              <span class="badge" style="background: rgba(52, 211, 153, 0.15); color: var(--success);">Revealed ✓</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
              Autumn walk in Hyde park · Family dinner in Bole
            </div>
          </div>
        </div>

        ${this.renderTabBar("days")}
      </div>
    `;
  },

  // DAYS-02 · My Day Timeline
  screenDays02(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("My day", "Today · Addis Ababa (GMT+3)", true, true)}

        <div style="padding: 0 20px 12px 20px;">
          <div class="studio-btn-group" style="width: 100%;">
            <button class="studio-btn active" style="flex: 1; justify-content: center;">My day</button>
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.navigatePrompt('DAYS-03')">Noah's day</button>
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.navigatePrompt('DAYS-04')">Together</button>
          </div>
        </div>

        <!-- Vertical Timeline with Ruby accent -->
        <div style="padding: 10px 20px 24px 20px; position: relative;">
          <!-- Timeline Line -->
          <div style="position: absolute; left: 68px; top: 20px; bottom: 40px; width: 2px; background: var(--ruby-subtle);"></div>

          <!-- Moment 1 -->
          <div style="display: flex; gap: 16px; margin-bottom: 20px; position: relative;">
            <div style="width: 44px; font-size: 12px; color: var(--text-tertiary); text-align: right; padding-top: 2px;">08:12</div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--ruby); margin-top: 4px; box-shadow: var(--glow-ruby); z-index: 2;"></div>
            <div class="card-quiet" style="flex: 1;">
              <div style="display: flex; justify-content: space-between;">
                <span class="headline-text" style="font-size: 14px;">☕ First coffee at Tomoca</span>
                <span class="badge badge-only-you">Only you</span>
              </div>
              <p class="caption-text" style="margin-top: 4px;">Sunlight coming through the cafe window.</p>
            </div>
          </div>

          <!-- Moment 2 (Voice Note) -->
          <div style="display: flex; gap: 16px; margin-bottom: 20px; position: relative;">
            <div style="width: 44px; font-size: 12px; color: var(--text-tertiary); text-align: right; padding-top: 2px;">09:03</div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--ruby); margin-top: 4px; box-shadow: var(--glow-ruby); z-index: 2;"></div>
            <div class="card-quiet" style="flex: 1; background: rgba(232, 83, 111, 0.08);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button style="width: 32px; height: 32px; border-radius: 50%; background: var(--ruby); border: none; color: #FFF; cursor: pointer;">▶</button>
                  <span style="font-size: 13px;">Voice note (0:18)</span>
                </div>
                <span class="badge badge-simulated">After reveal</span>
              </div>
            </div>
          </div>

          <!-- Finish My Day Button -->
          <div style="margin-top: 24px; text-align: center;">
            <button class="btn-pill btn-secondary" onclick="GarnetApp.navigatePrompt('DAYS-04')">Finish my day</button>
          </div>
        </div>

        ${this.renderTabBar("days")}
      </div>
    `;
  },

  // DAYS-03 · Partner's Day
  screenDays03(state) {
    const isRevealed = state === "revealed";
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Noah's day", "London 🇬🇧 · Sapphire Side", true, true)}

        <div style="padding: 0 20px 12px 20px;">
          <div class="studio-btn-group" style="width: 100%;">
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.navigatePrompt('DAYS-02')">My day</button>
            <button class="studio-btn active" style="flex: 1; justify-content: center;">Noah's day</button>
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.navigatePrompt('DAYS-04')">Together</button>
          </div>
        </div>

        ${
          !isRevealed
            ? `
          <!-- Unrevealed State -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(91, 140, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">
              🌌
            </div>
            <h2 class="display-title" style="font-size: 24px; margin-bottom: 8px;">Noah's day is still theirs for now.</h2>
            <p class="body-text" style="color: var(--text-secondary); max-width: 280px; margin-bottom: 24px;">
              Your days will meet when you're both ready.
            </p>
            <button class="btn-pill btn-secondary" onclick="GarnetApp.setState('revealed')">Preview revealed day</button>
          </div>
        `
            : `
          <!-- Revealed State -->
          <div style="padding: 10px 20px 24px 20px; position: relative;">
            <div style="position: absolute; left: 68px; top: 20px; bottom: 40px; width: 2px; background: var(--sapphire-subtle);"></div>

            <div style="display: flex; gap: 16px; margin-bottom: 20px;">
              <div style="width: 44px; font-size: 11px; color: var(--text-tertiary); text-align: right;">15:42<br><span style="font-size: 9px;">18:42 for you</span></div>
              <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--sapphire); margin-top: 4px; box-shadow: var(--glow-sapphire); z-index: 2;"></div>
              <div class="card-quiet" style="flex: 1; border-color: rgba(91, 140, 255, 0.3);">
                <div class="headline-text" style="font-size: 14px;">🌧️ Rain on Southbank</div>
                <p class="caption-text" style="margin-top: 4px;">Walked back from the studio.</p>
              </div>
            </div>
          </div>
        `
        }

        ${this.renderTabBar("days")}
      </div>
    `;
  },

  // DAYS-04 · Day Reveal Recap
  screenDays04(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Our Day Together", "Merged Recap · Violet Harmony", true, true)}

        <div style="text-align: center; padding: 14px 20px;">
          ${this.renderCrystalSVG("recap", 100)}
          <h2 class="display-title" style="font-size: 24px; margin: 8px 0 4px 0;">Your days have met. ❤️💙</h2>
          <p class="caption-text">Chronological flow across Addis Ababa and London</p>
        </div>

        <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div class="card-quiet" style="border-left: 3px solid var(--ruby);">
            <div class="caption-text" style="color: var(--ruby);">08:12 Addis · Selam</div>
            <div class="headline-text" style="font-size: 14px;">☕ First coffee at Tomoca</div>
          </div>

          <div class="card-quiet" style="border-left: 3px solid var(--sapphire);">
            <div class="caption-text" style="color: var(--sapphire);">11:30 London · Noah</div>
            <div class="headline-text" style="font-size: 14px;">🎨 Painting study finished</div>
          </div>

          <div class="card-quiet" style="border-left: 3px solid var(--ruby);">
            <div class="caption-text" style="color: var(--ruby);">17:45 Addis · Selam</div>
            <div class="headline-text" style="font-size: 14px;">🌅 Sunset over Entoto hills</div>
          </div>
        </div>

        ${this.renderTabBar("days")}
      </div>
    `;
  },

  /* ==========================================================================
     07 · US: EMOTIONAL CONNECTION
     ========================================================================== */

  // US-01 · Us Tab Screen
  screenUs01(state) {
    const isSupportPinned = state === "pinned-support-card";
    const signals = [
      { id: "US-02", icon: "💭", title: "Thought of You", color: "var(--ruby)" },
      { id: "US-03", icon: "🥺", title: "Missing You", color: "var(--sapphire)" },
      { id: "US-04", icon: "🫂", title: "I Need You", color: "var(--garnet)" },
      { id: "US-06", icon: "💬", title: "I Need to Talk", color: "var(--text-primary)" },
      { id: "US-07", icon: "⏱️", title: "Check On Me", color: "var(--text-secondary)" },
      { id: "US-08", icon: "🛡️", title: "Can't Talk Yet", color: "var(--text-secondary)" },
      { id: "US-09", icon: "❤️", title: "I'm Okay Now", color: "var(--ruby)" },
      { id: "CHAT-01", icon: "✉️", title: "Messages", color: "var(--garnet)" },
    ];

    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Us", "Intimate Emotional Connection", false, true)}

        <!-- Dual Avatars & Violet Connection Line -->
        <div style="padding: 14px 20px 20px 20px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px;">
            <div>
              <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--ruby); background: #E8536F; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #FFF; margin: 0 auto 4px auto;">S</div>
              <div class="caption-text" style="color: var(--text-primary); font-weight: 600;">Selam</div>
              <div class="caption-text" style="font-size: 10px;">09:12</div>
            </div>
            
            <div style="flex: 1; max-width: 100px; height: 2px; background: linear-gradient(90deg, var(--ruby), var(--garnet), var(--sapphire)); border-radius: 2px; position: relative;">
              <div style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; border-radius: 50%; background: var(--garnet); box-shadow: var(--glow-garnet);"></div>
            </div>

            <div>
              <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--sapphire); background: #5B8CFF; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #FFF; margin: 0 auto 4px auto;">N</div>
              <div class="caption-text" style="color: var(--text-primary); font-weight: 600;">Noah</div>
              <div class="caption-text" style="font-size: 10px;">07:12</div>
            </div>
          </div>
        </div>

        ${
          isSupportPinned
            ? `
          <div style="padding: 0 20px 14px 20px;">
            <div class="card-quiet" style="background: rgba(154, 123, 255, 0.15); border-color: var(--garnet);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="headline-text" style="font-size: 14px;">🫂 Noah sent a support signal</span>
                <span class="caption-text">10m ago</span>
              </div>
              <p class="body-text" style="font-size: 13px; margin: 6px 0 10px 0;">"Feeling overwhelmed with work today."</p>
              <button class="btn-pill btn-primary-garnet" style="min-height: 36px; font-size: 12px;" onclick="GarnetApp.showToast('Comfort sent to Noah ❤️')">Send comfort</button>
            </div>
          </div>
        `
            : ""
        }

        <!-- 2-Column Grid of Signal Tiles -->
        <div style="padding: 0 20px 24px 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
            ${signals
              .map(
                (s) => `
              <div class="card-quiet" style="padding: 16px 12px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(20,17,27,0.7); backdrop-filter: blur(10px);" onclick="GarnetApp.openOverlay('${s.id}')">
                <span style="font-size: 26px;">${s.icon}</span>
                <span style="font-size: 13px; font-weight: 600; color: ${s.color};">${s.title}</span>
              </div>
            `,
              )
              .join("")}
          </div>

          <!-- Signal History -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="headline-text" style="font-size: 15px;">Recent between you</span>
            <a href="#" onclick="GarnetApp.navigatePrompt('US-10')" class="caption-text" style="color: var(--garnet); text-decoration: none;">History</a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="card-quiet" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span>💭</span>
                <div>
                  <div style="font-size: 13px; font-weight: 500;">You sent a thought</div>
                  <div class="caption-text">Today · 08:30</div>
                </div>
              </div>
              <span class="badge badge-simulated">Delivered</span>
            </div>
          </div>
        </div>

        ${this.renderTabBar("us")}
      </div>
    `;
  },

  // US-02 · I Thought of You
  screenUs02(state) {
    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">💭</span>
            <h2 class="display-title" style="font-size: 24px; margin-top: 8px;">Send a thought to Noah</h2>
            <p class="caption-text">Instant, gentle, and quiet.</p>
          </div>

          <input class="input-field" type="text" placeholder="Add a few words (optional)" style="margin-bottom: 16px;" />

          <button class="btn-pill btn-primary-ruby" onclick="GarnetApp.showToast('Thought sent to Noah 💭'); GarnetApp.closeOverlay();">
            Send thought
          </button>
        </div>
      </div>
    `;
  },

  // US-03 · Missing You
  screenUs03() {
    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">🥺</span>
            <h2 class="display-title" style="font-size: 24px; margin-top: 8px;">Missing Noah</h2>
            <p class="caption-text">Choose how you're feeling right now.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Sent: Missing you a little 🥺'); GarnetApp.closeOverlay();">A little</button>
            <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Sent: Missing you a lot 🥺'); GarnetApp.closeOverlay();">A lot</button>
            <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.showToast('Sent: I need a hug 🫂'); GarnetApp.closeOverlay();">I need a hug</button>
          </div>
        </div>
      </div>
    `;
  },

  // US-04 · I Need You Selector
  screenUs04() {
    const needs = [
      "I'm feeling down",
      "I'm overwhelmed",
      "I feel lonely",
      "I need to talk",
      "I need comfort",
      "Something upset me",
      "I just need you",
    ];

    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          <h2 class="section-title" style="font-size: 20px; margin-bottom: 6px;">What do you need right now?</h2>
          <p class="caption-text" style="margin-bottom: 16px;">Noah will receive a calm, caring notification.</p>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            ${needs
              .map(
                (n) => `
              <div class="card-quiet" style="padding: 12px 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="GarnetApp.showToast('Support signal sent to Noah'); GarnetApp.closeOverlay();">
                <span style="font-size: 14px;">${n}</span>
                <span>›</span>
              </div>
            `,
              )
              .join("")}
          </div>

          <div class="caption-text" style="color: var(--text-tertiary); text-align: center;">
            Garnet isn't an emergency service. <a href="#" style="color: var(--garnet);">Help resources</a>
          </div>
        </div>
      </div>
    `;
  },

  // US-10 · Signal History
  screenUs10() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Signal history", "Private emotional log", true, true)}

        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 10px;">
          <div class="card-quiet">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 500;">💭 Thought of you</span>
              <span class="caption-text">Today · 08:30</span>
            </div>
            <div class="caption-text" style="color: var(--text-secondary); margin-top: 4px;">"Good morning love"</div>
          </div>

          <div class="card-quiet">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 500;">🥺 Missing you</span>
              <span class="caption-text">Yesterday · 21:14</span>
            </div>
            <div class="caption-text" style="color: var(--text-secondary); margin-top: 4px;">Selected: I need a hug</div>
          </div>
        </div>

        ${this.renderTabBar("us")}
      </div>
    `;
  },

  /* ==========================================================================
     08 · PRIVATE CHAT
     ========================================================================== */

  // CHAT-00 · Conversation List
  screenChat00() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Messages", null, true, true)}

        <div style="padding: 12px 20px;">
          <div class="card-quiet" style="display: flex; align-items: center; gap: 14px; cursor: pointer;" onclick="GarnetApp.navigatePrompt('CHAT-01')">
            <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--sapphire); background: #5B8CFF; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #FFF; flex-shrink: 0;">N</div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="headline-text" style="font-size: 15px;">Noah</span>
                <span class="caption-text">18:42</span>
              </div>
              <div class="caption-text" style="color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                "Just finished work, walking back now ❤️"
              </div>
            </div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--garnet);"></div>
          </div>
        </div>

        ${this.renderTabBar("us")}
      </div>
    `;
  },

  // CHAT-01 · Conversation
  screenChat01(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-hidden; position: relative;">
        <!-- Compact Header -->
        <header style="padding: 10px 16px; border-bottom: 1px solid var(--hairline); display: flex; align-items: center; justify-content: space-between; background: var(--surface-glass);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="GarnetApp.navigatePrompt('US-01')" style="background: none; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer;">‹</button>
            <div style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--sapphire); background: #5B8CFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #FFF;">N</div>
            <div>
              <div style="font-size: 14px; font-weight: 600;">Noah</div>
              <div class="caption-text" style="font-size: 10px;">18:42 in London</div>
            </div>
          </div>
          <button onclick="GarnetApp.navigatePrompt('CHAT-09')" style="background: none; border: none; color: var(--text-tertiary); font-size: 18px; cursor: pointer;">ℹ️</button>
        </header>

        <!-- Message Stream -->
        <div style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <div style="text-align: center;">
            <span class="caption-text" style="background: rgba(255,255,255,0.05); padding: 2px 10px; border-radius: 99px;">Today</span>
          </div>

          <!-- Noah's Bubble (Sapphire) -->
          <div style="align-self: flex-start; max-width: 80%;">
            <div style="background: var(--sapphire-subtle); border: 1px solid rgba(91, 140, 255, 0.25); color: var(--text-primary); padding: 10px 14px; border-radius: 16px 16px 16px 4px; font-size: 14px; line-height: 1.4;">
              Morning Selam! Hope your coffee is warm ☕
            </div>
            <div class="caption-text" style="font-size: 10px; margin-top: 2px; color: var(--text-tertiary);">08:15</div>
          </div>

          <!-- My Bubble (Ruby) -->
          <div style="align-self: flex-end; max-width: 80%;">
            <div style="background: var(--ruby-subtle); border: 1px solid rgba(232, 83, 111, 0.25); color: var(--text-primary); padding: 10px 14px; border-radius: 16px 16px 4px 16px; font-size: 14px; line-height: 1.4;">
              It is! Tomoca is packed today. How is the London fog?
            </div>
            <div class="caption-text" style="font-size: 10px; margin-top: 2px; text-align: right; color: var(--text-tertiary);">08:18 · Sent</div>
          </div>

          <!-- Noah's Bubble 2 with reaction -->
          <div style="align-self: flex-start; max-width: 80%;">
            <div style="background: var(--sapphire-subtle); border: 1px solid rgba(91, 140, 255, 0.25); color: var(--text-primary); padding: 10px 14px; border-radius: 16px 16px 16px 4px; font-size: 14px; line-height: 1.4;">
              Freezing cold haha! Just walking to the library now.
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span class="caption-text" style="font-size: 10px; color: var(--text-tertiary);">08:20</span>
              <span style="font-size: 11px; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 10px;">❤️</span>
            </div>
          </div>
        </div>

        <!-- Chat Composer -->
        <div style="padding: 10px 14px; border-top: 1px solid var(--hairline); display: flex; align-items: center; gap: 8px; background: var(--surface-primary);">
          <button style="background: none; border: none; font-size: 20px; color: var(--text-tertiary); cursor: pointer;" onclick="GarnetApp.openOverlay('CHAT-08')">＋</button>
          <input class="input-field" style="height: 38px; border-radius: 19px; padding: 0 14px; font-size: 13px;" type="text" placeholder="Message" />
          <button style="background: none; border: none; font-size: 18px; color: var(--text-tertiary); cursor: pointer;" onclick="GarnetApp.openOverlay('DAYS-08')">🎙️</button>
          <button style="width: 34px; height: 34px; border-radius: 50%; background: var(--garnet); border: none; color: #FFF; font-size: 14px; cursor: pointer;" onclick="GarnetApp.showToast('Message sent')">↑</button>
        </div>
      </div>
    `;
  },

  // CHAT-08 · Media Sheet
  screenChat08() {
    return `
      <div class="sheet-backdrop" onclick="GarnetApp.closeOverlay(event)">
        <div class="sheet-container" onclick="event.stopPropagation()">
          <div class="sheet-grabber"></div>
          <h2 class="section-title" style="font-size: 18px; margin-bottom: 12px;">Share in Chat</h2>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="card-quiet" onclick="GarnetApp.showToast('Photo selected'); GarnetApp.closeOverlay();" style="cursor: pointer;">📷 Photo library</div>
            <div class="card-quiet" onclick="GarnetApp.showToast('Camera active'); GarnetApp.closeOverlay();" style="cursor: pointer;">📸 Take photo</div>
            <div class="card-quiet" onclick="GarnetApp.showToast('Voice note started'); GarnetApp.closeOverlay();" style="cursor: pointer;">🎙️ Voice note</div>
          </div>
          <p class="caption-text" style="margin-top: 12px; text-align: center; color: var(--text-tertiary);">
            This won't be saved as a memory unless you choose to.
          </p>
        </div>
      </div>
    `;
  },

  // CHAT-09 · Conversation details
  screenChat09() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Chat details", null, true, false)}
        
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <div class="card-quiet">
            <div class="headline-text" style="font-size: 15px; margin-bottom: 8px;">Shared Media</div>
            <div style="display: flex; gap: 8px;">
              <div style="width: 60px; height: 60px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center;">📷</div>
              <div style="width: 60px; height: 60px; border-radius: 8px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center;">🎙️</div>
            </div>
          </div>

          <div class="card-quiet">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="headline-text" style="font-size: 14px;">Read Receipts (U-35)</div>
                <div class="caption-text">Off by default for zero pressure</div>
              </div>
              <input type="checkbox" style="accent-color: var(--garnet);" />
            </div>
          </div>

          <div class="card-quiet">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="headline-text" style="font-size: 14px;">Typing Indicators</div>
                <div class="caption-text">Show when you are typing</div>
              </div>
              <input type="checkbox" checked style="accent-color: var(--garnet);" />
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     09 · OPEN WHEN LETTERS
     ========================================================================== */

  // OPEN-01 · Open When Library
  screenOpen01(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Open When", "Time-locked empathy letters", false, true)}

        <div style="padding: 0 20px 14px 20px;">
          <div class="studio-btn-group" style="width: 100%;">
            <button class="studio-btn active" style="flex: 1; justify-content: center;">For me</button>
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.setState('populated-from-me')">From me</button>
          </div>
        </div>

        <div style="padding: 0 20px 24px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${this.renderCapsule("sapphire", "Ready to open", "Open when you miss me", "Noah")}
          ${this.renderCapsule("garnet", "Sealed", "Open on our anniversary", "Noah")}
          ${this.renderCapsule("sapphire", "Sealed", "Open when you have a hard day", "Noah")}
          ${this.renderCapsule("sapphire", "Opened", "Open when you first land", "Noah")}
        </div>

        <div style="padding: 0 20px 20px 20px; margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('OPEN-02')">
            ✍️ Write a letter
          </button>
        </div>

        ${this.renderTabBar("moments")}
      </div>
    `;
  },

  // OPEN-02 · Create Prompt & Category
  screenOpen02() {
    const suggestions = [
      "you miss me",
      "you have a terrible day",
      "you can't sleep",
      "you're homesick",
      "you're angry with me",
      "you need to laugh",
      "you need motivation",
      "on your first day at work",
      "you need to hear my voice",
    ];

    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          ${this.renderHeader("Open when…", null, true, false)}

          <div class="input-group" style="margin-top: 14px;">
            <input class="input-field" style="font-family: var(--font-display); font-size: 20px;" type="text" placeholder="Write your own prompt…" value="you miss me" />
          </div>

          <div class="caption-text" style="margin-bottom: 12px; color: var(--text-tertiary);">Suggestions</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${suggestions
              .map(
                (s) => `
              <span class="state-chip" onclick="GarnetApp.showToast('Selected: ${s}')">${s}</span>
            `,
              )
              .join("")}
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('OPEN-03')">Next: Write letter</button>
      </div>
    `;
  },

  // OPEN-03 · Letter Body
  screenOpen03() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          ${this.renderHeader("Letter for Noah", "Open when you miss me", true, false)}

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--hairline); border-radius: 16px; padding: 18px; margin-top: 16px;">
            <textarea style="width: 100%; height: 200px; background: none; border: none; color: var(--text-primary); font-family: var(--font-display); font-size: 18px; line-height: 1.6; outline: none; resize: none;" placeholder="Write with your heart…">Whenever you feel the distance, close your eyes and remember that I am right there with you. The miles don't change how deeply you are loved.</textarea>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
            <div class="caption-text" style="color: var(--text-tertiary);">Draft saved on this device</div>
            <div style="display: flex; gap: 8px;">
              <button style="background: none; border: none; font-size: 18px; color: var(--text-secondary); cursor: pointer;">📷</button>
              <button style="background: none; border: none; font-size: 18px; color: var(--text-secondary); cursor: pointer;">🎙️</button>
            </div>
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('OPEN-04')">Next: Set unlock condition</button>
      </div>
    `;
  },

  // OPEN-04 · Unlock Condition
  screenOpen04() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          ${this.renderHeader("Unlock condition", "When can Noah open it?", true, false)}

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
            <div class="card-quiet" style="border-color: var(--garnet); background: rgba(154, 123, 255, 0.1);">
              <div class="headline-text" style="font-size: 14px;">Anytime</div>
              <div class="caption-text">Noah decides when they need it most</div>
            </div>
            <div class="card-quiet">
              <div class="headline-text" style="font-size: 14px;">On a date and time</div>
              <div class="caption-text">Locked until a specific future moment</div>
            </div>
            <div class="card-quiet">
              <div class="headline-text" style="font-size: 14px;">On an event</div>
              <div class="caption-text">e.g. Birthday, Anniversary, First trip</div>
            </div>
          </div>

          <div class="card-quiet" style="margin-top: 20px; text-align: center;">
            <div class="caption-text" style="color: var(--garnet); margin-bottom: 8px;">What Noah will see before opening</div>
            ${this.renderCapsule("ruby", "Sealed", "Open when you miss me", "Selam")}
          </div>
        </div>

        <div>
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.showToast('Letter sealed! Once sealed, it cannot be edited.'); GarnetApp.navigatePrompt('OPEN-01');">
            Seal letter
          </button>
        </div>
      </div>
    `;
  },

  // OPEN-05 · Sealed Letter Detail
  screenOpen05() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 40px 24px; text-align: center;">
        ${this.renderHeader("", null, true, false)}

        <div style="margin: auto 0;">
          <div class="capsule-gem sapphire" style="width: 80px; height: 104px; margin: 0 auto 24px auto;">
            <div class="capsule-seam"></div>
            <span style="font-size: 32px;">💌</span>
          </div>

          <h1 class="display-title" style="font-size: 30px; margin-bottom: 8px;">"Open when you miss me"</h1>
          <p class="caption-text" style="color: var(--sapphire); font-size: 14px; margin-bottom: 24px;">From Noah · sealed 30 Aug</p>
          
          <div class="guardrail-pill" style="display: inline-block; background: rgba(154, 123, 255, 0.1); border-color: rgba(154, 123, 255, 0.3); color: #CBB5FF;">
            ✨ Ready to open whenever you need it
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('OPEN-06')">Open letter</button>
      </div>
    `;
  },

  // OPEN-06 · Opening Storyboard
  screenOpen06() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; background: radial-gradient(circle, #29153B 0%, #0D0B12 80%);">
        <div class="capsule-gem sapphire" style="width: 100px; height: 130px; margin-bottom: 24px; box-shadow: 0 0 40px rgba(154, 123, 255, 0.8);">
          <div class="capsule-seam" style="box-shadow: 0 0 16px #FFF;"></div>
          <span style="font-size: 40px;">✨</span>
        </div>
        <h2 class="display-title" style="font-size: 28px; margin-bottom: 12px;">Light spilling out…</h2>
        <p class="body-text" style="color: var(--text-secondary); margin-bottom: 28px;">Capsule unsealing</p>
        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('OPEN-07')">View letter</button>
      </div>
    `;
  },

  // OPEN-07 · Opened Letter
  screenOpen07() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 24px;">
        ${this.renderHeader("Letter from Noah", "Opened today at 21:04", true, false)}

        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--hairline); border-radius: 20px; padding: 24px; margin: 16px 0;">
          <h2 class="display-title" style="font-size: 24px; margin-bottom: 16px;">"Open when you miss me"</h2>
          <p style="font-family: var(--font-display); font-size: 19px; line-height: 1.7; color: var(--text-primary); margin-bottom: 24px;">
            My dearest Selam, if you are reading this, I know the miles feel heavy today. Just know that every single thought I have here in London is tied to you. You are my home.
          </p>
          <div style="text-align: right; font-family: var(--font-display); font-size: 20px; color: var(--sapphire);">
            — Noah
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: auto;">
          <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Saved to Memories')">Save as memory</button>
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.openOverlay('US-02')">Reply with thought</button>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     10 · MEMORIES
     ========================================================================== */

  // MEM-01 · Memories Timeline
  screenMem01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Memories", "Private shared archive", false, true)}

        <div style="padding: 0 20px 14px 20px;">
          <div class="studio-btn-group" style="width: 100%;">
            <button class="studio-btn active" style="flex: 1; justify-content: center;">Timeline</button>
            <button class="studio-btn" style="flex: 1; justify-content: center;" onclick="GarnetApp.navigatePrompt('MEM-02')">Collections</button>
          </div>
        </div>

        <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 16px;">
          <div class="section-title" style="font-size: 18px;">October · Chapter 02</div>

          <!-- Memory Card 1 -->
          <div class="card-quiet" style="padding: 0; overflow: hidden; cursor: pointer;" onclick="GarnetApp.navigatePrompt('MEM-05')">
            <div style="height: 140px; background: linear-gradient(135deg, #3D1A2E, #14111B); display: flex; align-items: center; justify-content: center; font-size: 32px;">
              🌄
            </div>
            <div style="padding: 14px;">
              <div class="headline-text" style="font-size: 15px;">Sunset over Entoto</div>
              <div class="caption-text">24 Oct · Addis Ababa</div>
            </div>
          </div>

          <!-- Memory Card 2: Quote -->
          <div class="card-quiet" style="padding: 18px; border-left: 3px solid var(--garnet);">
            <div style="font-family: var(--font-display); font-size: 18px; line-height: 1.5; margin-bottom: 8px;">
              "I told you about the street art in Shoreditch and we couldn't stop laughing."
            </div>
            <div class="caption-text">12 Oct · From Chat</div>
          </div>
        </div>

        <div style="padding: 0 20px 20px 20px; margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('MEM-04')">＋ Add memory</button>
        </div>

        ${this.renderTabBar("world")}
      </div>
    `;
  },

  // MEM-02 · Collections
  screenMem02() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Collections", "Organized story albums", true, true)}

        <div style="padding: 14px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="card-quiet" style="padding: 16px; text-align: center; cursor: pointer;" onclick="GarnetApp.navigatePrompt('MEM-01')">
            <div style="font-size: 32px; margin-bottom: 8px;">✈️</div>
            <div class="headline-text" style="font-size: 14px;">Before Long Distance</div>
            <div class="caption-text">18 moments</div>
          </div>

          <div class="card-quiet" style="padding: 16px; text-align: center; cursor: pointer;" onclick="GarnetApp.navigatePrompt('MEM-01')">
            <div style="font-size: 32px; margin-bottom: 8px;">🇬🇧</div>
            <div class="headline-text" style="font-size: 14px;">First Days Apart</div>
            <div class="caption-text">12 moments</div>
          </div>

          <div class="card-quiet" style="padding: 16px; text-align: center; border: 1px dashed var(--hairline); cursor: pointer;" onclick="GarnetApp.showToast('New collection form opened')">
            <div style="font-size: 28px; margin-bottom: 8px; color: var(--garnet);">＋</div>
            <div class="headline-text" style="font-size: 14px;">New Collection</div>
          </div>
        </div>

        ${this.renderTabBar("world")}
      </div>
    `;
  },

  // MEM-04 · Create Memory
  screenMem04() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          ${this.renderHeader("New memory", null, true, false)}

          <div class="input-group" style="margin-top: 14px;">
            <label class="input-label">Title</label>
            <input class="input-field" type="text" placeholder="Title of this moment" value="Coffee together over video" />
          </div>

          <div class="input-group">
            <label class="input-label">Story / Note</label>
            <textarea class="input-field" style="height: 100px; padding: 12px; resize: none;" placeholder="Write about what made this special…">We made our coffees at the exact same minute.</textarea>
          </div>

          <div class="input-group">
            <label class="input-label">Place (voluntary, not tracked)</label>
            <input class="input-field" type="text" placeholder="Add place (optional)" value="London & Addis Ababa" />
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.showToast('Memory saved to our private archive.'); GarnetApp.navigatePrompt('MEM-01');">
          Save memory
        </button>
      </div>
    `;
  },

  // MEM-05 · Memory Detail
  screenMem05() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        ${this.renderHeader("", null, true, false)}

        <div style="height: 220px; border-radius: 20px; background: linear-gradient(135deg, #3D1A2E, #14111B); display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 20px;">
          🌄
        </div>

        <h1 class="display-title" style="font-size: 28px; margin-bottom: 6px;">Sunset over Entoto</h1>
        <div class="caption-text" style="color: var(--ruby); margin-bottom: 16px;">24 Oct · Addis Ababa · Added by Selam</div>

        <p class="body-text" style="line-height: 1.6; color: var(--text-secondary); margin-bottom: 24px;">
          I sat on the hillside watching the sun go down and wished so deeply that you were sitting beside me.
        </p>

        <div style="display: flex; gap: 10px; margin-top: auto;">
          <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Edit opened')">Edit</button>
          <button class="btn-pill btn-destructive" onclick="GarnetApp.openOverlay('MEM-09')">Delete</button>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     11 · EVENTS & CHAPTERS
     ========================================================================== */

  // EVT-01 · Events List
  screenEvt01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Moments & Events", "Dates that matter to you both", false, true)}

        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div class="card-quiet" style="border-left: 3px solid var(--sapphire); cursor: pointer;" onclick="GarnetApp.navigatePrompt('EVT-05')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="headline-text" style="font-size: 15px;">🎂 Noah's Birthday</span>
              <span class="badge" style="background: rgba(91, 140, 255, 0.15); color: var(--sapphire);">In 4 days</span>
            </div>
            <div class="caption-text" style="margin-top: 4px;">Sat 14 Nov · London 🇬🇧</div>
          </div>

          <div class="card-quiet" style="border-left: 3px solid var(--garnet); cursor: pointer;" onclick="GarnetApp.navigatePrompt('EVT-06')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="headline-text" style="font-size: 15px;">💜 Our Anniversary</span>
              <span class="badge" style="background: rgba(154, 123, 255, 0.15); color: var(--garnet);">12 Dec</span>
            </div>
            <div class="caption-text" style="margin-top: 4px;">Two years together</div>
          </div>

          <div class="card-quiet" style="border-left: 3px solid var(--ruby); cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="headline-text" style="font-size: 15px;">✈️ Flight to London</span>
              <span class="badge badge-provisional">Plan</span>
            </div>
            <div class="caption-text" style="margin-top: 4px;">Target: Dec–Jan</div>
          </div>
        </div>

        <div style="padding: 0 20px 20px 20px; margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('EVT-03')">＋ Add event</button>
        </div>

        ${this.renderTabBar("moments")}
      </div>
    `;
  },

  // EVT-05 · Birthday Mode (Noah)
  screenEvt05() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 24px; text-align: center; background: radial-gradient(circle, #101E4A 0%, #0D0B12 80%);">
        ${this.renderHeader("", null, true, false)}

        <div style="margin: 10px 0 20px 0;">
          <div class="figure-render sapphire-figure" style="margin: 0 auto 12px auto; width: 80px; height: 104px;">
            <span style="font-size: 36px;">🎉</span>
          </div>
          <h1 class="display-title" style="font-size: 32px; color: var(--sapphire); margin-bottom: 6px;">Happy birthday, Noah!</h1>
          <p class="body-text" style="color: var(--text-secondary);">Celebrating you across the miles</p>
        </div>

        <div class="card-quiet" style="background: rgba(91, 140, 255, 0.15); border-color: rgba(91, 140, 255, 0.4); text-align: left; margin-bottom: 16px;">
          <div class="headline-text" style="font-size: 15px; margin-bottom: 6px;">🎁 A surprise is scheduled for you</div>
          <p class="caption-text">Unlocks on Noah's birthday morning</p>
        </div>

        <div class="card-quiet" style="text-align: left;">
          <div class="headline-text" style="font-size: 15px; margin-bottom: 8px;">Birthday Memories</div>
          <div class="caption-text">Photos and notes gathered from previous years</div>
        </div>
      </div>
    `;
  },

  // EVT-06 · Anniversary Mode
  screenEvt06() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 24px; text-align: center; background: radial-gradient(circle, #291240 0%, #0D0B12 80%);">
        ${this.renderHeader("", null, true, false)}

        <div style="margin: 10px 0 20px 0;">
          ${this.renderFigureSlots("together", "together", false)}
          ${this.renderCrystalSVG("anniversary", 120)}
          <h1 class="display-title" style="font-size: 30px; margin: 12px 0 6px 0;">A day that matters to you both</h1>
          <p class="body-text" style="color: var(--garnet);">Happy 2nd Anniversary ❤️💙</p>
        </div>

        <div class="card-quiet" style="text-align: left; margin-bottom: 14px;">
          <div class="headline-text" style="font-size: 15px; margin-bottom: 6px;">Our Story So Far</div>
          <p class="caption-text">730 days of quiet love, calls across timezones, and endless warmth.</p>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     12 · SURPRISES
     ========================================================================== */

  // SUR-01 · Surprise Library
  screenSur01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Surprises", "Hidden delights across the distance", false, true)}

        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SUR-05')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 26px;">🎁</span>
              <div>
                <div class="headline-text" style="font-size: 14px;">Something for you</div>
                <div class="caption-text">From Noah · Opens on your birthday</div>
              </div>
            </div>
            <span class="badge badge-simulated">Scheduled</span>
          </div>
        </div>

        <div style="padding: 0 20px 20px 20px; margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SUR-02')">＋ Create surprise</button>
        </div>

        ${this.renderTabBar("moments")}
      </div>
    `;
  },

  // SUR-02 · Choose Content
  screenSur02() {
    const types = [
      "Message",
      "Photo",
      "Voice note",
      "Video",
      "Letter",
      "Song link",
      "Future-date idea",
    ];
    return `
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
        <div>
          ${this.renderHeader("Create a surprise", "Choose what to hide", true, false)}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;">
            ${types
              .map(
                (t) => `
              <div class="card-quiet" style="padding: 16px; text-align: center; cursor: pointer;" onclick="GarnetApp.showToast('Selected: ${t}'); GarnetApp.navigatePrompt('SUR-05');">
                <span class="headline-text" style="font-size: 14px;">${t}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SUR-05')">Continue</button>
      </div>
    `;
  },

  // SUR-05 · Locked Surprise Detail
  screenSur05() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 36px 24px; text-align: center;">
        ${this.renderHeader("", null, true, false)}

        <div style="margin: auto 0;">
          <div style="font-size: 64px; margin-bottom: 16px;">🎁</div>
          <h1 class="display-title" style="font-size: 28px; margin-bottom: 8px;">Something for you</h1>
          <p class="body-text" style="color: var(--text-secondary); margin-bottom: 24px;">Opens on Noah's birthday · 14 Nov</p>

          <div class="guardrail-pill" style="display: inline-block;">
            🔒 Contents stay strictly hidden until unlocked
          </div>
        </div>

        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('SUR-06')">Simulate unlock</button>
      </div>
    `;
  },

  // SUR-06 · Open Surprise
  screenSur06() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center;">
        <span style="font-size: 56px; margin-bottom: 16px;">✨</span>
        <h1 class="display-title" style="font-size: 30px; margin-bottom: 12px;">Unwrapped!</h1>
        <p class="body-text" style="margin-bottom: 24px;">"Tickets booked for our reunion next month ❤️"</p>
        <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.navigatePrompt('HOME-01')">Save to Memories</button>
      </div>
    `;
  },

  /* ==========================================================================
     13 · FUTURE & OUR WORLD
     ========================================================================== */

  // WORLD-01 · Our World Tab
  screenWorld01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Our World", "A sanctuary growing with your story", false, true)}

        <!-- 3D Floating Crystal Island -->
        <div style="text-align: center; padding: 14px 20px;">
          <div style="width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(154, 123, 255, 0.25) 0%, rgba(13, 11, 18, 0) 70%); display: flex; align-items: center; justify-content: center; margin: 0 auto; position: relative;">
            <span style="font-size: 56px;">🏝️</span>
            <div style="position: absolute; left: 10px; top: 50%;">❤️</div>
            <div style="position: absolute; right: 10px; top: 50%;">💙</div>
          </div>
          <h2 class="display-title" style="font-size: 24px; margin: 8px 0 4px 0;">Our Shared Sanctuary</h2>
          <p class="caption-text">Every saved moment adds a star to this sky</p>
        </div>

        <!-- Directory Entry Cards -->
        <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 10px;">
          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('MEM-01')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">📸</span>
              <div>
                <div class="headline-text" style="font-size: 15px;">Memories</div>
                <div class="caption-text">Your private life archive</div>
              </div>
            </div>
            <span>›</span>
          </div>

          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('FUT-01')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">✨</span>
              <div>
                <div class="headline-text" style="font-size: 15px;">When We Meet Again</div>
                <div class="caption-text">Hopes, plans and dreams together</div>
              </div>
            </div>
            <span>›</span>
          </div>

          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('PLACE-01')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">📍</span>
              <div>
                <div class="headline-text" style="font-size: 15px;">Places</div>
                <div class="caption-text">Saved spots across Addis and London</div>
              </div>
            </div>
            <span>›</span>
          </div>

          <div class="card-quiet" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SONG-01')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">🎵</span>
              <div>
                <div class="headline-text" style="font-size: 15px;">Soundtrack</div>
                <div class="caption-text">Songs that carry feelings</div>
              </div>
            </div>
            <span>›</span>
          </div>
        </div>

        ${this.renderTabBar("world")}
      </div>
    `;
  },

  // FUT-01 · When We Meet Again
  screenFut01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("When We Meet Again", "No counters — only hope and plans", true, true)}

        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div class="card-quiet">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="headline-text" style="font-size: 15px;">Walk along Southbank at dusk</span>
              <span class="badge badge-provisional">London</span>
            </div>
            <p class="caption-text" style="color: var(--text-secondary);">Target: Dec–Jan trip</p>
          </div>

          <div class="card-quiet">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="headline-text" style="font-size: 15px;">Cook doro wat together in Bole</span>
              <span class="badge badge-provisional">Addis Ababa</span>
            </div>
            <p class="caption-text" style="color: var(--text-secondary);">Target: Someday</p>
          </div>
        </div>

        <div style="padding: 0 20px 20px 20px; margin-top: auto;">
          <button class="btn-pill btn-primary-garnet" onclick="GarnetApp.showToast('Add plan form opened')">＋ Add a plan</button>
        </div>

        ${this.renderTabBar("world")}
      </div>
    `;
  },

  // PLACE-01 · Places
  screenPlace01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Saved Places", "Voluntary memories, not tracking", true, true)}

        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div class="card-quiet">
            <div class="headline-text" style="font-size: 15px;">Tomoca Coffee · Bole</div>
            <div class="caption-text">Where Selam starts mornings</div>
          </div>

          <div class="card-quiet">
            <div class="headline-text" style="font-size: 15px;">Tate Modern · Bankside</div>
            <div class="caption-text">Noah's favourite weekend escape</div>
          </div>
        </div>

        <div style="padding: 0 20px 20px 20px; margin-top: auto;">
          <button class="btn-pill btn-secondary" onclick="GarnetApp.showToast('Place saved')">📍 I'm here today</button>
        </div>

        ${this.renderTabBar("world")}
      </div>
    `;
  },

  // SONG-01 · Soundtrack
  screenSong01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Our Soundtrack", "Songs that connect us", true, true)}

        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div class="card-quiet" style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="GarnetApp.showToast('External link opened')">
            <span style="font-size: 28px;">🎵</span>
            <div style="flex: 1;">
              <div class="headline-text" style="font-size: 14px;">Here Comes A Thought</div>
              <div class="caption-text">"I listened to this walking home and thought of you."</div>
            </div>
          </div>
        </div>

        ${this.renderTabBar("world")}
      </div>
    `;
  },

  /* ==========================================================================
     14 · UNIVERSAL SEARCH
     ========================================================================== */

  // SEARCH-01 · Search Screen
  screenSearch01(state) {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <input class="input-field" type="text" placeholder="Search moments, letters, messages…" value="${state === "active-results" ? "coffee" : ""}" style="height: 42px; border-radius: 21px;" />
          <button onclick="GarnetApp.navigateBack()" style="background: none; border: none; color: var(--garnet); cursor: pointer;">Cancel</button>
        </div>

        <div class="guardrail-pill" style="margin-bottom: 16px;">
          🔒 Sealed letters only appear as titles. Private drafts are never shown.
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="caption-text" style="color: var(--text-tertiary);">Recent Searches</div>
          <div class="card-quiet" style="padding: 10px 14px; display: flex; justify-content: space-between;">
            <span>Southbank</span>
            <span style="color: var(--text-tertiary); cursor: pointer;">✕</span>
          </div>
          <div class="card-quiet" style="padding: 10px 14px; display: flex; justify-content: space-between;">
            <span>Anniversary</span>
            <span style="color: var(--text-tertiary); cursor: pointer;">✕</span>
          </div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     15 · SETTINGS & ACCOUNT
     ========================================================================== */

  // SET-01 · Settings Home
  screenSet01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        ${this.renderHeader("Settings", null, true, false)}

        <div style="padding: 10px 20px 30px 20px; display: flex; flex-direction: column; gap: 18px;">
          <!-- Profile card -->
          <div class="card-quiet" style="display: flex; align-items: center; gap: 14px; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-02')">
            <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--ruby); background: #E8536F; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #FFF;">S</div>
            <div style="flex: 1;">
              <div class="headline-text" style="font-size: 16px;">Selam</div>
              <div class="caption-text" style="color: var(--ruby);">Ruby · Addis Ababa</div>
            </div>
            <span>›</span>
          </div>

          <!-- Account Group -->
          <div>
            <div class="caption-text" style="margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.8px;">Personalization</div>
            <div class="card-quiet" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-03')">
                <span>Appearance & Themes</span>
                <span>›</span>
              </div>
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-04')">
                <span>Nicknames & Greetings</span>
                <span>›</span>
              </div>
            </div>
          </div>

          <!-- Notifications Group -->
          <div>
            <div class="caption-text" style="margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.8px;">Notifications</div>
            <div class="card-quiet" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-05')">
                <span>Notification Preferences</span>
                <span>›</span>
              </div>
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-06')">
                <span>Quiet Hours</span>
                <span>›</span>
              </div>
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-07')">
                <span>Lock-Screen Previews</span>
                <span>›</span>
              </div>
            </div>
          </div>

          <!-- Privacy & Safety Group -->
          <div>
            <div class="caption-text" style="margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.8px;">Privacy & Safety</div>
            <div class="card-quiet" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-09')">
                <span>What Noah Can See</span>
                <span>›</span>
              </div>
              <div style="display: flex; justify-content: space-between; cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-13')">
                <span>Export My Data</span>
                <span>›</span>
              </div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div>
            <div class="caption-text" style="margin-bottom: 6px; color: var(--danger); text-transform: uppercase; letter-spacing: 0.8px;">Danger Zone</div>
            <div class="card-quiet" style="display: flex; flex-direction: column; gap: 12px; border-color: rgba(248, 113, 113, 0.3);">
              <div style="color: var(--danger); cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-14')">End our space (unpair)</div>
              <div style="color: var(--danger); cursor: pointer;" onclick="GarnetApp.navigatePrompt('SET-15')">Delete my account</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // SET-07 · Lock-Screen Preview Privacy
  screenSet07() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; padding: 24px;">
        ${this.renderHeader("Lock-screen privacy", null, true, false)}

        <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 14px;">
          <div class="card-quiet" style="border-color: var(--garnet); background: rgba(154, 123, 255, 0.1);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span class="headline-text" style="font-size: 15px;">Generic (Recommended)</span>
              <span style="color: var(--garnet);">✓</span>
            </div>
            <div class="caption-text" style="color: var(--text-secondary); margin-bottom: 8px;">
              "Garnet — Something new for you 💜"
            </div>
            <div class="caption-text">Anyone who sees your phone sees zero details.</div>
          </div>

          <div class="card-quiet">
            <div class="headline-text" style="font-size: 15px; margin-bottom: 4px;">Sender & Category Only</div>
            <div class="caption-text">"Noah · Thought"</div>
          </div>

          <div class="card-quiet">
            <div class="headline-text" style="font-size: 15px; margin-bottom: 4px;">Full Content</div>
            <div class="caption-text">Shows messages and snippets on lock screen.</div>
          </div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     16 · SYSTEM OVERLAYS & UNIVERSAL STATES
     ========================================================================== */

  // SYS-01 · Overlay Catalogue Board
  screenSys01() {
    const overlays = [
      { id: "HOME-03", name: "Quick Log Sheet" },
      { id: "HOME-04", name: "Emotional Actions Sheet" },
      { id: "DAYS-07", name: "Media Source Sheet" },
      { id: "DAYS-08", name: "Voice Recorder Sheet" },
      { id: "DAYS-09", name: "Mood / Activity Picker" },
      { id: "AUTH-08", name: "Sign Out Confirmation" },
      { id: "SET-17", name: "Reset Demo Data Dialog" },
    ];

    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        ${this.renderHeader("System Overlays", "Catalogue of bottom sheets & dialogs", true, false)}

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          ${overlays
            .map(
              (o) => `
            <div class="card-quiet" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="GarnetApp.openOverlay('${o.id}')">
              <span>${o.name}</span>
              <span style="color: var(--garnet);">Open ›</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     17 · NOTIFICATIONS, EMAILS & WIDGETS LABS
     ========================================================================== */

  // NOTIF-02 · Notification Preview Lab
  screenNotif02() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        ${this.renderHeader("Notification Lab", "Simulated device previews", true, false)}

        <div class="card-quiet" style="margin-bottom: 16px; background: rgba(0,0,0,0.5);">
          <div class="caption-text" style="color: var(--garnet); margin-bottom: 6px;">iOS Lock Screen Preview</div>
          <div style="background: rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 14px; display: flex; gap: 10px; align-items: center;">
            <div class="brand-gem" style="width: 20px; height: 20px;"></div>
            <div>
              <div style="font-size: 13px; font-weight: 600;">Garnet</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Something new for you 💜</div>
            </div>
            <span class="caption-text" style="margin-left: auto;">now</span>
          </div>
        </div>

        <div class="caption-text" style="margin-bottom: 8px; text-transform: uppercase;">Categories (Tap to simulate)</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-pill btn-secondary" style="min-height: 40px; font-size: 12px;" onclick="GarnetApp.showToast('Simulated notification: Thought from Noah')">Thought of You</button>
          <button class="btn-pill btn-secondary" style="min-height: 40px; font-size: 12px;" onclick="GarnetApp.showToast('Simulated notification: Noah sent a support signal')">Support Signal</button>
          <button class="btn-pill btn-secondary" style="min-height: 40px; font-size: 12px;" onclick="GarnetApp.showToast('Simulated notification: Your shared day is ready')">Day Reveal</button>
          <button class="btn-pill btn-secondary" style="min-height: 40px; font-size: 12px;" onclick="GarnetApp.showToast('Simulated notification: A letter is ready when you are')">Open When Letter</button>
        </div>
      </div>
    `;
  },

  // EMAIL-01 · Email Preview Lab
  screenEmail01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        ${this.renderHeader("Email Preview Lab", "Transactional template viewer", true, false)}

        <!-- Mock Email Container -->
        <div style="background: #FFFFFF; color: #111; border-radius: 12px; padding: 24px; margin: 16px 0;">
          <div style="font-family: var(--font-display); font-size: 22px; font-weight: 700; color: #0D0B12; margin-bottom: 4px;">Garnet</div>
          <div style="height: 2px; width: 40px; background: #7B55F0; margin-bottom: 18px;"></div>
          
          <h2 style="font-size: 18px; margin-bottom: 12px; font-family: var(--font-sans);">Verify your email for Garnet</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #4A4358; margin-bottom: 20px;">
            You're one step away from setting up your private space.
          </p>

          <a href="#" style="display: inline-block; background: #7B55F0; color: #FFF; padding: 12px 24px; border-radius: 99px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 24px;">
            Verify email
          </a>

          <div style="border-top: 1px solid #EEE; padding-top: 12px; font-size: 11px; color: #888;">
            If you didn't create this account, you can ignore this message.
          </div>
        </div>

        <span class="badge badge-simulated" style="margin: 0 auto;">Simulated — no email is sent</span>
      </div>
    `;
  },

  // WIDGET-01 · Widget Preview Gallery
  screenWidget01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        ${this.renderHeader("Widget Gallery", "iOS & Android widgets", true, false)}

        <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 14px;">
          <!-- Small Widget -->
          <div>
            <div class="caption-text" style="margin-bottom: 6px;">Small Widget (2x2)</div>
            <div style="width: 140px; height: 140px; border-radius: 22px; background: rgba(255,255,255,0.06); border: 1px solid var(--hairline); padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div class="brand-gem" style="width: 24px; height: 24px;"></div>
              <div>
                <div style="font-size: 13px; font-weight: 600;">Garnet ❤️</div>
                <div class="caption-text" style="font-size: 10px;">Something waiting for you</div>
              </div>
            </div>
          </div>

          <!-- Medium Widget -->
          <div>
            <div class="caption-text" style="margin-bottom: 6px;">Medium Widget (4x2)</div>
            <div style="height: 140px; border-radius: 22px; background: rgba(255,255,255,0.06); border: 1px solid var(--hairline); padding: 16px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Noah's Birthday</div>
                <div class="caption-text">In 4 days · 14 Nov</div>
              </div>
              <div class="brand-gem" style="width: 36px; height: 36px;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // COMP-01 · Global Component Sheet
  screenComp01() {
    return `
      <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px;">
        ${this.renderHeader("Component Sheet", "COMP-01 Design Tokens", true, false)}

        <div style="display: flex; flex-direction: column; gap: 18px; margin-top: 14px;">
          <div>
            <div class="caption-text" style="margin-bottom: 8px;">Buttons</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn-pill btn-primary-garnet">Primary Garnet Pill</button>
              <button class="btn-pill btn-primary-ruby">Primary Ruby Pill</button>
              <button class="btn-pill btn-primary-sapphire">Primary Sapphire Pill</button>
              <button class="btn-pill btn-secondary">Secondary Outline</button>
              <button class="btn-pill btn-destructive">Destructive Action</button>
            </div>
          </div>

          <div>
            <div class="caption-text" style="margin-bottom: 8px;">Badges</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-simulated">Simulated Demo</span>
              <span class="badge badge-only-you">Only You</span>
              <span class="badge badge-provisional">Provisional (U-02)</span>
            </div>
          </div>

          <div>
            <div class="caption-text" style="margin-bottom: 8px;">Input Fields</div>
            <div class="input-group">
              <label class="input-label">Label</label>
              <input class="input-field" type="text" placeholder="Focused / Filled input" />
            </div>
          </div>
        </div>
      </div>
    `;
  },
};
