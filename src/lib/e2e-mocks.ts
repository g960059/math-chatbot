// E2E test mock data - centralized to avoid invalid exports from Next.js Route Handlers

export const E2E_TEST_USER_ID = 'e2e-test-user-id'

export const E2E_MOCK_CONVERSATIONS = [
  { id: 'e2e-conv-1', user_id: E2E_TEST_USER_ID, title: 'テスト会話1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const E2E_MOCK_MESSAGES: Record<string, Array<{ id: string; conversation_id: string; role: string; content: string; created_at: string }>> = {}
