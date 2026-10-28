import { AsyncLocalStorage } from "node:async_hooks";

// A request-scoped adapter lets the unchanged campaign handlers run on Rumata.
// Netlify remains the default; concurrent requests never share another store.
const stores = new AsyncLocalStorage();

export const withLegacyStores = (factory, run) => stores.run(factory, run);

export const getLegacyStore = async (options) => {
  const factory = stores.getStore();
  if (factory)
    return factory(typeof options === "string" ? options : options.name);
  const { getStore } = await import("@netlify/blobs");
  return getStore(options);
};
