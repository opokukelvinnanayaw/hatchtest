import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, onSnapshot, doc, setDoc, increment, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. Firebase Initialization & Config
const firebaseConfig = {
  apiKey: "AIzaSyA91WlL0vnYEYZcQo51KTDMWPPSw1eZayM",
  authDomain: "the-tech-x.firebaseapp.com",
  projectId: "the-tech-x",
  storageBucket: "the-tech-x.firebasestorage.app",
  messagingSenderId: "997772121695",
  appId: "1:997772121695:web:0fb74ffa3bc64240a66dea",
  measurementId: "G-VQ00H9FPKF"
};

const app = initializeApp(firebaseConfig);
const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

// Prevent pinch-to-zoom using standard gesture events
document.addEventListener("gesturestart", (e) => {
  e.preventDefault();
});

// Static Data
const INITIAL_TRACKS = [
  { id: "clean-energy", name: "Clean Energy & Environment", icon: "fa-leaf", desc: "Build systems that reduce carbon footprint, manage resources sustainably, or transition to clean power." },
  { id: "fintech", name: "Fintech & Financial Inclusion", icon: "fa-wallet", desc: "Create tools that democratize access to capital, optimize banking, or streamline micro-payments." },
  { id: "healthtech", name: "Healthcare & MedTech", icon: "fa-heart-pulse", desc: "Develop software or devices that improve patient telemetry, diagnosis, or health administrative tasks." }
];

const INITIAL_RESOURCES = [
  { title: "HatchPoint Official Rules & Guidelines", icon: "fa-file-pdf", type: "PDF Document", size: "1.2 MB", desc: "Download the complete terms, criteria weights, and technical guidelines.", link: "#" },
  { title: "Pitch Deck PowerPoint Template", icon: "fa-file-powerpoint", type: "PPTX Presentation", size: "4.8 MB", desc: "Use our approved slide outline for Demo Day to structure your problem, solution, and model.", link: "#" },
  { title: "Judging Scorecard Rubric Details", icon: "fa-clipboard-check", type: "PDF Document", size: "800 KB", desc: "A comprehensive breakdown of how judges rate Innovation, Execution, Impact, and UX.", link: "#" }
];

const INITIAL_TIMELINE = [
  { step: 1, title: "Application Opens", date: "September 15, 2026", desc: "Register as a team of minimum 3 members and a maximum of 5. Explore tracks and prepare project directions.", status: "active" },
  { step: 2, title: "Application Deadline", date: "November 15 @ 12:59 PM", desc: "Submit initial proposals, team lists, and draft designs. Late entries are not accepted.", status: "upcoming" },
  { step: 3, title: "Shortlisting & Selection", date: "Pending", desc: "Our expert panel vets all entries to select top 30 teams who will advance to the next phase.", status: "upcoming" }
];

const INITIAL_PRIZES = [
  { rank: "2nd Place", amount: "GH₵ 20,000", desc: "Media exposure and recognition through The HatchPoint's official platforms and partner networks.\nNetworking opportunities with investors, corporate partners, innovators, and ecosystem stakeholders.\nIncubation and business development support to help transform innovative ideas into sustainable ventures.", popular: false },
  { rank: "1st Place Grand Winner", amount: "GH₵ 30,000", desc: "Equivalent value in architecture reviews, code deployment assistance, AWS cloud credits.", popular: true },
  { rank: "3rd Place", amount: "GH₵ 10,000", desc: "Networking opportunities with investors, corporate partners, innovators, and ecosystem stakeholders.\nIncubation and business development support to help transform innovative ideas into sustainable ventures.", popular: false }
];

// State Cache
let allProjects = [];
let allNews = [];
let allTracks = [];
let allFeatures = [];
let allTimeline = [];
let landingStatsConfig = null;
let registrationFormConfig = null;
let allPrizes = [];
let allResources = [];

// Default to countdown-active so mobile hides duplicate #hero-register-btn before Firestore resolves
document.body.classList.add("countdown-active");

// DOM Elements
const navLinks = document.querySelectorAll(".nav-link, .mobile-nav-link");
const viewSections = document.querySelectorAll(".view");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileDrawer = document.getElementById("mobile-drawer");

const infoModal = document.getElementById("info-modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalCloseBtn = document.getElementById("modal-close-btn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
const toastIcon = document.getElementById("toast-icon");

// Toast management
function showToast(message, type = "success") {
  toastMessage.textContent = message;
  if (type === "success") {
    toastIcon.className = "fa-solid fa-circle-check";
    toastIcon.style.color = "var(--success)";
  } else if (type === "error") {
    toastIcon.className = "fa-solid fa-circle-xmark";
    toastIcon.style.color = "var(--danger)";
  } else {
    toastIcon.className = "fa-solid fa-circle-info";
    toastIcon.style.color = "var(--primary)";
  }
  
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Modal open/close
function openModal(title, contentHTML) {
  modalTitle.textContent = title;
  modalBody.innerHTML = contentHTML;
  infoModal.classList.add("open");
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", () => {
    infoModal.classList.remove("open");
  });
}

window.addEventListener("click", (e) => {
  if (e.target === infoModal) {
    infoModal.classList.remove("open");
  }
});

// View Routing
function getActiveViewId() {
  const activeSection = document.querySelector(".view.active");
  return activeSection ? activeSection.id.replace("-view", "") : "home";
}

function showView(viewId) {
  viewSections.forEach(section => {
    if (section.id === `${viewId}-view`) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });

  // Sync nav active states
  document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
    if (link.getAttribute("data-view") === viewId) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Sync mobile bottom nav active states
  document.querySelectorAll(".mobile-bottom-nav-item").forEach(item => {
    if (item.getAttribute("data-view") === viewId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  window.scrollTo({ top: 0 });

  if (viewId === "home") {
    renderLandingFeatures();
    renderLandingTracks();
    renderLandingTimeline();
    renderLandingPrizes();
  }
  if (viewId === "news") renderNewsFeed();
  if (viewId === "resources") renderResources();
  if (viewId === "showcase") renderShowcase();
}

function handleNavigationClick(e) {
  e.preventDefault();
  const target = e.currentTarget;
  const view = target.getAttribute("data-view");
  const scrollTarget = target.getAttribute("data-scroll");

  // Close mobile drawer if open
  mobileDrawer.classList.remove("open");
  mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';

  if (view) {
    showView(view);
    
    if (scrollTarget) {
      setTimeout(() => {
        const element = document.getElementById(scrollTarget);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }
}

// Attach Nav Listeners
navLinks.forEach(link => link.addEventListener("click", handleNavigationClick));

// Attach Footer & Inline Scroll Links Listeners
document.querySelectorAll(".footer-link, .fal-footer-link, .fal-footer-brand-logo, [data-view][data-scroll]").forEach(link => {
  if (link.getAttribute("data-view") && !link.classList.contains("nav-link") && !link.classList.contains("mobile-nav-link")) {
    link.addEventListener("click", handleNavigationClick);
  }
});

// Attach Mobile Bottom Nav Listeners
document.querySelectorAll(".mobile-bottom-nav-item").forEach(item => {
  item.addEventListener("click", (e) => {
    const view = item.getAttribute("data-view");
    if (view) {
      e.preventDefault();
      showView(view);
    }
  });
});

// === HIDE MOBILE BOTTOM NAV ON KEYBOARD ACTIVE & ON SCROLL (iOS Safari + Android Compatible) ===
function initMobileNavAutoHiding() {
  const mobileNav = document.querySelector(".mobile-bottom-nav");
  if (!mobileNav) return;

  const isMobile = () => window.innerWidth <= 768;

  const isInputEl = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    const type = (el.type || "").toLowerCase();
    const isCtrl = tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    const isExcl = ["checkbox", "radio", "submit", "button", "file", "color", "range"].includes(type);
    return isCtrl && !isExcl;
  };

  function hideForKeyboard() {
    if (isMobile()) {
      document.body.classList.add("keyboard-active");
      mobileNav.classList.add("keyboard-hidden");
    }
  }

  function showFromKeyboard() {
    document.body.classList.remove("keyboard-active");
    mobileNav.classList.remove("keyboard-hidden");
  }

  // 1. Focusin / Focusout listener across document
  document.addEventListener("focusin", (e) => {
    if (isInputEl(e.target)) hideForKeyboard();
  }, true);

  document.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!isInputEl(document.activeElement)) {
        showFromKeyboard();
      }
    }, 150);
  }, true);

  // iOS Safari touchstart event on input elements
  document.addEventListener("touchstart", (e) => {
    if (isInputEl(e.target)) {
      hideForKeyboard();
    }
  }, { passive: true });

  // 2. Visual Viewport API for dynamic height tracking
  if (window.visualViewport) {
    let baseHeight = window.visualViewport.height;
    window.visualViewport.addEventListener("resize", () => {
      if (!isMobile()) return;
      const currentHeight = window.visualViewport.height;
      if (baseHeight - currentHeight > 120 || isInputEl(document.activeElement)) {
        hideForKeyboard();
      } else if (currentHeight >= baseHeight - 40 && !isInputEl(document.activeElement)) {
        showFromKeyboard();
      }
    });
  }

  // 3. Scroll Auto-Hiding for Mobile
  let isScrollingTimer = null;
  let lastScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    if (!isMobile()) return;

    // Do not override if keyboard is active or an input is focused
    if (isInputEl(document.activeElement) || document.body.classList.contains("keyboard-active")) {
      return;
    }

    const currentScrollY = window.scrollY;
    if (Math.abs(currentScrollY - lastScrollY) > 5) {
      mobileNav.classList.add("scroll-hidden");
    }
    lastScrollY = currentScrollY;

    clearTimeout(isScrollingTimer);
    isScrollingTimer = setTimeout(() => {
      if (!isInputEl(document.activeElement)) {
        mobileNav.classList.remove("scroll-hidden");
      }
    }, 500);
  }, { passive: true });
}

initMobileNavAutoHiding();

