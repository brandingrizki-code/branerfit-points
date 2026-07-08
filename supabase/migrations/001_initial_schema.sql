-- ============================================
-- BRANERFIT AFFILIATE REWARDS PROGRAM
-- Database Schema - Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'affiliate');
CREATE TYPE affiliate_status AS ENUM ('active', 'inactive');
CREATE TYPE activity_type AS ENUM (
  'upload_video',
  'shopee_video',
  'weekly_3_videos',
  'weekly_5_videos',
  'streak_3_days',
  'streak_7_days'
);

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  role user_role NOT NULL DEFAULT 'affiliate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AFFILIATES
-- ============================================

CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tiktok_username TEXT,
  phone TEXT,
  status affiliate_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ACTIVITIES (content upload points)
-- ============================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  activity_date DATE NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SALES (checkout points)
-- ============================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  checkout_count INTEGER NOT NULL DEFAULT 0,
  sale_month INTEGER NOT NULL CHECK (sale_month >= 1 AND sale_month <= 12),
  sale_year INTEGER NOT NULL CHECK (sale_year >= 2024),
  points INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(affiliate_id, sale_month, sale_year)
);

-- ============================================
-- POINT LOGS (audit trail for all point changes)
-- ============================================

CREATE TABLE point_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('activity', 'sales')),
  source_id UUID NOT NULL,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TIERS (seed data)
-- ============================================

CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  min_points INTEGER NOT NULL,
  benefit_description TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed tiers data
INSERT INTO tiers (name, min_points, benefit_description, display_order) VALUES
('Rising Affiliate', 1000, 'Nama tercantum pada daftar Affiliate Aktif. Berhak mengikuti seluruh challenge dan campaign Branerfit.', 1),
('Bronze Affiliate', 3000, 'Prioritas review konten oleh tim. Prioritas mengikuti campaign affiliate.', 2),
('Silver Affiliate', 7000, 'Prioritas approval sampel produk. Kesempatan mendapatkan Boost Traffic apabila konten memenuhi kriteria.', 3),
('Gold Affiliate', 15000, 'Prioritas mendapatkan Boost Traffic. Prioritas menerima informasi campaign baru. Kesempatan menjadi affiliate pilihan untuk campaign tertentu.', 4),
('Diamond Affiliate', 30000, 'Prioritas Boost Traffic. Prioritas approval sampel. Prioritas mengikuti campaign eksklusif. Konten berkesempatan dipromosikan melalui media resmi Branerfit.', 5),
('Branerfit Champion', 50000, 'Penghargaan sebagai Top Affiliate Bulanan. Prioritas tertinggi untuk Boost Traffic. Prioritas tertinggi approval sampel. Prioritas mengikuti seluruh campaign eksklusif Branerfit.', 6);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_activities_affiliate_id ON activities(affiliate_id);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_activities_verified ON activities(verified);
CREATE INDEX idx_sales_affiliate_id ON sales(affiliate_id);
CREATE INDEX idx_sales_month_year ON sales(sale_month, sale_year);
CREATE INDEX idx_point_logs_affiliate_id ON point_logs(affiliate_id);
CREATE INDEX idx_point_logs_created_at ON point_logs(created_at);
CREATE INDEX idx_affiliates_status ON affiliates(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Affiliates: admins full access, affiliates can read their own
CREATE POLICY "Admins full access on affiliates" ON affiliates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view own data" ON affiliates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND id = user_id)
  );

-- Activities: admins full access, affiliates can view own
CREATE POLICY "Admins full access on activities" ON activities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view own activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.user_id = auth.uid()
      AND affiliates.id = activities.affiliate_id
    )
  );

-- Sales: admins full access, affiliates can view own
CREATE POLICY "Admins full access on sales" ON sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view own sales" ON sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.user_id = auth.uid()
      AND affiliates.id = sales.affiliate_id
    )
  );

-- Point Logs: admins full access, affiliates can view own
CREATE POLICY "Admins full access on point_logs" ON point_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view own point_logs" ON point_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.user_id = auth.uid()
      AND affiliates.id = point_logs.affiliate_id
    )
  );

-- Tiers: everyone can read
CREATE POLICY "Anyone can view tiers" ON tiers
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'affiliate')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: leaderboard_summary
-- ============================================

CREATE OR REPLACE VIEW leaderboard_summary AS
WITH point_totals AS (
  SELECT
    a.id AS affiliate_id,
    a.name AS affiliate_name,
    a.tiktok_username,
    COALESCE(ac.points, 0) AS content_points,
    COALESCE(s.points, 0) AS sales_points,
    COALESCE(ac.points, 0) + COALESCE(s.points, 0) AS total_points
  FROM affiliates a
  LEFT JOIN (
    SELECT affiliate_id, SUM(points) AS points
    FROM activities
    WHERE verified = TRUE
    GROUP BY affiliate_id
  ) ac ON ac.affiliate_id = a.id
  LEFT JOIN (
    SELECT affiliate_id, SUM(points) AS points
    FROM sales
    WHERE verified = TRUE
    GROUP BY affiliate_id
  ) s ON s.affiliate_id = a.id
  WHERE a.status = 'active'
)
SELECT
  pt.affiliate_id,
  pt.affiliate_name,
  pt.tiktok_username,
  pt.content_points,
  pt.sales_points,
  pt.total_points,
  t.name AS current_tier,
  t.min_points AS tier_min_points
FROM point_totals pt
LEFT JOIN LATERAL (
  SELECT name, min_points
  FROM tiers
  WHERE min_points <= pt.total_points
  ORDER BY min_points DESC
  LIMIT 1
) t ON TRUE
ORDER BY pt.total_points DESC;
