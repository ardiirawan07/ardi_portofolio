/**
 * Portofolio Analytics & Supabase Tracker
 * Menghubungkan pelacakan kunjungan (visit), klik tombol (click), dan form kontak (form)
 * ke tabel 'portofolio' di Supabase.
 */

const SUPABASE_CONFIG = {
  url: 'https://tydixffpnhqpxtslamqm.supabase.co',
  key: 'sb_publishable_ydUVx0Jw5UNHcbdyhSQM6w_FgRZ-nWk',
  table: 'portofolio'
};

class PortofolioTracker {
  constructor() {
    this.url = SUPABASE_CONFIG.url;
    this.key = SUPABASE_CONFIG.key;
    this.table = SUPABASE_CONFIG.table;
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    this.init();
  }

  // Ambil atau buat ID pengunjung unik
  getOrCreateVisitorId() {
    let id = localStorage.getItem('portofolio_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      try {
        localStorage.setItem('portofolio_visitor_id', id);
      } catch (e) {}
    }
    return id;
  }

  // Session ID per sesi browser (expires in 30 mins)
  getOrCreateSessionId() {
    let sId = sessionStorage.getItem('portofolio_session_id');
    if (!sId) {
      sId = 's_' + Math.random().toString(36).substring(2, 9);
      try {
        sessionStorage.setItem('portofolio_session_id', sId);
      } catch (e) {}
    }
    return sId;
  }

  // Metadata browser
  getMetadata(extra = {}) {
    return {
      path: (window.location.pathname.replace(/\/index\.html$/, '/') || '/').replace(/\.html$/, '') + window.location.hash,
      referrer: document.referrer || 'direct',
      screen: `${window.innerWidth}x${window.innerHeight}`,
      device: window.innerWidth < 768 ? 'Mobile' : (window.innerWidth < 1024 ? 'Tablet' : 'Desktop'),
      userAgent: navigator.userAgent,
      language: navigator.language || 'id-ID',
      session_id: this.sessionId,
      ...extra
    };
  }

  // Kirim data ke Supabase REST API & backup di localStorage
  async sendEvent(payload) {
    const fullPayload = {
      ...payload,
      visitor_id: this.visitorId,
      created_at: new Date().toISOString()
    };

    // 1. Simpan backup lokal untuk fallback jika Supabase belum membuat tabel
    this.backupLocalEvent(fullPayload);

    // 2. Kirim ke Supabase REST endpoint
    try {
      const response = await fetch(`${this.url}/rest/v1/${this.table}`, {
        method: 'POST',
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(fullPayload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.warn('[Portofolio Tracker] Supabase insert note:', err.message || response.statusText);
        return { success: false, error: err };
      }

      return { success: true };
    } catch (error) {
      console.warn('[Portofolio Tracker] Network or Supabase issue:', error);
      return { success: false, error };
    }
  }

  backupLocalEvent(event) {
    try {
      const raw = localStorage.getItem('portofolio_events_backup') || '[]';
      const events = JSON.parse(raw);
      events.unshift({ ...event, id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) });
      // Simpan maksimal 300 event lokal
      if (events.length > 300) events.pop();
      localStorage.setItem('portofolio_events_backup', JSON.stringify(events));
    } catch (e) {}
  }

  // Catat Kunjungan Halaman
  trackVisit() {
    const lastVisitKey = 'portofolio_last_visit_time';
    const now = Date.now();
    const lastVisit = parseInt(localStorage.getItem(lastVisitKey) || '0', 10);
    
    // Kirim kunjungan (debounce 5 menit per pengunjung untuk visit count yang natural)
    const isNewVisit = (now - lastVisit) > 5 * 60 * 1000;
    if (isNewVisit) {
      try { localStorage.setItem(lastVisitKey, now.toString()); } catch (e) {}
      this.sendEvent({
        event_type: 'visit',
        metadata: this.getMetadata({ type: 'page_view' })
      });
    }
  }

  // Catat Klik Tombol
  trackClick(buttonName, buttonId = null, extraMeta = {}) {
    if (!buttonName) return;
    this.sendEvent({
      event_type: 'click',
      button_name: buttonName,
      button_id: buttonId,
      metadata: this.getMetadata(extraMeta)
    });
  }

  // Catat Form Kontak
  async trackForm(formData) {
    const { name, email, project } = formData;
    return await this.sendEvent({
      event_type: 'form',
      button_name: 'Connect on WhatsApp',
      name: name ? name.trim() : null,
      email: email ? email.trim() : null,
      message: project ? project.trim() : null,
      metadata: this.getMetadata({ form: 'remote_collaboration' })
    });
  }

  // Setup Otomatis Event Listener untuk tombol-tombol
  setupButtonListeners() {
    document.addEventListener('click', (e) => {
      // Cari elemen tombol atau link terdekat
      const target = e.target.closest('button, a, .map-node, .work-card, .cylinder-card');
      if (!target) return;

      let name = null;
      let id = target.id || null;
      let location = 'General';

      // 1. Cek tombol kontak
      if (target.matches('[data-contact]') || target.closest('[data-contact]')) {
        if (target.closest('.hero-cta')) {
          name = "Let's Talk (Hero CTA)";
          location = 'Hero';
        } else if (target.closest('.offer-action')) {
          name = "Let's digitize your business (Offer)";
          location = 'Digital Offer';
        } else if (target.closest('.footer-cta')) {
          name = "Start a project (Footer)";
          location = 'Footer';
        } else if (target.closest('.primary-nav')) {
          name = "Contact (Primary Nav)";
          location = 'Header Nav';
        } else if (target.closest('.overlay-nav') || target.closest('.overlay-bottom')) {
          name = "Contact (Menu Overlay)";
          location = 'Menu Modal';
        } else {
          name = "Let's Talk / Contact";
        }
      }
      // 2. Cek scroll links
      else if (target.matches('[data-scroll]') || target.closest('[data-scroll]')) {
        const scrollTarget = target.dataset.scroll || target.closest('[data-scroll]').dataset.scroll;
        if (scrollTarget === 'works') {
          name = "View Work (Hero)";
          location = 'Hero';
        } else if (scrollTarget === 'framework') {
          name = "The Framework (Studio)";
          location = 'Studio';
        } else if (scrollTarget === 'about') {
          name = "Scroll to explore (Hero)";
          location = 'Hero';
        } else {
          name = `Navigasi: ${scrollTarget}`;
          location = 'Navigation';
        }
      }
      // 3. Kartu & Tombol Portofolio
      else if (target.matches('.portfolio-view') || target.closest('.role-work-card')) {
        const card = target.closest('.role-work-card');
        const roleTitle = card?.querySelector('h3')?.textContent || 'Selected Work';
        name = `Lihat Portofolio: ${roleTitle}`;
        location = 'Portfolio';
      }
      // 4. Menu burger & close
      else if (target.id === 'open-menu' || target.closest('#open-menu')) {
        name = "Open Menu (Header)";
        location = 'Header';
      } else if (target.id === 'close-menu' || target.closest('#close-menu')) {
        name = "Close Menu";
        location = 'Menu';
      }
      // 5. Framework interactive nodes
      else if (target.matches('.map-node') || target.closest('.map-node')) {
        const node = target.closest('.map-node');
        const title = node?.querySelector('h3')?.textContent || 'Framework Node';
        name = `Framework: ${title}`;
        location = 'Framework';
      }
      // 6. Skills tabs
      else if (target.matches('[data-toolkit-role]')) {
        name = `Skill Tab: ${target.textContent.trim()}`;
        location = 'Skills';
      }
      // 7. Form submit WhatsApp
      else if (target.type === 'submit' && target.closest('.request-form')) {
        name = "Connect on WhatsApp (Submit)";
        location = 'Form Modal';
      }
      // 8. Legal & Admin links
      else if (target.matches('#admin-link')) {
        name = "Buka Admin Dashboard";
        location = 'Footer';
      } else if (target.matches('#privacy')) {
        name = "Privacy Policy Link";
        location = 'Footer';
      } else if (target.matches('#terms')) {
        name = "Terms Link";
        location = 'Footer';
      }
      // 9. Brand Logo
      else if (target.matches('.brand') || target.closest('.brand')) {
        name = "Brand Logo (Home)";
        location = 'Header';
      }
      // 10. Fallback jika punya teks
      else {
        const text = target.textContent?.trim();
        if (text && text.length < 50 && !target.closest('.skills-panorama')) {
          name = `Klik: ${text}`;
        }
      }

      if (name) {
        this.trackClick(name, id, { location });
      }
    });
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.trackVisit();
        this.setupButtonListeners();
      });
    } else {
      this.trackVisit();
      this.setupButtonListeners();
    }
  }
}

// Instansiasi global
window.portofolioTracker = new PortofolioTracker();
