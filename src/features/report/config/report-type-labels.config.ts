import { ReportType } from '../enum/ReportType.enum';

export interface ReportTypeLabel {
  value: ReportType;
  label: string;
  description?: string;
}

export const REPORT_TYPE_LABELS: ReportTypeLabel[] = [
  {
    value: ReportType.MAINTENANCE,
    label: 'Yêu cầu bảo trì',
    description: 'Yêu cầu bảo trì, sửa chữa tài sản',
  },
  {
    value: ReportType.BUY_NEW,
    label: 'Đề xuất mua mới',
    description: 'Đề xuất mua tài sản mới',
  },
  {
    value: ReportType.DAMAGED,
    label: 'Thiết bị hư hỏng',
    description: 'Báo cáo tài sản bị hư hỏng',
  },
  {
    value: ReportType.LOST,
    label: 'Thất lạc',
    description: 'Báo cáo tài sản bị thất lạc',
  },
  {
    value: ReportType.OTHER,
    label: 'Khác',
    description: 'Báo cáo khác',
  },
];

/**
 * Get label by report type value
 */
export function getReportTypeLabel(type: ReportType): string {
  const found = REPORT_TYPE_LABELS.find((item) => item.value === type);
  return found ? found.label : type;
}

/**
 * Get all report types as key-value object
 */
export function getReportTypeLabelsObject(): Record<ReportType, string> {
  return REPORT_TYPE_LABELS.reduce(
    (acc, item) => {
      acc[item.value] = item.label;
      return acc;
    },
    {} as Record<ReportType, string>,
  );
}
