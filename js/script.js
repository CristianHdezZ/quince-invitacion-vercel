document.addEventListener('DOMContentLoaded', () => {

  /* =========================================================
     0. PORTADA — botón "abrir invitación"
     ========================================================= */
  const gate = document.getElementById('gate');
  const gateBtn = document.getElementById('gateBtn');
  const musicToggleRef = document.getElementById('musicToggle');
  const musicRef = document.getElementById('bgMusic');

  gateBtn.addEventListener('click', () => {
    gate.classList.add('is-closed');
    document.body.classList.remove('gate-active');
    window.scrollTo({ top:0 });

    // Intenta iniciar la música de fondo al abrir la invitación.
    musicRef.play().then(() => {
      musicToggleRef.setAttribute('aria-pressed','true');
      musicToggleRef.setAttribute('aria-label','Pausar música');
    }).catch(() => { /* el navegador puede bloquearlo; el botón flotante sigue disponible */ });
  });

  /* =========================================================
     1. ENREDADERA — crece según el progreso de scroll
     ========================================================= */
  const vinePath = document.getElementById('vinePath');
  const vineLength = vinePath.getTotalLength();
  vinePath.style.strokeDasharray = vineLength;
  vinePath.style.strokeDashoffset = vineLength;

  function updateVine(){
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(scrollTop / docHeight, 1);
    vinePath.style.strokeDashoffset = vineLength - (vineLength * progress);
  }
  window.addEventListener('scroll', updateVine, { passive:true });
  updateVine();

  /* =========================================================
     2. REVEAL ON SCROLL
     ========================================================= */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold:0.2 });
  revealEls.forEach(el => revealObserver.observe(el));

  /* =========================================================
     3. DOT NAV — sección activa
     ========================================================= */
  const dotLinks = document.querySelectorAll('.dot-nav a');
  const sections = [...dotLinks].map(link => document.querySelector(link.getAttribute('href')));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        const id = '#' + entry.target.id;
        dotLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === id));
      }
    });
  }, { threshold:0.5 });
  sections.forEach(sec => sec && sectionObserver.observe(sec));

  /* =========================================================
     4. CUENTA REGRESIVA
     ========================================================= */
  const countdownEl = document.getElementById('countdown');
  const targetDate = new Date(countdownEl.dataset.date).getTime();

  const elDays  = document.getElementById('cd-days');
  const elHours = document.getElementById('cd-hours');
  const elMins  = document.getElementById('cd-mins');
  const elSecs  = document.getElementById('cd-secs');

  function pad(n){ return String(n).padStart(2,'0'); }

  function tickCountdown(){
    const now = Date.now();
    let diff = targetDate - now;

    if (diff <= 0){
      elDays.textContent = elHours.textContent = elMins.textContent = elSecs.textContent = '00';
      clearInterval(countdownTimer);
      return;
    }
    const days  = Math.floor(diff / (1000*60*60*24));
    diff -= days * (1000*60*60*24);
    const hours = Math.floor(diff / (1000*60*60));
    diff -= hours * (1000*60*60);
    const mins  = Math.floor(diff / (1000*60));
    diff -= mins * (1000*60);
    const secs  = Math.floor(diff / 1000);

    elDays.textContent  = pad(days);
    elHours.textContent = pad(hours);
    elMins.textContent  = pad(mins);
    elSecs.textContent  = pad(secs);
  }
  tickCountdown();
  const countdownTimer = setInterval(tickCountdown, 1000);

  /* =========================================================
     5. GALERÍA + LIGHTBOX
     ========================================================= */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  document.querySelectorAll('.galeria__item').forEach(btn => {
    btn.addEventListener('click', () => {
      lightboxImg.src = btn.dataset.full;
      lightboxImg.alt = btn.querySelector('img').alt;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden','false');
    });
  });

  function closeLightbox(){
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden','true');
    lightboxImg.src = '';
  }
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  /* =========================================================
     6. MÚSICA DE FONDO
     ========================================================= */
  const music = document.getElementById('bgMusic');
  const musicToggle = document.getElementById('musicToggle');

  musicToggle.addEventListener('click', () => {
    if (music.paused){
      music.play().catch(() => {
        console.warn('El navegador bloqueó la reproducción automática. Requiere interacción del usuario (ya cubierta por este click).');
      });
      musicToggle.setAttribute('aria-pressed','true');
      musicToggle.setAttribute('aria-label','Pausar música');
    } else {
      music.pause();
      musicToggle.setAttribute('aria-pressed','false');
      musicToggle.setAttribute('aria-label','Reproducir música');
    }
  });

  /* =========================================================
     7. RSVP — formulario de confirmación
     ========================================================= */
  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpStatus = document.getElementById('rsvpStatus');
  const rsvpSubmit = document.getElementById('rsvpSubmit');
  const endpoint = rsvpForm.dataset.endpoint;

  function setStatus(text, state){
    rsvpStatus.textContent = text;
    rsvpStatus.setAttribute('data-state', state || '');
  }

  function saveLocalBackup(data){
    try {
      const stored = JSON.parse(localStorage.getItem('rsvps') || '[]');
      stored.push(data);
      localStorage.setItem('rsvps', JSON.stringify(stored));
    } catch (err){ /* localStorage no disponible: no es crítico */ }
  }

  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: si el campo oculto viene lleno, es un bot — ignorar en silencio.
    if (rsvpForm._gotcha.value){ return; }

    const asistenciaInput = rsvpForm.querySelector('input[name="asistencia"]:checked');
    const data = {
      nombre: rsvpForm.nombre.value.trim(),
      telefono: rsvpForm.telefono.value.trim(),
      acompanantes: rsvpForm.acompanantes.value,
      asistencia: asistenciaInput ? asistenciaInput.value : '',
      mensaje: rsvpForm.mensaje.value.trim(),
      fecha: new Date().toISOString()
    };

    saveLocalBackup(data);

    const endpointConfigured = endpoint && !endpoint.includes('TU_ID');

    if (!endpointConfigured){
      // No hay backend configurado todavía: guarda solo localmente y avisa.
      console.warn('RSVP: configura data-endpoint en el <form id="rsvpForm"> con tu URL de Formspree para recibir confirmaciones reales. Por ahora solo se guardó localmente.');
      setStatus(
        data.asistencia === 'si'
          ? '¡Gracias, ' + data.nombre + '! (Guardado local — falta conectar el formulario a un backend real, ver README)'
          : 'Gracias por avisarnos, ' + data.nombre + '. (Guardado local — falta conectar el backend)',
        'ok'
      );
      rsvpForm.reset();
      return;
    }

    rsvpSubmit.disabled = true;
    rsvpSubmit.textContent = 'Enviando…';
    setStatus('Enviando tu confirmación…', '');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok){
        setStatus(
          data.asistencia === 'si'
            ? '¡Gracias, ' + data.nombre + '! Tu asistencia quedó confirmada. 💕'
            : 'Gracias por avisarnos, ' + data.nombre + '. ¡Te extrañaremos!',
          'ok'
        );
        rsvpForm.reset();
      } else if (response.status === 409){
        setStatus('Ya existe una confirmación registrada con este número de teléfono. Si crees que es un error, escríbenos directamente.', 'error');
      } else {
        setStatus('No pudimos enviar tu confirmación. Inténtalo de nuevo en un momento.', 'error');
      }
    } catch (err){
      setStatus('Sin conexión. Tu respuesta quedó guardada en este dispositivo; inténtalo de nuevo cuando tengas internet.', 'error');
    } finally {
      rsvpSubmit.disabled = false;
      rsvpSubmit.textContent = 'Enviar confirmación';
    }
  });

});
