
import type { StatsResponse } from '../types';
import { BarChart3, CheckCircle, XCircle, Image } from 'lucide-react';

interface StatsBarProps {
  stats: StatsResponse | null;
}

export function StatsBar({ stats }: StatsBarProps) {
  if (!stats) return null;

  return (
    <div className="stats-bar">
      <div className="stat-item">
        <Image size={18} />
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat-item stat-accepted">
        <CheckCircle size={18} />
        <span className="stat-value">{stats.accepted}</span>
        <span className="stat-label">Accepted</span>
      </div>
      <div className="stat-item stat-rejected">
        <XCircle size={18} />
        <span className="stat-value">{stats.rejected}</span>
        <span className="stat-label">Rejected</span>
      </div>
      {stats.total > 0 && (
        <div className="stat-item">
          <BarChart3 size={18} />
          <span className="stat-value">
            {((stats.accepted / stats.total) * 100).toFixed(0)}%
          </span>
          <span className="stat-label">Acceptance Rate</span>
        </div>
      )}
    </div>
  );
}
