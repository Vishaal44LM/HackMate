-- Add status and current_user_count to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'));
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_user_count integer NOT NULL DEFAULT 0 CHECK (current_user_count >= 0 AND current_user_count <= 5);

-- Add device_id, is_active, and last_seen to room_participants
ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone NOT NULL DEFAULT now();

-- Create unique constraint on room_id + user_id to prevent duplicates
ALTER TABLE public.room_participants DROP CONSTRAINT IF EXISTS room_participants_room_user_unique;
ALTER TABLE public.room_participants ADD CONSTRAINT room_participants_room_user_unique UNIQUE (room_id, user_id);

-- Create atomic join room function to prevent race conditions
CREATE OR REPLACE FUNCTION public.join_room(p_room_id uuid, p_user_id uuid, p_device_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_status text;
  v_current_count integer;
  v_max_users integer;
  v_existing_participant uuid;
  v_result jsonb;
BEGIN
  -- Lock the room row to prevent race conditions
  SELECT status, current_user_count, max_participants 
  INTO v_room_status, v_current_count, v_max_users
  FROM rooms 
  WHERE id = p_room_id
  FOR UPDATE;
  
  -- Check if room exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;
  
  -- Check room status
  IF v_room_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is not active');
  END IF;
  
  -- Check if user is already in room
  SELECT id INTO v_existing_participant
  FROM room_participants
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  IF FOUND THEN
    -- User already in room, just update their status
    UPDATE room_participants
    SET is_active = true, last_seen = now(), device_id = COALESCE(p_device_id, device_id)
    WHERE room_id = p_room_id AND user_id = p_user_id;
    
    -- Make sure count is accurate
    UPDATE rooms SET current_user_count = (
      SELECT COUNT(*) FROM room_participants WHERE room_id = p_room_id AND is_active = true
    ) WHERE id = p_room_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Rejoined room', 'already_member', true);
  END IF;
  
  -- Check capacity
  IF v_current_count >= v_max_users THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room full (5/5 members). Try another room or wait.');
  END IF;
  
  -- Insert new participant
  INSERT INTO room_participants (room_id, user_id, device_id, is_active, last_seen)
  VALUES (p_room_id, p_user_id, p_device_id, true, now());
  
  -- Increment count
  UPDATE rooms 
  SET current_user_count = current_user_count + 1, updated_at = now()
  WHERE id = p_room_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Successfully joined room', 'already_member', false);
END;
$$;

-- Create leave room function
CREATE OR REPLACE FUNCTION public.leave_room(p_room_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_exists boolean;
BEGIN
  -- Check if user is in room
  SELECT EXISTS(SELECT 1 FROM room_participants WHERE room_id = p_room_id AND user_id = p_user_id AND is_active = true)
  INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not in room');
  END IF;
  
  -- Mark as inactive
  UPDATE room_participants
  SET is_active = false, last_seen = now()
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  -- Decrement count
  UPDATE rooms 
  SET current_user_count = GREATEST(0, current_user_count - 1), updated_at = now()
  WHERE id = p_room_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Successfully left room');
END;
$$;

-- Create heartbeat function
CREATE OR REPLACE FUNCTION public.room_heartbeat(p_room_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE room_participants
  SET last_seen = now()
  WHERE room_id = p_room_id AND user_id = p_user_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Participant not found');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function to clean up inactive users (called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_participants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark users as inactive if no heartbeat for 2 minutes
  UPDATE room_participants
  SET is_active = false
  WHERE is_active = true AND last_seen < now() - interval '2 minutes';
  
  -- Update room counts
  UPDATE rooms r
  SET current_user_count = (
    SELECT COUNT(*) FROM room_participants rp 
    WHERE rp.room_id = r.id AND rp.is_active = true
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.join_room(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_room(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_heartbeat(uuid, uuid) TO authenticated;

-- Update existing rooms to have current_user_count calculated
UPDATE rooms r
SET current_user_count = (
  SELECT COUNT(*) FROM room_participants rp 
  WHERE rp.room_id = r.id
);