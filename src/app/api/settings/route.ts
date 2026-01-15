import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_MODEL, DEFAULT_MODEL_OPTIONS } from '@/types'

// E2E test mock settings
let E2E_MOCK_SETTINGS = {
  id: 'e2e-settings-id',
  user_id: 'e2e-test-user-id',
  selected_model: DEFAULT_MODEL,
  custom_models: [],
  model_options: DEFAULT_MODEL_OPTIONS,
  math_renderer: 'katex',
  theme: 'light',
  openrouter_api_key: 'e2e-test-api-key',
}

export async function GET() {
  // E2E test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    return NextResponse.json(E2E_MOCK_SETTINGS)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to get existing settings
  let { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no settings exist, create default settings
  if (!settings) {
    const { data: newSettings, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        selected_model: DEFAULT_MODEL,
        custom_models: [],
        model_options: DEFAULT_MODEL_OPTIONS,
        math_renderer: 'katex',
        theme: 'light',
      } as Record<string, unknown>)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    settings = newSettings
  }

  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const updates = await request.json()

  // E2E test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    E2E_MOCK_SETTINGS = { ...E2E_MOCK_SETTINGS, ...updates }
    return NextResponse.json(E2E_MOCK_SETTINGS)
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if settings exist
  const { data: existingSettings } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let settings
  let error

  if (existingSettings) {
    // Update existing settings
    const result = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('user_id', user.id)
      .select()
      .single()

    settings = result.data
    error = result.error
  } else {
    // Create new settings
    const result = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        selected_model: updates.selected_model || DEFAULT_MODEL,
        custom_models: updates.custom_models || [],
        model_options: updates.model_options || DEFAULT_MODEL_OPTIONS,
        math_renderer: updates.math_renderer || 'katex',
        theme: updates.theme || 'light',
        openrouter_api_key: updates.openrouter_api_key || null,
      } as Record<string, unknown>)
      .select()
      .single()

    settings = result.data
    error = result.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}