// Glassmorphism app bar: intensify blur once content scrolls underneath
(function initGlassNavOnScroll() {
  const nav = document.querySelector(".fal-nav");
  if (!nav) return;
  const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

const navLogo = document.getElementById("nav-logo");
if (navLogo) {
  navLogo.addEventListener("click", (e) => {
    e.preventDefault();
    showView("home");
  });
}

const learnMoreBtn = document.getElementById("learn-more-btn");
if (learnMoreBtn) {
  learnMoreBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const introSec = document.getElementById("what-is") || document.getElementById("about");
    if (introSec) introSec.scrollIntoView({ behavior: "smooth" });
  });
}

// Mobile drawer toggle
mobileMenuBtn.addEventListener("click", () => {
  const isOpen = mobileDrawer.classList.toggle("open");
  mobileMenuBtn.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
});

// Render landing page tracks
function renderLandingTracks() {
  const container = document.getElementById("landing-tracks-list");
  if (!container) return;

  const visibleTracks = allTracks.filter(t => t.visible !== false);
  const tracksToRender = visibleTracks.length > 0 ? visibleTracks : INITIAL_TRACKS;

  const trackThemes = [
    { badge: "TRACK 01 // SUSTAINABILITY", bg: "var(--color-pixel-lime, #f1ffd2)", color: "var(--color-forest-pixel, #004012)" },
    { badge: "TRACK 02 // CAPITAL & PAYMENTS", bg: "var(--color-sky-cyan, #99ecff)", color: "#0a4dce" },
    { badge: "TRACK 03 // CARE & DIAGNOSTICS", bg: "var(--color-lilac-wash, #d0b7f9)", color: "var(--color-deep-ultraviolet, #4a17b0)" }
  ];

  container.innerHTML = tracksToRender.map((track, idx) => {
    const theme = trackThemes[idx % trackThemes.length];
    const bgStyle = (track.image && !track.hideImage) ? `background-image: url('${track.image}'); background-size: cover; background-position: center; position: relative; z-index: 1;` : '';
    const overlay = (track.image && !track.hideImage) ? `<div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.95) 100%); z-index: -1;"></div>` : '';
    
    return `
    <div class="card track-card" style="${bgStyle} overflow: hidden;">
      ${overlay}
      <div>
        <span class="fal-feature-step">${theme.badge}</span>
        <div class="card-icon" style="background-color: ${theme.bg}; color: ${theme.color};"><i class="fa-solid ${track.icon || 'fa-tag'}"></i></div>
        <h3>${track.name}</h3>
        <p>${track.desc}</p>
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-hairline, #e6e4de); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary, #737373); text-transform: uppercase; letter-spacing: 0.05em;">Open for Teams (3–5)</span>
        <a href="register.html" class="fal-link-arrow" style="margin-top: 0; font-size: 13px;">Apply in Track <span>↗</span></a>
      </div>
    </div>
  `}).join("");
}

// Render landing page dynamic features
function renderLandingFeatures() {
  const container = document.getElementById("landing-features-list");
  if (!container) return;

  const visibleFeatures = allFeatures.filter(f => f.visible !== false);

  if (visibleFeatures.length === 0) {
    // Dynamic self-healing fallback
    container.innerHTML = `
      <div class="card" style="position: relative; z-index: 1;">
        <span class="fal-feature-step">01 / SCOUT &amp; MENTOR</span>
        <div class="card-icon" style="background-color: var(--color-pixel-lime, #f1ffd2); color: var(--color-forest-pixel, #004012);"><i class="fa-solid fa-graduation-cap"></i></div>
        <h3>Venture Scouting &amp; Mentorship</h3>
        <p>Gain access to seasoned founders and investors who review your product's market readiness, operational model, and technical scaling path.</p>
      </div>
      <div class="card" style="position: relative; z-index: 1;">
        <span class="fal-feature-step">02 / VALIDATE &amp; TEST</span>
        <div class="card-icon" style="background-color: var(--color-sky-cyan, #99ecff); color: #0a4dce;"><i class="fa-solid fa-people-group"></i></div>
        <h3>Commercial Viability</h3>
        <p>Stress-test your concept note and prototype against real market variables, ensuring you build something with actual demand and scalable unit economics.</p>
      </div>
      <div class="card" style="position: relative; z-index: 1;">
        <span class="fal-feature-step">03 / INCUBATE &amp; SCALE</span>
        <div class="card-icon" style="background-color: var(--color-lilac-wash, #d0b7f9); color: var(--color-deep-ultraviolet, #4a17b0);"><i class="fa-solid fa-seedling"></i></div>
        <h3>Venture Center Residency</h3>
        <p>Top teams earn dedicated physical space, continuous funding pathways, administrative backing, and direct exposure to venture capital networks to launch.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = visibleFeatures.map((feat, index) => {
    const steps = ["01 / SCOUT & MENTOR", "02 / VALIDATE & TEST", "03 / INCUBATE & SCALE", "04 / ACCELERATE"];
    const colors = [
      { bg: "var(--color-pixel-lime, #f1ffd2)", color: "var(--color-forest-pixel, #004012)" },
      { bg: "var(--color-sky-cyan, #99ecff)", color: "#0a4dce" },
      { bg: "var(--color-lilac-wash, #d0b7f9)", color: "var(--color-deep-ultraviolet, #4a17b0)" }
    ];
    const c = colors[index % colors.length];
    const stepLabel = steps[index % steps.length];
    
    const bgStyle = (feat.image && !feat.hideImage) ? `background-image: url('${feat.image}'); background-size: cover; background-position: center; position: relative; z-index: 1;` : '';
    const overlay = (feat.image && !feat.hideImage) ? `<div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.95) 100%); z-index: -1;"></div>` : '';

    return `
      <div class="card" style="${bgStyle} overflow: hidden;">
        ${overlay}
        <span class="fal-feature-step">${stepLabel}</span>
        <div class="card-icon" style="background-color: ${c.bg}; color: ${c.color};"><i class="fa-solid ${feat.icon || 'fa-star'}"></i></div>
        <h3>${feat.name}</h3>
        <p>${feat.desc}</p>
      </div>
    `;
  }).join("");
}

// Render landing page dynamic timeline milestones
function renderLandingTimeline() {
  const container = document.getElementById("landing-timeline-container");
  if (!container) return;

  const items = allTimeline.length > 0 ? allTimeline : INITIAL_TIMELINE;

  container.innerHTML = `
    <div class="timeline-line"></div>
    ${items.map((item, idx) => {
      let activeClass = "";
      let statusLabel = "UPCOMING PHASE";
      if (item.status === "completed") {
        activeClass = "active completed";
        statusLabel = "COMPLETED";
      } else if (item.status === "active") {
        activeClass = "active";
        statusLabel = "ACTIVE NOW";
      }
      const stepNum = item.step || (idx + 1);
      return `
        <div class="timeline-item ${activeClass}" data-step="${stepNum}" data-idx="${idx}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-meta-row">
              <div class="timeline-date">PHASE 0${stepNum} // ${item.date}</div>
              <span class="fal-badge" style="font-size: 10px; padding: 3px 8px; ${item.status === 'active' ? 'background: var(--color-pixel-lime, #f1ffd2); color: var(--color-forest-pixel, #004012); border: 1px solid rgba(0,64,18,0.2);' : 'background: var(--bg-surface-elevated, #f2f1ed); color: var(--text-secondary, #4a4a4a);'}">${statusLabel}</span>
            </div>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
          </div>
        </div>
      `;
    }).join("")}
  `;

  container.querySelectorAll(".timeline-item").forEach(el => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.getAttribute("data-idx"), 10);
      const item = items[idx];
      if (!item) return;
      const statusText = item.status === "active" ? "Active Phase" : (item.status === "completed" ? "Completed" : "Upcoming Milestone");
      openModal(`${item.title} (${item.date})`, `
        <div style="font-size: 15px; color: var(--text-secondary, #4a4a4a); line-height: 1.65;">
          <div style="margin-bottom: 14px;">
            <span class="fal-badge fal-badge-lilac" style="font-size: 11px;">PHASE 0${item.step || (idx + 1)} &bull; ${statusText}</span>
          </div>
          <p style="margin-bottom: 16px;">${item.desc}</p>
          <div style="padding: 14px 16px; background: var(--bg-surface-elevated, #f2f1ed); border-radius: 6px; border: 1px solid var(--border-hairline, #e6e4de); font-size: 13px;">
            <strong style="color: var(--text-primary, #171717); display: block; margin-bottom: 4px;">Scheduled Window:</strong>
            <span style="font-family: var(--font-mono);">${item.date}</span>
          </div>
        </div>
      `);
    });
  });
}

// 2. IndexedDB Caching Utility for high traffic resistance
const DB_NAME = "HatchPointCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "firestore_cache";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getCachedData(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB cache read error:", err);
    return null;
  }
}

async function setCachedData(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB cache write error:", err);
  }
}

// Toggle landing page live countdown timer visibility
function toggleCountdownAndRegisterBtnVisibility() {
  const cdWrapper = document.getElementById("hero-countdown-wrapper");
  const cdWidget = document.getElementById("hero-countdown");
  const cdText = document.getElementById("hero-countdown-text");
  const lbWidget = document.getElementById("floating-leaderboard-widget");
  const dribbbleDays = document.getElementById("dribbble-days-stat");
  const dribbbleDaysDivider = document.getElementById("dribbble-days-divider");
  const heroRegBtn = document.getElementById("hero-register-btn");
  const regTag = document.getElementById("registration-status-tag");
  const announcementBar = document.querySelector(".fal-announcement-bar");

  const showCountdown = !landingStatsConfig || landingStatsConfig.showCountdown !== false;
  document.body.classList.toggle("countdown-active", showCountdown);

  if (!showCountdown) {
    if (cdWrapper) cdWrapper.style.display = "none";
    if (cdWidget) cdWidget.style.display = "none";
    if (cdText) cdText.style.display = "none";
    if (dribbbleDays) dribbbleDays.style.display = "none";
    if (dribbbleDaysDivider) dribbbleDaysDivider.style.display = "none";
  } else {
    if (cdWrapper) cdWrapper.style.removeProperty("display");
    if (cdWidget) cdWidget.style.display = "inline-flex";
    if (cdText) cdText.style.removeProperty("display");
    if (dribbbleDays) dribbbleDays.style.display = "flex";
    if (dribbbleDaysDivider) dribbbleDaysDivider.style.removeProperty("display");
  }

  // Synchronize hero register button & registration status tag across desktop & mobile
  const hideRegTag = registrationFormConfig && registrationFormConfig.hideRegistrationTag === true;
  const swapToLb = registrationFormConfig && registrationFormConfig.swapNavToLeaderboard === true;

  if (hideRegTag) {
    if (regTag) regTag.style.display = "none";
    if (announcementBar) announcementBar.style.display = "none";
  } else {
    if (regTag) regTag.style.display = "inline-flex";
    if (announcementBar) announcementBar.style.removeProperty("display");
  }

  if (heroRegBtn) {
    if (hideRegTag || swapToLb || (window.innerWidth <= 768 && showCountdown)) {
      heroRegBtn.style.display = "none";
    } else {
      heroRegBtn.style.removeProperty("display");
    }
  }

  const showLbWidget = Boolean(landingStatsConfig && landingStatsConfig.showLeaderboardWidget === true);
  if (lbWidget) {
    lbWidget.style.display = showLbWidget ? "flex" : "none";
  }

  const footerLbLink = document.getElementById("footer-leaderboard-link");
  if (footerLbLink) {
    footerLbLink.style.display = (showLbWidget || swapToLb) ? "" : "none";
  }
}

