import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface PlaceholderTabProps {
  tab: 'pruning' | 'reference';
  onBackOverview: () => void;
}

export function PlaceholderTab({ tab, onBackOverview }: PlaceholderTabProps) {
  if (tab === 'pruning') {
    return (
      <EmptyState
        illustration="camera"
        title="Phân tích cắt tỉa & 3 góc chụp chuẩn"
        description="Sắp có: kiểm tra 6 dấu hiệu cắt tỉa, tự gợi ý mức độ (Không cần / Nhẹ / Vừa / Mạnh), nhắc bỏ chồi gốc ghép và lưu 3 góc chụp tán cây."
        action={
          <Button variant="tonal" onClick={onBackOverview}>
            Quay lại Tổng quan
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      illustration="logs"
      title="Tra cứu phác đồ & Máy tính Ri6"
      description="Sắp có: tra cứu 8 phác đồ sâu bệnh theo hoạt chất & thời gian cách ly, tính mốc nuôi trái Ri6 (0–105 ngày) và tính lượng nước béc tưới."
      action={
        <Button variant="tonal" onClick={onBackOverview}>
          Quay lại Tổng quan
        </Button>
      }
    />
  );
}
