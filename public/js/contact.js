// Fetches support contacts from admin settings and wires all
// [data-contact="whatsapp|telegram|email"] anchors on the page.
(async function () {
  const API = 'https://life-ktxw.onrender.com';
  try {
    const res = await fetch(API + '/api/contact');
    const data = await res.json();
    if (!data.success) return;

    const wa = data.whatsapp;
    const tg = data.telegram;
    const em = data.email;

    const waHref = wa ? (wa.startsWith('http') ? wa : 'https://wa.me/' + wa.replace(/\D/g, '')) : null;
    const tgHref = tg ? (tg.startsWith('http') ? tg : 'https://t.me/' + tg.replace(/^@/, '')) : null;
    const emHref = em ? 'mailto:' + em : null;

    document.querySelectorAll('[data-contact="whatsapp"]').forEach(el => {
      if (waHref) { el.href = waHref; el.style.display = ''; }
      else el.style.display = 'none';
    });
    document.querySelectorAll('[data-contact="telegram"]').forEach(el => {
      if (tgHref) { el.href = tgHref; el.style.display = ''; }
      else el.style.display = 'none';
    });
    document.querySelectorAll('[data-contact="email"]').forEach(el => {
      if (emHref) { el.href = emHref; el.style.display = ''; }
      else el.style.display = 'none';
    });
    // Update any visible text spans with the actual value
    document.querySelectorAll('[data-contact-text="whatsapp"]').forEach(el => { if (wa) el.textContent = wa; });
    document.querySelectorAll('[data-contact-text="telegram"]').forEach(el => { if (tg) el.textContent = tg; });
    document.querySelectorAll('[data-contact-text="email"]').forEach(el => { if (em) el.textContent = em; });
  } catch (_) {}
})();
