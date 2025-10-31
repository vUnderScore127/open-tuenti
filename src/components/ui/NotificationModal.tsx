import React from 'react';

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
};

export default function NotificationModal({
  open,
  title,
  items,
  onClose,
}: {
  open: boolean;
  title: string;
  items: NotificationItem[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', width: 'min(640px, 90vw)', maxHeight: '80vh', borderRadius: 6, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 14, color: '#666', cursor: 'pointer' }}>Cerrar</button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 13, color: '#666' }}>No hay elementos para mostrar.</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((it) => (
                <li key={it.id} style={{ border: '1px solid #eee', borderRadius: 4, padding: '8px 10px', background: '#fafafa' }}>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{it.title}</div>
                  {it.description && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{it.description}</div>
                  )}
                  {it.timestamp && (
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{it.timestamp}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}