const { listRsvps } = require('../lib/store');

const ADMIN_KEY = process.env.ADMIN_KEY || '';

module.exports = async (req, res) => {
  const key = req.query.key;
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  const list = await listRsvps();
  const header = ['nombre', 'telefono', 'asistencia', 'mensaje', 'creado'];
  const rows = list.map((r) =>
    header.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="rsvps.csv"');
  res.status(200).send(csv);
};
