import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Leer variables de entorno manualmente
const envContent = fs.readFileSync('.env.local', 'utf8')
const envLines = envContent.split('\n')
const envVars = {}

envLines.forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateSchema() {
  console.log('🔍 Investigating profiles table schema...')
  
  try {
    // Intentar obtener todos los campos disponibles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error querying profiles:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ Available fields in profiles table:')
      console.log(Object.keys(data[0]))
      console.log('\n📊 Sample data:')
      console.log(data[0])
    } else {
      console.log('⚠️ No data found in profiles table')
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

investigateSchema()