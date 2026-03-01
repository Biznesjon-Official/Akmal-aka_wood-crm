import { useState, useEffect } from 'react';
import { message } from 'antd';
import { checkAuthStatus, verifyPin, setupPin } from '../api';
import { translations } from '../i18n/translations';
const tl = (key) => { const lang = localStorage.getItem('lang') || 'uz'; return translations[lang]?.[key] ?? translations.uz[key] ?? key; };

const BTN = {
  width: 72, height: 72, borderRadius: '50%', fontSize: 24, fontWeight: 600,
  border: 'none', background: '#f0f0f0', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', userSelect: 'none',
  WebkitTapHighlightColor: 'transparent', transition: 'background 0.1s',
};
const BTN_DEL = { ...BTN, background: 'transparent', fontSize: 20, color: '#666' };
const BTN_EMPTY = { ...BTN, background: 'transparent', cursor: 'default' };

export default function PinLock({ onUnlock }) {
  const [mode, setMode] = useState('loading'); // loading | login | setup | confirm
  const [pin, setPin] = useState('');
  const [setupFirst, setSetupFirst] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    checkAuthStatus().then(({ hasPin }) => {
      setMode(hasPin ? 'login' : 'setup');
    });
  }, []);

  const doShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) setTimeout(() => handleSubmit(next), 150);
  };

  const handleDel = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async (code) => {
    if (mode === 'login') {
      try {
        await verifyPin(code);
        sessionStorage.setItem('auth', '1');
        onUnlock();
      } catch {
        doShake();
        setPin('');
        message.error(tl('pinWrong'));
      }
    } else if (mode === 'setup') {
      setSetupFirst(code);
      setMode('confirm');
      setPin('');
    } else if (mode === 'confirm') {
      if (code !== setupFirst) {
        doShake();
        setPin('');
        message.error(tl('pinMismatch'));
        setMode('setup');
        setSetupFirst('');
      } else {
        try {
          await setupPin(code, undefined);
          sessionStorage.setItem('auth', '1');
          onUnlock();
        } catch {
          message.error('Xatolik');
          setPin('');
        }
      }
    }
  };

  if (mode === 'loading') return null;

  const dots = Array.from({ length: 4 }, (_, i) => (
    <div key={i} style={{
      width: 16, height: 16, borderRadius: '50%',
      background: i < pin.length ? '#1677ff' : '#d9d9d9',
      transition: 'background 0.15s',
    }} />
  ));

  const title = mode === 'login' ? tl('pinTitle') : mode === 'setup' ? tl('pinSetup') : tl('pinConfirm');

  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    [null,'0','del'],
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, gap: 32,
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#333' }}>{title}</div>

      <div style={{
        display: 'flex', gap: 20,
        animation: shake ? 'pinShake 0.5s ease' : 'none',
      }}>
        {dots}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {keys.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 16 }}>
            {row.map((k, ki) => {
              if (k === null) return <div key={ki} style={BTN_EMPTY} />;
              if (k === 'del') return (
                <button key={ki} style={BTN_DEL} onClick={handleDel}>⌫</button>
              );
              return (
                <button key={ki} style={BTN}
                  onMouseDown={e => e.currentTarget.style.background = '#d0d0d0'}
                  onMouseUp={e => e.currentTarget.style.background = '#f0f0f0'}
                  onTouchStart={e => e.currentTarget.style.background = '#d0d0d0'}
                  onTouchEnd={e => { e.currentTarget.style.background = '#f0f0f0'; handleDigit(k); }}
                  onClick={() => handleDigit(k)}
                >{k}</button>
              );
            })}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pinShake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
      `}</style>
    </div>
  );
}
