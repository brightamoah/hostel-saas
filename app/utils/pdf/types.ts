export type DateType = "short" | "long" | "medium";

export interface BrandingContext {
  name?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export interface DynamicReportOptions {
  title: string;
  config: ReportConfigSchema;
  data: Record<string, any>[];
  hostelName?: string;
  hostelAddress?: string;
}
