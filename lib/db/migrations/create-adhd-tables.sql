-- ADHD Command Center Schema for Supabase
-- Follows AImpact Nexus patterns and conventions

-- ADHD Projects table
CREATE TABLE IF NOT EXISTS public.adhd_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  emoji character varying,
  priority character varying NOT NULL DEFAULT 'medium',
  revenue numeric,
  deadline timestamp without time zone,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT adhd_projects_pkey PRIMARY KEY (id),
  CONSTRAINT adhd_projects_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT adhd_projects_priority_check CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

-- ADHD Tasks table
CREATE TABLE IF NOT EXISTS public.adhd_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  text text NOT NULL,
  priority character varying NOT NULL DEFAULT 'medium',
  time_estimate integer DEFAULT 25, -- minutes
  completed boolean DEFAULT false,
  completed_at timestamp without time zone,
  focus_sessions_count integer DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT adhd_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT adhd_tasks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT adhd_tasks_project_id_adhd_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.adhd_projects(id) ON DELETE SET NULL,
  CONSTRAINT adhd_tasks_priority_check CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

-- ADHD Focus Sessions table
CREATE TABLE IF NOT EXISTS public.adhd_focus_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone,
  duration integer, -- minutes
  interruptions integer DEFAULT 0,
  productivity_score integer DEFAULT 8,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT adhd_focus_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT adhd_focus_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT adhd_focus_sessions_task_id_adhd_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.adhd_tasks(id) ON DELETE SET NULL,
  CONSTRAINT adhd_focus_sessions_productivity_check CHECK (productivity_score >= 1 AND productivity_score <= 10)
);

-- ADHD Brain Dumps table
CREATE TABLE IF NOT EXISTS public.adhd_brain_dumps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  converted_to_task boolean DEFAULT false,
  task_id uuid,
  tags jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT adhd_brain_dumps_pkey PRIMARY KEY (id),
  CONSTRAINT adhd_brain_dumps_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT adhd_brain_dumps_task_id_adhd_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.adhd_tasks(id) ON DELETE SET NULL
);

-- ADHD Daily Stats table (for tracking streaks and aggregated data)
CREATE TABLE IF NOT EXISTS public.adhd_daily_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  tasks_completed integer DEFAULT 0,
  total_focus_minutes integer DEFAULT 0,
  focus_sessions_count integer DEFAULT 0,
  avg_productivity_score real,
  interruptions_total integer DEFAULT 0,
  brain_dumps_count integer DEFAULT 0,
  streak_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT adhd_daily_stats_pkey PRIMARY KEY (id),
  CONSTRAINT adhd_daily_stats_unique_user_date UNIQUE (user_id, date),
  CONSTRAINT adhd_daily_stats_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS adhd_projects_user_id_idx ON public.adhd_projects(user_id);
CREATE INDEX IF NOT EXISTS adhd_projects_is_active_idx ON public.adhd_projects(is_active);

CREATE INDEX IF NOT EXISTS adhd_tasks_user_id_idx ON public.adhd_tasks(user_id);
CREATE INDEX IF NOT EXISTS adhd_tasks_project_id_idx ON public.adhd_tasks(project_id);
CREATE INDEX IF NOT EXISTS adhd_tasks_completed_idx ON public.adhd_tasks(completed);
CREATE INDEX IF NOT EXISTS adhd_tasks_created_at_idx ON public.adhd_tasks(created_at);

CREATE INDEX IF NOT EXISTS adhd_focus_sessions_user_id_idx ON public.adhd_focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS adhd_focus_sessions_task_id_idx ON public.adhd_focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS adhd_focus_sessions_start_time_idx ON public.adhd_focus_sessions(start_time);

CREATE INDEX IF NOT EXISTS adhd_brain_dumps_user_id_idx ON public.adhd_brain_dumps(user_id);
CREATE INDEX IF NOT EXISTS adhd_brain_dumps_created_at_idx ON public.adhd_brain_dumps(created_at);

CREATE INDEX IF NOT EXISTS adhd_daily_stats_user_id_idx ON public.adhd_daily_stats(user_id);
CREATE INDEX IF NOT EXISTS adhd_daily_stats_date_idx ON public.adhd_daily_stats(date);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE public.adhd_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhd_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhd_focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhd_brain_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhd_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (users can only see their own data)
CREATE POLICY "Users can view own adhd_projects" ON public.adhd_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adhd_projects" ON public.adhd_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adhd_projects" ON public.adhd_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own adhd_projects" ON public.adhd_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for other tables
CREATE POLICY "Users can manage own adhd_tasks" ON public.adhd_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own adhd_focus_sessions" ON public.adhd_focus_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own adhd_brain_dumps" ON public.adhd_brain_dumps
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own adhd_daily_stats" ON public.adhd_daily_stats
  FOR ALL USING (auth.uid() = user_id);