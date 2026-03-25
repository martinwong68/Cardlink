-- Add RLS policies for boards and sub_boards tables
-- This fixes the "new row violates row-level security policy" error when creating community subtopics

-- Enable RLS on boards if not already enabled
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Allow company members to read boards belonging to their company or global boards
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boards' AND policyname = 'Members can read company boards') THEN
    CREATE POLICY "Members can read company boards" ON boards
      FOR SELECT USING (
        company_id IS NULL
        OR company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
      );
  END IF;
END $$;

-- Allow company members to insert boards for their company
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boards' AND policyname = 'Members can insert company boards') THEN
    CREATE POLICY "Members can insert company boards" ON boards
      FOR INSERT WITH CHECK (
        company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
      );
  END IF;
END $$;

-- Allow company members to update boards belonging to their company
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boards' AND policyname = 'Members can update company boards') THEN
    CREATE POLICY "Members can update company boards" ON boards
      FOR UPDATE USING (
        company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
      );
  END IF;
END $$;

-- Allow company members to delete boards belonging to their company
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boards' AND policyname = 'Members can delete company boards') THEN
    CREATE POLICY "Members can delete company boards" ON boards
      FOR DELETE USING (
        company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
      );
  END IF;
END $$;

-- Enable RLS on sub_boards if not already enabled
ALTER TABLE sub_boards ENABLE ROW LEVEL SECURITY;

-- Allow company members to read sub_boards for boards they can access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_boards' AND policyname = 'Members can read sub boards') THEN
    CREATE POLICY "Members can read sub boards" ON sub_boards
      FOR SELECT USING (
        board_id IN (
          SELECT b.id FROM boards b
          WHERE b.company_id IS NULL
          OR b.company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Allow company members to insert sub_boards for boards they own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_boards' AND policyname = 'Members can insert sub boards') THEN
    CREATE POLICY "Members can insert sub boards" ON sub_boards
      FOR INSERT WITH CHECK (
        board_id IN (
          SELECT b.id FROM boards b
          WHERE b.company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Allow company members to update sub_boards for boards they own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_boards' AND policyname = 'Members can update sub boards') THEN
    CREATE POLICY "Members can update sub boards" ON sub_boards
      FOR UPDATE USING (
        board_id IN (
          SELECT b.id FROM boards b
          WHERE b.company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Allow company members to delete sub_boards for boards they own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_boards' AND policyname = 'Members can delete sub boards') THEN
    CREATE POLICY "Members can delete sub boards" ON sub_boards
      FOR DELETE USING (
        board_id IN (
          SELECT b.id FROM boards b
          WHERE b.company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
        )
      );
  END IF;
END $$;
