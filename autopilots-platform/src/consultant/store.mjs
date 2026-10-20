import { DatabaseSync } from "node:sqlite";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

// Dedicated module storage, NOT a CRM or identity store. One Render instance and
// one attached persistent disk; SQLite transactions also coordinate local workers.
export class ConsultantStore {
  constructor(path, secret, organizationId) {
    if (!secret || secret.length < 32 || !organizationId)
      throw new Error("store_configuration_required");
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.key = createHash("sha256").update(secret).digest();
    this.org = organizationId;
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,org TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(org,kind,id));
      CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY,org TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,status TEXT NOT NULL,at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS nonces(org TEXT NOT NULL,id TEXT NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(org,id));`);
  }
  encode(value) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(this.org));
    const body = Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
  }
  decode(value) {
    const bytes = Buffer.from(value, "base64");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      bytes.subarray(0, 12),
    );
    cipher.setAAD(Buffer.from(this.org));
    cipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]),
    );
  }
  get(kind, id) {
    const row = this.db
      .prepare("SELECT payload FROM records WHERE org=? AND kind=? AND id=?")
      .get(this.org, kind, id);
    return row ? this.decode(row.payload) : null;
  }
  list(kind) {
    return this.db
      .prepare(
        "SELECT payload FROM records WHERE org=? AND kind=? ORDER BY created",
      )
      .all(this.org, kind)
      .map((row) => this.decode(row.payload));
  }
  put(kind, value) {
    if (value.organizationId !== this.org) throw new Error("scope_mismatch");
    this.db
      .prepare(
        "INSERT INTO records VALUES(?,?,?,?,?,?) ON CONFLICT(org,kind,id) DO UPDATE SET status=excluded.status,payload=excluded.payload",
      )
      .run(
        kind,
        value.id,
        this.org,
        value.status,
        value.createdAt,
        this.encode(value),
      );
    this.db
      .prepare("INSERT INTO audit(org,kind,id,status,at) VALUES(?,?,?,?,?)")
      .run(this.org, kind, value.id, value.status, Date.now());
    return value;
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      if (result?.then) throw new Error("async_transaction_forbidden");
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  nonce(id, now) {
    return this.transaction(() => {
      this.db
        .prepare("DELETE FROM nonces WHERE org=? AND expires<?")
        .run(this.org, now);
      this.db
        .prepare("INSERT INTO nonces VALUES(?,?,?)")
        .run(this.org, id, now + 300000);
    });
  }
  close() {
    this.db.close();
  }
  prune(now = Date.now()) {
    this.transaction(() => {
      // Dossiers and capability tokens are short-lived; suppression holds only a
      // keyed hash. Audit evidence contains no raw phone, transcript or answers.
      this.db
        .prepare(
          "DELETE FROM records WHERE org=? AND kind!='suppression' AND created<?",
        )
        .run(this.org, now - 7 * 86400000);
      this.db
        .prepare("DELETE FROM audit WHERE org=? AND at<?")
        .run(this.org, now - 90 * 86400000);
    });
  }
}