window.addEventListener("resize", toggleCountdownAndRegisterBtnVisibility);

// Update dynamic participants stats value
function updateLandingHeaderStats() {
  toggleCountdownAndRegisterBtnVisibility();

  const partsVal = document.getElementById("stat-participants");
  if (!partsVal) return;

  if (!landingStatsConfig) {
    partsVal.textContent = "--";
    return;
  }

  if (landingStatsConfig.participantsMode === "manual") {
    partsVal.textContent = landingStatsConfig.participantsOverride || "0";
  } else {
    const sum = allProjects.reduce((acc, p) => acc + (p.members ? p.members.length : 0), 0);
    partsVal.textContent = sum > 0 ? `${sum}+` : "0";
  }

  const subsVal = document.getElementById("stat-submissions");
  if (subsVal) {
    if (landingStatsConfig.submissionsMode === "manual") {
      subsVal.textContent = landingStatsConfig.submissionsOverride || "0";
    } else {
      subsVal.textContent = allProjects.length > 0 ? `${allProjects.length}+` : "0";
    }
  }
}

function startCountdown() {
  if (!landingStatsConfig) return;
  if (window.countdownIntervalId) clearInterval(window.countdownIntervalId);

  const targetTime = new Date(landingStatsConfig.countdownDate).getTime();
  const updateCountdown = () => {
    const now = Date.now();
    const diff = targetTime - now;
    const daysVal = document.getElementById("stat-days");
    const daysVal2 = document.getElementById("stat-days-slide2");
    const daysLabel = document.getElementById("stat-days-label");

    const cdDays = document.getElementById("cd-days");
    const cdHours = document.getElementById("cd-hours");
    const cdMinutes = document.getElementById("cd-minutes");
    const cdSeconds = document.getElementById("cd-seconds");

    const bannerTimer = document.getElementById("banner-cd-timer");
    const registerCdText = document.getElementById("register-cd-text");
    const heroLiveStatus = document.getElementById("hero-cd-live-status");

    if (isNaN(targetTime) || diff <= 0) {
      if (daysVal) daysVal.textContent = "0";
      if (daysVal2) daysVal2.textContent = "0";
      if (daysLabel) daysLabel.textContent = "Registration Closed";
      
      if (cdDays) cdDays.textContent = "00";
      if (cdHours) cdHours.textContent = "00";
      if (cdMinutes) cdMinutes.textContent = "00";
      if (cdSeconds) cdSeconds.textContent = "00";

      if (bannerTimer) bannerTimer.textContent = "Registration is now Closed";
      if (registerCdText) registerCdText.textContent = "Registration Closed";
      if (heroLiveStatus) heroLiveStatus.textContent = "CLOSED";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n) => n.toString().padStart(2, '0');

    if (daysVal) {
      if (days > 0) {
        daysVal.textContent = days;
        if (daysLabel) daysLabel.textContent = days === 1 ? "Day Left" : "Days Left";
      } else {
        daysVal.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        if (daysLabel) daysLabel.textContent = "Hours Left";
      }
    }
    
    if (daysVal2) {
      daysVal2.textContent = days > 0 ? `${days} Days` : `${hours}h ${minutes}m`;
    }

    if (cdDays) cdDays.textContent = pad(days);
    if (cdHours) cdHours.textContent = pad(hours);
    if (cdMinutes) cdMinutes.textContent = pad(minutes);
    if (cdSeconds) {
      cdSeconds.textContent = pad(seconds);
      cdSeconds.classList.remove('tick');
      void cdSeconds.offsetWidth;
      cdSeconds.classList.add('tick');
      setTimeout(() => cdSeconds.classList.remove('tick'), 150);
    }

    const dayUnit = days === 1 ? "Day" : "Days";
    const formattedLiveStr = `${days} ${dayUnit}, ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s Left`;
    if (bannerTimer) bannerTimer.textContent = formattedLiveStr;
    if (registerCdText) registerCdText.textContent = formattedLiveStr;
    const heroStatus = days > 0 ? `${days} ${dayUnit} Left` : `${pad(hours)}h ${pad(minutes)}m Left`;
    if (heroLiveStatus) heroLiveStatus.textContent = heroStatus;
  };
  updateCountdown();
  window.countdownIntervalId = setInterval(updateCountdown, 1000);
}

// Render Prizes list on landing page
function renderLandingPrizes() {
  const container = document.getElementById("landing-prizes-list");
  if (!container) return;

  const prizesData = allPrizes.length > 0 ? allPrizes : INITIAL_PRIZES;
  let displayPrizes = [...prizesData];
  
  // Sort numerically by rank if custom prizes
  if (allPrizes.length > 0) {
    displayPrizes.sort((a, b) => {
      const aRank = parseInt(a.rank) || 99;
      const bRank = parseInt(b.rank) || 99;
      return aRank - bRank;
    });

    if (displayPrizes.length >= 3) {
      const first = displayPrizes[0];
      const second = displayPrizes[1];
      const third = displayPrizes[2];
      displayPrizes[0] = second;
      displayPrizes[1] = first;
      displayPrizes[2] = third;
    }
  }

  container.innerHTML = displayPrizes.map((p, idx) => {
    const isGrand = p.popular === true || (p.rank && p.rank.toLowerCase().includes("1st"));
    const formattedDesc = (p.desc || "").split("\n").filter(Boolean).map(line => `<p style="margin-bottom: 8px;">${line}</p>`).join("");
    
    return `
      <div class="card prize-card ${isGrand ? 'grand' : ''}">
        <div>
          <div class="prize-rank">${p.rank || ''}</div>
          <div class="prize-amount">${p.amount || ''}</div>
          <div>${formattedDesc}</div>
        </div>
        <div style="margin-top: 24px;">
          <a href="register.html" class="fal-btn ${isGrand ? 'fal-btn-dark' : 'fal-btn-hairline'}" style="width: 100%; text-align: center; justify-content: center; font-size: 13px;">Compete for ${p.rank ? p.rank.split(' ')[0] : 'Prize'} ↗</a>
        </div>
      </div>
    `;
  }).join("");
}

// Render News Feed
function renderNewsFeed(filteredCategory = "all") {
  const container = document.getElementById("news-feed-container");
  if (!container) return;

  const filtered = filteredCategory === "all" 
    ? allNews 
    : allNews.filter(item => item.category === filteredCategory);

  const images = {
    code: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80",
    meeting: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=400&q=80",
    presentation: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=400&q=80",
    launch: "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=400&q=80"
  };

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;">No articles found in this category.</p>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="news-card" data-id="${item.id}">
      <img src="${item.coverImage || images[item.img] || images.code}" alt="${item.title}" class="news-img">
      <div class="news-body">
        <div class="news-meta">
          <span class="news-category">${item.category}</span>
          <span>${item.date || 'June 2026'}</span>
        </div>
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <button class="btn btn-outline btn-sm read-news-btn" style="margin-top: 12px;">Read Full Story</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll(".news-card, .read-news-btn").forEach(card => {
    card.addEventListener("click", (e) => {
      const articleId = e.currentTarget.closest("article").getAttribute("data-id");
      const article = allNews.find(n => n.id === articleId);
      if (article) {
        const coverUrl = article.coverImage || images[article.img] || images.code;
        openModal(article.title, `
          <div style="font-size: 11px; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${article.category} | ${article.date || 'June 2026'}</div>
          ${coverUrl ? `<img src="${coverUrl}" alt="${article.title}" style="width: 100%; max-height: 240px; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--radius-sm); margin: 12px 0 8px 0; border: 1px solid var(--border);">` : ''}
          <div style="font-size: 14px; line-height: 1.65; color: var(--text-muted); white-space: pre-wrap; font-family: system-ui, -apple-system, sans-serif;">${article.content}</div>
        `);
      }
    });
  });
}

// News Filters
const categoryFilterBtns = document.querySelectorAll("#news-categories-filter .filter-btn");
categoryFilterBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    categoryFilterBtns.forEach(b => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    renderNewsFeed(e.currentTarget.getAttribute("data-category"));
  });
});

// Interactive Timeline
const timelineItems = document.querySelectorAll(".timeline-item");
timelineItems.forEach(item => {
  item.addEventListener("click", () => {
    const step = item.getAttribute("data-step");
    let title = "";
    let content = "";
    switch(step) {
      case "1":
        title = "Registration Period (June 1 - July 15)";
        content = "<p>Teams and individuals from across the globe submit applications defining their team composition, focus track choice, and profile competency descriptions. Individual builders match with teams here.</p><h4>Requirements:</h4><ul><li>Valid profiles for all builders</li><li>Track choice selected</li></ul>";
        break;
      case "2":
        title = "Application Deadline (July 15 @ 23:59 EST)";
        content = "<p>Final calls for submission drafts. Teams must lock and submit their projects with descriptive briefs, initial structural architecture plans, mockups, or wireframes. Automatic lockout follows after deadline.</p>";
        break;
      case "3":
        title = "Shortlisting Phase (July 20)";
        content = "<p>Our expert judge panel and committee coordinators vet all submitted concepts. The top 30 submissions demonstrating high innovation, social viability, and clean feasibility are selected to proceed to the Mentorship Cohort.</p>";
        break;
      case "4":
        title = "Mentorship Phase (July 22 - Aug 10)";
        content = "<p>Selected cohorts get assigned dedicated experts. Over 3 weeks, mentors support refining prototype structures, interface UX, cloud deployment, and business pitch structures in scheduled weekly meetings.</p>";
        break;
      case "5":
        title = "Demo Day (August 15)";
        content = "<p>The grand finale event. Finalists stream live presentations showcasing functional codebases and pitch structures to our panels of judges, seed VCs, and tech community leads.</p>";
        break;
      case "6":
        title = "Awards Ceremony (August 18)";
        content = "<p>Closing gala event announcing winners and distribution of the prize funding pools. Direct acceleration opportunities and credits are distributed to finalists.</p>";
        break;
    }

    openModal(title, `
      <div style="font-size: 15px; color: var(--text-muted); line-height: 1.6;">
        ${content}
      </div>
    `);
  });
});

