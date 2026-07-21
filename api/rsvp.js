const { appendRsvp, listRsvps, hasRedis } = require('../lib/store');

const ADMIN_KEY = process.env.ADMIN_KEY || '';

function sanitize(value, maxLen) {
  return typeof value === 'string' ? value.trim().slice(0, maxLen) : '';
}

// Deja solo dígitos y, si viene, el "+" inicial — así "300 123 4567",
// "(300) 123-4567" y "3001234567" se comparan como el mismo número.
function normalizePhone(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/\D/g, '');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ---- Crear una confirmación ----
  if (req.method === 'POST') {
    const body = req.body || {};

    // Honeypot anti-spam: si viene lleno, respondemos ok pero no guardamos.
    if (body._gotcha) {
      return res.status(200).json({ ok: true });
    }

    const nombre = sanitize(body.nombre, 120);
    const telefono = normalizePhone(body.telefono);
    const asistencia = body.asistencia === 'si' || body.asistencia === 'no' ? body.asistencia : null;

    // Cupo limitado: por ahora cada confirmación cuenta como un solo lugar
    // (no se aceptan acompañantes desde el formulario público).
    const acompanantes = 0;

    const mensaje = sanitize(body.mensaje, 500);

    const errors = [];
    if (!nombre) errors.push('El nombre es obligatorio.');
    if (telefono.replace('+', '').length < 7) errors.push('Ingresa un teléfono válido.');
    if (!asistencia) errors.push('Debes indicar si asistirás.');
    if (errors.length) return res.status(400).json({ ok: false, errors });

    // Evita que el mismo teléfono confirme más de una vez (cupo limitado).
    try {
      const existing = await listRsvps();
      const yaExiste = existing.some((r) => normalizePhone(r.telefono) === telefono);
      if (yaExiste) {
        return res.status(409).json({
          ok: false,
          error: 'Ya existe una confirmación registrada con este número de teléfono.'
        });
      }
    } catch (err) {
      console.error('Error verificando duplicados:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo validar la confirmación.' });
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      nombre,
      telefono,
      asistencia,
      acompanantes,
      mensaje,
      creado: new Date().toISOString()
    };

    try {
      await appendRsvp(entry);
      return res.status(200).json({ ok: true, id: entry.id });
    } catch (err) {
      console.error('Error guardando RSVP:', err);
      return res.status(500).json({ ok: false, error: 'No se pudo guardar la confirmación.' });
    }
  }

  // ---- Listar confirmaciones (protegido) ----
  if (req.method === 'GET') {
    const key = req.query.key;
    if (!ADMIN_KEY || key !== ADMIN_KEY) {
      return res.status(401).json({ ok: false, error: 'No autorizado' });
    }

    const list = await listRsvps();
    const resumen = {
      total: list.length,
      confirman: list.filter((r) => r.asistencia === 'si').length,
      declinan: list.filter((r) => r.asistencia === 'no').length,
      invitados_totales: list
        .filter((r) => r.asistencia === 'si')
        .reduce((sum, r) => sum + 1 + (r.acompanantes || 0), 0)
    };

    return res.status(200).json({
      ok: true,
      resumen,
      rsvps: list.slice().reverse(),
      storage: hasRedis ? 'upstash' : 'local-tmp (no persiste en producción, configura Upstash)'
    });
  }

  res.status(405).json({ ok: false, error: 'Método no permitido' });
};
