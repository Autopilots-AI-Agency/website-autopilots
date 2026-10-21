import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Database } from './database.ts';

const copy: Record<string, string[]> = {
 nl: ['Je persoonlijke AI-analyse', 'Jouw volgende stap begint hier.', 'Op basis van jouw antwoorden', 'Mogelijkheden voor jouw bedrijf', 'Wat we nog samen afstemmen', 'Volgende stap', 'Beantwoord deze e-mail', 'Je ontvangt deze analyse omdat je die hebt aangevraagd bij Autopilots.', 'Dit is een test van de nieuwe Rumata-koppeling. De analyse hieronder gebruikt een fictieve intake.'],
 en: ['Your personal AI analysis', 'Your next step starts here.', 'Based on your answers', 'Opportunities for your business', 'What we still need to clarify together', 'Next step', 'Reply to this email', 'You received this analysis because you requested it from Autopilots.', 'This is a test of the new Rumata integration. The analysis below uses a fictional intake.'],
 de: ['Deine persönliche KI-Analyse', 'Dein nächster Schritt beginnt hier.', 'Auf Basis deiner Antworten', 'Möglichkeiten für dein Unternehmen', 'Was wir noch gemeinsam klären', 'Nächster Schritt', 'Antworte auf diese E-Mail', 'Du erhältst diese Analyse, weil du sie bei Autopilots angefordert hast.', 'Dies ist ein Test der neuen Rumata-Anbindung. Die folgende Analyse verwendet fiktive Angaben.'],
 fr: ['Votre analyse IA personnalisée', 'Votre prochaine étape commence ici.', 'Selon vos réponses', 'Des possibilités pour votre entreprise', 'Ce que nous devons encore préciser ensemble', 'Prochaine étape', 'Répondez à cet e-mail', 'Vous recevez cette analyse car vous en avez fait la demande auprès d’Autopilots.', 'Ceci est un test de la nouvelle intégration Rumata. L’analyse ci-dessous utilise un questionnaire fictif.'],
 es: ['Tu análisis de IA personalizado', 'Tu siguiente paso empieza aquí.', 'Según tus respuestas', 'Oportunidades para tu empresa', 'Lo que aún debemos aclarar juntos', 'Siguiente paso', 'Responde a este correo', 'Recibes este análisis porque lo has solicitado a Autopilots.', 'Esta es una prueba de la nueva integración con Rumata. El análisis siguiente utiliza datos ficticios.'],
 it: ['La tua analisi IA personalizzata', 'Il tuo prossimo passo inizia qui.', 'In base alle tue risposte', 'Opportunità per la tua azienda', 'Cosa dobbiamo ancora chiarire insieme', 'Prossimo passo', 'Rispondi a questa email', 'Ricevi questa analisi perché l’hai richiesta ad Autopilots.', 'Questo è un test della nuova integrazione Rumata. L’analisi seguente utilizza dati fittizi.'],
};
export interface MailReport {
 company: string; summary: string; nextStep: string; unknowns: string[];
 recommendations: { title: string; why: string; benefit: string; workflow: string[]; conditions: string[] }[];
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function analysisEmail(locale: string, report: MailReport, testMode = false) {
 const c = copy[locale];
 if (!c) throw new Error('Unsupported locale');
 const e = escapeHtml;
 const subject = (testMode ? '[TEST Rumata] ' : '') + c[0] + ' — Autopilots';
 const recommendations = report.recommendations.map(r => '<tr><td style="padding:22px 0;border-bottom:1px solid #3c4d53"><h3 style="margin:0 0 10px;font-size:20px;color:#f6f2e9">' + e(r.title) + '</h3><p style="margin:0 0 10px;line-height:1.7;color:#b8c8cc">' + e(r.why) + '</p><p style="margin:0;line-height:1.7;color:#f6f2e9">' + e(r.benefit) + '</p></td></tr>').join('');
 const text = [testMode ? c[8] : '', c[0], report.company, c[2], report.summary, c[3],
 ...report.recommendations.flatMap(r => [r.title, r.why, r.benefit]), c[4], ...report.unknowns, c[5], report.nextStep,
 c[6] + ': support@auto-pilots.io', c[7]].filter(Boolean).join('\n\n');
 const html = '<!doctype html><html lang="' + locale + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(c[0]) + '</title></head><body style="margin:0;background:#101f26;color:#f6f2e9;font-family:Public Sans,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#101f26"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%"><tr><td style="padding:0 0 30px;color:#c18b5d;font-size:15px;letter-spacing:4px;font-weight:700">AUTOPILOTS</td></tr>' +
 (testMode ? '<tr><td style="padding:18px;background:#2b3940;border:1px solid #c18b5d;color:#f6f2e9;line-height:1.6">' + e(c[8]) + '</td></tr>' : '') +
 '<tr><td style="padding:28px 0"><p style="margin:0 0 16px;color:#c18b5d;font-size:12px;letter-spacing:2px">' + e(c[2]) + '</p><h1 style="margin:0 0 18px;font-size:34px;line-height:1.15;color:#f6f2e9">' + e(c[1]) + '</h1><p style="margin:0;font-size:17px;line-height:1.8;color:#b8c8cc">' + e(report.summary) + '</p></td></tr>' +
 '<tr><td style="padding:26px;background:#1b3039;border:1px solid #4d514a;border-radius:24px"><h2 style="margin:0;font-size:23px;color:#f6f2e9">' + e(c[3]) + '</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + recommendations + '</table><h2 style="margin:26px 0 12px;font-size:20px;color:#c18b5d">' + e(c[4]) + '</h2>' + report.unknowns.map(u => '<p style="margin:10px 0;color:#b8c8cc;line-height:1.6">' + e(u) + '</p>').join('') +
 '<h2 style="margin:26px 0 12px;font-size:20px;color:#c18b5d">' + e(c[5]) + '</h2><p style="color:#f6f2e9;line-height:1.7">' + e(report.nextStep) + '</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#9b6343"><a href="mailto:support@auto-pilots.io" style="display:inline-block;padding:16px 24px;color:#fff;text-decoration:none;font-weight:700">' + e(c[6]) + '</a></td></tr></table></td></tr><tr><td style="padding:26px 0;color:#a7b7bc;font-size:12px;line-height:1.7">AUTOPILOTS<br>' + e(c[7]) + '</td></tr></table></td></tr></table></body></html>';
 return {subject, html, text};
}
export async function sendAnalysisEmail(key: string, id: string, to: string, message: ReturnType<typeof analysisEmail>, send: typeof fetch = fetch) {
 const response = await send('https://api.resend.com/emails', {
  method:'POST', signal:AbortSignal.timeout(12000),
  headers:{authorization:'Bearer ' + key,'content-type':'application/json','idempotency-key':'autopilots-scan-email-' + id},
  body:JSON.stringify({from:'Autopilots <support@auto-pilots.io>',to:[to],reply_to:'support@auto-pilots.io',...message}),
 });
 if (!response.ok) throw Object.assign(new Error('Email provider rejected request'), {code:'EMAIL_PROVIDER_' + response.status});
 const data = await response.json() as {id?: unknown};
 if (typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.id)) throw new Error('Invalid email provider receipt');
 return data.id;
}