// Render Resources
function renderResources() {
  const publicGrid = document.getElementById("public-resources-grid");
  if (!publicGrid) return;

  const items = allResources.length > 0 ? allResources : INITIAL_RESOURCES;

  publicGrid.innerHTML = items.map(res => {
    const icon = res.icon || "fa-file";
    const title = res.title || "Resource Template";
    const type = res.type || "Document";
    const size = res.size || "N/A";
    const desc = res.desc || "";
    
    return `
      <div class="resource-card">
        <div class="resource-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="resource-info">
          <h4>${title}</h4>
          <p>${desc}</p>
          <span style="font-size: 11px; color: var(--text-light); display: block; margin-bottom: 8px;">${type} &bull; ${size}</span>
          ${res.link 
            ? `<a href="#" class="resource-link download-resource-btn" data-id="${res.id || ''}"><i class="fa-solid fa-download"></i> Download Template</a>`
            : `<a href="#" class="resource-link download-mock-btn" data-res="${title}"><i class="fa-solid fa-download"></i> Download Template</a>`
          }
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".download-resource-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const resId = e.currentTarget.getAttribute("data-id");
      const res = allResources.find(r => r.id === resId);
      if (res) {
        await downloadResourceFile(res);
      }
    });
  });

  document.querySelectorAll(".download-mock-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const resTitle = e.currentTarget.getAttribute("data-res");
      showToast(`Mock download started for: ${resTitle}`, "info");
    });
  });
}

// Render Showcase
function renderShowcase() {
  const container = document.getElementById("showcase-feed-container");
  if (!container) return;

  const projects = allProjects.filter(p => p.status === "Approved");

  if (projects.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;">No winner projects showcase published yet. Approved applicant projects will be dynamically posted here.</p>`;
    return;
  }

  const images = {
    "clean-energy": "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=400&q=80",
    "fintech": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80",
    "healthtech": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80"
  };

  container.innerHTML = projects.map(proj => {
    const trackObj = INITIAL_TRACKS.find(t => t.id === proj.track);
    const scoreBadge = proj.averageScore ? `<div class="showcase-award-badge"><i class="fa-solid fa-star"></i> Score: ${proj.averageScore}/100</div>` : '';
    
    return `
      <div class="showcase-card">
        <div class="showcase-img-container">
          <img src="${images[proj.track] || images['clean-energy']}" alt="${proj.title}" class="showcase-img">
          <span class="badge showcase-badge"><i class="fa-solid fa-code-fork"></i> Showcase Entry</span>
          ${scoreBadge}
        </div>
        <div class="showcase-body">
          <div class="showcase-track">${trackObj ? trackObj.name : proj.track}</div>
          <h3>${proj.title || 'Untitled Project'}</h3>
          <p class="showcase-desc">${proj.description || 'No description provided.'}</p>
          
          <div class="showcase-team">
            <div>Built by: <span class="showcase-team-name">${proj.teamName}</span></div>
            <span class="showcase-members-count">${(proj.members || []).length} members</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Database Listeners
function initRealtimeSync() {
  onSnapshot(collection(firestore, "news"), (snapshot) => {
    allNews = [];
    snapshot.forEach(d => {
      allNews.push({ id: d.id, ...d.data() });
    });
    allNews.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Update Layout badge
    const announcementsCount = allNews.filter(n => n.category === "Announcements" || n.category === "Deadlines").length;
    const badgeAnnouncements = document.getElementById("badge-announcements-count");
    if (badgeAnnouncements) {
      if (announcementsCount > 0) {
        badgeAnnouncements.textContent = announcementsCount;
        badgeAnnouncements.style.display = "inline-block";
      } else {
        badgeAnnouncements.style.display = "none";
      }
    }

    setCachedData("news_cache", allNews);
    renderNewsFeed();
  });

  onSnapshot(collection(firestore, "projects"), (snapshot) => {
    allProjects = [];
    snapshot.forEach(d => {
      allProjects.push({ id: d.id, ...d.data() });
    });
    setCachedData("projects_cache", allProjects);
    updateLandingHeaderStats();
    renderShowcase();
  });

  onSnapshot(collection(firestore, "tracks"), (snapshot) => {
    allTracks = [];
    snapshot.forEach(d => {
      allTracks.push({ id: d.id, ...d.data() });
    });
    allTracks.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    setCachedData("tracks_cache", allTracks);
    renderLandingTracks();
  });

  // Listen to Features Collection
  onSnapshot(collection(firestore, "features"), (snapshot) => {
    allFeatures = [];
    snapshot.forEach(d => {
      allFeatures.push({ id: d.id, ...d.data() });
    });
    allFeatures.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    renderLandingFeatures();
  });

  // Listen to Timeline Collection
  onSnapshot(collection(firestore, "timeline"), (snapshot) => {
    allTimeline = [];
    snapshot.forEach(d => {
      allTimeline.push({ id: d.id, ...d.data() });
    });
    allTimeline.sort((a, b) => (a.step || 0) - (b.step || 0));
    setCachedData("timeline_cache", allTimeline);
    renderLandingTimeline();
  });

  onSnapshot(doc(firestore, "config", "landing_stats"), (snapshot) => {
    if (snapshot.exists()) {
      landingStatsConfig = snapshot.data();
      setCachedData("landing_stats_cache", landingStatsConfig);
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 18);
      landingStatsConfig = {
        participantsMode: "dynamic",
        countdownDate: defaultDate.toISOString(),
        showCountdown: true,
        showLeaderboardWidget: false
      };
    }

    updateLandingHeaderStats();
    startCountdown();
  });

  function applyRegistrationFormConfig(data) {
    if (!data) return;
    registrationFormConfig = data;
    const regTag = document.getElementById("registration-status-tag");
    const navBtn = document.getElementById("nav-register-btn");
    const mobileNavBtn = document.getElementById("mobile-register-btn");
    const mobileBottomNavBtn = document.getElementById("mobile-bottom-register-btn");

    // --- Registration tag + hero button visibility ---
    if (!data.hideRegistrationTag && regTag) {
      if (data.registrationClosed) {
        regTag.innerHTML = '<i class="fa-solid fa-lock"></i> Registration closed';
        regTag.style.backgroundColor = '#fee2e2';
        regTag.style.color = '#ef4444';
        regTag.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      } else {
        regTag.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> Registration is open!';
        regTag.style.backgroundColor = 'var(--primary-light)';
        regTag.style.color = 'var(--primary)';
        regTag.style.borderColor = 'rgba(37, 99, 235, 0.1)';
      }
    }

    toggleCountdownAndRegisterBtnVisibility();

    // --- Nav & bottom bar swap ---
    if (data.swapNavToLeaderboard) {
      if (navBtn) {
        navBtn.innerHTML = '<i class="fa-solid fa-trophy"></i> View Leaderboard';
        navBtn.href = "leaderboard.html";
        navBtn.removeAttribute("data-view");
        navBtn.onclick = null;
      }
      if (mobileNavBtn) {
        mobileNavBtn.innerHTML = 'View Leaderboard';
        mobileNavBtn.href = "leaderboard.html";
        mobileNavBtn.removeAttribute("data-view");
        mobileNavBtn.onclick = null;
      }
      if (mobileBottomNavBtn) {
        mobileBottomNavBtn.innerHTML = '<i class="fa-solid fa-trophy"></i><span>Leaderboard</span>';
        mobileBottomNavBtn.href = "leaderboard.html";
        mobileBottomNavBtn.removeAttribute("data-view");
        mobileBottomNavBtn.onclick = null;
      }
    } else {
      if (navBtn) {
        navBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register Now';
        navBtn.href = "register.html";
        navBtn.removeAttribute("data-view");
        navBtn.onclick = null;
      }
      if (mobileNavBtn) {
        mobileNavBtn.innerHTML = 'Register Now';
        mobileNavBtn.href = "register.html";
        mobileNavBtn.removeAttribute("data-view");
        mobileNavBtn.onclick = null;
      }
      if (mobileBottomNavBtn) {
        mobileBottomNavBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i><span>Register</span>';
        mobileBottomNavBtn.href = "register.html";
        mobileBottomNavBtn.removeAttribute("data-view");
        mobileBottomNavBtn.onclick = null;
      }
    }
  }

  getCachedData("registration_form_cache").then(cached => {
    if (cached && !registrationFormConfig) {
      applyRegistrationFormConfig(cached);
    }
  });

  onSnapshot(doc(firestore, "config", "registration_form"), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      setCachedData("registration_form_cache", data);
      applyRegistrationFormConfig(data);
    }
  });

  onSnapshot(collection(firestore, "prizes"), async (snapshot) => {
    allPrizes = [];
    snapshot.forEach(d => {
      allPrizes.push({ id: d.id, ...d.data() });
    });

    if (snapshot.empty) {
      const defaultPrizes = [
        { rank: "1st Place Grand Winner", amount: "GH₵ 100,000", desc: "Equivalent value in full-stack engineering support, premium co-working space incubation, GH₵ 30,000 AWS credits, and global showcase publicity.", popular: true, timestamp: 1 },
        { rank: "Runner Up", amount: "GH₵ 50,000", desc: "Equivalent value in architecture reviews, code deployment assistance, GH₵ 15,000 AWS cloud credits, and 3 months mentorship.", popular: false, timestamp: 2 },
        { rank: "3rd Place", amount: "GH₵ 25,000", desc: "Equivalent value in technical deployment reviews, GH₵ 10,000 cloud infrastructure credits, and partner networking access.", popular: false, timestamp: 3 }
      ];
      try {
        for (const prize of defaultPrizes) {
          const id = prize.rank.toLowerCase().replace(/[^a-z0-9]/g, "-");
          await setDoc(doc(firestore, "prizes", id), {
            rank: prize.rank,
            amount: prize.amount,
            desc: prize.desc,
            popular: prize.popular,
            timestamp: Date.now() + prize.timestamp
          });
        }
      } catch (err) {
        console.error("Failed seeding prizes:", err);
      }
    }

    allPrizes.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    setCachedData("prizes_cache", allPrizes);
    renderLandingPrizes();
  });

  // Watch ticketing settings
  onSnapshot(doc(firestore, "config", "ticketing_settings"), (snapshot) => {
    const floatingAction = document.getElementById("floating-ticket-action");
    const supportChat = document.getElementById("support-chat-container");
    const waWidget = document.getElementById("whatsapp-floating-widget");
    if (!floatingAction) return;

    if (snapshot.exists()) {
      const data = snapshot.data();
      window.ticketingConfig = data;
      if (data.ticketingEnabled === true) {
        floatingAction.style.display = "flex";
        if (supportChat) supportChat.classList.add("ticket-visible");
        if (waWidget) waWidget.classList.add("ticket-visible");
      } else {
        floatingAction.style.display = "none";
        if (supportChat) supportChat.classList.remove("ticket-visible");
        if (waWidget && (!window.currentWaConfig || window.currentWaConfig.position !== "left")) {
          waWidget.classList.remove("ticket-visible");
        }
      }
    } else {
      floatingAction.style.display = "none";
      if (supportChat) supportChat.classList.remove("ticket-visible");
      if (waWidget && (!window.currentWaConfig || window.currentWaConfig.position !== "left")) {
        waWidget.classList.remove("ticket-visible");
      }
    }
  });

  // Watch legal collection
  onSnapshot(collection(firestore, "legal"), async (snapshot) => {
    let allLegal = [];
    snapshot.forEach(d => {
      allLegal.push({ id: d.id, ...d.data() });
    });
    allLegal.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    setCachedData("legal_cache", allLegal);
    
    // Render to public-legal-grid
    const legalGrid = document.getElementById("public-legal-grid");
    if (legalGrid) {
      if (allLegal.length === 0) {
        legalGrid.innerHTML = `<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">No terms or policies configured yet.</p>`;
      } else {
        legalGrid.innerHTML = allLegal.map(leg => `
          <div class="card" style="padding: 24px; display: flex; flex-direction: column; gap: 12px; background: var(--bg-card); box-shadow: var(--shadow-sm); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: var(--text-main); font-family: var(--font-heading);">
              <i class="fa-solid fa-gavel" style="color: var(--primary);"></i> ${leg.title}
            </div>
            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0; white-space: pre-line;">${leg.content}</p>
          </div>
        `).join("");
      }
    }
  });

  // Watch resources collection
  onSnapshot(collection(firestore, "resources"), async (snapshot) => {
    allResources = [];
    snapshot.forEach(d => {
      allResources.push({ id: d.id, ...d.data() });
    });
    
    // Provide default visual resources if collection is empty (do not write to DB to avoid permission errors)
    if (snapshot.empty) {
      allResources = [
        { id: "default-1", title: "HatchPoint Official Rules & Guidelines", icon: "fa-file-pdf", type: "PDF Document", size: "1.2 MB", desc: "Download the complete terms, criteria weights, and technical guidelines.", timestamp: 1, link: "" },
        { id: "default-2", title: "Pitch Deck PowerPoint Template", icon: "fa-file-powerpoint", type: "PPTX Presentation", size: "4.8 MB", desc: "Use our approved slide outline for Demo Day to structure your problem, solution, and model.", timestamp: 2, link: "" },
        { id: "default-3", title: "Judging Scorecard Rubric Details", icon: "fa-clipboard-check", type: "PDF Document", size: "800 KB", desc: "A comprehensive breakdown of how judges rate Innovation, Execution, Impact, and UX.", timestamp: 3, link: "" }
      ];
    }
    
    allResources.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    setCachedData("resources_cache", allResources);
    renderResources();
  });
}

