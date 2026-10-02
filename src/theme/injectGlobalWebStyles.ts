import { Platform } from 'react-native';

/**
 * Injects sleek darkmode scrollbars and focus styles for React Native Web.
 * Safe to execute on native platforms (no-op).
 */
export function injectGlobalWebStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const STYLE_ID = 'devvault-global-web-styles';
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const css = `
    /* =========================================================
       DevVault Terminal Darkmode Custom Scrollbars
       ========================================================= */

    /* Universal scrollbar styling for modern browsers (Firefox, modern standards) */
    html, body, #root, * {
      scrollbar-width: thin;
      scrollbar-color: rgba(139, 148, 158, 0.28) transparent;
    }

    *:hover {
      scrollbar-color: rgba(88, 166, 255, 0.45) transparent;
    }

    /* WebKit browsers (Chrome, Edge, Safari, Opera) */
    ::-webkit-scrollbar {
      width: 7px;
      height: 7px;
      background-color: transparent;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background-color: rgba(139, 148, 158, 0.26);
      border-radius: 9999px;
      border: 2px solid transparent;
      background-clip: padding-box;
      transition: background-color 0.18s ease, box-shadow 0.18s ease;
    }

    ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(88, 166, 255, 0.65);
      border: 1px solid transparent;
      background-clip: padding-box;
      box-shadow: 0 0 8px rgba(88, 166, 255, 0.4);
    }

    ::-webkit-scrollbar-thumb:active {
      background-color: #58a6ff;
      border: 1px solid transparent;
      background-clip: padding-box;
      box-shadow: 0 0 12px rgba(88, 166, 255, 0.6);
    }

    ::-webkit-scrollbar-corner {
      background: transparent;
    }

    /* Code blocks horizontal & vertical scrollbars - compact terminal style */
    [data-code-block] ::-webkit-scrollbar,
    [data-code-block]::-webkit-scrollbar,
    pre::-webkit-scrollbar,
    code::-webkit-scrollbar {
      height: 5px;
      width: 5px;
    }

    [data-code-block] ::-webkit-scrollbar-thumb,
    [data-code-block]::-webkit-scrollbar-thumb {
      background-color: rgba(139, 148, 158, 0.22);
      border-radius: 9999px;
    }

    [data-code-block] ::-webkit-scrollbar-thumb:hover,
    [data-code-block]::-webkit-scrollbar-thumb:hover {
      background-color: rgba(88, 166, 255, 0.75);
      box-shadow: 0 0 8px rgba(88, 166, 255, 0.45);
    }

    /* =========================================================
       DevVault Search Fieldset Focus Outline & Form Resets
       ========================================================= */

    /* Outer search box container focus ring */
    [data-searchbar]:focus-within {
      border-color: #58a6ff !important;
      box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.25), 0 1px 3px rgba(0, 0, 0, 0.4) !important;
    }

    /* Eliminate ugly browser focus outline on the inner input element */
    [data-searchbar] input,
    [data-searchbar] input:focus {
      outline: none !important;
      outline-style: none !important;
      box-shadow: none !important;
      border: none !important;
    }

    /* Form input focus consistency across the app */
    input:focus,
    textarea:focus {
      outline: none;
    }

    /* Terminal text selection color */
    ::selection {
      background-color: rgba(88, 166, 255, 0.3);
      color: #f0f6fc;
    }

    /* =========================================================
       Electron Frameless Drag Region & Window Chrome
       ========================================================= */
    [data-drag-region="true"],
    [data-window-drag="true"] {
      -webkit-app-region: drag;
    }

    [data-no-drag="true"],
    [data-searchbar],
    input,
    textarea,
    button,
    a,
    select,
    [role="button"] {
      -webkit-app-region: no-drag;
    }

    /* macOS traffic light inset spacing when running in Electron with hiddenInset */
    html[data-electron="true"][data-electron-platform="darwin"] [data-drag-region="true"] {
      padding-left: 80px;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}
