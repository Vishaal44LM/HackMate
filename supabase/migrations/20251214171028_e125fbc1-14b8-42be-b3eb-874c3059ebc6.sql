-- Create role enum
CREATE TYPE public.app_role AS ENUM ('participant', 'organizer', 'judge');

-- Create room_role enum for room-level roles
CREATE TYPE public.room_role AS ENUM ('member', 'organizer', 'judge');

-- Create user_roles table for global roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Organizers can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Only organizers can manage roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Only organizers can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Only organizers can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'organizer'));

-- Add role column to room_participants for room-level roles
ALTER TABLE public.room_participants
ADD COLUMN room_role room_role NOT NULL DEFAULT 'member';

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('schedule', 'rules', 'prizes', 'general')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements
CREATE POLICY "Anyone can view announcements"
ON public.announcements
FOR SELECT
USING (true);

CREATE POLICY "Organizers can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizers can update announcements"
ON public.announcements
FOR UPDATE
USING (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizers can delete announcements"
ON public.announcements
FOR DELETE
USING (public.has_role(auth.uid(), 'organizer'));

-- Add trigger for updated_at on announcements
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create organizer_comments table for task/room comments by organizers
CREATE TABLE public.organizer_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizer_comments
ALTER TABLE public.organizer_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizer_comments
CREATE POLICY "Anyone in room can view organizer comments"
ON public.organizer_comments
FOR SELECT
USING (true);

CREATE POLICY "Organizers can create comments"
ON public.organizer_comments
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizers can delete own comments"
ON public.organizer_comments
FOR DELETE
USING (public.has_role(auth.uid(), 'organizer') AND auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizer_comments;