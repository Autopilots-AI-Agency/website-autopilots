import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";

export function encryptedRecords(secret, organizationId) {
  if (!secret || secret.length < 32 || !organizationId)
    throw new Error("store_configuration_required");
  const key = createHash("sha256").update(secret).digest();
  const aad = Buffer.from(organizationId);
  return {
    encode(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(aad);
      const body = Buffer.concat([
        cipher.update(JSON.stringify(value)),
        cipher.final(),
      ]);
      return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
    },
    decode(value) {
      const bytes = Buffer.from(value, "base64");
      const cipher = createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(0, 12),
      );
      cipher.setAAD(aad);
      cipher.setAuthTag(bytes.subarray(12, 28));
      return JSON.parse(
        Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]),
      );
    },
  };
}

// Pilot-only operational ledger, not a CRM. Strong reads and conditional writes
// serialize admissions across instances. Persist reservations BEFORE provider I/O.
export class BlobConsultantStore {
  constructor(blobs, secret, org, clock = Date.now) {
    this.blobs = blobs;
    this.codec = encryptedRecords(secret, org);
    this.org = org;
    this.clock = clock;
    this.key = `ledger/${createHash("sha256").update(org).digest("hex")}`;
    this.owner = randomUUID();
    this.state = { records: {}, audit: [] };
    this.held = false;
  }
  async acquire() {
    const old = await this.blobs.getWithMetadata(this.key, {
      type: "json",
      consistency: "strong",
    });
    if (old?.data?.lease?.expiresAt > this.clock())
      throw new Error("consultant_busy");
    if (old) this.state = this.codec.decode(old.data.payload);
    const expiresAt = this.clock() + 120000;
    const result = await this.blobs.setJSON(
      this.key,
      {
        lease: { owner: this.owner, expiresAt },
        payload: this.codec.encode(this.state),
      },
      old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
    );
    if (!result.modified || !result.etag) throw new Error("consultant_busy");
    this.etag = result.etag;
    this.expiresAt = expiresAt;
    this.held = true;
    return this;
  }
  async checkpoint(release = false) {
    if (!this.held || this.expiresAt <= this.clock())
      throw new Error("lease_lost");
    const expiresAt = release ? 0 : this.clock() + 120000;
    const result = await this.blobs.setJSON(
      this.key,
      {
        lease: { owner: this.owner, expiresAt },
        payload: this.codec.encode(this.state),
      },
      { onlyIfMatch: this.etag },
    );
    if (!result.modified || !result.etag) {
      this.held = false;
      throw new Error("lease_lost");
    }
    this.etag = result.etag;
    this.expiresAt = expiresAt;
    this.held = !release;
  }
  get(kind, id) {
    return structuredClone(this.state.records[kind]?.[id] ?? null);
  }
  list(kind) {
    return structuredClone(Object.values(this.state.records[kind] || {}));
  }
  put(kind, value) {
    if (!this.held || value.organizationId !== this.org)
      throw new Error("scope_mismatch");
    if (!this.state.records[kind]) this.state.records[kind] = {};
    // IDs are server-generated; reject prototype keys defensively.
    if (["__proto__", "constructor", "prototype"].includes(value.id))
      throw new Error("invalid_id");
    this.state.records[kind][value.id] = structuredClone(value);
    this.state.audit.push({
      kind,
      id: value.id,
      status: value.status,
      at: this.clock(),
    });
    return structuredClone(value);
  }
  transaction(fn) {
    const before = structuredClone(this.state);
    try {
      const result = fn();
      if (result?.then) throw new Error("async_transaction_forbidden");
      return result;
    } catch (e) {
      this.state = before;
      throw e;
    }
  }
  prune(now = this.clock()) {
    for (const [kind, records] of Object.entries(this.state.records)) {
      if (kind === "suppression") continue;
      for (const [id, record] of Object.entries(records))
        if (record.createdAt < now - 7 * 86400000) delete records[id];
    }
    this.state.audit = this.state.audit.filter(
      (x) => x.at >= now - 90 * 86400000,
    );
  }
}
