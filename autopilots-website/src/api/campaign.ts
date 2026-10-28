import { campaignEndpoint } from './campaign-endpoint.mjs';

export const campaignUrl = (path: '/api/funnel-lead' | '/api/funnel-event') =>
  campaignEndpoint(path, import.meta.env.VITE_AUTOPILOTS_SCAN_URL || '');
