import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  CloudRain,
  FlaskConical,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getLatestWeeklyPhotoRecords,
  getTreePhiDisplay,
  SEASON_BANNER_COPY,
} from '../../hooks/treePresentation';
import { SOIL_PH } from '../../lib/agronomy';
import { formatDateVN, todayVN } from '../../lib/date';
import { formatNumberVN } from '../../lib/format';
import { totalTreeCount } from '../../lib/lotSplit';
import { lastWeeklyByTarget, photoStatus } from '../../lib/photoStatus';
import type { TreeFilter } from '../../lib/treeFilters';
import type { Log, Lot, Photo, Season, Tree } from '../../types/models';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Card, KpiCard } from '../ui/Card';
import { PhotoTile } from '../ui/PhotoTile';
import { Skeleton } from '../ui/Skeleton';
import { StatusPill } from '../ui/StatusPill';

interface OverviewScreenProps {
  loading: boolean;
  season: Season;
  trees: Tree[];
  lotA: Lot | null;
  logs: Log[];
  photos: Photo[];
  thumbUrls: Map<string, string>;
  onToggleSeason: (next: Season) => void;
  onSelectTree: (treeId: string) => void;
  onOpenQuickPhoto: () => void;
  onOpenTreesFiltered: (filter: TreeFilter) => void;
}

/**
 * M1 Overview screen (SPEC M1, T02 AC1):
 * - Dynamic total tree count KPI, overdue photo count, union pruning/disease watch count, pH target
 * - Season toggle (Dry/Rainy) with Southeast Vietnam agronomic recommendations
 * - Active PHI harvest conflict alerts
 * - Photo grid for ALL active individual trees (3 cols mobile, 5 cols desktop) opening tree profiles
 */