// Samsung Internet browser enforcement to Google Chrome
function checkBrowserAndEnforceChrome() {
  const ua = navigator.userAgent;
  const isSamsungBrowser = ua.indexOf("SamsungBrowser") > -1;
  
  if (isSamsungBrowser) {
    if (sessionStorage.getItem("chrome_enforcement_dismissed") === "true") {
      return;
    }
    
    const banner = document.createElement("div");
    banner.id = "browser-enforcement-banner";
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: white;
      padding: 14px 20px;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border-bottom: 2px solid #2563eb;
    `;
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 16px;"></i>
        <span>Using Samsung Internet? Open in <strong>Google Chrome</strong> for maximum compatibility.</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <a href="intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end" 
           style="background: #2563eb; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-brands fa-chrome"></i> Open in Chrome
        </a>
        <button id="close-browser-banner" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px;">&times;</button>
      </div>
    `;
    
    document.body.appendChild(banner);
    document.body.style.paddingTop = "50px";
    
    document.getElementById("close-browser-banner").addEventListener("click", () => {
      banner.remove();
      document.body.style.paddingTop = "0px";
      sessionStorage.setItem("chrome_enforcement_dismissed", "true");
    });
  }
}

// FAQ Accordion Toggle Interaction
function initFaqAccordion() {
  const headers = document.querySelectorAll(".accordion-header");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const isActive = item.classList.contains("active");
      
      // Close all other accordion items
      document.querySelectorAll(".accordion-item").forEach(i => {
        i.classList.remove("active");
      });
      
      // Toggle active class on clicked item
      if (!isActive) {
        item.classList.add("active");
      }
    });
  });

  // Connect FAQ & Footer Support Buttons
  const faqChatBtn = document.getElementById("faq-open-chat-btn");
  if (faqChatBtn) {
    faqChatBtn.addEventListener("click", () => {
      const modal = document.getElementById("support-chat-modal");
      if (modal) modal.classList.add("active");
    });
  }

  const faqWaBtn = document.getElementById("faq-whatsapp-btn");
  if (faqWaBtn) {
    faqWaBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.currentWaConfig && window.currentWaConfig.groupLink) {
        window.open(window.currentWaConfig.groupLink, "_blank", "noopener,noreferrer");
      } else {
        const floatBtn = document.getElementById("whatsapp-float-btn");
        if (floatBtn) floatBtn.click();
      }
    });
  }

  const footerSupportBtn = document.getElementById("footer-support-trigger");
  if (footerSupportBtn) {
    footerSupportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const modal = document.getElementById("support-chat-modal");
      if (modal) modal.classList.add("active");
    });
  }

  const footerWaBtn = document.getElementById("footer-whatsapp-link");
  if (footerWaBtn) {
    footerWaBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.currentWaConfig && window.currentWaConfig.groupLink) {
        window.open(window.currentWaConfig.groupLink, "_blank", "noopener,noreferrer");
      } else {
        const floatBtn = document.getElementById("whatsapp-float-btn");
        if (floatBtn) floatBtn.click();
      }
    });
  }
}

// Window load init
window.addEventListener("DOMContentLoaded", () => {
  // Load Cached Data on Startup to prevent layout flicker and show real data instantly
  getCachedData("landing_stats_cache").then(cached => {
    if (cached) {
      landingStatsConfig = cached;
      updateLandingHeaderStats();
      startCountdown();
    }
  });

  getCachedData("news_cache").then(cached => {
    if (cached) {
      allNews = cached;
      const announcementsCount = allNews.filter(n => n.category === "Announcements" || n.category === "Deadlines").length;
      const badgeAnnouncements = document.getElementById("badge-announcements-count");
      if (badgeAnnouncements) {
        if (announcementsCount > 0) {
          badgeAnnouncements.textContent = announcementsCount;
          badgeAnnouncements.style.display = "inline-block";
        } else {
          badgeAnnouncements.style.display = "none";
        }
      }
      renderNewsFeed();
    }
  });

  getCachedData("tracks_cache").then(cached => {
    if (cached) {
      allTracks = cached;
      renderLandingTracks();
    }
  });

  getCachedData("timeline_cache").then(cached => {
    if (cached) {
      allTimeline = cached;
      renderLandingTimeline();
    }
  });

  getCachedData("prizes_cache").then(cached => {
    if (cached) {
      allPrizes = cached;
      renderLandingPrizes();
    }
  });

  getCachedData("projects_cache").then(cached => {
    if (cached) {
      allProjects = cached;
      updateLandingHeaderStats();
      renderShowcase();
    }
  });

  getCachedData("resources_cache").then(cached => {
    if (cached) {
      allResources = cached;
      renderResources();
    }
  });

  renderLandingTracks();
  renderLandingTimeline();
  renderLandingPrizes();
  initRealtimeSync();
  checkBrowserAndEnforceChrome();
  initFaqAccordion();

  const hash = window.location.hash.substring(1);
  if (["home", "resources", "news", "showcase", "legal"].includes(hash)) {
    showView(hash);
  } else if (["what-is", "about", "tracks", "timeline", "prizes", "eligibility", "faq"].includes(hash)) {
    showView("home");
    setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  } else {
    showView("home");
  }
  
  initHeroCarousel();
});

// Hero Carousel auto-sliding
function initHeroCarousel() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (slides.length === 0) return;

  let currentSlide = 0;
  let slideInterval = setInterval(nextSlide, 5000);

  function goToSlide(n) {
    slides[currentSlide].classList.remove("active");
    dots[currentSlide].classList.remove("active");
    currentSlide = (n + slides.length) % slides.length;
    slides[currentSlide].classList.add("active");
    dots[currentSlide].classList.add("active");
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      clearInterval(slideInterval);
      goToSlide(idx);
      slideInterval = setInterval(nextSlide, 5000);
    });
  });
}

