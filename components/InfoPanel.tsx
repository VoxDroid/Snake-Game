import React from 'react';

interface LikeInfo {
  nickname?: string;
  likeCount?: number;
  totalLikeCount?: number;
}

interface GiftNotification {
  nickname?: string;
  tier?: number;
  obstacles?: number;
  diamonds?: number;
  pointsRemaining?: number;
}

interface RecentGift {
  nickname?: string;
  tier?: number;
  obstacles?: number;
  diamonds?: number;
  pointsRemaining?: number;
  time: number;
}

interface InfoPanelProps {
  score: number;
  liveLikes: number;
  lastLike?: LikeInfo | null;
  giftNotification?: GiftNotification | null;
  recentGifts?: RecentGift[];
}

const InfoPanel: React.FC<InfoPanelProps> = ({ score, liveLikes, lastLike, giftNotification, recentGifts }) => {
  return (
    <div className="w-full max-w-md mt-6 space-y-2 h-48">
      <div className="flex items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm h-24">
        <div className="w-1/3 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Score</p>
          <p className="text-3xl font-mono text-white font-bold">{score}</p>
        </div>

        <div className="w-1/3 text-center px-2 flex items-center justify-center h-14">
          {/* Notifications area (likes and gifts) - fixed height so content doesn't resize panel */}
          {giftNotification ? (
            <div className="bg-slate-700/60 px-3 py-2 rounded-md w-full text-left">
              <div className="text-xs opacity-80">Gift tier {giftNotification.tier ?? '-'}</div>
              <div className="text-sm font-medium">{giftNotification.nickname} • Obstacles: {giftNotification.obstacles ?? 0}</div>
            </div>
          ) : lastLike ? (
            <div className="bg-rose-700/60 px-3 py-2 rounded-md w-full text-left">
              <div className="text-xs opacity-80">Like +{lastLike.likeCount}</div>
              <div className="text-sm font-medium">{lastLike.nickname} • {lastLike.totalLikeCount}</div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 uppercase tracking-wider">No recent activity</div>
          )}
        </div>

        <div className="w-1/3 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Likes</p>
          <p className="text-3xl font-mono text-emerald-400 font-bold">{liveLikes}</p>
        </div>
      </div>

      {recentGifts && recentGifts.length > 0 && (
        <div className="bg-slate-900/60 p-2 rounded-md border border-slate-800 text-xs text-slate-200 h-20 overflow-y-auto">
          <div className="mb-1 text-xs opacity-70">Recent gifts</div>
          {recentGifts.map((g, i) => (
            <div key={g.time + i} className="text-xs py-0.5">
              <span className="font-medium">{g.nickname}</span>
              {g.diamonds ? ` • ${g.diamonds} diamonds` : g.obstacles ? ` • Obstacles ${g.obstacles}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InfoPanel;