export function OverviewScreen({
  loading,
  season,
  trees,
  lotA,
  logs,
  photos,
  thumbUrls,
  onToggleSeason,
  onSelectTree,
  onOpenQuickPhoto,
  onOpenTreesFiltered,
}: OverviewScreenProps) {
  const [showAllSeasonTips, setShowAllSeasonTips] = useState(false);
  const today = todayVN();
  const seasonMeta = SEASON_BANNER_COPY[season];
  const nextSeason: Season = season === 'kho' ? 'mua' : 'kho';

  const latestWeeklyDates = useMemo(() => lastWeeklyByTarget(photos), [photos]);
  const latestWeeklyPhotos = useMemo(() => getLatestWeeklyPhotoRecords(photos), [photos]);

  const stats = useMemo(() => {
    const lotACount = lotA?.treeCount ?? 0;
    const totalTrees = totalTreeCount(trees, lotA ?? undefined);

    let overdueCount = 0;
    let dueSoonCount = 0;
    let careAttentionCount = 0; // union of needsPruning OR diseaseWatch/benh (counted once per tree per SPEC M1)
    const phiAlerts: Array<{ tree: Tree; phiEndDate: string; conflictsHarvest: boolean }> = [];

    for (const tree of trees) {
      const st = photoStatus(latestWeeklyDates.get(tree.id), today);
      if (st === 'overdue') overdueCount += 1;
      else if (st === 'due-soon') dueSoonCount += 1;

      if (tree.needsPruning || tree.diseaseWatch || tree.health === 'benh') {
        careAttentionCount += 1;
      }

      const phi = getTreePhiDisplay(tree, logs, today);
      if (phi && (phi.conflictsHarvest || phi.isActiveToday)) {
        phiAlerts.push({
          tree,
          phiEndDate: phi.phiEndDate,
          conflictsHarvest: phi.conflictsHarvest,
        });
      }
    }

    return {
      lotACount,
      totalTrees,
      overdueCount,
      dueSoonCount,
      careAttentionCount,
      phiAlerts,
    };
  }, [latestWeeklyDates, logs, lotA, today, trees]);

  return (
    <div className="space-y-4">
      {/* Season banner + compact switch + recommendations (renders immediately for fast LCP & low CLS) */}
      <Banner
        tone={season === 'kho' ? 'season' : 'info'}
        icon={season === 'kho' ? <Sun className="w-6 h-6" /> : <CloudRain className="w-6 h-6" />}
        title={`${seasonMeta.label} · ${seasonMeta.monthsText}`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outlined"
              leadingIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => onToggleSeason(nextSeason)}
              className="px-3 whitespace-nowrap"
            >
              Đổi {SEASON_BANNER_COPY[nextSeason].label.toLowerCase()}
            </Button>
            <Button
              variant="text"
              onClick={() => setShowAllSeasonTips((v) => !v)}
              className="px-2.5 whitespace-nowrap"
            >
              {showAllSeasonTips ? 'Thu gọn' : 'Khuyến cáo'}
            </Button>
          </div>
        }
      >
        <p>{seasonMeta.summary}</p>
        {showAllSeasonTips && (
          <ul className="list-disc list-inside space-y-1 mt-2.5 text-caption">
            {seasonMeta.recommendations.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        )}
      </Banner>

      {/* Dynamic KPIs (SPEC M1 & T02 AC1) */}
      {loading ? (
        <section aria-label="Đang tải chỉ số vườn" className="grid grid-cols-3 gap-2.5">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </section>
      ) : (
        <section aria-label="Chỉ số tổng quan vườn" className="grid grid-cols-3 gap-2.5">
          <KpiCard
            value={stats.totalTrees}
            label="cây trong vườn"
            tone="neutral"
            onClick={() => onOpenTreesFiltered('all')}
          />
          <KpiCard
            value={stats.overdueCount}
            label="quá hạn chụp ảnh"
            tone={stats.overdueCount > 0 ? 'danger' : 'ok'}
            onClick={() => onOpenTreesFiltered('need-photo')}
          />
          <KpiCard
            value={stats.careAttentionCount}
            label="cắt tỉa / theo dõi"
            tone={stats.careAttentionCount > 0 ? 'warn' : 'ok'}
            onClick={() => onOpenTreesFiltered('need-pruning')}
          />
        </section>
      )}

      {/* pH benchmark & active PHI warnings */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="ph" icon={<FlaskConical className="w-4 h-4" />}>
          pH chuẩn {formatNumberVN(SOIL_PH.min, 1)}–{formatNumberVN(SOIL_PH.max, 1)}
        </StatusPill>
        <StatusPill tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
          {trees.length} cây cá thể · Lô A {stats.lotACount} cây
        </StatusPill>
        {stats.dueSoonCount > 0 && (
          <StatusPill tone="warn" icon={<Clock className="w-4 h-4" />}>
            {stats.dueSoonCount} cây sắp đến hạn chụp
          </StatusPill>
        )}
      </div>

      {stats.phiAlerts.length > 0 && (
        <div className="space-y-2">
          {stats.phiAlerts.slice(0, 3).map(({ tree, phiEndDate, conflictsHarvest }) => (
            <Banner
              key={tree.id}
              tone={conflictsHarvest ? 'danger' : 'warn'}
              icon={<AlertTriangle className="w-5 h-5" />}
              action={
                <Button variant="outlined" onClick={() => onSelectTree(tree.id)}>
                  Mở hồ sơ {tree.code}
                </Button>
              }
            >
              <span className="tabular-nums">
                <strong>{tree.code}:</strong> Không thu hoạch trước{' '}
                <strong>{formatDateVN(phiEndDate)}</strong>
                {conflictsHarvest ? ' (vượt mốc thu sớm nhất Ri6).' : ' (đang trong thời gian cách ly PHI).'}
              </span>
            </Banner>
          ))}
        </div>
      )}

      {/* Weekly photo grid for ALL individual trees (3 cols mobile, 5 cols desktop per SPEC M1) */}
      <section aria-labelledby="overview-photos-heading" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div>
            <h2 id="overview-photos-heading" className="text-title font-bold text-text">
              Ảnh tuần · {trees.length} cây cá thể
            </h2>
            <p className="text-caption text-text-3">
              Chạm vào ô cây để xem hồ sơ hoặc cập nhật ảnh tuần
            </p>
          </div>
          <Button
            variant="tonal"
            leadingIcon={<Camera className="w-5 h-5" />}
            onClick={onOpenQuickPhoto}
            className="shrink-0 whitespace-nowrap"
          >
            Chụp nhanh
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 rail:grid-cols-5 gap-2" aria-label="Đang tải lưới ảnh">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} variant="tile" />
            ))}
          </div>
        ) : trees.length === 0 ? (
          <Card padding="md">
            <p className="text-body text-text-2">
              Chưa có cây cá thể nào. Vào mục Cây để thêm cây hoặc tách cây từ Lô A.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-3 rail:grid-cols-5 gap-2">
            {trees.map((tree) => {
              const latestPhoto = latestWeeklyPhotos.get(tree.id);
              const status = photoStatus(latestWeeklyDates.get(tree.id), today);
              const thumbSrc = latestPhoto ? thumbUrls.get(latestPhoto.id) : undefined;
              const tone = status === 'ok' ? 'ok' : status === 'due-soon' ? 'warn' : 'danger';
              const statusLabel =
                status === 'ok' ? 'Đã chụp' : status === 'due-soon' ? 'Sắp hạn' : 'Quá hạn';
              const statusIcon =
                status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === 'due-soon' ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                );

              return (
                <PhotoTile
                  key={tree.id}
                  code={tree.code}
                  src={thumbSrc}
                  alt={`Ảnh tuần cây ${tree.label || tree.code}`}
                  statusTone={tone}
                  statusIcon={statusIcon}
                  statusLabel={statusLabel}
                  emptyLabel="Chụp ảnh"
                  onClick={() => onSelectTree(tree.id)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
