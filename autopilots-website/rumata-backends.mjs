import fs from 'node:fs';
import path from 'node:path';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const reserved = new Set(['VITE_RUMATA_API_GATEWAY_BASE_URL', 'VITE_RUMATA_BACKEND_ENVIRONMENT']);

// Bindings contain public addresses only. Runtime credentials belong to backend settings.
export function backendEnvironment(bindings, environment) {
  if (!bindings || Array.isArray(bindings) || typeof bindings !== 'object') throw new Error('Invalid rumata.backends.json');
  const variables = {};
  for (const [name, binding] of Object.entries(bindings)) {
    if (!/^VITE_[A-Z][A-Z0-9_]*$/.test(name) || reserved.has(name)) throw new Error(`Invalid backend variable: ${name}`);
    if (!binding || !uuid.test(binding.serviceId)) throw new Error(`Invalid backend service for ${name}`);
    if ((binding.productionMode !== undefined && !['rumata_permissions', 'direct'].includes(binding.productionMode))
      || (binding.developmentMode !== undefined && binding.developmentMode !== 'rumata_permissions')) throw new Error('Invalid backend endpoint mode');
    for (const target of ['production', 'development']) {
      const url = new URL(binding[target]);
      const routes = target === 'production' ? ['backend-api'] : ['backend-api', 'backend-preview'];
      const direct = target === 'production' && binding.productionMode === 'direct';
      const domains = process.env.BACKEND_DIRECT_DOMAIN ? [process.env.BACKEND_DIRECT_DOMAIN] : ['preview.rumata.xyz', 'rumata.dev'];
      const validRoute = direct
        ? url.pathname === '/' && domains.some(domain => url.hostname === `direct-backend-${binding.serviceId}.${domain}`)
        : routes.some(route => url.pathname === `/${route}/${binding.serviceId}/`);
      if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash || !validRoute) {
        throw new Error(`Invalid ${target} backend URL for ${name}. Copy frontendBinding from getBackendService.`);
      }
    }
    // Published websites route to their explicitly bound services on their own origin.
    // The platform deployer resolves the validated upstream addresses server-side.
    variables[name] = environment === 'production' ? `/backend-api/${binding.serviceId}`
      : binding[environment].replace(/\/$/, '');
  }
  return variables;
}

export function rumataBackends() {
  let filename;
  return {
    name: 'rumata-backend-bindings',
    config(config, { command }) {
      filename = path.resolve(config.root || process.cwd(), 'rumata.backends.json');
      const bindings = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {};
      // A build always uses the published site's own origin, including on development machines.
      const environment = command === 'build' ? 'production' : (process.env.RUMATA_BACKEND_ENVIRONMENT || 'development');
      if (!['development', 'production'].includes(environment)) throw new Error('Invalid RUMATA_BACKEND_ENVIRONMENT');
      const variables = backendEnvironment(bindings, environment);
      return { define: Object.fromEntries(Object.entries({ ...variables, VITE_RUMATA_BACKEND_ENVIRONMENT: environment })
        .map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)])) };
    },
    configureServer(server) {
      server.watcher.add(filename);
      const reload = file => { if (path.resolve(file) === filename) void server.restart(); };
      server.watcher.on('add', reload).on('change', reload).on('unlink', reload);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', reload).off('change', reload).off('unlink', reload);
      });
    },
  };
}

