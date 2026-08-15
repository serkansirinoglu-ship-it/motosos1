export {};

declare global {
  interface Window {
    __openAuthModal?: () => void;
  }
}