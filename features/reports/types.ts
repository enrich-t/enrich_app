export type ReportContent = {
  business_name?: string;
  contact_info?: string;
  overview?: {
    growth_transparency_info?: string;
    claim_confidence?: { unverified?: number; estimated?: number; verified?: number };
  };
  goals?: string;
  certifications?: string;
  sections?: {
    operations_information?: string;
    localimpact_information?: string;
    peoplepartners_information?: string;
    unwto_information?: string;
    ctc_information?: string;
  };
  insights?: {
    local_supplier_details?: string;
    employee_details?: string;
    economic_details?: string;
  };
  recommendations?: {
    goals?: string;
    operations?: string;
  };
};

export type ReportRow = {
  id: string;
  report_type: string;
  created_at?: string;
  content: ReportContent;
  exports?: {
    pdf_url?: string;
    csv_url?: string;
    json_url?: string;
  };
};
