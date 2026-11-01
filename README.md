# HatchPoint Innovations Challenge Core Architecture

This document provides an overview of the three core JavaScript files that power the HatchPoint platform: `app.js`, `admin.js`, and `register.js`.

## 1. `app.js` (Public Interface & Core Data)
`app.js` is the engine behind the public-facing landing page. It manages state, routing, and real-time data synchronization with Firebase.

**Key Responsibilities:**
*   **Firebase Initialization:** Connects to Firestore with offline persistence enabled.
*   **View Routing:** Manages navigation between different sections (`home`, `news`, `resources`, `showcase`) without page reloads.
*   **Real-time Data Sync:** Uses `onSnapshot` listeners to pull and cache dynamic content:
    *   **Tracks:** Thematic categories for projects.
    *   **Features & Timeline:** Hackathon schedule and key platform features.
    *   **News & Resources:** Articles, announcements, and downloadable templates.
    *   **Showcase:** Approved projects displayed to the public.
*   **Dynamic UI Rendering:** Re-renders DOM elements when Firestore data changes, falling back to static constants if the database is empty or offline.
*   **Client-Side Caching (IndexedDB):** Implements a robust caching layer (`HatchPointCacheDB`) using IndexedDB to ensure the site remains highly available and loads instantly even under heavy traffic.
*   **Interactive Components:** Manages the live countdown timer, modals, toast notifications, and dynamic header statistics.

## 2. `admin.js` (Organizer Dashboard)
`admin.js` handles the secure administrative control panel used by organizers to manage the hackathon.

**Key Responsibilities:**
*   **Authentication & Authorization:** Handles login and secure organizer registration using Firebase Auth. Verifies that logging-in users have the `isAdmin` flag.
*   **Dashboard Routing:** Manages tab switching within the admin panel.
*   **Security & Settings:** 
    *   Toggles public registration on/off.
    *   Configures a hidden keyboard shortcut combo that organizers can use on the public site to quickly jump to the admin page.
*   **Content Management (CRUD):** 
    *   Monitors and manages submitted projects/applications (with desktop notification alerts for new submissions).
    *   Configures landing page statistics (manual vs. dynamic counts).
    *   Manages the timeline, news feed, custom registration fields, tracks, prizes, and legal documents.
*   **Analytics Tracking:** Displays real-time traffic statistics (page views, shared link clicks).

## 3. `register.js` (Application Portal)
`register.js` manages the core team registration workflow, ensuring robust data collection and file handling.

**Key Responsibilities:**
*   **Dynamic Form Generation:** Fetches and renders custom form fields configured by admins in real-time.
*   **Validation & Constraints:** Enforces word limits (1,000 words), file type restrictions (.pdf, .docx, .pptx), file size limits (2.5MB), and deadline cutoffs.
*   **Advanced File Handling:** 
    *   Provides a modern drag-and-drop file upload UI.
    *   Implements **client-side GZIP compression** using the `CompressionStream` API before converting documents to Base64 data URLs. This minimizes payload size and storage costs.
*   **Analytics Instrumentation:** Automatically logs page visits and referral traffic sources.
*   **Browser Enforcement:** Detects Samsung Internet and strongly encourages users to switch to Google Chrome to ensure full compatibility with advanced features like `CompressionStream`.
*   **Submission & Safety:** Submits team data to Firestore, checks for duplicate team names, and handles gracefully if the registration deadline is dynamically toggled closed during submission.