export async function registerScanEmail(app: FastifyInstance, db: Database | null, env: NodeJS.ProcessEnv) {
 if (env.SCAN_ENABLED !== 'true' || env.SCAN_EMAIL_ENABLED !== 'true') return;
 if (!db || !env.RESEND_API_KEY) throw new Error('Email binding required');
 const deliveries = db.schema + '.scan_email_deliveries';
 const jobs = db.schema + '.scan_jobs';
 const audit = db.schema + '.scan_audit';
 await db.pool.query(`CREATE TABLE IF NOT EXISTS ${deliveries} (
   job_id uuid PRIMARY KEY REFERENCES ${jobs}(id), recipient_hash text NOT NULL, state text NOT NULL,
   provider_id uuid, reserved_units integer NOT NULL DEFAULT 1, cost_usd numeric,
   created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
 )`);
 app.post<{Params:{id:string};Body:{email:string;consent:boolean}}>('/scans/:id/email', {
  config:{public:true},schema:{security:[],summary:'Email an owned completed scan',
   params:{type:'object',required:['id'],properties:{id:{type:'string',format:'uuid'}}},
   headers:{type:'object',required:['x-scan-token'],properties:{'x-scan-token':{type:'string',pattern:'^[a-zA-Z0-9_-]{43,128}$'}}},
   body:{type:'object',additionalProperties:false,required:['email','consent'],properties:{email:{type:'string',format:'email',maxLength:254},consent:{const:true}}},
  },
 }, async(request,reply) => {
  reply.header('cache-control','no-store');
  const mailKey=env.RESEND_API_KEY?.trim();
  if (!mailKey || !/^re_[A-Za-z0-9_-]+$/.test(mailKey)) return reply.code(503).send({error:'email_binding_invalid'});
  const id=request.params.id;
  const email=request.body.email.trim().toLowerCase();
  if (env.SCAN_EMAIL_TEST_MODE === 'true' && email !== 'tim@auto-pilots.io') return reply.code(403).send({error:'test_recipient_only'});
  const cap=digest(String(request.headers['x-scan-token']));
  const job=(await db.pool.query(`SELECT capability_hash,state,result,input FROM ${jobs} WHERE id=$1 AND expires_at>now()`,[id])).rows[0];
  if (!job || !timingSafeEqual(Buffer.from(cap,'hex'),Buffer.from(job.capability_hash,'hex'))) return reply.code(404).send({error:'not_found'});
  if (job.state !== 'succeeded') return reply.code(409).send({error:'scan_not_ready'});
  const message=analysisEmail(String(job.input.locale),job.result,env.SCAN_EMAIL_TEST_MODE === 'true');
  const recipientHash=digest(email);
  const reserved=await db.pool.query(`WITH delivery AS (
    INSERT INTO ${deliveries}(job_id,recipient_hash,state) VALUES($1,$2,'sending') ON CONFLICT DO NOTHING RETURNING job_id
   ) INSERT INTO ${audit}(job_id,event,risk) SELECT job_id,'email_reserved','R2' FROM delivery RETURNING job_id`,[id,recipientHash]);
  if (!reserved.rowCount) {
   const existing=(await db.pool.query(`SELECT recipient_hash,state,provider_id FROM ${deliveries} WHERE job_id=$1`,[id])).rows[0];
   if (!existing || existing.recipient_hash !== recipientHash) return reply.code(409).send({error:'delivery_already_requested'});
   return reply.code(existing.state === 'accepted' ? 200 : 202).send({id,state:existing.state,providerId:existing.provider_id || undefined});
  }
  try {
   const providerId=await sendAnalysisEmail(mailKey,id,email,message);
   await db.pool.query(`WITH changed AS (
     UPDATE ${deliveries} SET state='accepted',provider_id=$2,updated_at=now() WHERE job_id=$1 RETURNING job_id
    ) INSERT INTO ${audit}(job_id,event,risk) SELECT job_id,'email_provider_accepted','R2' FROM changed`,[id,providerId]);
   return reply.code(200).send({id,state:'accepted',providerId});
  } catch (error) {
   const safeCode = error instanceof Error && 'code' in error && /^EMAIL_PROVIDER_[0-9]{3}$/.test(String(error.code)) ? String(error.code) : error instanceof Error && error.cause && typeof error.cause === 'object' && 'code' in error.cause ? String(error.cause.code).replace(/[^A-Z0-9_]/g,'').slice(0,60) : error instanceof Error ? error.name : 'UnknownError';
   request.log.warn({event:'scan_email_failed',provider_code:safeCode},'Scan email failed');
   await db.pool.query(`WITH changed AS (
     UPDATE ${deliveries} SET state='delivery_unknown',updated_at=now() WHERE job_id=$1 AND state='sending' RETURNING job_id
    ) INSERT INTO ${audit}(job_id,event,risk) SELECT job_id,'email_delivery_unknown','R2' FROM changed`,[id]);
   return reply.code(202).send({id,state:'delivery_unknown',...(env.SCAN_EMAIL_TEST_MODE === 'true' ? {diagnostic:safeCode} : {})});
  }
 });
}

