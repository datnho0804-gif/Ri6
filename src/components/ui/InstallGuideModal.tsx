import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { Modal } from './Modal';

interface InstallGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstallGuideModal({ open, onClose }: InstallGuideModalProps) {
  return (
    <Modal
      open={open}
      title="Cài app lên màn hình chính"
      subtitle="Dùng như ứng dụng gốc ngoài vườn, mở toàn màn hình và chạy offline"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="min-h-[48px] px-5 rounded-xl bg-durian-900 hover:bg-durian-950 text-white text-base font-bold transition"
        >
          Đã hiểu
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-durian-50 border border-durian-200 p-4 space-y-2">
          <p className="font-bold text-durian-900 flex items-center gap-2">
            <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
            Trên Google Chrome (Android)
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-ink">
            <li>Mở trang web này bằng <strong>Google Chrome</strong>.</li>
            <li>
              Bấm biểu tượng menu <strong>⋮</strong> ở góc trên bên phải.
            </li>
            <li>
              Chọn <strong>&ldquo;Cài đặt ứng dụng&rdquo;</strong> hoặc{' '}
              <strong>&ldquo;Thêm vào màn hình chính&rdquo;</strong> rồi xác nhận.
            </li>
          </ol>
        </div>

        <div className="rounded-xl bg-basalt-50 border border-basalt-200 p-4 space-y-2">
          <p className="font-bold text-basalt-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 shrink-0" aria-hidden="true" />
            Mẹo cho máy Xiaomi / HyperOS
          </p>
          <p className="text-ink leading-relaxed">
            Nếu cài xong mà chưa thấy biểu tượng ngoài màn hình chính, hãy vào:{' '}
            <strong>
              Cài đặt → Ứng dụng → Chrome → Quyền → bật &ldquo;Lối tắt màn hình chính&rdquo;
            </strong>
            , sau đó thêm lại.
          </p>
        </div>

        <p className="text-sm text-ink-muted flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-status-ok shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Sau lần mở đầu tiên, ứng dụng tự lưu dữ liệu giao diện và tự cập nhật khi có phiên bản mới.
          </span>
        </p>
      </div>
    </Modal>
  );
}
