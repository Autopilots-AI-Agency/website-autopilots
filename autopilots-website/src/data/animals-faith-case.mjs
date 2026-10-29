// Public case data only. Never import customer records, calls or provider credentials.
// Results stay empty until the same six-month period is reconciled and approved.
export const caseResults = {
  approved: false,
  period: null,
  appointments: null,
  minutes: null,
  hoursSaved: null,
  manualMinutesPerCall: 10,
};

// Supplied by the client for this local design, not independently measured.
// Keep the source and reporting period visible; do not label this live.
export const suppliedCaseMetrics = [
  { key: 'appointments', value: 300, label: 'Afspraken ingepland', suffix: '+', decimals: 0 },
  { key: 'calls', value: 2000, label: 'Oproepen verwerkt', suffix: '+', decimals: 0 },
  { key: 'hoursSaved', value: 90, label: 'Uren bespaard', suffix: '+', decimals: 0 },
  { key: 'availability', value: 99.8, label: 'Beschikbaarheid', suffix: '%', decimals: 1 },
].map(metric => ({ ...metric, source: 'client-supplied', period: '2026' }));

export const specialistAgents = [
  { name: 'Adoptie', detail: 'Brengt de wensen en situatie van de beller in kaart en betrekt de informatie over het dier.', outcome: 'Een passende kennismaking voorbereiden' },
  { name: 'Donaties', detail: 'Herkenning van vragen over doneren en ondersteuning van Animals Faith.', outcome: 'De juiste informatie en vervolgstap' },
  { name: 'Gedragsproblemen', detail: 'Vraagt door over het gedrag en de situatie, zodat duidelijk wordt welke begeleiding nodig kan zijn.', outcome: 'Een gerichte hulpvraag' },
  { name: 'Stage & vrijwilligerswerk', detail: 'Brengt interesse, beschikbaarheid en de vraag van een kandidaat in kaart.', outcome: 'Context voor het team' },
  { name: 'Pension', detail: 'Vraagt naar het dier, de gewenste periode en wat belangrijk is voor het verblijf.', outcome: 'Een duidelijke pensionaanvraag' },
  { name: 'Afstand doen', detail: 'Brengt zorgvuldig in kaart waarom iemand afstand wil doen en welke informatie relevant is.', outcome: 'Een aanvraag voor beoordeling' },
  { name: 'Urgente situaties', detail: 'Herkent dat een vraag menselijke aandacht nodig heeft en ondersteunt de afgesproken opvolging.', outcome: 'Menselijke beoordeling waar nodig' },
];

export function publicResults(data = caseResults) {
  const valid = data.approved === true && typeof data.period === 'string' && data.period.trim().length > 0;
  return ['appointments', 'minutes', 'hoursSaved'].map(key => ({
    key,
    value: valid && typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0 ? data[key] : null,
  }));
}