// Handle click on "Get Ticket" banner on Slide 2
function handleGetTicketClick(event) {
  if (event) event.preventDefault();
  if (window.ticketingConfig && window.ticketingConfig.ticketingEnabled === true) {
    openPublicTicketModal();
  } else {
    showToast("Attendance booking is coming soon!", "info");
  }
}
window.handleGetTicketClick = handleGetTicketClick;

// Helper: Decompress Base64 gzip Data URL using DecompressionStream API
async function decompressFileGzip(base64GzipUrl) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream is not supported in this browser. Please use a modern browser.");
  }
  
  const base64Data = base64GzipUrl.split(",")[1];
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  
  const decompressionStream = new DecompressionStream("gzip");
  const decompressedStream = stream.pipeThrough(decompressionStream);
  const response = new Response(decompressedStream);
  return await response.arrayBuffer();
}

// Download dynamic resource file (decompresses on-the-fly)
async function downloadResourceFile(res) {
  const url = res.link;
  if (!url) {
    showToast("No download file uploaded for this resource.", "error");
    return;
  }
  
  const title = res.title;
  let extension = "pdf";
  if (res.icon === "fa-file-word" || res.type.includes("Word") || res.type.includes("DOCX")) extension = "docx";
  else if (res.icon === "fa-file-powerpoint" || res.type.includes("PowerPoint") || res.type.includes("PPTX")) extension = "pptx";
  else if (res.icon === "fa-file-zipper" || res.type.includes("ZIP") || res.type.includes("Archive")) extension = "zip";
  else if (res.icon === "fa-file-excel" || res.type.includes("Excel") || res.type.includes("Spreadsheet")) extension = "xlsx";
  else if (res.icon === "fa-image" || res.type.includes("Image")) extension = "png";
  
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${extension}`;
  
  let mimeType = "application/octet-stream";
  if (extension === "pdf") mimeType = "application/pdf";
  else if (extension === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  else if (extension === "pptx") mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  else if (extension === "zip") mimeType = "application/zip";
  else if (extension === "xlsx") mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  
  try {
    showToast(`Downloading ${title}...`, "info");
    
    let downloadUrl;
    let blob;
    if (url.startsWith("data:application/gzip;base64,")) {
      const buffer = await decompressFileGzip(url);
      blob = new Blob([buffer], { type: mimeType });
      downloadUrl = URL.createObjectURL(blob);
    } else {
      downloadUrl = url;
    }
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (blob) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    }
  } catch (err) {
    console.error("Decompression failed:", err);
    showToast("Failed to download file: " + err.message, "error");
  }
}

// Open Public Ticket Modal
function openPublicTicketModal() {
  const config = window.ticketingConfig || {
    eventTitle: "HatchPoint Grand Finale Pitch Day",
    eventDate: "August 15, 2026 @ 09:00 AM",
    eventVenue: "KNUST Great Hall"
  };

  openModal("Book Attendance Ticket Pass", `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(108, 92, 231, 0.08); padding: 12px; border-radius: var(--radius-sm); border-left: 4px solid var(--primary); font-size: 13px; color: var(--text-muted); line-height: 1.5;">
        <strong style="color: var(--text-main); display: block; margin-bottom: 2px;">${config.eventTitle}</strong>
        <i class="fa-regular fa-calendar-check"></i> ${config.eventDate}<br>
        <i class="fa-solid fa-map-pin"></i> ${config.eventVenue}
      </div>
      <form id="public-ticket-booking-form" onsubmit="submitPublicTicketBooking(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="form-group">
          <label style="font-size: 12px; font-weight: 600; color: var(--text-main);">Your Full Name</label>
          <input type="text" id="public-ticket-name" class="form-control" placeholder="e.g. Kelvin Boateng" required>
        </div>
        <div class="form-group">
          <label style="font-size: 12px; font-weight: 600; color: var(--text-main);">Your Email Address</label>
          <input type="email" id="public-ticket-email" class="form-control" placeholder="e.g. kelvin@example.com" required>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top: 8px; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;"><i class="fa-solid fa-ticket"></i> Book Free Pass</button>
      </form>
    </div>
  `);
}

// Submit ticket booking to firestore
async function submitPublicTicketBooking(event) {
  event.preventDefault();
  const name = document.getElementById("public-ticket-name").value.trim();
  const email = document.getElementById("public-ticket-email").value.trim();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnHTML = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    showToast("Processing booking...", "info");
    
    const { getFirestore, doc, setDoc, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const db = getFirestore();
    
    // Fetch all current tickets to determine seat sequence
    const ticketsSnap = await getDocs(collection(db, "tickets"));
    const ticketsCount = ticketsSnap.size;

    const config = window.ticketingConfig || {};
    const prefix = config.seatPrefix || "GA-";
    const startNum = config.seatStartNumber || 100;
    const finalSeat = `${prefix}${startNum + ticketsCount}`;

    const ticketId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
    
    await setDoc(doc(db, "tickets", ticketId), {
      name,
      email,
      seatCode: finalSeat,
      timestamp: Date.now()
    });

    showToast("Ticket booked successfully!", "success");
    renderStunningTechTicket(ticketId, name, email, finalSeat);
    
  } catch (err) {
    console.error(err);
    showToast("Booking failed: " + err.message, "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHTML;
  }
}

// Render attendance pass
function renderStunningTechTicket(ticketId, name, email, seatCode) {
  const config = window.ticketingConfig || {
    eventTitle: "HatchPoint Grand Finale Pitch Day",
    eventDate: "August 15, 2026 @ 09:00 AM",
    eventVenue: "KNUST Great Hall",
    showSeats: true
  };

  const showSeatsToggle = config.showSeats !== false;
  const seatBlockHTML = showSeatsToggle ? `
    <div>
      <span style="font-size: 8px; color: var(--text-light); text-transform: uppercase; display: block; margin-bottom: 2px;">Seat</span>
      <strong style="font-size: 11px; color: var(--primary); display: block; font-weight: 700; font-family: monospace;">${seatCode || "GA-100"}</strong>
    </div>
  ` : "";

  let barcodeHTML = '<div style="display: flex; gap: 2px; align-items: stretch; height: 32px; background: white; padding: 4px; border-radius: 2px; justify-content: center; width: 100%;">';
  for (let i = 0; i < 20; i++) {
    const width = (i % 3 === 0) ? "3px" : (i % 5 === 0) ? "4px" : "1.5px";
    barcodeHTML += `<span style="background: black; width: ${width}; display: block;"></span>`;
  }
  barcodeHTML += '</div>';

  openModal("Your HatchPoint Attendance Pass", `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%;">
      
      <!-- Horizontal Tech-Style Ticket -->
      <div id="hatchpoint-attendance-ticket" style="width: 100%; max-width: 600px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--shadow-md); position: relative; overflow: hidden; display: flex; flex-direction: row; min-height: 220px;">
        
        <!-- Left Details Section -->
        <div style="flex: 2.2; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px dashed var(--border); gap: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: var(--primary); color: white; width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900;"><i class="fa-solid fa-code"></i></div>
            <span style="font-family: var(--font-heading); font-weight: 700; font-size: 12px; color: var(--text-main);">HATCHPOINT 2026 EVENT PASS</span>
          </div>

          <div>
            <span style="font-size: 8px; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Event Name</span>
            <strong style="font-size: 15px; color: var(--text-main); display: block; font-family: var(--font-heading); font-weight: 700; line-height: 1.2;">${config.eventTitle}</strong>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1.2fr 0.8fr; gap: 10px; border-top: 1px dashed var(--border); padding-top: 12px; margin-top: auto;">
            <div>
              <span style="font-size: 8px; color: var(--text-light); text-transform: uppercase; display: block; margin-bottom: 1px;">Date &amp; Time</span>
              <span style="font-size: 10px; color: var(--text-main); font-weight: 600; display: block; line-height: 1.2;">${config.eventDate}</span>
            </div>
            <div>
              <span style="font-size: 8px; color: var(--text-light); text-transform: uppercase; display: block; margin-bottom: 1px;">Venue</span>
              <span style="font-size: 10px; color: var(--text-main); font-weight: 600; display: block; line-height: 1.2;">${config.eventVenue}</span>
            </div>
            ${seatBlockHTML}
          </div>
        </div>

        <!-- Vertical tear-off notches -->
        <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; position: absolute; left: calc(68.5% - 6px); top: 0; bottom: 0; pointer-events: none; height: 100%;">
          <div style="width: 12px; height: 12px; background: white; border-radius: 50%; border: 1px solid var(--border); border-top: 0; border-left: 0; border-right: 0; margin-top: -6px; z-index: 2;"></div>
          <div style="width: 12px; height: 12px; background: white; border-radius: 50%; border: 1px solid var(--border); border-bottom: 0; border-left: 0; border-right: 0; margin-bottom: -6px; z-index: 2;"></div>
        </div>

        <!-- Right Stub Section -->
        <div style="flex: 1; padding: 20px; background: var(--bg-app); display: flex; flex-direction: column; align-items: center; justify-content: space-between; border-radius: 0 12px 12px 0;">
          <span style="font-size: 9px; text-transform: uppercase; color: var(--primary); font-weight: 700; background: rgba(37, 99, 235, 0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(37, 99, 235, 0.2); text-align: center; width: 100%;">Admit One</span>
          
          <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 6px; margin: 10px 0;">
            <div style="font-size: 8px; color: var(--text-light); text-transform: uppercase; text-align: center;">Attendee Pass</div>
            <strong style="font-size: 11px; color: var(--text-main); font-weight: 700; text-align: center; word-break: break-all; max-width: 130px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</strong>
          </div>

          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            ${barcodeHTML}
            <span style="font-family: monospace; font-size: 10px; color: var(--text-main); letter-spacing: 2px; font-weight: 700;">${ticketId}</span>
          </div>
        </div>

      </div>

      <div style="display: flex; gap: 10px; width: 100%; max-width: 600px; justify-content: center;">
        <button class="btn btn-secondary btn-sm" onclick="downloadTechTicket('${ticketId}', '${name.replace(/'/g, "\\'")}', '${email.replace(/'/g, "\\'")}', '${seatCode || ""}', '${config.eventTitle.replace(/'/g, "\\'")}', '${config.eventDate.replace(/'/g, "\\'")}', '${config.eventVenue.replace(/'/g, "\\'")}', ${showSeatsToggle})" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;"><i class="fa-solid fa-download"></i> Download Pass</button>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('modal-close-btn').click()" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;"><i class="fa-solid fa-circle-check"></i> Done</button>
      </div>

    </div>
  `);
}

// Download attendance ticket as image (horizontal)
function downloadTechTicket(ticketId, name, email, seatCode, eventTitle, eventDate, eventVenue, showSeatsVal) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");

  // Draw background card
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 800, 360);

  // Outer border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, 770, 330);

  // Vertical separator dashed line at x = 540
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(540, 15);
  ctx.lineTo(540, 345);
  ctx.stroke();
  ctx.setLineDash([]);

  // Notches at (540, 15) and (540, 345)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(540, 15, 12, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(540, 345, 12, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  // LEFT SECTION DETAILS
  // Brand Header
  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("⚡ HATCHPOINT 2026 EVENT PASS", 40, 50);

  // Event Name label
  ctx.fillStyle = "#718096";
  ctx.font = "11px sans-serif";
  ctx.fillText("EVENT NAME", 40, 95);

  // Event title
  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 20px sans-serif";
  const words = eventTitle.split(" ");
  let line = "";
  let y = 125;
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + " ";
    let metrics = ctx.measureText(testLine);
    if (metrics.width > 460 && n > 0) {
      ctx.fillText(line, 40, y);
      line = words[n] + " ";
      y += 26;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 40, y);

  // Attendee label
  ctx.fillStyle = "#718096";
  ctx.font = "11px sans-serif";
  ctx.fillText("ATTENDEE PASS", 40, 205);

  // Attendee name & email
  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(name, 40, 230);
  ctx.fillStyle = "#4a5568";
  ctx.font = "13px sans-serif";
  ctx.fillText(email, 40, 250);

  // Separator above footer info
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 280);
  ctx.lineTo(500, 280);
  ctx.stroke();

  // Date, Venue, Seat Grid
  ctx.fillStyle = "#718096";
  ctx.font = "10px sans-serif";
  ctx.fillText("DATE & TIME", 40, 305);
  ctx.fillText("VENUE", 220, 305);

  const showSeatsBool = showSeatsVal !== "false" && showSeatsVal !== false;
  if (showSeatsBool) {
    ctx.fillText("SEAT", 420, 305);
  }

  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(eventDate, 40, 325);
  ctx.fillText(eventVenue, 220, 325);

  if (showSeatsBool) {
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 13px monospace";
    ctx.fillText(seatCode, 420, 325);
  }

  // RIGHT SECTION DETAILS (STUB)
  // Admit One badge block
  ctx.fillStyle = "rgba(37, 99, 235, 0.1)";
  ctx.beginPath();
  ctx.roundRect(570, 35, 190, 36, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(37, 99, 235, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ADMIT ONE", 665, 57);

  // Stub Attendee name
  ctx.fillStyle = "#718096";
  ctx.font = "10px sans-serif";
  ctx.fillText("ATTENDEE PASS", 665, 110);
  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(name.length > 20 ? name.substring(0, 18) + "..." : name, 665, 130);

  // Barcode container area
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(570, 175, 190, 100);

  // Barcode lines
  ctx.fillStyle = "#000000";
  let bx = 590;
  for (let i = 0; i < 24; i++) {
    const width = (i % 3 === 0) ? 4 : (i % 5 === 0) ? 6 : 2;
    ctx.fillRect(bx, 190, width, 45);
    bx += width + 3;
    if (bx >= 740) break;
  }

  // Ticket ID below barcode
  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 14px monospace";
  ctx.fillText(ticketId, 665, 260);

  // Reset text alignment
  ctx.textAlign = "left";

  // Trigger download action
  const link = document.createElement("a");
  link.download = `HatchPoint_Ticket_${ticketId}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.openPublicTicketModal = openPublicTicketModal;
