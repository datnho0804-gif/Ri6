import {
  AlertTriangle,
  BookOpen,
  Bug,
  Calendar,
  CloudRain,
  Droplets,
  Info,
  Leaf,
  Package,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sun,
  Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatMilestoneDates } from '../../hooks/treePresentation';
import { IRRIGATION } from '../../lib/agronomy';
import { formatDateVN, todayVN } from '../../lib/date';
import { formatNumberVN, formatShortDateVN } from '../../lib/format';
import { irrigation, SPRINKLER_RULES } from '../../lib/irrigation';
import {
  PROTOCOL_DISCLAIMER,
  PROTOCOLS,
  ROTATION_NOTE,
  searchProtocols,
  type Protocol,
} from '../../lib/protocols';
import { harvestWindow, ri6Day, ri6Milestones } from '../../lib/ri6';
import {
  getSuppliesForProtocol,
  learnedPrice,
  priceLine,
  searchSupplies,
  SUPPLIES,
  SUPPLY_CATEGORY_LABEL,
  SUPPLY_LABEL_NOTE,
  SUPPLY_PRICE_DISCLAIMER,
  type SupplyCategory,
} from '../../lib/supplies';
import type { ISODate, Log, Lot, Tree } from '../../types/models';
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  KpiCard,
  ListItem,
  NumberStepper,
  Ri6Progress,
  SegmentedButton,
  StatusPill,
  TextField,
  type SemanticTone,
} from '../ui';

interface ReferenceScreenProps {
  trees: Tree[];
  lotA: Lot | null;
  logs: Log[];
}

type RefSubTab = 'protocols' | 'supplies' | 'ri6' | 'irrigation';
type ProtocolKindFilter = 'all' | Protocol['kind'];
type SupplyFilter = 'all' | SupplyCategory;

const KIND_LABEL: Record<Protocol['kind'], string> = {
  benh: 'Bệnh hại',
  sau: 'Sâu hại',
  'sinh-ly': 'Sinh lý',
};

const KIND_TONE: Record<Protocol['kind'], SemanticTone> = {
  benh: 'danger',
  sau: 'warn',
  'sinh-ly': 'ph',
};

const SUPPLY_TONE: Record<SupplyCategory, SemanticTone> = {
  thuoc_bvtv: 'danger',
  phan_bon: 'ok',
  vat_tu: 'info',
};

const SEASON_TAG: Record<Protocol['season'], { label: string; tone: SemanticTone }> = {
  mua: { label: 'Mùa mưa', tone: 'info' },
  kho: { label: 'Mùa khô', tone: 'tc' },
  'ca-nam': { label: 'Cả năm', tone: 'neutral' },
};

function formatM3(value: number): string {
  // Show up to 2 decimal places without redundant trailing zeros, Vietnamese comma
  const rounded = Math.round(value * 100) / 100;
  const decimals = Number.isInteger(rounded) ? 0 : Math.round(rounded * 10) / 10 === rounded ? 1 : 2;
  return formatNumberVN(rounded, decimals);
}

/**
 * M4 Reference, Supplies Catalog & Calculators screen (SPEC M4, T03 AC3–AC5, T07 AC2):
 * - 8 five-step disease/pest/physiology protocols with linked products
 * - Detailed Supplies Catalog (Thuốc BVTV, Phân bón, Vật tư) with brand, packaging, reference/learned price, usage
 * - Ri6 physiological milestones calculator (mat-cua / xo-nhuy)
 * - Drip/sprinkler irrigation volume calculator with dynamic Lot A & individual tree counts
 */
