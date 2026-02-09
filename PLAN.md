# Plan: Payslip Validation + AI Chat

## Feature 1: Automatic Payslip Validation

After each payslip is extracted by Claude, automatically run a second AI call to validate the extracted data and flag issues. Results are shown inline in the upload review flow and stored in the DB.

### What gets validated (by the LLM):
- **Math errors**: gross ≠ sum of earnings, net ≠ gross - deductions, component totals don't add up
- **Missing critical fields**: no national ID, no name, missing month/year, zero net/gross
- **Suspicious values**: negative salary, net > gross, unreasonably high/low amounts
- **Format issues**: invalid national ID format (not 9 digits), dates that don't parse
- **Cross-component checks**: deductions > gross, overtime without base salary, tax deductions with 0 income
- **Historical anomalies** (when previous data exists): salary changed by >50%, new deductions appearing, missing components vs last month

### Implementation:

1. **`lib/claude.ts`** — Add `validatePayslipData(record, previousPayroll?)` function
   - Sends extracted JSON (not the image) to Claude with a Hebrew validation prompt
   - Returns `{ issues: Array<{ severity: 'error' | 'warning' | 'info', field: string, message: string }> }`
   - Also runs quick deterministic checks (math validation) before calling Claude

2. **`lib/types.ts`** — Add `ValidationIssue` and `ValidationResult` types

3. **`app/api/extract/route.ts`** — After each page extraction succeeds, call `validatePayslipData()` and include issues in the SSE `result` event: `{ type: 'result', record: {...}, issues: [...] }`

4. **`app/(dashboard)/upload/page.tsx`** — Extend `ExtractedRecord` with `issues` array, pass to ReviewTable/ReviewModal

5. **`components/upload/ReviewTable.tsx`** — Show issue count badges per row (red for errors, yellow for warnings)

6. **`components/upload/ReviewModal.tsx`** — Show validation issues panel at the top of the modal with severity icons and Hebrew messages

7. **DB storage** — Store validation issues in `employee_payrolls.raw_extraction` JSONB field (already exists) alongside the extracted data. No new tables needed.

---

## Feature 2: AI Chat Assistant

A dedicated chat page where Vered can ask questions about payroll data in natural Hebrew and get answers backed by actual DB data.

### How it works:
- User types a question in Hebrew (e.g., "מה השכר הממוצע במחלקת הייצור?" or "מי קיבל העלאה החודש?")
- The server sends the question + a summary of available data to Claude
- Claude generates a SQL-like query description, server fetches relevant data, then Claude answers with the data

**Simplified approach** (no SQL generation — safer and simpler):
- Server pre-fetches a context package of relevant payroll data based on the question
- Sends question + data context to Claude
- Claude answers in Hebrew based on the actual data

### Implementation:

1. **`app/(dashboard)/chat/page.tsx`** — Chat page with:
   - Message history (user messages + AI responses)
   - Input field at bottom
   - RTL Hebrew layout
   - Loading state while AI responds

2. **`components/chat/ChatMessage.tsx`** — Individual message bubble component (user vs assistant styling)

3. **`app/api/chat/route.ts`** — POST endpoint that:
   - Receives the user message + conversation history
   - Fetches relevant payroll context from DB (recent payrolls, employee list, department stats, salary components)
   - Sends to Claude with a system prompt establishing it as a Hebrew payroll assistant with the data context
   - Streams the response back via SSE for real-time typing effect

4. **`lib/claude.ts`** — Add `chatWithPayrollContext(message, conversationHistory, dataContext)` function

5. **`lib/chat-context.ts`** — Helper to build data context:
   - `getPayrollSummary()` — aggregated stats (employee count, avg salary, department breakdown)
   - `getRecentPayrolls(limit)` — last N payroll records with employee names
   - `searchPayrollData(query)` — keyword-based search across employees/departments
   - The context is compact JSON that fits in Claude's context window

6. **`components/layout/Sidebar.tsx`** — Add chat nav item: `{ href: '/chat', label: 'צ׳אט AI', icon: '💬' }`

7. **`lib/types.ts`** — Add `ChatMessage` type

---

## File change summary:

| File | Action |
|------|--------|
| `lib/types.ts` | Add ValidationIssue, ValidationResult, ChatMessage types |
| `lib/claude.ts` | Add validatePayslipData() and chatWithPayrollContext() |
| `lib/chat-context.ts` | **New** — DB context builder for chat |
| `app/api/extract/route.ts` | Add validation call after extraction |
| `app/api/chat/route.ts` | **New** — Chat API endpoint with streaming |
| `app/(dashboard)/upload/page.tsx` | Add issues to ExtractedRecord state |
| `app/(dashboard)/chat/page.tsx` | **New** — Chat page |
| `components/upload/ReviewTable.tsx` | Add issue badges |
| `components/upload/ReviewModal.tsx` | Add validation issues panel |
| `components/chat/ChatMessage.tsx` | **New** — Chat bubble component |
| `components/layout/Sidebar.tsx` | Add chat nav item |
| `lib/db.ts` | No changes needed (no new tables) |

## Order of implementation:
1. Types (ValidationIssue, ChatMessage)
2. Validation logic in claude.ts
3. Wire validation into extract API + upload UI (ReviewTable, ReviewModal)
4. Chat context builder
5. Chat API endpoint
6. Chat page + components
7. Sidebar update
8. Build & test
