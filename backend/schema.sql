-- UniHome UK - Supabase Database Schema
-- Created: 2026-03-18

-- Create listings table
CREATE TABLE IF NOT EXISTS public.listings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    price INTEGER NOT NULL,
    price_unit TEXT DEFAULT 'pw',
    beds INTEGER DEFAULT 1,
    baths INTEGER DEFAULT 1,
    description TEXT,
    includes_bills BOOLEAN DEFAULT false,
    student_friendly BOOLEAN DEFAULT true,
    url TEXT,
    image_url TEXT,
    original_data JSONB,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_beds ON public.listings(beds);
CREATE INDEX IF NOT EXISTS idx_listings_includes_bills ON public.listings(includes_bills);
CREATE INDEX IF NOT EXISTS idx_listings_student_friendly ON public.listings(student_friendly);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings(location);

-- Enable RLS (optional, for public access)
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access" ON public.listings
    FOR SELECT USING (true)
    WITH CHECK (true);

-- Create policy for service role insert/update
CREATE POLICY "Service role insert access" ON public.listings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update access" ON public.listings
    FOR UPDATE USING (true);