export function ReferenceScreen({ trees, lotA, logs }: ReferenceScreenProps) {
  const [subTab, setSubTab] = useState<RefSubTab>('protocols');

  return (
    <div className="space-y-4">
      <SegmentedButton
        ariaLabel="Mục tra cứu, vật tư và máy tính"
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: 'protocols', label: 'Phác đồ' },
          { value: 'supplies', label: 'Vật tư' },
          { value: 'ri6', label: 'Mốc Ri6' },
          { value: 'irrigation', label: 'Béc tưới' },
        ]}
      />

      {subTab === 'protocols' && <ProtocolsSection logs={logs} />}
      {subTab === 'supplies' && <SuppliesSection logs={logs} />}
      {subTab === 'ri6' && <Ri6CalculatorSection trees={trees} />}
      {subTab === 'irrigation' && (
        <IrrigationCalculatorSection
          key={`${lotA?.treeCount ?? 0}-${trees.length}`}
          defaultLotACount={lotA?.treeCount ?? 0}
          defaultLotBCount={trees.length}
        />
      )}
    </div>
  );
}

function SuppliesSection({ logs }: { logs: Log[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SupplyFilter>('all');

  const filtered = useMemo(() => {
    const byQuery = searchSupplies(query);
    if (category === 'all') return byQuery;
    return byQuery.filter((s) => s.category === category);
  }, [category, query]);

  const counts = useMemo(
    () => ({
      all: SUPPLIES.length,
      thuoc_bvtv: SUPPLIES.filter((s) => s.category === 'thuoc_bvtv').length,
      phan_bon: SUPPLIES.filter((s) => s.category === 'phan_bon').length,
      vat_tu: SUPPLIES.filter((s) => s.category === 'vat_tu').length,
    }),
    [],
  );

  return (
    <div className="space-y-4">
      <Banner tone="info" icon={<Info className="w-5 h-5" />} title="Danh mục vật tư vườn Ri6">
        <p>{SUPPLY_PRICE_DISCLAIMER}</p>
        <p className="mt-1">{SUPPLY_LABEL_NOTE}</p>
      </Banner>

      <div className="space-y-3">
        <TextField
          label="Tìm thuốc BVTV, phân bón, hoạt chất hoặc thương hiệu"
          placeholder="Ví dụ: nhen do, phu my ure, Ridomil, IRAC 6…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo nhóm vật tư">
          {(
            [
              { id: 'all', label: `Tất cả (${counts.all})` },
              { id: 'thuoc_bvtv', label: `${SUPPLY_CATEGORY_LABEL.thuoc_bvtv} (${counts.thuoc_bvtv})` },
              { id: 'phan_bon', label: `${SUPPLY_CATEGORY_LABEL.phan_bon} (${counts.phan_bon})` },
              { id: 'vat_tu', label: `${SUPPLY_CATEGORY_LABEL.vat_tu} (${counts.vat_tu})` },
            ] as const
          ).map((opt) => (
            <Chip
              key={opt.id}
              variant="filter"
              selected={category === opt.id}
              onClick={() => setCategory(opt.id)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="durian"
          title="Không tìm thấy vật tư phù hợp"
          description="Thử tìm không dấu (ví dụ: nhen do, phu my ure, dolomite) hoặc xem lại toàn bộ danh mục."
          action={
            <Button
              variant="outlined"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Xem tất cả ({SUPPLIES.length})
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 rail:grid-cols-2 gap-3">
          {filtered.map((item) => {
            const gardenPrice = learnedPrice(logs, item.id);
            const priceText = priceLine(item, logs);

            return (
              <Card key={item.id} padding="md" className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-title font-bold text-text leading-snug">{item.name}</h2>
                    <p className="text-caption text-text-3 mt-0.5">
                      Hãng / Thương hiệu: <strong className="text-text-2">{item.brand}</strong>
                    </p>
                  </div>
                  <StatusPill tone={SUPPLY_TONE[item.category]}>
                    {SUPPLY_CATEGORY_LABEL[item.category]}
                  </StatusPill>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {item.moaGroup && <StatusPill tone="info">{item.moaGroup}</StatusPill>}
                  <StatusPill tone="neutral" icon={<Package className="w-4 h-4" />}>
                    {item.packaging.join(' · ')}
                  </StatusPill>
                  {item.category === 'thuoc_bvtv' && (
                    <StatusPill tone="warn">
                      PHI: {item.phiDays !== undefined ? `${item.phiDays} ngày` : 'Theo nhãn'}
                    </StatusPill>
                  )}
                </div>

                {/* Price row: garden learned price prioritized over reference price */}
                <div
                  className={[
                    'rounded-sm px-3 py-2 text-label flex items-start gap-2',
                    gardenPrice
                      ? 'bg-primary-container/50 text-on-primary-container font-semibold'
                      : 'bg-surface-2 text-text-2',
                  ].join(' ')}
                >
                  <Tag className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="tabular-nums">{priceText}</div>
                    {!gardenPrice && item.price?.source && (
                      <div className="text-caption text-text-3 mt-0.5">
                        Nguồn: {item.price.source}
                      </div>
                    )}
                  </div>
                </div>

                <dl className="space-y-1.5 text-body text-text-2 leading-relaxed">
                  <div>
                    <dt className="inline font-semibold text-text">Hoạt chất / Thành phần: </dt>
                    <dd className="inline">{item.activeIngredient}</dd>
                  </div>
                  {item.targets.length > 0 && (
                    <div>
                      <dt className="inline font-semibold text-text">Đối tượng: </dt>
                      <dd className="inline">{item.targets.join(', ')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline font-semibold text-text">Cách dùng: </dt>
                    <dd className="inline">{item.usageGuide}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-text">Liều lượng: </dt>
                    <dd className="inline">{item.doseNote}</dd>
                  </div>
                </dl>

                <div className="rounded-sm bg-warn-container/50 px-3 py-2 text-caption text-text-2 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.safetyNote}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProtocolsSection({ logs }: { logs: Log[] }) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ProtocolKindFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(PROTOCOLS[0]?.id ?? '');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    const byQuery = searchProtocols(query);
    if (kindFilter === 'all') return byQuery;
    return byQuery.filter((p) => p.kind === kindFilter);
  }, [kindFilter, query]);

  const selectedProtocol = useMemo(
    () =>
      filtered.find((p) => p.id === selectedId) ??
      PROTOCOLS.find((p) => p.id === selectedId) ??
      filtered[0] ??
      null,
    [filtered, selectedId],
  );

  return (
    <div className="space-y-4">
      <Banner
        tone="warn"
        icon={<ShieldAlert className="w-5 h-5" />}
        title="Lưu ý an toàn thuốc BVTV"
      >
        <p>{PROTOCOL_DISCLAIMER}</p>
        <p className="mt-1 font-medium">{ROTATION_NOTE}</p>
      </Banner>

      <div className="rail:grid rail:grid-cols-12 rail:gap-5 items-start">
        {/* Left list column */}
        <div className="rail:col-span-5 space-y-3">
          <TextField
            label="Tìm phác đồ, sâu bệnh hoặc hoạt chất"
            placeholder="Ví dụ: xì mủ, rầy, nhện đỏ, Metalaxyl…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo nhóm phác đồ">
            {(
              [
                { id: 'all', label: 'Tất cả (8)' },
                { id: 'benh', label: 'Bệnh hại' },
                { id: 'sau', label: 'Sâu hại' },
                { id: 'sinh-ly', label: 'Sinh lý' },
              ] as const
            ).map((opt) => (
              <Chip
                key={opt.id}
                variant="filter"
                selected={kindFilter === opt.id}
                onClick={() => setKindFilter(opt.id)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              illustration="durian"
              title="Không tìm thấy phác đồ phù hợp"
              description="Thử tìm bằng từ khóa khác hoặc bấm xem tất cả 8 phác đồ chuẩn."
              action={
                <Button
                  variant="outlined"
                  onClick={() => {
                    setQuery('');
                    setKindFilter('all');
                  }}
                >
                  Xem tất cả 8 phác đồ
                </Button>
              }
            />
          ) : (
            <Card padding="none">
              {filtered.map((protocol, idx) => {
                const isSelected = selectedProtocol?.id === protocol.id;
                const seasonTag = SEASON_TAG[protocol.season];
                return (
                  <div
                    key={protocol.id}
                    className={[
                      idx > 0 ? 'border-t border-surface-2' : '',
                      isSelected ? 'rail:bg-primary-container/35' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <ListItem
                      leadingIcon={
                        protocol.kind === 'benh' ? (
                          <Leaf className="w-5.5 h-5.5" />
                        ) : protocol.kind === 'sau' ? (
                          <Bug className="w-5.5 h-5.5" />
                        ) : (
                          <Sparkles className="w-5.5 h-5.5" />
                        )
                      }
                      leadingTone={KIND_TONE[protocol.kind]}
                      title={`${PROTOCOLS.indexOf(protocol) + 1}. ${protocol.name}`}
                      subtitle={protocol.agents}
                      showChevron
                      onClick={() => {
                        setSelectedId(protocol.id);
                        if (typeof window !== 'undefined' && window.innerWidth < 840) {
                          setMobileDetailOpen(true);
                        }
                      }}
                    />
                    <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
                      <StatusPill tone={KIND_TONE[protocol.kind]}>
                        {KIND_LABEL[protocol.kind]}
                      </StatusPill>
                      <StatusPill
                        tone={seasonTag.tone}
                        icon={
                          protocol.season === 'mua' ? (
                            <CloudRain className="w-4 h-4" />
                          ) : protocol.season === 'kho' ? (
                            <Sun className="w-4 h-4" />
                          ) : undefined
                        }
                      >
                        {seasonTag.label}
                      </StatusPill>
                      {protocol.actives.length > 0 && (
                        <StatusPill tone="ok">
                          {protocol.actives.length} nhóm hoạt chất
                        </StatusPill>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* Right detail pane on >=840px desktop */}
        <div className="hidden rail:block rail:col-span-7">
          {selectedProtocol ? (
            <ProtocolDetailView protocol={selectedProtocol} logs={logs} />
          ) : (
            <Card padding="lg">
              <EmptyState
                illustration="durian"
                title="Chọn một phác đồ bên trái"
                description="Xem đủ 5 bước nhận định, kiểm tra tại vườn, canh tác, hoạt chất luân phiên và theo dõi PHI."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Mobile BottomSheet detail view (<840px) */}
      <BottomSheet
        open={mobileDetailOpen && Boolean(selectedProtocol)}
        title={selectedProtocol?.name ?? 'Phác đồ'}
        subtitle={selectedProtocol?.agents}
        onClose={() => setMobileDetailOpen(false)}
        footer={
          <Button variant="filled" fullWidth onClick={() => setMobileDetailOpen(false)}>
            Đóng phác đồ
          </Button>
        }
      >
        {selectedProtocol && <ProtocolDetailView protocol={selectedProtocol} logs={logs} compactHeader />}
      </BottomSheet>
    </div>
  );
}

function ProtocolDetailView({
  protocol,
  logs,
  compactHeader = false,
}: {
  protocol: Protocol;
  logs: Log[];
  compactHeader?: boolean;
}) {
  const seasonTag = SEASON_TAG[protocol.season];
  const relatedSupplies = useMemo(() => getSuppliesForProtocol(protocol.id), [protocol.id]);

  return (
    <div className="space-y-4">
      {!compactHeader && (
        <Card padding="md" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={KIND_TONE[protocol.kind]}>{KIND_LABEL[protocol.kind]}</StatusPill>
            <StatusPill tone={seasonTag.tone}>{seasonTag.label}</StatusPill>
          </div>
          <h2 className="text-headline font-bold text-text">{protocol.name}</h2>
          <p className="text-body text-text-2">{protocol.agents}</p>
        </Card>
      )}

      {compactHeader && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={KIND_TONE[protocol.kind]}>{KIND_LABEL[protocol.kind]}</StatusPill>
          <StatusPill tone={seasonTag.tone}>{seasonTag.label}</StatusPill>
        </div>
      )}

      {/* 5 structured protocol steps (SPEC §3.5, T03 AC5) */}
      <div className="space-y-3">
        {protocol.steps.map((step, idx) => (
          <Card key={step.key} padding="md" className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-pill bg-primary text-on-primary text-label font-bold flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <h3 className="text-title font-bold text-text">{step.title}</h3>
            </div>

            <div className="space-y-2.5 pl-1">
              {step.groups.map((grp, gIdx) => (
                <div key={grp.label ?? String(gIdx)} className="space-y-1">
                  {grp.label && (
                    <div className="text-label font-bold text-primary">{grp.label}</div>
                  )}
                  <ul className="list-disc list-inside space-y-1 text-body text-text-2 leading-relaxed">
                    {grp.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Active ingredient FRAC/IRAC rotation summary */}
      {protocol.actives.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-surface-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h3 className="text-title font-bold text-text">
              Hoạt chất luân phiên theo nhóm (liều lượng theo nhãn)
            </h3>
          </div>
          {protocol.actives.map((act, idx) => (
            <ListItem
              key={`${act.name}-${act.group}`}
              divider={idx > 0}
              title={act.name}
              subtitle={
                [act.target, act.note, 'Liều lượng và PHI theo nhãn'].filter(Boolean).join(' · ')
              }
              trailing={<StatusPill tone="info">{act.group}</StatusPill>}
            />
          ))}
        </Card>
      )}

      {/* Linked popular products from Supplies Catalog (SPEC 1.2 & T07 AC2) */}
      {relatedSupplies.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-surface-2 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h3 className="text-title font-bold text-text">
              Sản phẩm phổ biến liên quan ({relatedSupplies.length})
            </h3>
          </div>
          {relatedSupplies.map((item, idx) => (
            <ListItem
              key={item.id}
              divider={idx > 0}
              title={`${item.name} · ${item.brand}`}
              subtitle={[
                `${item.activeIngredient}${item.moaGroup ? ` (${item.moaGroup})` : ''}`,
                `Quy cách: ${item.packaging.join(', ')}`,
                priceLine(item, logs),
              ].join(' · ')}
              trailing={
                item.moaGroup ? <StatusPill tone="info">{item.moaGroup}</StatusPill> : undefined
              }
            />
          ))}
        </Card>
      )}

      <Banner tone="info" icon={<Info className="w-5 h-5" />}>
        {PROTOCOL_DISCLAIMER}
      </Banner>
    </div>
  );
}

function Ri6CalculatorSection({ trees }: { trees: Tree[] }) {
  const today = todayVN();
  const [kind, setKind] = useState<'xo-nhuy' | 'mat-cua'>('xo-nhuy');
  const [date, setDate] = useState<ISODate>(() => {
    const withFlower = trees.find((t) => t.flowerDate);
    return withFlower?.flowerDate ?? today;
  });

  const treesWithDates = useMemo(
    () => trees.filter((t) => Boolean(t.flowerDate || t.budDate)),
    [trees],
  );

  const milestones = useMemo(() => ri6Milestones({ kind, date }), [date, kind]);
  const harvestMilestone = milestones.find((m) => m.key === 'thu-hoach');
  const currentDay = kind === 'xo-nhuy' ? ri6Day(date, today) : null;
  const flowerHarvestWindow = kind === 'xo-nhuy' ? harvestWindow(date) : null;

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-4">
        <div>
          <h2 className="text-title font-bold text-text">Máy tính mốc sinh lý Ri6</h2>
          <p className="text-caption text-text-3 mt-0.5">
            Tự tính lịch tưới nhấp, chặn đọt, chuyển Kali, lên cơm, giảm đạm và thu hoạch (90–105
            ngày sau xổ nhụy).
          </p>
        </div>

        <SegmentedButton
          ariaLabel="Chọn mốc đầu vào để tính lịch Ri6"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'xo-nhuy', label: 'Từ ngày xổ nhụy' },
            { value: 'mat-cua', label: 'Từ ngày mắt cua' },
          ]}
        />

        <DateField
          label={kind === 'xo-nhuy' ? 'Ngày xổ nhụy' : 'Ngày ra mắt cua'}
          value={date}
          onChange={setDate}
          helperText={
            kind === 'mat-cua'
              ? 'Từ mắt cua đến xổ nhụy khoảng 55–57 ngày; các mốc sau tự lan truyền khoảng ngày.'
              : 'Mốc chuẩn Ri6 tại Lộc Tấn, Đồng Nai.'
          }
        />

        {treesWithDates.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-label font-semibold text-text-2">Lấy nhanh từ cây trong vườn</span>
            <div className="flex flex-wrap gap-2">
              {treesWithDates.map((t) => (
                <Chip
                  key={t.id}
                  onClick={() => {
                    if (t.flowerDate) {
                      setKind('xo-nhuy');
                      setDate(t.flowerDate);
                    } else if (t.budDate) {
                      setKind('mat-cua');
                      setDate(t.budDate);
                    }
                  }}
                >
                  {t.code} · {t.flowerDate ? `Xổ nhụy ${formatShortDateVN(t.flowerDate)}` : `Mắt cua ${formatShortDateVN(t.budDate!)}`}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </Card>

      {harvestMilestone && (
        <Banner
          tone="tc"
          icon={<Calendar className="w-5 h-5" />}
          title="Cửa sổ thu hoạch Ri6 dự kiến"
        >
          <span className="text-body font-bold tabular-nums">
            {formatDateVN(harvestMilestone.earliest)} – {formatDateVN(harvestMilestone.latest)}
          </span>
          {flowerHarvestWindow && currentDay !== null && currentDay >= 0 && (
            <span className="block text-caption mt-0.5 tabular-nums">
              Tính đến hôm nay ({formatDateVN(today)}): ngày thứ {currentDay} sau xổ nhụy.
            </span>
          )}
        </Banner>
      )}

      {currentDay !== null && currentDay >= 0 && (
        <Ri6Progress day={currentDay} subtitle={`sau xổ nhụy ${formatDateVN(date)}`} />
      )}

      <Card padding="none">
        {milestones.map((m, idx) => (
          <div
            key={m.key}
            className={[
              'flex items-start gap-3 px-4 py-3.5',
              idx > 0 ? 'border-t border-surface-2' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className={[
                'w-10 h-10 rounded-tile flex items-center justify-center shrink-0 mt-0.5',
                m.key === 'thu-hoach'
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : m.key === 'xo-nhuy'
                    ? 'bg-info-container text-info'
                    : 'bg-ok-container text-ok',
              ].join(' ')}
              aria-hidden="true"
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="text-body font-bold text-text leading-snug">{m.label}</h3>
                <span className="text-body font-bold text-primary tabular-nums">
                  {formatMilestoneDates(m, true)}
                </span>
              </div>
              <p className="text-caption text-text-3 leading-snug mt-0.5">{m.note}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function IrrigationCalculatorSection({
  defaultLotACount,
  defaultLotBCount,
}: {
  defaultLotACount: number;
  defaultLotBCount: number;
}) {
  const [aLiters, setALiters] = useState<number>(IRRIGATION.lotA.defaultLiters);
  const [aCount, setACount] = useState<number>(defaultLotACount);
  const [bLiters, setBLiters] = useState<number>(IRRIGATION.lotB.defaultLiters);
  const [bCount, setBCount] = useState<number>(defaultLotBCount);
  const [perWeek, setPerWeek] = useState<number>(3);

  const result = useMemo(
    () =>
      irrigation({
        aLiters,
        aCount,
        bLiters,
        bCount,
        perWeek,
      }),
    [aCount, aLiters, bCount, bLiters, perWeek],
  );

  const countsDifferFromOrchard = aCount !== defaultLotACount || bCount !== defaultLotBCount;

  return (
    <div className="space-y-4">
      {/* Live calculated m³ KPIs right at top so every +/- tap is immediately visible */}
      <section aria-label="Kết quả tính lượng nước tưới" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <KpiCard value={`${formatM3(result.totalM3)} m³`} label="Tổng / lần" tone="ok" />
        <KpiCard
          value={`${formatM3(result.weeklyM3 ?? result.totalM3 * perWeek)} m³`}
          label={`Tổng / tuần (${perWeek} lần)`}
          tone="info"
        />
        <KpiCard value={`${formatM3(result.lotA.m3)} m³`} label="Lô A / lần" tone="neutral" />
        <KpiCard value={`${formatM3(result.lotB.m3)} m³`} label="Lô B / lần" tone="neutral" />
      </section>

      {/* Non-blocking agronomic warnings (T03 AC4) */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w) => (
            <Banner key={`${w.lot}-${w.message}`} tone="warn" icon={<AlertTriangle className="w-5 h-5" />}>
              {w.message}
            </Banner>
          ))}
        </div>
      )}

      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-title font-bold text-text">Máy tính nước béc tưới</h2>
            <p className="text-caption text-text-3 mt-0.5">
              Mặc định tự lấy theo số cây thật trong sổ tay ({defaultLotACount} cây Lô A ·{' '}
              {defaultLotBCount} cây cá thể).
            </p>
          </div>
          {countsDifferFromOrchard && (
            <Button
              variant="text"
              leadingIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => {
                setACount(defaultLotACount);
                setBCount(defaultLotBCount);
              }}
            >
              Lấy theo vườn
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 p-3.5 rounded-md bg-bg border border-outline">
            <h3 className="text-body font-bold text-text">Lô A (cây kiến thiết)</h3>
            <NumberStepper
              label="Lượng nước mỗi cây"
              value={aLiters}
              min={0}
              max={200}
              step={5}
              unit="L/cây"
              helperText={`Khuyến cáo: ${IRRIGATION.lotA.min}–${IRRIGATION.lotA.max} L/cây/lần`}
              onChange={setALiters}
            />
            <NumberStepper
              label="Số cây Lô A"
              value={aCount}
              min={0}
              max={500}
              step={1}
              unit="cây"
              onChange={setACount}
            />
          </div>

          <div className="space-y-3 p-3.5 rounded-md bg-bg border border-outline">
            <h3 className="text-body font-bold text-text">Lô B (cây trưởng thành / nuôi trái)</h3>
            <NumberStepper
              label="Lượng nước mỗi cây"
              value={bLiters}
              min={0}
              max={500}
              step={10}
              unit="L/cây"
              helperText={`Khuyến cáo nuôi trái: ${IRRIGATION.lotB.min}–${IRRIGATION.lotB.max} L/cây/lần`}
              onChange={setBLiters}
            />
            <NumberStepper
              label="Số cây Lô B / cá thể"
              value={bCount}
              min={0}
              max={500}
              step={1}
              unit="cây"
              onChange={setBCount}
            />
          </div>
        </div>

        <NumberStepper
          label="Số lần tưới mỗi tuần"
          value={perWeek}
          min={1}
          max={14}
          step={1}
          unit="lần/tuần"
          onChange={setPerWeek}
        />
      </Card>

      {/* Sprinkler placement rules (SPEC §3.3) */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-surface-2 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-water shrink-0" aria-hidden="true" />
          <h3 className="text-title font-bold text-text">Quy tắc đặt béc tưới gốc</h3>
        </div>
        <ListItem
          leadingIcon={<AlertTriangle className="w-5 h-5" />}
          leadingTone="danger"
          title="Lưu ý sống còn"
          subtitle={SPRINKLER_RULES.common}
        />
        <ListItem
          divider
          leadingIcon={<Droplets className="w-5 h-5" />}
          leadingTone="water"
          title="Béc cho Lô A (cây kiến thiết)"
          subtitle={SPRINKLER_RULES.lotA}
        />
        <ListItem
          divider
          leadingIcon={<Droplets className="w-5 h-5" />}
          leadingTone="water"
          title="Béc cho Lô B (cây trưởng thành)"
          subtitle={SPRINKLER_RULES.lotB}
        />
      </Card>
    </div>
  );
}
