/** Local admission limits bound password hashing memory and repeated credential attempts.
 * Multi-replica/public deployments also need a shared ingress or database rate limit.
 */
export function accountLimits(now: () => number = Date.now) {
    const attempts = new Map<string, { count: number; until: number }>();
    let active = 0;
    const windowMs = 10 * 60 * 1000;
    return {
        acquire(email: string): (() => void) | null {
            const time = now();
            if (active >= 2) return null;
            let entry = attempts.get(email);
            if (!entry || entry.until <= time) {
                // Cleanup only when allocating a bucket; never evict a live limit.
                for (const [key, value] of attempts) if (value.until <= time) attempts.delete(key);
                if (attempts.size >= 10000) return null;
                entry = { count: 0, until: time + windowMs };
                attempts.set(email, entry);
            }
            if (entry.count >= 20) return null;
            entry.count++;
            active++;
            let released = false;
            return () => { if (!released) { active--; released = true; } };
        },
    };
}

