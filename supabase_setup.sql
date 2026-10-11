-- ==============================================================================
-- SETUP DATABASE SUPABASE UNTUK PORTOFOLIO ARDI IRAWAN
-- ==============================================================================
-- Tabel: public.portofolio
-- Fungsi: Menyimpan data kunjungan (visit), klik tombol (click), dan form kontak (form)
-- ==============================================================================

-- 1. Buat tabel portofolio
CREATE TABLE IF NOT EXISTS public.portofolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,                  -- 'visit', 'click', atau 'form'
    button_name TEXT,                          -- Nama tombol yang diklik (contoh: "Let's Talk", "View Work")
    button_id TEXT,                            -- ID / selector tombol
    visitor_id TEXT,                           -- Identifier anonim pengunjung (cookie/localStorage)
    name TEXT,                                 -- Nama pengisi formulir
    email TEXT,                                -- Email pengisi formulir
    message TEXT,                              -- Isi pesan / peran kolaborasi dari formulir
    metadata JSONB DEFAULT '{}'::jsonb,        -- Info browser, path URL, referrer, screen width
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Buat index agar query dashboard sangat cepat
CREATE INDEX IF NOT EXISTS idx_portofolio_event_type ON public.portofolio (event_type);
CREATE INDEX IF NOT EXISTS idx_portofolio_created_at ON public.portofolio (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portofolio_button_name ON public.portofolio (button_name);
CREATE INDEX IF NOT EXISTS idx_portofolio_visitor_id ON public.portofolio (visitor_id);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.portofolio ENABLE ROW LEVEL SECURITY;

-- 4. Buat Kebijakan Akses (RLS Policies)
-- Kebijakan INSERT: Memungkinkan pengunjung umum & website mencatat kunjungan, klik, & form
DROP POLICY IF EXISTS "Allow public insert on portofolio" ON public.portofolio;
CREATE POLICY "Allow public insert on portofolio" 
ON public.portofolio
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Kebijakan SELECT: Memungkinkan Dashboard Admin membaca data
DROP POLICY IF EXISTS "Allow public select on portofolio" ON public.portofolio;
CREATE POLICY "Allow public select on portofolio" 
ON public.portofolio
FOR SELECT 
TO anon, authenticated
USING (true);

-- 5. Data Awal / Sample Seed Data (Opsional: agar dashboard langsung memiliki gambaran awal)
INSERT INTO public.portofolio (event_type, button_name, visitor_id, name, email, message, metadata, created_at)
VALUES 
    ('visit', NULL, 'v_demo_01', NULL, NULL, NULL, '{"path":"/","screen":"1920x1080","device":"Desktop"}'::jsonb, now() - INTERVAL '3 days'),
    ('visit', NULL, 'v_demo_02', NULL, NULL, NULL, '{"path":"/","screen":"1440x900","device":"Desktop"}'::jsonb, now() - INTERVAL '2 days'),
    ('visit', NULL, 'v_demo_03', NULL, NULL, NULL, '{"path":"/","screen":"390x844","device":"Mobile"}'::jsonb, now() - INTERVAL '1 day'),
    ('visit', NULL, 'v_demo_04', NULL, NULL, NULL, '{"path":"/","screen":"1920x1080","device":"Desktop"}'::jsonb, now() - INTERVAL '4 hours'),
    ('visit', NULL, 'v_demo_05', NULL, NULL, NULL, '{"path":"/","screen":"412x915","device":"Mobile"}'::jsonb, now() - INTERVAL '1 hour'),
    
    ('click', 'Let''s Talk (Hero CTA)', 'v_demo_01', NULL, NULL, NULL, '{"location":"Hero"}'::jsonb, now() - INTERVAL '3 days'),
    ('click', 'View Work (Hero)', 'v_demo_01', NULL, NULL, NULL, '{"location":"Hero"}'::jsonb, now() - INTERVAL '3 days'),
    ('click', 'The Framework (Studio)', 'v_demo_02', NULL, NULL, NULL, '{"location":"About"}'::jsonb, now() - INTERVAL '2 days'),
    ('click', 'Lihat Portofolio (Website & System Builder)', 'v_demo_03', NULL, NULL, NULL, '{"location":"Works"}'::jsonb, now() - INTERVAL '1 day'),
    ('click', 'Let''s digitize your business', 'v_demo_04', NULL, NULL, NULL, '{"location":"Offer"}'::jsonb, now() - INTERVAL '3 hours'),
    ('click', 'Start a project (Footer)', 'v_demo_05', NULL, NULL, NULL, '{"location":"Footer"}'::jsonb, now() - INTERVAL '50 minutes'),
    ('click', 'Connect on WhatsApp', 'v_demo_05', NULL, NULL, NULL, '{"location":"Modal"}'::jsonb, now() - INTERVAL '45 minutes'),
    
    ('form', 'Connect on WhatsApp', 'v_demo_05', 'Budi Santoso', 'budi@techfirm.id', 'Halo Ardi, kami membutuhkan Website Builder & AI Automation untuk sistem internal kami. Mohon jadwal meeting.', '{"source":"Portfolio Modal"}'::jsonb, now() - INTERVAL '45 minutes'),
    ('form', 'Connect on WhatsApp', 'v_demo_02', 'Sarah Jenkins', 'sarah.j@growthdigital.agency', 'Interested in hiring you remotely for AI Workflow Builder & Ad Design campaigns.', '{"source":"Portfolio Modal"}'::jsonb, now() - INTERVAL '1 day');
