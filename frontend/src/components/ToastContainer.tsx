import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'info') {
  const event = new CustomEvent('metaflow-toast', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>;
      if (!customEvent.detail) return;
      const { message, type } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    window.addEventListener('metaflow-toast', handleToast);
    return () => {
      window.removeEventListener('metaflow-toast', handleToast);
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✗'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
