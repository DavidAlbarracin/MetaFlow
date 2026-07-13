import { useState, useEffect, useRef } from 'react';

export type ConfirmEventDetail = {
  message: string;
  description?: string;
};

let resolveConfirm: ((value: boolean) => void) | null = null;

export function showConfirm(message: string, description?: string): Promise<boolean> {
  const event = new CustomEvent('metaflow-confirm', {
    detail: { message, description }
  });
  window.dispatchEvent(event);
  return new Promise((resolve) => {
    resolveConfirm = resolve;
  });
}

export function ConfirmDialog() {
  const [message, setMessage] = useState('');
  const [description, setDescription] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const handleConfirm = (e: Event) => {
      const customEvent = e as CustomEvent<ConfirmEventDetail>;
      if (!customEvent.detail) return;
      const { message, description } = customEvent.detail;
      setMessage(message);
      setDescription(description || '');
      dialogRef.current?.showModal();
    };

    window.addEventListener('metaflow-confirm', handleConfirm);
    return () => {
      window.removeEventListener('metaflow-confirm', handleConfirm);
    };
  }, []);

  const handleClose = (value: boolean) => {
    dialogRef.current?.close();
    if (resolveConfirm) {
      resolveConfirm(value);
      resolveConfirm = null;
    }
  };

  return (
    <dialog
      ref={dialogRef}
      style={{
        padding: '24px',
        maxWidth: '400px',
        width: '90%'
      }}
      onCancel={() => handleClose(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
          {message}
        </h3>
        {description && (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            {description}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => handleClose(false)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => handleClose(true)}
            style={{ 
              padding: '8px 16px', 
              fontSize: '13px',
              backgroundColor: message.toLowerCase().includes('eliminar') ? '#ef4444' : 'var(--primary)',
              boxShadow: message.toLowerCase().includes('eliminar') ? '0 4px 14px 0 rgba(239, 68, 68, 0.35)' : 'var(--shadow-glow)'
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </dialog>
  );
}
