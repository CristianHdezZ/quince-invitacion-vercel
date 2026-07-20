/**
 * Capa de almacenamiento de confirmaciones RSVP.
 *
 * En producción (Vercel) usa Upstash Redis vía su API REST — funciona en
 * funciones serverless porque no depende de una conexión persistente ni
 * de disco local.
 *
 * Si UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN no están definidas
 * (por ejemplo corriendo en local sin configurarlas), cae a un archivo en
 * /tmp. Sirve para probar rápido, pero OJO: /tmp en Vercel NO persiste
 * entre invocaciones — para producción real siempre configura Upstash.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const LIST_KEY = 'rsvps';

const hasRedis = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

async function redisCommand(command) {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

/* ---------- Fallback local (solo desarrollo, no persiste en Vercel) ---------- */
const fs = require('fs/promises');
const LOCAL_FILE = '/tmp/rsvps.json';

async function readLocal() {
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function writeLocal(list) {
  await fs.writeFile(LOCAL_FILE, JSON.stringify(list), 'utf8');
}

/* ---------- API pública del módulo ---------- */
async function appendRsvp(entry) {
  if (hasRedis) {
    await redisCommand(['RPUSH', LIST_KEY, JSON.stringify(entry)]);
  } else {
    const list = await readLocal();
    list.push(entry);
    await writeLocal(list);
  }
}

async function listRsvps() {
  if (hasRedis) {
    const raw = await redisCommand(['LRANGE', LIST_KEY, '0', '-1']);
    return (raw || []).map((r) => JSON.parse(r));
  }
  return readLocal();
}

module.exports = { appendRsvp, listRsvps, hasRedis };
