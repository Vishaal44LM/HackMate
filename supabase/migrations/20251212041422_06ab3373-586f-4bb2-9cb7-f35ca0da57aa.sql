-- Add join_code and is_private fields to rooms table
ALTER TABLE public.rooms 
ADD COLUMN join_code text,
ADD COLUMN is_private boolean NOT NULL DEFAULT true;

-- Create a unique index on join_code
CREATE UNIQUE INDEX idx_rooms_join_code ON public.rooms(join_code) WHERE join_code IS NOT NULL;

-- Generate join codes for existing rooms
UPDATE public.rooms 
SET join_code = UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6))
WHERE join_code IS NULL;

-- Make join_code NOT NULL for future inserts
ALTER TABLE public.rooms ALTER COLUMN join_code SET NOT NULL;

-- Create function to generate random join code
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create function to regenerate join code (host only)
CREATE OR REPLACE FUNCTION public.regenerate_join_code(p_room_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
  v_new_code text;
BEGIN
  -- Check if user is the room creator
  SELECT created_by INTO v_created_by FROM rooms WHERE id = p_room_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;
  
  IF v_created_by != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the host can regenerate the join code');
  END IF;
  
  -- Generate new code
  v_new_code := generate_join_code();
  
  -- Update room with new code
  UPDATE rooms SET join_code = v_new_code WHERE id = p_room_id;
  
  RETURN jsonb_build_object('success', true, 'join_code', v_new_code);
END;
$$;

-- Update join_room function to validate join code
CREATE OR REPLACE FUNCTION public.join_room(p_room_id uuid, p_user_id uuid, p_device_id text DEFAULT NULL, p_join_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_status text;
  v_current_count integer;
  v_max_users integer;
  v_is_private boolean;
  v_join_code text;
  v_created_by uuid;
  v_existing_participant uuid;
  v_result jsonb;
BEGIN
  -- Lock the room row to prevent race conditions
  SELECT status, current_user_count, max_participants, is_private, join_code, created_by
  INTO v_room_status, v_current_count, v_max_users, v_is_private, v_join_code, v_created_by
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
  
  -- For new members: validate join code if room is private and user is not the creator
  IF v_is_private AND v_created_by != p_user_id THEN
    IF p_join_code IS NULL OR p_join_code != v_join_code THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid join code');
    END IF;
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

-- Trigger to auto-generate join_code on room insert
CREATE OR REPLACE FUNCTION public.set_room_join_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_room_join_code
BEFORE INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_room_join_code();