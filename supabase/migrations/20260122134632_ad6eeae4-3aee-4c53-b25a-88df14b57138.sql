-- Fix RLS policies for room system

-- Add UPDATE policy for room_participants to allow heartbeat and status updates
CREATE POLICY "Users can update their own participant status"
ON public.room_participants
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix the overly permissive AI suggestions INSERT policy
-- Drop the old policy and create a more secure one
DROP POLICY IF EXISTS "System can create AI suggestions" ON public.room_ai_suggestions;

-- Create a policy that only allows authenticated users in the room to trigger AI suggestions
-- In practice, this is called by edge functions with service role, but we need a safer fallback
CREATE POLICY "Authenticated users can trigger AI suggestions"
ON public.room_ai_suggestions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM room_participants rp 
    WHERE rp.room_id = room_ai_suggestions.room_id 
    AND rp.user_id = auth.uid() 
    AND rp.is_active = true
  )
);