import React from 'react';

export default function SemesterGroupNode({ data }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      borderRadius: '24px',
      position: 'relative',
      pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '24px',
        color: 'var(--text-secondary)',
        fontSize: '16px',
        fontWeight: '700',
        letterSpacing: '1.5px',
        textTransform: 'uppercase'
      }}>
        {data.label}
      </div>
    </div>
  );
}
