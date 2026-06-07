/**
 * Stream Chat React theme overrides for Edyfra. Extracted from StreamChatRoom
 * so it can be reused / unit-tested without dragging the whole component in.
 */
export const EDYFRA_CHAT_THEME_CSS = `
  .str-chat__theme-dark {
    --str-chat__primary-color: var(--primary, #06B6D4);
    --str-chat__background-core-elevation-0: transparent;
    --str-chat__background-core-elevation-1: rgba(10, 10, 10, 0.4);
    --str-chat__background-core-elevation-2: rgba(17, 17, 17, 0.6);
    --str-chat__background-core-elevation-3: rgba(26, 26, 26, 0.8);
    --str-chat__background-core-elevation-4: rgba(34, 34, 34, 0.9);
    --str-chat__font-family: var(--font-sans), system-ui;
    --str-chat__radius-md: 20px;
    --str-chat__radius-lg: 32px;
    --str-chat__text-primary: #ffffff;
    --str-chat__text-secondary: #94a3b8;
    --str-chat__border-radius-circle: 50%;
  }
  .str-chat__theme-light {
    --str-chat__primary-color: var(--primary, #06B6D4);
    --str-chat__background-core-elevation-0: transparent;
    --str-chat__background-core-elevation-1: rgba(255, 255, 255, 0.8);
    --str-chat__background-core-elevation-2: rgba(248, 250, 252, 0.9);
    --str-chat__background-core-elevation-3: rgba(255, 255, 255, 0.95);
    --str-chat__background-core-elevation-4: rgba(255, 255, 255, 0.98);
    --str-chat__font-family: var(--font-sans), system-ui;
    --str-chat__radius-md: 20px;
    --str-chat__radius-lg: 32px;
    --str-chat__text-primary: #0f172a;
    --str-chat__text-secondary: #64748b;
    --str-chat__border-radius-circle: 50%;
  }
  .edyfra-chat-wrapper { background: transparent; position: relative; }
  .str-chat__theme-dark .str-chat__message-list,
  .str-chat__theme-light .str-chat__message-list {
    background: var(--background, transparent);
    padding: 1.5rem;
    scrollbar-width: thin;
  }
  .str-chat__theme-dark .str-chat__message-list { scrollbar-color: rgba(255,255,255,0.1) transparent; }
  .str-chat__theme-light .str-chat__message-list { scrollbar-color: rgba(0,0,0,0.1) transparent; }
  .str-chat__theme-dark .str-chat__date-separator-line { border-color: rgba(255,255,255,0.05); }
  .str-chat__theme-light .str-chat__date-separator-line { border-color: rgba(0,0,0,0.05); }
  .str-chat__theme-dark .str-chat__date-separator-date,
  .str-chat__theme-light .str-chat__date-separator-date {
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #64748b;
  }
  .str-chat__message-simple-text-inner {
    border-radius: 1.75rem !important;
    padding: 0.85rem 1.35rem !important;
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.6;
    position: relative;
  }
  .str-chat__theme-dark .str-chat__message--me .str-chat__message-simple-text-inner,
  .str-chat__theme-light .str-chat__message--me .str-chat__message-simple-text-inner {
    background: linear-gradient(135deg, var(--primary, #06B6D4) 0%, #0891b2 100%) !important;
    color: white;
    border-bottom-right-radius: 6px !important;
  }
  .str-chat__theme-dark .str-chat__message--me .str-chat__message-simple-text-inner {
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
  }
  .str-chat__theme-light .str-chat__message--me .str-chat__message-simple-text-inner {
    border: 1px solid rgba(0,0,0,0.05);
    box-shadow: 0 10px 30px -10px rgba(6, 182, 212, 0.3);
  }
  .str-chat__theme-dark .str-chat__message--regular .str-chat__message-simple-text-inner {
    background: #111111 !important;
    border: 1px solid rgba(255,255,255,0.05);
    border-bottom-left-radius: 6px !important;
    color: #e2e8f0;
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
  }
  .str-chat__theme-light .str-chat__message--regular .str-chat__message-simple-text-inner {
    background: #f1f5f9 !important;
    border: 1px solid rgba(0,0,0,0.05);
    border-bottom-left-radius: 6px !important;
    color: #0f172a;
    box-shadow: 0 5px 15px -5px rgba(0,0,0,0.05);
  }
  .str-chat__message-simple__timestamp {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    opacity: 0.5;
  }
  .str-chat__theme-dark .str-chat__message-input {
    background: rgba(5, 5, 5, 0.8);
    backdrop-blur: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 1.25rem;
  }
  .str-chat__theme-light .str-chat__message-input {
    background: rgba(255, 255, 255, 0.8);
    backdrop-blur: 12px;
    border-top: 1px solid rgba(0,0,0,0.05);
    padding: 1.25rem;
  }
  .str-chat__theme-dark .str-chat__message-input-inner {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .str-chat__theme-light .str-chat__message-input-inner {
    background: #f8fafc;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .str-chat__message-input-inner {
    border-radius: 1.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 4px;
  }
  .str-chat__theme-dark .str-chat__message-input-inner:focus-within {
    border-color: var(--primary, #06B6D4);
    background: rgba(255,255,255,0.05);
    box-shadow: 0 0 30px -10px rgba(6, 182, 212, 0.3);
  }
  .str-chat__theme-light .str-chat__message-input-inner:focus-within {
    border-color: var(--primary, #06B6D4);
    background: #ffffff;
    box-shadow: 0 0 30px -10px rgba(6, 182, 212, 0.2);
  }
  .str-chat__textarea { background: transparent; font-size: 0.95rem; padding: 12px 16px; }
  .str-chat__theme-dark .str-chat__textarea { color: #ffffff; }
  .str-chat__theme-light .str-chat__textarea { color: #0f172a; }
  .str-chat__theme-dark .str-chat__header-livestream {
    background: rgba(10, 10, 10, 0.8);
    backdrop-blur: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding: 1.25rem 2rem;
  }
  .str-chat__theme-light .str-chat__header-livestream {
    background: rgba(255, 255, 255, 0.8);
    backdrop-blur: 20px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    padding: 1.25rem 2rem;
  }
  .str-chat__header-livestream-left-title {
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }
  .str-chat__theme-dark .str-chat__header-livestream-left-title { color: #ffffff; }
  .str-chat__theme-light .str-chat__header-livestream-left-title { color: #0f172a; }
  .edyfra-chat-wrapper ::-webkit-scrollbar { width: 4px; }
  .edyfra-chat-wrapper ::-webkit-scrollbar-track { background: transparent; }
  .edyfra-chat-wrapper ::-webkit-scrollbar-thumb {
    background: rgba(128,128,128,0.2);
    border-radius: 10px;
  }
  .edyfra-chat-wrapper ::-webkit-scrollbar-thumb:hover {
    background: var(--primary, #06B6D4);
  }
  .video-call-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    background: #000;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  /* Sleek backdrop behind the dynamic island pill */
  .edyfra-island-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    z-index: 30;
    pointer-events: none;
    background: linear-gradient(180deg,
      rgba(0,0,0,0.55) 0%,
      rgba(0,0,0,0.25) 40%,
      rgba(0,0,0,0) 100%);
    backdrop-filter: blur(8px);
  }
`;
