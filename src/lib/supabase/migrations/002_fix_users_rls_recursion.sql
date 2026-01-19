-- Migration: Fixing infinite recursion in users table RLS policy
-- The original "Admins can read all users" policy caused infinite recursion
-- because it queried the users table while being a policy ON the users table.
-- 
-- Solution: Use a SECURITY DEFINER function that bypasses RLS when checking admin status.

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;


CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can read all users (uses the SECURITY DEFINER function)
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (public.is_admin());

-- Also add admin policy for subscriptions table
CREATE POLICY "Admins can read all subscriptions" ON subscriptions
  FOR SELECT USING (public.is_admin());
