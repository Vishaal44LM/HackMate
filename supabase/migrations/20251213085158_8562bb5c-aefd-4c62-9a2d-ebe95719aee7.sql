-- Add final submission fields to rooms table
ALTER TABLE public.rooms 
ADD COLUMN final_pitch_link TEXT,
ADD COLUMN final_demo_link TEXT,
ADD COLUMN final_repo_link TEXT,
ADD COLUMN final_summary TEXT;