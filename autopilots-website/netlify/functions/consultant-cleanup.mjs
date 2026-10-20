import { n8nConfiguration, ticketStore } from "./_shared/consultant-n8n.mjs";
import { getStore } from "@netlify/blobs";
import { BlobConsultantStore } from "../../../autopilots-platform/src/consultant/blob-store.mjs";

// Netlify invokes this schedule; it cannot start a call or contact any provider.
// Cleanup still runs with calling disabled, once storage has been configured.
export default async function () {
  if (
    !process.env.CONSULTANT_STORAGE_SECRET ||
    !process.env.CONSULTANT_ORGANIZATION_ID
  )
    return;
  await ticketStore(n8nConfiguration()).prune();
  const store = new BlobConsultantStore(
    getStore({
      name: "autopilots-consultant-ledger-v1",
      consistency: "strong",
    }),
    process.env.CONSULTANT_STORAGE_SECRET,
    process.env.CONSULTANT_ORGANIZATION_ID,
  );
  try {
    await store.acquire();
  } catch (e) {
    if (e.message === "consultant_busy") return;
    throw e;
  }
  try {
    store.prune();
  } finally {
    await store.checkpoint(true);
  }
}
export const config = { schedule: "@hourly" };
