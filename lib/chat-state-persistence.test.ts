// Simple test to verify chat state persistence
export function testChatStatePersistence() {
  console.log("=== CHAT STATE PERSISTENCE TEST ===")
  
  // Test 1: Save and load chat state
  const testState = {
    isOpen: true,
    currentThreadId: "test-thread-123"
  }
  
  localStorage.setItem('chatState', JSON.stringify(testState))
  
  const loadedState = localStorage.getItem('chatState')
  const parsedState = loadedState ? JSON.parse(loadedState) : {}
  
  console.log("Test 1 - Save and Load:")
  console.log("  Expected:", testState)
  console.log("  Got:", parsedState)
  console.log("  ✅ PASS:", JSON.stringify(testState) === JSON.stringify(parsedState))
  
  // Test 2: Test with different states
  const testStates = [
    { isOpen: false, currentThreadId: null },
    { isOpen: true, currentThreadId: "thread-456" },
    { isOpen: false, currentThreadId: "thread-789" }
  ]
  
  testStates.forEach((state, index) => {
    localStorage.setItem('chatState', JSON.stringify(state))
    const loaded = localStorage.getItem('chatState')
    const parsed = loaded ? JSON.parse(loaded) : {}
    
    console.log(`Test ${index + 2} - State ${index + 1}:`)
    console.log("  Expected:", state)
    console.log("  Got:", parsed)
    console.log("  ✅ PASS:", JSON.stringify(state) === JSON.stringify(parsed))
  })
  
  console.log("=== END TEST ===")
} 