window.submitPublicTicketBooking = submitPublicTicketBooking;
window.renderStunningTechTicket = renderStunningTechTicket;
window.downloadTechTicket = downloadTechTicket;

// Admin shortcut listener & section visibility
let adminShortcutCombo = JSON.parse(localStorage.getItem("adminShortcutCombo") || "[]");
let pressedGlobalKeys = new Set();

function applyAdminSettingsVisibility(data) {
  if (!data) return;
  const sponsorsSection = document.getElementById("sponsors");
  if (sponsorsSection) {
    sponsorsSection.style.display = data.hideSponsors ? "none" : "block";
  }

  const prizesSection = document.querySelector(".prizes-section");
  if (prizesSection) {
    prizesSection.style.display = data.hidePrizes ? "none" : "block";
  }

  document.querySelectorAll('[data-scroll="prizes"]').forEach(link => {
    const li = link.closest("li");
    if (li) {
      li.style.display = data.hidePrizes ? "none" : "";
    } else {
      link.style.display = data.hidePrizes ? "none" : "";
    }
  });
}

try {
  const cachedAdminSettings = JSON.parse(localStorage.getItem("adminSettingsVisibility") || "null");
  if (cachedAdminSettings) applyAdminSettingsVisibility(cachedAdminSettings);
} catch (e) {}

onSnapshot(doc(firestore, "config", "admin_settings"), (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    adminShortcutCombo = data.shortcutCombo || [];
    localStorage.setItem("adminShortcutCombo", JSON.stringify(adminShortcutCombo));
    localStorage.setItem("adminSettingsVisibility", JSON.stringify({
      hideSponsors: !!data.hideSponsors,
      hidePrizes: !!data.hidePrizes
    }));
    applyAdminSettingsVisibility(data);
  }
});

window.addEventListener("keydown", (e) => {
  pressedGlobalKeys.add(e.key.toLowerCase());
  if (adminShortcutCombo.length > 0 && adminShortcutCombo.length === pressedGlobalKeys.size && adminShortcutCombo.every(k => pressedGlobalKeys.has(k))) {
    e.preventDefault();
    pressedGlobalKeys.clear();
    window.location.href = "admin.html";
  }
});
window.addEventListener("keyup", (e) => {
  pressedGlobalKeys.delete(e.key.toLowerCase());
});

// Analytics Tracking
function trackSiteAnalytics() {
  const urlParams = new URLSearchParams(window.location.search);
  const isShareClick = urlParams.has("ref") && urlParams.get("ref") === "share";
  
  // Track Global Page Views
  setDoc(doc(firestore, "analytics", "traffic"), {
    total_page_views: increment(1)
  }, { merge: true }).catch(err => console.warn("Analytics Error:", err));

  // Log Detailed View
  addDoc(collection(firestore, "analytics", "traffic", "visits"), {
    path: window.location.pathname,
    timestamp: serverTimestamp(),
    isShareClick: isShareClick
  }).catch(err => console.warn("Detailed Analytics Error:", err));

  // Track Clicks from Shared Links
  if (isShareClick) {
    setDoc(doc(firestore, "analytics", "traffic"), {
      shared_link_clicks: increment(1)
    }, { merge: true }).catch(err => console.warn("Analytics Error:", err));
  }
}
// Run analytics on page load
window.addEventListener("DOMContentLoaded", trackSiteAnalytics);

// WHATSAPP FLOATING WIDGET LOGIC
document.addEventListener("DOMContentLoaded", () => {
  const widgetContainer = document.getElementById("whatsapp-floating-widget");
  const floatBtn = document.getElementById("whatsapp-float-btn");
  const menuPopup = document.getElementById("whatsapp-menu-popup");
  const closePopupBtn = document.getElementById("close-whatsapp-popup");
  const joinGroupBtn = document.getElementById("whatsapp-popup-join-btn");
  const popupText = document.getElementById("whatsapp-popup-text");
  const tooltipBadge = document.getElementById("whatsapp-tooltip-badge");
  const triggerSupportBtn = document.getElementById("whatsapp-trigger-support-chat");
  const chatModal = document.getElementById("support-chat-modal");

  if (!widgetContainer || !floatBtn) return;

  let currentWaConfig = {
    enabled: true,
    mode: "popup",
    groupLink: "",
    label: "Join WhatsApp Group",
    welcomeText: "Join our official HatchPoint WhatsApp group for live updates, announcements, and direct community support!"
  };

  // Sync with Firestore settings
  try {
    const docRef = doc(firestore, "settings", "whatsapp_widget");
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentWaConfig = { ...currentWaConfig, ...data };
      }
      updateWhatsAppWidgetUI();
    });
  } catch (e) {
    console.warn("Firestore WhatsApp sync fallback:", e);
    updateWhatsAppWidgetUI();
  }

  function updateWhatsAppWidgetUI() {
    window.currentWaConfig = currentWaConfig;
    if (currentWaConfig.enabled && currentWaConfig.groupLink) {
      widgetContainer.style.display = "block";
    } else {
      widgetContainer.style.display = "none";
      if (menuPopup) menuPopup.classList.remove("active");
      return;
    }

    const isTicketingOn = window.ticketingConfig && window.ticketingConfig.ticketingEnabled === true;
    const shouldMirrorLeft = currentWaConfig.position === "left" || (currentWaConfig.position !== "right" && isTicketingOn);
    
    if (shouldMirrorLeft) {
      widgetContainer.classList.add("ticket-visible");
    } else {
      widgetContainer.classList.remove("ticket-visible");
    }

    if (tooltipBadge) {
      tooltipBadge.textContent = currentWaConfig.label || "Join Group";
    }

    if (popupText) {
      popupText.textContent = currentWaConfig.welcomeText || "Join our official HatchPoint WhatsApp group for live updates, announcements, and direct community support!";
    }

    if (joinGroupBtn && currentWaConfig.groupLink) {
      joinGroupBtn.href = currentWaConfig.groupLink;
    }

    if (typeof updateTikTokWidgetLayout === "function") {
      updateTikTokWidgetLayout();
    }
  }

  // Toggle Popup or Direct Link on Floating Button Click
  floatBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Close TikTok popup if active
    const ttPopup = document.getElementById("tiktok-menu-popup");
    if (ttPopup) ttPopup.classList.remove("active");

    if (!currentWaConfig.groupLink) return;

    if (currentWaConfig.mode === "direct") {
      window.open(currentWaConfig.groupLink, "_blank", "noopener,noreferrer");
    } else {
      menuPopup.classList.toggle("active");
    }
  });

  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuPopup.classList.remove("active");
    });
  }

  // Close popup if clicking outside
  document.addEventListener("click", (e) => {
    if (menuPopup && menuPopup.classList.contains("active")) {
      if (!menuPopup.contains(e.target) && !floatBtn.contains(e.target)) {
        menuPopup.classList.remove("active");
      }
    }
  });

  // Support chat shortcut button inside WhatsApp popup
  if (triggerSupportBtn) {
    triggerSupportBtn.addEventListener("click", () => {
      if (menuPopup) menuPopup.classList.remove("active");
      if (chatModal) chatModal.classList.add("active");
    });
  }
});

