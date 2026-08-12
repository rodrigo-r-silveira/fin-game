import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rwonnuthjiuyqukxfngj.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_oVGLGBnYNHPtg5n9m98_-Q_6CswcYnG";

  return createBrowserClient(supabaseUrl, supabaseKey);
};
