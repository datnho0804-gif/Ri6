import { AlertTriangle, MoreVertical, Smartphone } from 'lucide-react';
import { Banner } from './Banner';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';

interface InstallGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function InstallGuideModal({ open, onClose }: InstallGuideModalProps) {
  return (
    <Dialog
      open={open}
      title="Cài app lên điện thoại"
      subtitle="Mở toàn màn hình không cần cửa hàng ứng dụng, chạy offline hoàn toàn"
      onClose={onClose}
      footer={
        <Button variant="filled" size="lg" onClick={onClose}>
          Đã hiểu
        </Button>
      }
    >
      <div className="space-y-4">
        <Card padding="md" elevated={false} className="bg-bg">
          <h3 className="text-title font-bold text-text flex items-center gap-2 mb-2.5">
            <Smartphone className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <span>Trên Chrome Android</span>
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-body text-text-2">
            <li>
              Chạm nút menu{' '}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-2 border border-outline align-middle">
                <MoreVertical className="w-4 h-4 text-text" aria-hidden="true" />
                <span className="sr-only">ba chấm dọc</span>
              </span>{' '}
              ở góc trên bên phải trình duyệt Chrome.
            </li>
            <li>
              Chọn <strong>&ldquo;Thêm vào Màn hình chính&rdquo;</strong> (hoặc{' '}
              <strong>&ldquo;Cài đặt ứng dụng&rdquo;</strong>).
            </li>
            <li>
              Bấm <strong>Cài đặt</strong>. Biểu tượng trái sầu riêng Ri6 sẽ xuất hiện ngoài màn
              hình chính.
            </li>
          </ol>
        </Card>

        <Banner
          tone="warn"
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Mẹo cho máy Xiaomi (HyperOS / MIUI)"
        >
          Nếu đã bấm cài mà không thấy icon ngoài màn hình chính: vào{' '}
          <strong>Cài đặt máy → Ứng dụng → Chrome → Quyền khác → Lối tắt màn hình chính</strong> và
          chọn <strong>Cho phép</strong>, sau đó cài lại.
        </Banner>
      </div>
    </Dialog>
  );
}
