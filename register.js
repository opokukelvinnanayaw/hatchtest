import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, getDocs, collection, onSnapshot, addDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 1. Firebase Config
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
const storage = getStorage(app);

// Prevent pinch-to-zoom using standard gesture events
document.addEventListener("gesturestart", (e) => {
  e.preventDefault();
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
window.addEventListener("DOMContentLoaded", trackSiteAnalytics);




// State cache
let activeCustomFields = [];
let allTracks = [];

// Error Message Cleaner
function getCleanErrorMessage(err) {
  if (!err) return "An unknown error occurred.";
  if (err.code === "permission-denied" || (err.message && err.message.includes("permission-denied"))) {
    return "Permission denied. Please verify input parameters or contact organizers.";
  }
  if (err.code === "storage/unauthorized" || (err.message && err.message.includes("unauthorized"))) {
    return "File upload rejected. Please verify the file is under 10MB and is a valid document (.pdf, .docx, .pptx).";
  }
  let msg = err.message || String(err);
  if (msg.startsWith("Firebase: ")) {
    msg = msg.replace(/^Firebase:\s*(Error\s*)?(\([^)]+\))?:?\s*/, "");
  }
  return msg;
}

// DOM elements
const teamRegistrationForm = document.getElementById("team-registration-form");
const dynamicFieldsContainer = document.getElementById("dynamic-custom-fields-container");
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

// Render dynamic custom coordinator fields
function renderPublicCustomFields() {
  if (!dynamicFieldsContainer) return;
  if (activeCustomFields.length === 0) {
    dynamicFieldsContainer.innerHTML = "";
    return;
  }

  dynamicFieldsContainer.innerHTML = `
    <div class="fal-reg-section" style="margin-top: 8px; padding-top: 24px; border-top: 1px solid var(--color-hairline-gray, #e5e7eb); border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
      <div class="fal-reg-section-header">
        <div class="fal-reg-section-title-group">
          <span class="fal-reg-section-index">04 / CUSTOM</span>
          <h3 class="fal-reg-section-title">Additional Organizer Requirements</h3>
        </div>
        <span style="font-family: var(--font-chivo-mono, monospace); font-size: 11px; color: var(--color-ash, #787882);">SUPPLEMENTARY FIELDS</span>
      </div>
      <div class="grid-2" style="gap: 16px;">
        ${activeCustomFields.map(field => `
          <div class="form-group ${field.type === 'text' ? 'custom-field-textarea-group' : ''}">
            <label for="custom-field-${field.key}">${field.label}</label>
            ${field.type === 'text'
              ? `<textarea id="custom-field-${field.key}" class="form-control" required placeholder="Enter ${field.label.toLowerCase()}" rows="3" style="resize: vertical; min-height: 80px;"></textarea>`
              : field.type === 'file'
              ? `<input type="file" id="custom-field-${field.key}" class="form-control" required accept=".docx,.pdf,.zip" style="padding-top: 8px;">`
              : `<input type="${field.type}" id="custom-field-${field.key}" class="form-control" required placeholder="Enter ${field.label.toLowerCase()}">`
            }
          </div>
        `).join("")}
      </div>
    </div>
  `;
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

// Render Select Tracks Element
function renderTracksSelect() {
  const selectEl = document.getElementById("reg-project-track");
  if (!selectEl) return;
  const visibleTracks = allTracks.filter(t => t.visible !== false);
  if (visibleTracks.length === 0) {
    selectEl.innerHTML = `
      <option value="" selected>Open Track (Open to all innovations)</option>
      <option value="clean-energy">Clean Energy & Environment</option>
      <option value="fintech">Fintech & Financial Inclusion</option>
      <option value="healthtech">Healthcare & MedTech</option>
    `;
  } else {
    selectEl.innerHTML = `
      <option value="" selected>Open Track (Open to all innovations)</option>
      ` + visibleTracks.map(t => `<option value="${t.id}">${t.name}</option>`).join("") + `
    `;
  }
}

// Robust Caching: Load from IndexedDB immediately on startup
getCachedData("tracks_cache").then(cachedTracks => {
  if (cachedTracks) {
    allTracks = cachedTracks;
    renderTracksSelect();
  }
});

const urlParams = new URLSearchParams(window.location.search);
const targetFormId = urlParams.get("formId");
const formCacheKey = targetFormId ? `form_config_cache_${targetFormId}` : "form_config_cache";

getCachedData(formCacheKey).then(cachedConfig => {
  if (cachedConfig) {
    activeCustomFields = cachedConfig.customFields || [];
    window.registrationClosed = cachedConfig.registrationClosed || false;
    renderPublicCustomFields();
  }
});

// Real-Time Listeners: Sync and update cache
let regSwapToLeaderboard = false;
let regShowLeaderboardWidget = false;

function syncRegisterPageLeaderboardLink() {
  const regNavLbLink = document.getElementById("reg-nav-leaderboard-link");
  if (regNavLbLink) {
    regNavLbLink.style.display = (regSwapToLeaderboard || regShowLeaderboardWidget) ? "" : "none";
  }
}

onSnapshot(doc(firestore, "config", "registration_form"), (snapshot) => {
  let registrationClosed = false;
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (!targetFormId) {
      activeCustomFields = data.customFields || [];
    }
    registrationClosed = data.registrationClosed || false;
    regSwapToLeaderboard = data.swapNavToLeaderboard === true;
    
    if (!targetFormId) {
      setCachedData(formCacheKey, data);
    } else {
      // Still cache global registration status separately if needed,
      // but the main concern is window.registrationClosed
    }
  } else {
    if (!targetFormId) {
      activeCustomFields = [];
    }
    regSwapToLeaderboard = false;
  }
  window.registrationClosed = registrationClosed;
  syncRegisterPageLeaderboardLink();
  if (!targetFormId) renderPublicCustomFields();
});

if (targetFormId) {
  onSnapshot(doc(firestore, "forms", targetFormId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      activeCustomFields = data.customFields || [];
      // Inherit global registrationClosed
      data.registrationClosed = window.registrationClosed;
      setCachedData(formCacheKey, data);
    } else {
      activeCustomFields = [];
    }
    renderPublicCustomFields();
  });
}

