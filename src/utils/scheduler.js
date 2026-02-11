const timers = new Map();

export function schedule(id, ms, fn) {
  if (timers.has(id)) clearTimeout(timers.get(id));
  const t = setTimeout(async () => {
    timers.delete(id);
    try {
      await fn();
    } catch {}
  }, Math.max(0, ms));
  timers.set(id, t);
}

export function cancel(id) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}
