'use client';
import * as React from 'react';

export type ReportTypeId = 'business_overview' | 'local_impact' | 'energy_resources';

export type ReportType = {
  id: ReportTypeId;
  title: string;
  description: string;
  metrics: string[];
  icon: React.ReactNode;
  badge?: string;
  accent: string;
  endpoint?: string;
  enabled: boolean;
  template?: { embedSrc: string; viewUrl: string; templateId?: string };
};

export const COST_PER_REPORT = 1;

export const CANVA_BUSINESS_OVERVIEW = {
  embedSrc:
    'https://www.canva.com/design/DAGs_hzrmK4/fCjSsXKE_u9y2P47Vv3w5Q/view?embed',
  viewUrl:
    'https://www.canva.com/design/DAGs_hzrmK4/fCjSsXKE_u9y2P47Vv3w5Q/view?utm_content=DAGs_hzrmK4&utm_campaign=designshare&utm_medium=embeds&utm_source=link',
  templateId: 'DAGs_hzrmK4',
};

export const REPORT_TYPES: ReportType[] = [
  {
    id: 'business_overview',
    title: 'Business Overview',
    description: 'Comprehensive analysis of your business performance and key metrics',
    metrics: ['Revenue Growth', 'Market Share', 'Operational Efficiency'],
    icon: <span style={{ fontSize: 20 }}>📊</span>,
    badge: '2 days ago',
    accent: '#2a2343',
    endpoint: '/api/reports/generate-business-overview',
    enabled: true,
    template: CANVA_BUSINESS_OVERVIEW,
  },
  {
    id: 'local_impact',
    title: 'Local Impact',
    description: 'Community engagement and local market influence assessment',
    metrics: ['Community Reach', 'Local Partnerships', 'Regional Growth'],
    icon: <span style={{ fontSize: 20 }}>🌐</span>,
    badge: '1 week ago',
    accent: '#1f3726',
    enabled: false,
  },
  {
    id: 'energy_resources',
    title: 'Energy & Resources',
    description: 'Sustainability metrics and resource utilization analysis',
    metrics: ['Energy Efficiency', 'Carbon Footprint', 'Resource Usage'],
    icon: <span style={{ fontSize: 20 }}>⚡</span>,
    badge: '3 days ago',
    accent: '#3a2f19',
    enabled: false,
  },
];
