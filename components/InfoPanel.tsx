import React from 'react';

interface InfoPanelProps {
  score: number;
  highScore: number;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ score, highScore }) => {
  return (
    <div className="w-full max-w-md mt-6 space-y-4">
      <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Score</p>
          <p className="text-3xl font-mono text-white font-bold">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Best</p>
          <p className="text-3xl font-mono text-emerald-400 font-bold">{highScore}</p>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;