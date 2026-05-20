/**
 * Application entry point. Mounts the React tree into the #root DOM node
 * provided by index.html. StrictMode enables extra development-time warnings.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
