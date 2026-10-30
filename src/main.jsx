import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CartProvider } from './contexts/CartContext';
createRoot(document.getElementById('root')).render(<StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <SettingsProvider>
                  <WishlistProvider>
                    <CartProvider>
                      <App />
                    </CartProvider>
                  </WishlistProvider>
                </SettingsProvider>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>);
