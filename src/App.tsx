import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { PlaceholderTab } from './components/screens/PlaceholderTab';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { InstallGuideModal } from './components/ui/InstallGuideModal';
import { Modal } from './components/ui/Modal';
import { ToastContainer } from './components/ui/ToastContainer';
import { type DatabaseInitResult, initDatabase } from './db/database';
import { usePwa } from './hooks/usePwa';
import { useToast } from './hooks/useToast';
import type { TabId, ViewId } from './types/models';

const APP_VERSION = __APP_VERSION__;

export function App() {
  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [lastTab, setLastTab] = useState<TabId>('overview');
  const [dbState, setDbState] = useState<DatabaseInitResult | null>(null);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const { toasts, showToast, dismissToast } = useToast();

  const handleUpdated = useCallback(
    (version: string) => {
      showToast(`Đã cập nhật lên v${version}`, 'success', 5000);
    },
    [showToast]
  );

  const { isOnline, isStandalone, triggerInstallPrompt } = usePwa({
    appVersion: APP_VERSION,
    onUpdated: handleUpdated,
  });

  useEffect(() => {
    let mounted = true;
    initDatabase(APP_VERSION)
      .then((result) => {
        if (!mounted) return;
        setDbState(result);
        if (result.versionError) {
          showToast('Cần cập nhật ứng dụng để đọc dữ liệu mới hơn.', 'danger', 6000);
        } else if (result.wasUpgradedFromVersion) {
          showToast(`Đã cập nhật lên v${APP_VERSION}`, 'success', 5000);
        }
      })
      .catch(() => {
        if (!mounted) return;
        showToast('Không thể khởi tạo cơ sở dữ liệu offline trên thiết bị này.', 'danger', 6000);
      });
    return () => {
      mounted = false;
    };
  }, [showToast]);

  const handleSelectView = useCallback((view: ViewId) => {
    if (view !== 'settings') {
      setLastTab(view);
    }
    setActiveView(view);
  }, []);

  const handleInstallClick = useCallback(async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome === 'accepted') {
      showToast('Đã cài Sổ Tay Vườn Ri6 ra màn hình chính!', 'success');
    } else if (outcome === 'fallback') {
      setInstallGuideOpen(true);
    }
  }, [showToast, triggerInstallPrompt]);

  return (
    <div className="min-h-dvh flex flex-col bg-sand text-ink">
      <Header
        activeView={activeView}
        onSelectView={handleSelectView}
        isOnline={isOnline}
        isStandalone={isStandalone}
        onInstallClick={() => {
          void handleInstallClick();
        }}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
        {activeView === 'settings' ? (
          <SettingsScreen
            appVersion={APP_VERSION}
            dbState={dbState}
            isStandalone={isStandalone}
            onInstallClick={() => {
              void handleInstallClick();
            }}
            onBack={() => setActiveView(lastTab)}
          />
        ) : (
          <PlaceholderTab
            tab={activeView}
            dbState={dbState}
            onDemoToast={() =>
              showToast(`Thông báo Toast hoạt động tốt (Sổ Tay Vườn Ri6 v${APP_VERSION}).`, 'success')
            }
            onDemoModal={() => setDemoModalOpen(true)}
          />
        )}
      </main>

      <MobileBottomNav activeView={activeView} onSelectTab={handleSelectView} />

      <InstallGuideModal open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />

      <Modal
        open={demoModalOpen}
        title="Kiểm tra hộp thoại Modal"
        subtitle="Hỗ trợ focus trap (phím Tab) và đóng nhanh bằng phím Esc"
        onClose={() => setDemoModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDemoModalOpen(false)}
              className="min-h-[48px] px-4 rounded-xl bg-white border border-sand-300 hover:bg-sand-100 text-ink text-base font-bold transition"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                setDemoModalOpen(false);
                showToast('Đã xác nhận từ Modal (không dùng alert/confirm).', 'info');
              }}
              className="min-h-[48px] px-5 rounded-xl bg-durian-900 hover:bg-durian-950 text-white text-base font-bold transition"
            >
              Xác nhận
            </button>
          </>
        }
      >
        <p>
          Hộp thoại này thay thế hoàn toàn <code>alert()</code> và <code>confirm()</code> mặc định
          của trình duyệt. Nhấn phím <strong>Tab</strong> để di chuyển vòng lặp bên trong hộp thoại
          hoặc nhấn <strong>Esc</strong> để đóng.
        </p>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
