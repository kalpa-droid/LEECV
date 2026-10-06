import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string)
async function go() {
  const { data } = await supabase.from('profiles').select('*').limit(1)
  console.log(Object.keys(data![0]))
}
go()