// === TIKTOK FLOATING WIDGET LOGIC ===
let updateTikTokWidgetLayout = null;

document.addEventListener("DOMContentLoaded", () => {
  const widgetContainer = document.getElementById("tiktok-floating-widget");
  const floatBtn = document.getElementById("tiktok-float-btn");
  const menuPopup = document.getElementById("tiktok-menu-popup");
  const closePopupBtn = document.getElementById("close-tiktok-popup");
  const watchBtn = document.getElementById("tiktok-popup-watch-btn");
  const popupText = document.getElementById("tiktok-popup-text");
  const tooltipBadge = document.getElementById("tiktok-tooltip-badge");

  if (!widgetContainer || !floatBtn) return;

  let currentTikTokConfig = {
    enabled: true,
    mode: "popup",
    accountLink: "",
    label: "Watch on TikTok",
    welcomeText: "Follow our official TikTok for challenge highlights, student pitches, backstage moments, and announcements!",
    position: "auto"
  };

  try {
    const docRef = doc(firestore, "settings", "tiktok_widget");
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentTikTokConfig = { ...currentTikTokConfig, ...data };
      }
      updateTikTokWidgetUI();
    });
  } catch (e) {
    console.warn("Firestore TikTok sync fallback:", e);
    updateTikTokWidgetUI();
  }

  function updateTikTokWidgetUI() {
    window.currentTikTokConfig = currentTikTokConfig;
    if (currentTikTokConfig.enabled && currentTikTokConfig.accountLink) {
      widgetContainer.style.display = "flex";
    } else {
      widgetContainer.style.display = "none";
      if (menuPopup) menuPopup.classList.remove("active");
      return;
    }

    if (currentTikTokConfig.position === "left") {
      widgetContainer.classList.add("position-left");
      widgetContainer.classList.remove("stacked-above-wa");
    } else {
      widgetContainer.classList.remove("position-left");
      // Check if WhatsApp widget is currently active on the right
      const waContainer = document.getElementById("whatsapp-floating-widget");
      const isWaOnRight = waContainer && 
        waContainer.style.display !== "none" && 
        !waContainer.classList.contains("position-left") && 
        !waContainer.classList.contains("ticket-visible");
      
      if (isWaOnRight) {
        widgetContainer.classList.add("stacked-above-wa");
      } else {
        widgetContainer.classList.remove("stacked-above-wa");
      }
    }

    if (tooltipBadge) {
      tooltipBadge.textContent = currentTikTokConfig.label || "Watch on TikTok";
    }

    if (popupText) {
      popupText.textContent = currentTikTokConfig.welcomeText || "Follow our official TikTok for challenge highlights, student pitches, backstage moments, and announcements!";
    }

    if (watchBtn) {
      watchBtn.href = currentTikTokConfig.accountLink || "#";
    }
  }

  updateTikTokWidgetLayout = updateTikTokWidgetUI;

  // Toggle Popup or Direct Link on Floating Button Click
  floatBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Close WhatsApp popup if open to avoid visual collision
    const waPopup = document.getElementById("whatsapp-menu-popup");
    if (waPopup) waPopup.classList.remove("active");

    if (!currentTikTokConfig.accountLink) return;

    if (currentTikTokConfig.mode === "direct") {
      window.open(currentTikTokConfig.accountLink, "_blank", "noopener,noreferrer");
    } else {
      if (menuPopup) menuPopup.classList.toggle("active");
    }
  });

  // Watch / Follow CTA click handler
  if (watchBtn) {
    watchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentTikTokConfig.accountLink) {
        window.open(currentTikTokConfig.accountLink, "_blank", "noopener,noreferrer");
      }
    });
  }

  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menuPopup) menuPopup.classList.remove("active");
    });
  }

  // Close popup if clicking outside
  document.addEventListener("click", (e) => {
    if (menuPopup && menuPopup.classList.contains("active")) {
      if (!menuPopup.contains(e.target) && !floatBtn.contains(e.target)) {
        menuPopup.classList.remove("active");
      }
    }
  });
});

// SUPPORT CHAT WIDGET LOGIC
document.addEventListener("DOMContentLoaded", () => {
  const chatBtn = document.getElementById("support-chat-btn");
  const chatModal = document.getElementById("support-chat-modal");
  const closeBtn = document.getElementById("close-support-chat");
  const chatForm = document.getElementById("support-chat-form");
  const successMsg = document.getElementById("chat-success-msg");

  if (!chatBtn || !chatModal || !chatForm) return;

  chatBtn.addEventListener("click", () => {
    chatModal.classList.toggle("active");
  });

  closeBtn.addEventListener("click", () => {
    chatModal.classList.remove("active");
  });

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("chat-name").value.trim();
    const whatsapp = document.getElementById("chat-whatsapp").value.trim();
    const message = document.getElementById("chat-message").value.trim();

    if (!name || !whatsapp || !message) return;

    try {
      const btn = chatForm.querySelector("button[type='submit']");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      btn.disabled = true;

      await addDoc(collection(firestore, "support_messages"), {
        name,
        whatsapp,
        message,
        status: "unread",
        timestamp: serverTimestamp()
      });

      chatForm.style.display = "none";
      successMsg.style.display = "block";

      setTimeout(() => {
        chatModal.classList.remove("active");
        setTimeout(() => {
          chatForm.reset();
          chatForm.style.display = "block";
          successMsg.style.display = "none";
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 300);
      }, 3000);

    } catch (err) {
      console.error("Support message error:", err);
      alert("Failed to send message. Please try again.");
      chatForm.querySelector("button[type='submit']").disabled = false;
    }
  });
});

// LOAD SPONSORS
document.addEventListener("DOMContentLoaded", () => {
  const sponsorsGrid = document.getElementById("public-sponsors-grid");
  if (!sponsorsGrid) return;

  import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(({ getDocs, collection, query, orderBy }) => {
    const q = query(collection(firestore, "sponsors"), orderBy("timestamp", "desc"));
    getDocs(q).then(snapshot => {
      if (snapshot.empty) {
        sponsorsGrid.innerHTML = `<p style="color: var(--text-light);">We are currently accepting sponsors!</p>`;
        return;
      }
      let html = '';
      let index = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const baseZIndex = snapshot.size - index;
        const marginLeft = index === 0 ? '0' : '-20px';
        const innerContent = `
          <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); display: flex; align-items: center; justify-content: center; padding: 14px; border: 4px solid #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); transition: transform 0.3s ease;">
            <img src="${data.logoUrl}" alt="${data.name}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          </div>
        `;
        
        if (data.url) {
          html += `
            <a href="${data.url}" target="_blank" rel="noopener noreferrer" style="background: transparent; display: flex; align-items: center; justify-content: center; text-decoration: none; margin-left: ${marginLeft}; z-index: ${baseZIndex}; position: relative; transition: z-index 0s, transform 0.3s ease;" onmouseover="this.style.zIndex='1000'; this.style.transform='translateY(-5px)'" onmouseout="this.style.zIndex='${baseZIndex}'; this.style.transform='translateY(0)'">
              ${innerContent}
            </a>
          `;
        } else {
          html += `
            <div style="background: transparent; display: flex; align-items: center; justify-content: center; margin-left: ${marginLeft}; z-index: ${baseZIndex}; position: relative; transition: z-index 0s, transform 0.3s ease;" onmouseover="this.style.zIndex='1000'; this.style.transform='translateY(-5px)'" onmouseout="this.style.zIndex='${baseZIndex}'; this.style.transform='translateY(0)'">
              ${innerContent}
            </div>
          `;
        }
        index++;
      });
      sponsorsGrid.innerHTML = html;
    }).catch(err => {
      console.error("Failed to load sponsors:", err);
      sponsorsGrid.innerHTML = `<p style="color: var(--text-light);">Unable to load sponsors at this time.</p>`;
    });
  });
});

// 3D MATRIX BINARY ANIMATION
function initMatrixAnimation() {
  const canvas = document.getElementById("matrix-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  let width, height;
  function resize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  const particles = [];
  const maxParticles = window.innerWidth < 768 ? 20 : 45;
  
  class MatrixParticle {
    constructor() {
      this.reset(true);
    }
    
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + Math.random() * 100;
      this.speed = Math.random() * 1.5 + 0.5;
      this.val = Math.random() > 0.5 ? '1' : '0';
      this.size = Math.random() * 10 + 8;
      this.alpha = Math.random() * 0.3 + 0.05;
      this.trailLength = Math.random() * 150 + 50;
    }
    
    update() {
      this.y -= this.speed;
      if (Math.random() < 0.03) {
        this.val = Math.random() > 0.5 ? '1' : '0'; // Glitch effect
      }
      if (this.y < -this.trailLength) {
        this.reset();
      }
    }
    
    draw(ctx) {
      // Draw glowing trail
      const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.trailLength);
      gradient.addColorStop(0, `rgba(37, 99, 235, ${this.alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(37, 99, 235, 0)`);
      
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + this.trailLength);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw binary character
      ctx.font = `bold ${this.size}px monospace`;
      ctx.fillStyle = `rgba(37, 99, 235, ${this.alpha + 0.2})`;
      ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
      ctx.shadowBlur = 3;
      ctx.fillText(this.val, this.x - this.size/3, this.y);
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < maxParticles; i++) {
    particles.push(new MatrixParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw(ctx);
    });
    requestAnimationFrame(animate);
  }
  
  animate();
}

document.addEventListener("DOMContentLoaded", () => {
  initMatrixAnimation();
});
