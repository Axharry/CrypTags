#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build CrypTags - a crypto address contact book app with JWT auth, contact management with multiple crypto addresses, QR code generation/scanning, theme support, and data export"

backend:
  - task: "User Registration"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Tested via curl - registration creates user and returns JWT token"
      - working: true
        agent: "testing"
        comment: "Comprehensive test passed - user registration with valid data, JWT token generation, duplicate email rejection (400), proper response structure validation"

  - task: "User Login"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Tested via curl - login returns JWT token"
      - working: true
        agent: "testing"
        comment: "Comprehensive test passed - valid credentials return JWT token, invalid credentials return 401, proper response structure validation"

  - task: "Contact CRUD Operations"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Created contact via curl - need full testing"
      - working: true
        agent: "testing"
        comment: "All CRUD operations working - CREATE (with crypto address validation), READ (with search/crypto_type/favorites filters), UPDATE (partial updates), DELETE, and favorite toggle all functioning correctly. Proper auth checks in place."

  - task: "Custom Cryptocurrency Management"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "API endpoints created, returns 10 default cryptos"
      - working: true
        agent: "testing"
        comment: "Full crypto management working - GET returns 10 default cryptos plus custom ones, POST creates custom cryptos with validation (duplicate/default conflict checks), DELETE removes custom cryptos with proper auth"

  - task: "Data Export (JSON/CSV)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Both export formats working correctly - JSON export returns proper structure with contacts array and timestamp, CSV export generates valid CSV with proper headers and contact data formatting"

  - task: "Crypto Address Validation"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Address validation working correctly - validates ETH addresses (valid returns true, invalid returns false), BTC addresses work, integrated with contact creation/update for proper validation"

frontend:
  - task: "Authentication Flow (Login/Register)"
    implemented: true
    working: true
    file: "/app/frontend/app/(auth)/login.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Tested via screenshot - login and registration screens work"

  - task: "Contacts List View"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false

  - task: "Contact Detail View"
    implemented: true
    working: true
    file: "/app/frontend/app/contact/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false

  - task: "Add/Edit Contact"
    implemented: true
    working: true
    file: "/app/frontend/app/contact/add.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false

  - task: "Theme Support (Light/Dark/System)"
    implemented: true
    working: true
    file: "/app/frontend/stores/themeStore.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Tested dark mode switching via screenshots"

  - task: "QR Code Scanner"
    implemented: true
    working: NA
    file: "/app/frontend/app/scan.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true

  - task: "Custom Cryptocurrency Management UI"
    implemented: true
    working: NA
    file: "/app/frontend/app/cryptos.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "CrypTags MVP built - Backend API with JWT auth, contacts CRUD, crypto management, export endpoints. Frontend with login/register, contacts list, detail view, add/edit, settings with theme switch. Ready for backend testing."
  - agent: "testing"
    message: "Backend API comprehensive testing completed successfully. All 16 test suites passed including: Auth (register/login/me), Contact CRUD with filters and validation, Custom crypto management, Data export (JSON/CSV), Address validation, and health checks. All endpoints working correctly with proper authentication, validation, and error handling."