// Watch challenge tracks dynamically
onSnapshot(collection(firestore, "tracks"), (snapshot) => {
  allTracks = [];
  snapshot.forEach(d => {
    allTracks.push({ id: d.id, ...d.data() });
  });
  setCachedData("tracks_cache", allTracks);
  renderTracksSelect();
});

// Helper: get word count
function getWordCount(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Form submission handler
if (teamRegistrationForm) {
  teamRegistrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Lock submit button during processing
    const submitBtn = teamRegistrationForm.querySelector("button[type='submit']");
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Submit Team Registration";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    }

    try {
      // 1. Check registration deadline toggle status
      if (window.registrationClosed === true) {
        throw new Error("Registration is closed. The deadline has passed.");
      }

      const teamName = document.getElementById("reg-team-name").value.trim();
      const track = document.getElementById("reg-project-track").value;
      const summaryNote = document.getElementById("reg-summary-note").value.trim();
      const summaryWordCount = getWordCount(summaryNote);
      if (summaryWordCount > 1000) {
        throw new Error("Project summary note exceeds the 1,000-word limit.");
      }

      const docxFileInput = document.getElementById("reg-concept-note");
      const docxFile = docxFileInput ? docxFileInput.files[0] : null;

      if (docxFile) {
        const allowedExtensions = [".docx", ".pptx", ".pdf"];
        const fileExt = docxFile.name.substring(docxFile.name.lastIndexOf(".")).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
          throw new Error("Proposal document must be a .docx, .pptx, or .pdf file.");
        }
        
        // Enforce max upload size limit of 2.5MB
        const maxFileSize = 2.5 * 1024 * 1024;
        if (docxFile.size > maxFileSize) {
          throw new Error("File is too large. Maximum allowed size is 2.5MB.");
        }
      } else {
        throw new Error("Please select a concept file to upload.");
      }

      // 2. Traffic-proof optimization: check if team document exists by specific key
      const projId = `p-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
      const projectSnap = await getDoc(doc(firestore, "projects", projId));
      if (projectSnap.exists()) {
        throw new Error("Team name already exists.");
      }

      const membersContainer = document.getElementById("members-container");
      const memberCards = membersContainer ? membersContainer.querySelectorAll(".registration-member-card") : document.querySelectorAll(".registration-member-card");
      
      const members = [];
      const emails = [];
      const contacts = [];

      memberCards.forEach((card) => {
        const inputs = card.querySelectorAll("input");
        if (inputs.length >= 3) {
          const nameVal = inputs[0].value.trim();
          const emailVal = inputs[1].value.trim().toLowerCase();
          let contactVal = inputs[2].value.trim();
          if (contactVal === "+233") contactVal = "";

          if (nameVal && emailVal) {
            members.push(nameVal);
            emails.push(emailVal);
            contacts.push(contactVal);
          }
        }
      });

      if (members.length < 3) {
        throw new Error("A minimum of 3 team members is required for registration.");
      }
      if (members.length > 5) {
        throw new Error("A maximum of 5 team members is allowed per team.");
      }

      const uniqueEmails = new Set(emails);
      if (uniqueEmails.size !== emails.length) {
        throw new Error("Each team member must have a unique email address.");
      }

      const customFields = {};
      for (const field of activeCustomFields) {
        const inputEl = document.getElementById(`custom-field-${field.key}`);
        if (inputEl) {
          if (field.type === 'file') {
            if (inputEl.files && inputEl.files.length > 0) {
              const customFile = inputEl.files[0];
              const maxFileSize = 4 * 1024 * 1024; // 4MB limit for custom files
              if (customFile.size > maxFileSize) {
                throw new Error(`File for "${field.label}" is too large. Max allowed size is 4MB.`);
              }
              showToast(`Compressing ${field.label}...`, "info");
              const compressedBuffer = await compressFileGzip(customFile);
              if (compressedBuffer) {
                customFields[field.label] = await bufferToBase64Gzip(compressedBuffer);
              } else {
                customFields[field.label] = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = () => reject(new Error(`File reading failed for ${field.label}.`));
                  reader.readAsDataURL(customFile);
                });
              }
            } else {
              customFields[field.label] = ""; // Should be blocked by HTML 'required' attribute anyway
            }
          } else {
            customFields[field.label] = inputEl.value.trim();
          }
        }
      }
      
      // File encoding logic
      showToast("Compressing and encoding proposal file...", "info");
      if (window.__updateUploadProgress) window.__updateUploadProgress(30);

      let conceptNoteUrl;
      const compressedBuffer = await compressFileGzip(docxFile);
      if (compressedBuffer) {
        conceptNoteUrl = await bufferToBase64Gzip(compressedBuffer);
      } else {
        // Fallback to uncompressed base64 if CompressionStream is unsupported
        conceptNoteUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(new Error("File reading failed."));
          reader.readAsDataURL(docxFile);
        });
      }

      if (window.__updateUploadProgress) window.__updateUploadProgress(70);

      const newProj = {
        teamName,
        title: `${teamName} Registration`,
        track,
        summaryNote,
        leadEmail: emails[0],
        members,
        emails,
        contacts,
        conceptNoteName: docxFile.name,
        conceptNoteUrl: conceptNoteUrl,
        conceptNoteType: docxFile.name.substring(docxFile.name.lastIndexOf(".") + 1).toUpperCase(),
        customFields,
        status: "Pending",
        scores: {},
        judgeComments: "",
        averageScore: null,
        timestamp: Date.now()
      };

      showToast("Submitting team registration...", "info");
      await setDoc(doc(firestore, "projects", projId), newProj);

      if (window.__updateUploadProgress) window.__updateUploadProgress(100);
      showToast("Team registration submitted successfully!", "success");
      
      // Reset form and redirect
      setTimeout(() => {
        if (window.__hideUploadProgress) window.__hideUploadProgress();
        teamRegistrationForm.reset();
        window.location.href = "success.html";
      }, 1500);

    } catch (err) {
      console.error("Registration failed:", err);
      showToast(getCleanErrorMessage(err), "error");
      if (window.__hideUploadProgress) window.__hideUploadProgress();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Team Registration →';
      }
    }
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

// Run detection
window.addEventListener("DOMContentLoaded", () => {
  checkBrowserAndEnforceChrome();

  // === Rules & Guidelines Modal Logic ===
  const rulesModal = document.getElementById("rules-modal");
  const rulesToggle = document.getElementById("rules-agree-toggle");
  const registerCard = document.getElementById("register-card");
  const btnShowRules = document.getElementById("btn-show-rules");

  if (rulesModal && rulesToggle && registerCard) {
    // Initial state setup
    rulesToggle.checked = false;

    rulesToggle.addEventListener("change", () => {
      if (rulesToggle.checked) {
        // Wait 250ms for toggle animation to complete before hiding the modal
        setTimeout(() => {
          rulesModal.classList.remove("active");
          registerCard.classList.remove("hidden");
          registerCard.classList.add("visible");
        }, 250);
      } else {
        // Hide registration form if unchecked
        registerCard.classList.remove("visible");
        registerCard.classList.add("hidden");
        rulesModal.classList.add("active");
      }
    });

    if (btnShowRules) {
      btnShowRules.addEventListener("click", () => {
        // Open modal again with checkbox checked
        rulesToggle.checked = true;
        rulesModal.classList.add("active");
      });
    }
  }

  // === File Upload – premium drop-zone with info chip + progress bar ===
  const fileInput   = document.getElementById("reg-concept-note");
  const uploadZone  = document.getElementById("file-upload-zone");
  const idleEl      = document.getElementById("file-upload-idle");
  const infoEl      = document.getElementById("file-upload-info");
  const typeIconEl  = document.getElementById("file-upload-type-icon");
  const nameEl      = document.getElementById("file-upload-name");
  const sizeEl      = document.getElementById("file-upload-size");
  const removeBtn   = document.getElementById("file-upload-remove");
  const progressWrap = document.getElementById("upload-progress-wrap");
  const progressBar  = document.getElementById("upload-progress-bar");
  const progressLbl  = document.getElementById("upload-progress-label");

  // File type icon class + FA icon mapping
  const typeMap = {
    pdf:  { cls: "pdf",  icon: "fa-file-pdf" },
    docx: { cls: "docx", icon: "fa-file-word" },
    doc:  { cls: "docx", icon: "fa-file-word" },
    pptx: { cls: "pptx", icon: "fa-file-powerpoint" },
    ppt:  { cls: "pptx", icon: "fa-file-powerpoint" }
  };

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function showFileInfo(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const map = typeMap[ext] || { cls: "", icon: "fa-file" };

    // Set type-icon style
    typeIconEl.className = `file-upload-type-icon ${map.cls}`;
    typeIconEl.innerHTML = `<i class="fa-solid ${map.icon}"></i>`;

    nameEl.textContent = file.name;
    sizeEl.textContent = formatBytes(file.size);

    // Switch display
    if (idleEl) idleEl.style.display = "none";
    if (infoEl) infoEl.style.display = "flex";
    uploadZone.classList.add("file-selected");

    showToast(`✅ File ready: ${file.name}`, "success");
  }

  function clearFileSelection() {
    if (fileInput) fileInput.value = "";
    if (idleEl) idleEl.style.display = "flex";
    if (infoEl) infoEl.style.display = "none";
    uploadZone.classList.remove("file-selected");
    if (progressWrap) progressWrap.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";
    if (progressLbl) progressLbl.textContent = "0%";
  }

  if (fileInput && uploadZone) {
    // Open file selection when clicking the drop zone (fixes iOS Safari tap issue)
    uploadZone.addEventListener("click", (e) => {
      if (uploadZone.classList.contains("file-selected")) return;
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        showFileInfo(file);
      } else {
        clearFileSelection();
      }
    });

    // Drag-over / drag-leave / drop visual feedback
    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("drag-over");
    });
    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("drag-over");
    });
    uploadZone.addEventListener("drop", (e) => {
      uploadZone.classList.remove("drag-over");
      // Let the browser assign the dropped file to the input naturally
      setTimeout(() => {
        if (fileInput.files[0]) showFileInfo(fileInput.files[0]);
      }, 50);
    });
  }

  // Remove × button
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearFileSelection();
    });
  }

  // Expose progress bar updater for use in submit handler
  window.__updateUploadProgress = (pct) => {
    if (progressWrap) progressWrap.style.display = "flex";
    if (progressBar) progressBar.style.width = pct + "%";
    if (progressLbl) progressLbl.textContent = pct + "%";
  };
  window.__hideUploadProgress = () => {
    if (progressWrap) progressWrap.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";
    if (progressLbl) progressLbl.textContent = "0%";
  };
  
  // Live word counter for Summary Note
  const summaryInput = document.getElementById("reg-summary-note");
  const wordCountBadge = document.getElementById("summary-word-count");
  if (summaryInput && wordCountBadge) {
    summaryInput.addEventListener("input", () => {
      const words = summaryInput.value;
      const count = getWordCount(words);
      wordCountBadge.textContent = `${count} / 1000 words`;
      if (count > 1000) {
        wordCountBadge.style.color = "var(--danger)";
        wordCountBadge.style.fontWeight = "700";
      } else {
        wordCountBadge.style.color = "var(--text-light)";
        wordCountBadge.style.fontWeight = "400";
      }
    });
  }
});

// Helper: Compress file to gzip buffer
async function compressFileGzip(file) {
  if (typeof CompressionStream === "undefined") {
    console.warn("CompressionStream not supported. Uploading raw file.");
    return null;
  }
  try {
    const stream = file.stream();
    const compressionStream = new CompressionStream("gzip");
    const compressedStream = stream.pipeThrough(compressionStream);
    const response = new Response(compressedStream);
    return await response.arrayBuffer();
  } catch (err) {
    console.error("Compression failed:", err);
    return null;
  }
}

// Helper: Convert ArrayBuffer to gzip Data URL
async function bufferToBase64Gzip(buffer) {
  const blob = new Blob([buffer], { type: "application/gzip" });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Admin shortcut listener
let adminShortcutCombo = JSON.parse(localStorage.getItem("adminShortcutCombo") || "[]");
let pressedGlobalKeys = new Set();
onSnapshot(doc(firestore, "config", "admin_settings"), (snapshot) => {
  if (snapshot.exists()) {
    adminShortcutCombo = snapshot.data().shortcutCombo || [];
    localStorage.setItem("adminShortcutCombo", JSON.stringify(adminShortcutCombo));
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

// Mobile tap support for track tooltip
const trackInfoIcon = document.getElementById("track-info-icon");
if (trackInfoIcon) {
  trackInfoIcon.addEventListener("click", () => {
    showToast("Tracks allow you to align your project with a specific industry theme for specialized judging and prizes. If your innovation doesn't fit a specific category, select 'Open Track'.", "info");
  });
}

// --- Dynamic Team Member Management (3 to 5 members) ---
const maxMembers = 5;
const minMembers = 3;

function updateMemberCountUI() {
  const membersContainer = document.getElementById("members-container");
  const btnAddMember = document.getElementById("btn-add-member");
  const memberCountBadge = document.getElementById("member-count-badge");
  
  if (!membersContainer) return;
  const cards = membersContainer.querySelectorAll(".registration-member-card");
  const count = cards.length;

  if (memberCountBadge) {
    memberCountBadge.textContent = count;
  }

  if (btnAddMember) {
    if (count >= maxMembers) {
      btnAddMember.style.display = "none";
    } else {
      btnAddMember.style.display = "inline-flex";
    }
  }

  cards.forEach((card, idx) => {
    const num = idx + 1;
    card.id = `member-card-${num}`;
    
    const headerTitle = card.querySelector(".member-card-title");
    if (headerTitle) {
      if (num === 1) {
        headerTitle.innerHTML = '<i class="fa-solid fa-user-gear"></i> Member 1 (Team Lead)';
      } else {
        headerTitle.innerHTML = `<i class="fa-solid fa-user"></i> Member ${num}`;
      }
      headerTitle.style.removeProperty("color");
    }

    let removeBtn = card.querySelector(".btn-remove-member");
    if (num > minMembers) {
      if (!removeBtn) {
        const headerDiv = card.querySelector(".member-card-header") || card.querySelector("h4");
        if (headerDiv) {
          if (headerDiv.tagName.toLowerCase() === "h4") {
            const wrap = document.createElement("div");
            wrap.className = "member-card-header";
            headerDiv.parentNode.insertBefore(wrap, headerDiv);
            wrap.appendChild(headerDiv);
            removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "btn-remove-member";
            removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Remove';
            wrap.appendChild(removeBtn);
          } else {
            removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "btn-remove-member";
            removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Remove';
            headerDiv.appendChild(removeBtn);
          }
        }
      }
      if (removeBtn) {
        removeBtn.style.display = "inline-flex";
        removeBtn.onclick = function() { removeMemberCard(num); };
      }
    } else {
      if (removeBtn) {
        removeBtn.style.display = "none";
      }
    }
  });
}

window.removeMemberCard = function(memberNum) {
  const card = document.getElementById(`member-card-${memberNum}`);
  if (card) {
    card.remove();
    updateMemberCountUI();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const btnAddMember = document.getElementById("btn-add-member");
  const membersContainer = document.getElementById("members-container");

  if (btnAddMember && membersContainer) {
    btnAddMember.addEventListener("click", () => {
      const cards = membersContainer.querySelectorAll(".registration-member-card");
      if (cards.length >= maxMembers) {
        if (typeof showToast === 'function') showToast("Maximum of 5 members allowed per team.", "warning");
        return;
      }
      const newNum = cards.length + 1;
      const newCard = document.createElement("div");
      newCard.className = "registration-member-card";
      newCard.id = `member-card-${newNum}`;
      newCard.innerHTML = `
        <div class="member-card-header">
          <h4 class="member-card-title">
            <i class="fa-solid fa-user"></i> Member ${newNum}
            <span class="fal-member-role-tag fal-member-role-extra">CO-FOUNDER</span>
          </h4>
          <button type="button" class="btn-remove-member" onclick="removeMemberCard(${newNum})">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="reg-m${newNum}-name">Full Name</label>
            <input type="text" id="reg-m${newNum}-name" class="form-control" placeholder="Member ${newNum} Full Name" required>
          </div>
          <div class="form-group">
            <label for="reg-m${newNum}-email">Email Address</label>
            <input type="email" id="reg-m${newNum}-email" class="form-control" placeholder="member${newNum}@gmail.com" required>
          </div>
          <div class="form-group">
            <label for="reg-m${newNum}-contact">Contact Number</label>
            <input type="tel" id="reg-m${newNum}-contact" class="form-control" value="+233 " placeholder="+233 24 123 4567" required>
          </div>
        </div>
      `;
      membersContainer.appendChild(newCard);
      updateMemberCountUI();
    });
  }

  updateMemberCountUI();

  // === WHATSAPP FLOATING WIDGET LOGIC FOR REGISTER PAGE ===
  function initWhatsAppWidgetOnRegister() {
    const widgetContainer = document.getElementById("whatsapp-floating-widget");
    const floatBtn = document.getElementById("whatsapp-float-btn");
    const menuPopup = document.getElementById("whatsapp-menu-popup");
    const closePopupBtn = document.getElementById("close-whatsapp-popup");
    const joinGroupBtn = document.getElementById("whatsapp-popup-join-btn");
    const popupText = document.getElementById("whatsapp-popup-text");
    const tooltipBadge = document.getElementById("whatsapp-tooltip-badge");

    if (!widgetContainer || !floatBtn) return;

    let currentWaConfig = {
      enabled: true,
      mode: "popup",
      groupLink: "",
      label: "Join WhatsApp Group",
      welcomeText: "Join our official HatchPoint WhatsApp group for live updates, announcements, and direct community support!"
    };

    try {
      const docRef = doc(firestore, "settings", "whatsapp_widget");
      onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          currentWaConfig = { ...currentWaConfig, ...data };
        }
        updateUI();
      });
    } catch (e) {
      console.warn("Firestore WhatsApp sync fallback on register:", e);
      updateUI();
    }

    function updateUI() {
      if (currentWaConfig.enabled && currentWaConfig.groupLink) {
        widgetContainer.style.display = "block";
      } else {
        widgetContainer.style.display = "none";
        if (menuPopup) menuPopup.classList.remove("active");
        return;
      }
      if (tooltipBadge) tooltipBadge.textContent = currentWaConfig.label || "Join Group";
      if (popupText) popupText.textContent = currentWaConfig.welcomeText || "Join our official HatchPoint WhatsApp group for live updates, announcements, and direct community support!";
      if (joinGroupBtn && currentWaConfig.groupLink) joinGroupBtn.href = currentWaConfig.groupLink;

      if (typeof updateTikTokRegisterLayout === "function") {
        updateTikTokRegisterLayout();
      }
    }

    floatBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ttPopup = document.getElementById("tiktok-menu-popup");
      if (ttPopup) ttPopup.classList.remove("active");

      if (!currentWaConfig.groupLink) return;
      if (currentWaConfig.mode === "direct") {
        window.open(currentWaConfig.groupLink, "_blank", "noopener,noreferrer");
      } else if (menuPopup) {
        menuPopup.classList.toggle("active");
      }
    });

    if (closePopupBtn && menuPopup) {
      closePopupBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menuPopup.classList.remove("active");
      });
    }

    document.addEventListener("click", (e) => {
      if (menuPopup && menuPopup.classList.contains("active") && !widgetContainer.contains(e.target)) {
        menuPopup.classList.remove("active");
      }
    });
  }

  // === TIKTOK FLOATING WIDGET LOGIC FOR REGISTER PAGE ===
  let updateTikTokRegisterLayout = null;

  function initTikTokWidgetOnRegister() {
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
      welcomeText: "Follow our official TikTok for challenge highlights, backstage moments, participant pitch clips, and live event announcements!",
      position: "auto"
    };

    try {
      const docRef = doc(firestore, "settings", "tiktok_widget");
      onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          currentTikTokConfig = { ...currentTikTokConfig, ...data };
        }
        updateUI();
      });
    } catch (e) {
      console.warn("Firestore TikTok sync fallback on register:", e);
      updateUI();
    }

    function updateUI() {
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
        const waContainer = document.getElementById("whatsapp-floating-widget");
        const isWaOnRight = waContainer && 
          waContainer.style.display !== "none" && 
          !waContainer.classList.contains("position-left");
        
        if (isWaOnRight) {
          widgetContainer.classList.add("stacked-above-wa");
        } else {
          widgetContainer.classList.remove("stacked-above-wa");
        }
      }

      if (tooltipBadge) tooltipBadge.textContent = currentTikTokConfig.label || "Watch on TikTok";
      if (popupText) popupText.textContent = currentTikTokConfig.welcomeText || "Follow our official TikTok for challenge highlights, student pitches, backstage moments, and announcements!";
      if (watchBtn) watchBtn.href = currentTikTokConfig.accountLink || "#";
    }

    updateTikTokRegisterLayout = updateUI;

    floatBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const waPopup = document.getElementById("whatsapp-menu-popup");
      if (waPopup) waPopup.classList.remove("active");

      if (!currentTikTokConfig.accountLink) return;

      if (currentTikTokConfig.mode === "direct") {
        window.open(currentTikTokConfig.accountLink, "_blank", "noopener,noreferrer");
      } else if (menuPopup) {
        menuPopup.classList.toggle("active");
      }
    });

    if (watchBtn) {
      watchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentTikTokConfig.accountLink) {
          window.open(currentTikTokConfig.accountLink, "_blank", "noopener,noreferrer");
        }
      });
    }

    if (closePopupBtn && menuPopup) {
      closePopupBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menuPopup.classList.remove("active");
      });
    }

    document.addEventListener("click", (e) => {
      if (menuPopup && menuPopup.classList.contains("active") && !widgetContainer.contains(e.target)) {
        menuPopup.classList.remove("active");
      }
    });
  }

  initWhatsAppWidgetOnRegister();
  initTikTokWidgetOnRegister();

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

    document.addEventListener("touchstart", (e) => {
      if (isInputEl(e.target)) {
        hideForKeyboard();
      }
    }, { passive: true });

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

    let isScrollingTimer = null;
    let lastScrollY = window.scrollY;

    window.addEventListener("scroll", () => {
      if (!isMobile()) return;

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
});

// Live Registration Deadline Countdown Ticker for Registration Page
onSnapshot(doc(firestore, "config", "landing_stats"), (snapshot) => {
  let countdownTargetDate = null;
  if (snapshot.exists()) {
    const data = snapshot.data();
    regShowLeaderboardWidget = data.showLeaderboardWidget === true;
    if (data.countdownDate) {
      countdownTargetDate = data.countdownDate;
    }
  } else {
    regShowLeaderboardWidget = false;
  }
  syncRegisterPageLeaderboardLink();
  if (!countdownTargetDate) {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 18);
    countdownTargetDate = defaultDate.toISOString();
  }

  if (window.regCountdownIntervalId) clearInterval(window.regCountdownIntervalId);

  const targetTime = new Date(countdownTargetDate).getTime();
  const updateRegCountdown = () => {
    const now = Date.now();
    const diff = targetTime - now;

    const bannerTimer = document.getElementById("banner-cd-timer");
    const registerCdText = document.getElementById("register-cd-text");

    if (isNaN(targetTime) || diff <= 0) {
      if (bannerTimer) bannerTimer.textContent = "Registration Closed";
      if (registerCdText) registerCdText.textContent = "Registration Closed";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n) => n.toString().padStart(2, '0');
    const dayUnit = days === 1 ? "Day" : "Days";
    const formattedLiveStr = `${days} ${dayUnit}, ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s Left`;
    if (bannerTimer) bannerTimer.textContent = formattedLiveStr;
    if (registerCdText) registerCdText.textContent = formattedLiveStr;
  };

  updateRegCountdown();
  window.regCountdownIntervalId = setInterval(updateRegCountdown, 1000);
});
