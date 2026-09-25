import React from 'react';

export interface DataPacketProps {
  isActive?: boolean;
  direction?: 'horizontal' | 'vertical';
  color?: 'cyan' | 'indigo' | 'emerald';
  className?: string;
}

export const DataPacket: React.FC<DataPacketProps> = ({
  isActive = false,
  direction = 'horizontal',
  color = 'cyan',
  className = '',
}) => {
  const glowColors = {
    cyan: {
      dot: '#22d3ee',
      shadow: '0 0 10px rgba(34, 211, 238, 0.9)',
    },
    indigo: {
      dot: '#818cf8',
      shadow: '0 0 10px rgba(129, 140, 248, 0.9)',
    },
    emerald: {
      dot: '#34d399',
      shadow: '0 0 10px rgba(52, 211, 153, 0.9)',
    },
  };

  const scheme = glowColors[color] || glowColors.cyan;

  if (!isActive) {
    return (
      <div
        className={`relative flex items-center justify-center opacity-20 ${
          direction === 'horizontal' ? 'w-full h-1' : 'w-1 h-full'
        } ${className}`}
      >
        <div
          className={`${
            direction === 'horizontal' ? 'w-full h-[1px]' : 'w-[1px] h-full'
          } bg-white/20`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${
        direction === 'horizontal' ? 'w-full h-2' : 'w-2 h-full'
      } ${className}`}
    >
      <style>{`
        @keyframes packetSlideH {
          0% { left: 0%; opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { left: 95%; opacity: 0; }
        }
        @keyframes packetSlideV {
          0% { top: 0%; opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
      `}</style>

      {/* Hairline trace */}
      <div
        className={`absolute ${
          direction === 'horizontal' ? 'w-full h-[1.5px]' : 'w-[1.5px] h-full'
        } bg-white/15`}
      />

      {/* Animated glowing moving particle */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          backgroundColor: scheme.dot,
          boxShadow: scheme.shadow,
          width: direction === 'horizontal' ? '7px' : '3.5px',
          height: direction === 'horizontal' ? '3.5px' : '7px',
          animation:
            direction === 'horizontal'
              ? 'packetSlideH 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              : 'packetSlideV 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />
    </div>
  );
};

export interface TopologyConnectorProps {
  isActive: boolean;
  isCompleted?: boolean;
  className?: string;
}

export const TopologyConnector: React.FC<TopologyConnectorProps> = ({
  isActive,
  isCompleted = false,
  className = '',
}) => {
  return (
    <div className={`relative flex items-center justify-center min-w-[12px] max-w-[24px] flex-1 ${className}`}>
      {/* Base track */}
      <div
        className={`w-full h-[1.5px] transition-colors duration-300 ${
          isCompleted
            ? 'bg-emerald-500/60 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
            : isActive
            ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
            : 'bg-white/10'
        }`}
      />

      {/* Pulsing indicator when active */}
      {isActive && (
        <span
          className="absolute w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-90"
          style={{ boxShadow: '0 0 10px #22d3ee' }}
        />
      )}
    </div>
  );
};
