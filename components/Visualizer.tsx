
import React from 'react';

interface VisualizerProps {
  active: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ active }) => {
  return (
    <div className="visualizer-container">
      <div className={`heartbeat-core ${active ? 'pulsing' : 'idle'}`}>
        <div className="glow-ring ring-1"></div>
        <div className="glow-ring ring-2"></div>
        <div className="glow-ring ring-3"></div>
      </div>
    </div>
  );
};
