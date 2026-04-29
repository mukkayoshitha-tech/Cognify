-- Supabase Schema for Cognify
-- Ensure Row Level Security (RLS) is disabled as requested by the prompt.

CREATE TABLE logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  habit text NOT NULL,
  date date NOT NULL,
  topic text,
  questions_easy int DEFAULT 0,
  questions_medium int DEFAULT 0,
  questions_hard int DEFAULT 0,
  duration int DEFAULT 0,
  pages int DEFAULT 0,
  amount text,
  description text,
  note text,
  subject text,
  assignment_title text,
  status text,
  due_date date,
  priority text,
  hours_studied int DEFAULT 0,
  confidence int DEFAULT 0,
  exam_date date,
  classes_attended int DEFAULT 0,
  total_classes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE custom_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  habit_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid REFERENCES squads(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  habit text NOT NULL,
  duration_days int NOT NULL,
  stake_label text,
  created_by text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  completed boolean DEFAULT false,
  logs_count int DEFAULT 0
);
