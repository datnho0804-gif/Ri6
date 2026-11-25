import {
  AlertTriangle,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  Clock,
  CloudRain,
  FlaskConical,
  Plus,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { type TouchEvent, useMemo, useRef, useState } from 'react';
import {
  getLatestWeeklyPhotoRecords,
  latestPhiSprayEnd,
  SEASON_BANNER_COPY,
} from '../../hooks/treePresentation';
import type { AgendaItem } from '../../lib/agenda/agenda';
import { SOIL_PH } from '../../lib/agronomy';
import { formatDateVN, todayVN } from '../../lib/date';
import { formatNumberVN } from '../../lib/format';
import { totalTreeCount } from '../../lib/lotSplit';
import { phiMessage, phiWarning } from '../../lib/phi';
import { lastWeeklyByTarget, photoStatus } from '../../lib/photoStatus';
import type { TreeFilter } from '../../lib/treeFilters';
import type { Log, Lot, Photo, Season, Tree } from '../../types/models';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Card, KpiCard } from '../ui/Card';
import { ListItem } from '../ui/ListItem';
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
  agendaSummary: AgendaItem[];
  totalAgendaCount: number;
  isSyncConfigured?: boolean;
  isSyncing?: boolean;
  onPullToSync?: () => Promise<void>;
  onToggleSeason: (next: Season) => void;
  onSelectTree: (treeId: string) => void;
  onOpenAddTree: () => void;
  onOpenQuickPhoto: () => void;
  onOpenAgenda: () => void;
  onOpenTreesFiltered: (filter: TreeFilter) => void;
}

const PULL_THRESHOLD = 64;
const PULL_MAX = 96;
const PULL_DEADZONE = 8;

/**
 * M1 Overview screen (SPEC M1, T02 AC1, T03 AC6, T05 AC2, T07 AC1, DESIGN §6 pull-to-refresh):
 * - Pull-to-refresh at scroll top triggering GitHub sync
 * - Dynamic total tree count KPI, overdue photo count, union pruning/disease watch count, pH target
 * - Season toggle (Dry/Rainy) with Southeast Vietnam agronomic recommendations (SEASON_ADVICE)
 * - Active PHI harvest conflict alerts computed via src/lib/phi.ts
 * - "Hôm nay cần làm" top-5 agenda summary card linking to M6 Việc cần làm
 * - Photo grid for ALL active individual trees (3 cols mobile, 5 cols desktop) + "+ Thêm cây" last tile
 */
export function OverviewScreen({
  loading,
  season,
  trees,
  lotA,
  logs,
  photos,
  thumbUrls,
  agendaSummary,
  totalAgendaCount,
  isSyncConfigured = false,
  isSyncing = false,
  onPullToSync,
  onToggleSeason,
  onSelectTree,
  onOpenAddTree,
  onOpenQuickPhoto,
  onOpenAgenda,
  onOpenTreesFiltered,
}: OverviewScreenProps) {
  const [showAllSeasonTips, setShowAllSeasonTips] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!onPullToSync || isSyncing || pullRefreshing) return;
    if (e.touches.length !== 1 || window.scrollY > 0) return;
    touchStartYRef.current = e.touches[0].clientY;
    pullingRef.current = false;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;
    if (window.scrollY > 0) {
      touchStartYRef.current = null;
      pullingRef.current = false;
      setPullDistance(0);
      return;
    }
    const dy = e.touches[0].clientY - touchStartYRef.current;
    if (dy <= PULL_DEADZONE) {
      if (pullDistance !== 0) setPullDistance(0);
      return;
    }
    pullingRef.current = true;
    setPullDistance(Math.min(PULL_MAX, Math.round((dy - PULL_DEADZONE) * 0.5)));
  };

  const handleTouchEnd = () => {
    const shouldSync =
      pullingRef.current &&
      pullDistance >= PULL_THRESHOLD &&
      Boolean(onPullToSync) &&
      !isSyncing &&
      !pullRefreshing;
    touchStartYRef.current = null;
    pullingRef.current = false;
    setPullDistance(0);
    if (shouldSync && onPullToSync) {
      setPullRefreshing(true);
      void onPullToSync().finally(() => {
        setPullRefreshing(false);
      });
    }
  };
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
    const phiAlerts: Array<{ tree: Tree; message: string; conflictsHarvest: boolean }> = [];

    for (const tree of trees) {
      const st = photoStatus(latestWeeklyDates.get(tree.id), today);
      if (st === 'overdue') overdueCount += 1;
      else if (st === 'due-soon') dueSoonCount += 1;

      if (tree.needsPruning || tree.diseaseWatch || tree.health === 'benh') {
        careAttentionCount += 1;
      }

      const harvestConflict = tree.flowerDate
        ? phiWarning(tree.flowerDate, logs, tree.id)
        : null;
      if (harvestConflict) {
        phiAlerts.push({
          tree,
          message: phiMessage(harvestConflict),
          conflictsHarvest: true,
        });
      } else {
        const activeSpray = latestPhiSprayEnd(logs, tree.id);
        if (activeSpray && activeSpray.endDate > today) {
          phiAlerts.push({
            tree,
            message: `Không thu hoạch trước ${formatDateVN(activeSpray.endDate)} (đang trong thời gian cách ly PHI)`,
            conflictsHarvest: false,
          });
        }
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

  const showPullIndicator = pullDistance > 0 || pullRefreshing;
  const pullReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {showPullIndicator && (
        <div
          role="status"
          aria-live="polite"
          className="ptr-indicator flex items-center justify-center overflow-hidden"
          style={{ height: `${Math.max(44, pullDistance)}px` }}
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-pill bg-surface shadow-e1 text-label font-semibold text-primary">
            <RefreshCw
              className={`w-4 h-4 ptr-icon ${
                pullRefreshing ? 'animate-spin motion-reduce:animate-none' : ''
              }`}
              style={
                pullRefreshing
                  ? undefined
                  : {
                      transform: `rotate(${Math.min(
                        360,
                        Math.round((pullDistance / PULL_THRESHOLD) * 180),
                      )}deg)`,
                    }
              }
              aria-hidden="true"
            />
            <span>
              {pullRefreshing
                ? 'Đang đồng bộ…'
                : pullReady
                  ? isSyncConfigured
                    ? 'Thả ra để đồng bộ ngay'
                    : 'Thả ra để kiểm tra đồng bộ'
                  : 'Kéo xuống để đồng bộ'}
            </span>
          </span>
        </div>
      )}

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
          {stats.phiAlerts.slice(0, 3).map(({ tree, message, conflictsHarvest }) => (
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
                <strong>{tree.code}:</strong> {message}.
              </span>
            </Banner>
          ))}
        </div>
      )}

      {/* Today's Agenda summary block (SPEC M1 & M6, T05 AC2: top 5 items + Xem tất cả) */}
      <section aria-labelledby="overview-agenda-heading" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <h2 id="overview-agenda-heading" className="text-title font-bold text-text">
              Hôm nay cần làm
            </h2>
            {totalAgendaCount > 0 && (
              <StatusPill
                tone={agendaSummary.some((i) => i.priority === 'cao') ? 'danger' : 'warn'}
                icon={<CalendarCheck2 className="w-4 h-4" />}
              >
                {totalAgendaCount} việc
              </StatusPill>
            )}
          </div>
          <Button
            variant="tonal"
            leadingIcon={<CalendarCheck2 className="w-5 h-5" />}
            onClick={onOpenAgenda}
            className="whitespace-nowrap"
          >
            Xem tất cả
          </Button>
        </div>

        {loading ? (
          <Card padding="md" className="space-y-3">
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </Card>
        ) : agendaSummary.length === 0 ? (
          <Card padding="md" className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5.5 h-5.5 text-ok shrink-0" aria-hidden="true" />
              <p className="text-body text-text-2">
                Không có việc tồn đọng trong 7 ngày tới.
              </p>
            </div>
            <Button variant="text" onClick={onOpenAgenda}>
              Thêm việc
            </Button>
          </Card>
        ) : (
          <Card padding="none">
            {agendaSummary.map((item, idx) => {
              const isHigh = item.priority === 'cao';
              const isMed = item.priority === 'vua';
              return (
                <ListItem
                  key={item.key}
                  divider={idx > 0}
                  leadingIcon={
                    item.category === 'photo' ? (
                      <Camera className="w-5.5 h-5.5" />
                    ) : isHigh ? (
                      <AlertTriangle className="w-5.5 h-5.5" />
                    ) : (
                      <Clock className="w-5.5 h-5.5" />
                    )
                  }
                  leadingTone={isHigh ? 'danger' : isMed ? 'warn' : 'info'}
                  title={item.title}
                  subtitle={item.reason}
                  showChevron
                  onClick={() => {
                    if (item.key === 'photo:summary') {
                      onOpenQuickPhoto();
                    } else {
                      onOpenAgenda();
                    }
                  }}
                />
              );
            })}
          </Card>
        )}
      </section>

      {/* Weekly photo grid for ALL individual trees (3 cols mobile, 5 cols desktop per SPEC M1) */}
      <section aria-labelledby="overview-photos-heading" className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-0.5">
          <div className="min-w-0">
            <h2 id="overview-photos-heading" className="text-title font-bold text-text">
              Ảnh tuần · {trees.length} cây cá thể
            </h2>
            <p className="text-caption text-text-3">
              Chạm vào ô cây để xem hồ sơ hoặc chụp ảnh tuần
            </p>
          </div>
          <Button
            variant="tonal"
            leadingIcon={<Camera className="w-5 h-5" />}
            onClick={onOpenQuickPhoto}
            className="self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            Chụp nhanh
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 rail:grid-cols-5 gap-2" aria-label="Đang tải lưới ảnh">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} variant="tile" />
            ))}
          </div>
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
                  emptyLabel={latestPhoto?.remotePath ? 'Mở để xem' : 'Chụp ảnh gốc'}
                  onClick={() => onSelectTree(tree.id)}
                />
              );
            })}

            {/* Last tile: "+ Thêm cây" (SPEC 1.2 & T07 AC1: >= 48px, text + icon, opens AddTreeSheet) */}
            <button
              type="button"
              onClick={onOpenAddTree}
              className="pressable aspect-square min-h-14 rounded-tile border-2 border-dashed border-outline-strong bg-surface-2/60 hover:bg-primary-container/40 p-2 flex flex-col items-center justify-center gap-1.5 text-primary transition-colors"
            >
              <span
                className="w-10 h-10 rounded-pill bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Plus className="w-5.5 h-5.5" />
              </span>
              <span className="text-label font-bold leading-tight text-center">+ Thêm cây</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
