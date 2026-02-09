import type { ExtractionResult, ValidationIssue, ValidationResult, ChatMessage } from './types'

const EXTRACTION_PROMPT = `אתה מנתח תלושי שכר ישראליים. נתח את תלוש השכר בתמונה וחלץ את כל המידע למבנה JSON הבא.
חשוב: החזר אך ורק JSON תקין, ללא טקסט נוסף.

המבנה הנדרש:
{
  "employee": {
    "name": "שם מלא של העובד",
    "nationalId": "מספר תעודת זהות (9 ספרות)",
    "department": "מחלקה או null",
    "role": "תפקיד או null",
    "startDate": "תאריך תחילת עבודה בפורמט YYYY-MM-DD או null",
    "maritalStatus": "מצב משפחתי או null",
    "taxCreditPoints": "נקודות זיכוי מס כמספר או null",
    "bankAccount": "מספר חשבון בנק או null",
    "bankBranch": "סניף בנק או null"
  },
  "payroll": {
    "month": "מספר חודש 1-12",
    "year": "שנה כמספר",
    "grossSalary": "שכר ברוטו",
    "netSalary": "שכר נטו (הסכום לתשלום)",
    "totalDeductions": "סה״כ ניכויים",
    "workDays": "ימי עבודה או null",
    "workHours": "שעות עבודה או null",
    "hourlyRate": "שכר לשעה או null",
    "overtimeHours": "שעות נוספות או null",
    "vacationDays": "ימי חופשה שנוצלו או null",
    "sickDays": "ימי מחלה או null",
    "vacationBalance": "יתרת חופשה או null",
    "bankTransferAmount": "סכום העברה לבנק או null"
  },
  "earnings": [
    {
      "name": "שם הרכיב (למשל: שכר בסיס, שעות נוספות 125%, בונוס)",
      "quantity": "כמות או null",
      "rate": "תעריף או null",
      "percent": "אחוז או null",
      "amount": "סכום"
    }
  ],
  "deductions": [
    {
      "name": "שם הניכוי (למשל: מס הכנסה, ביטוח לאומי, מס בריאות)",
      "quantity": null,
      "rate": null,
      "percent": "אחוז או null",
      "amount": "סכום"
    }
  ],
  "benefits": [
    {
      "name": "שם ההפרשה (למשל: פנסיה מעסיק, קרן השתלמות מעסיק, פיצויים)",
      "quantity": null,
      "rate": null,
      "percent": "אחוז או null",
      "amount": "סכום"
    }
  ]
}

כללים חשובים:
1. כל ערכים כספיים חייבים להיות מספרים (לא מחרוזות)
2. אם שדה לא מופיע בתלוש, השתמש ב-null
3. הפרד בין הכנסות (earnings), ניכויים (deductions), והפרשות מעסיק (benefits)
4. שים לב שזהו מסמך בעברית עם כיוון RTL
5. החודש והשנה לרוב מופיעים בכותרת העליונה`

export async function extractPayslipData(
  imageBase64: string,
  mimeType: string
): Promise<ExtractionResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()

  const textContent = data.content?.find((c: { type: string }) => c.type === 'text')
  if (!textContent) {
    throw new Error('No text response from Claude')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response')
  }

  return JSON.parse(jsonMatch[0]) as ExtractionResult
}

function runDeterministicChecks(record: ExtractionResult): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { payroll, earnings, deductions, employee } = record

  // National ID format
  if (employee.nationalId && !/^\d{9}$/.test(employee.nationalId.replace(/[-\s]/g, ''))) {
    issues.push({ severity: 'error', field: 'employee.nationalId', message: 'מספר ת.ז. אינו תקין (נדרשות 9 ספרות)' })
  }

  // Missing critical fields
  if (!employee.name) {
    issues.push({ severity: 'error', field: 'employee.name', message: 'שם העובד חסר' })
  }
  if (!employee.nationalId) {
    issues.push({ severity: 'error', field: 'employee.nationalId', message: 'מספר ת.ז. חסר' })
  }
  if (!payroll.month || !payroll.year) {
    issues.push({ severity: 'error', field: 'payroll.month', message: 'חודש או שנה חסרים' })
  }

  // Net > Gross
  if (payroll.grossSalary && payroll.netSalary && payroll.netSalary > payroll.grossSalary) {
    issues.push({ severity: 'error', field: 'payroll.netSalary', message: `נטו (${payroll.netSalary}) גדול מברוטו (${payroll.grossSalary})` })
  }

  // Negative values
  if (payroll.grossSalary !== null && payroll.grossSalary < 0) {
    issues.push({ severity: 'error', field: 'payroll.grossSalary', message: 'שכר ברוטו שלילי' })
  }
  if (payroll.netSalary !== null && payroll.netSalary < 0) {
    issues.push({ severity: 'error', field: 'payroll.netSalary', message: 'שכר נטו שלילי' })
  }

  // Earnings sum vs gross
  if (earnings.length > 0 && payroll.grossSalary) {
    const earningsSum = earnings.reduce((sum, e) => sum + (e.amount || 0), 0)
    const diff = Math.abs(earningsSum - payroll.grossSalary)
    if (diff > 1) {
      issues.push({ severity: 'warning', field: 'earnings', message: `סכום רכיבי ההכנסה (${earningsSum.toFixed(0)}) שונה מהברוטו (${payroll.grossSalary})` })
    }
  }

  // Deductions sum vs totalDeductions
  if (deductions.length > 0 && payroll.totalDeductions) {
    const deductionsSum = deductions.reduce((sum, d) => sum + (d.amount || 0), 0)
    const diff = Math.abs(deductionsSum - payroll.totalDeductions)
    if (diff > 1) {
      issues.push({ severity: 'warning', field: 'deductions', message: `סכום הניכויים (${deductionsSum.toFixed(0)}) שונה מסה"כ ניכויים (${payroll.totalDeductions})` })
    }
  }

  // Gross - Deductions ≈ Net check
  if (payroll.grossSalary && payroll.totalDeductions && payroll.netSalary) {
    const expectedNet = payroll.grossSalary - payroll.totalDeductions
    const diff = Math.abs(expectedNet - payroll.netSalary)
    if (diff > 5) {
      issues.push({ severity: 'warning', field: 'payroll.netSalary', message: `ברוטו - ניכויים (${expectedNet.toFixed(0)}) לא שווה לנטו (${payroll.netSalary})` })
    }
  }

  // Zero salary
  if (payroll.grossSalary === 0 && payroll.netSalary === 0) {
    issues.push({ severity: 'warning', field: 'payroll.grossSalary', message: 'שכר ברוטו ונטו הם 0' })
  }

  return issues
}

const VALIDATION_PROMPT = `אתה מומחה לבדיקת תלושי שכר ישראליים. קיבלת נתונים שחולצו מתלוש שכר.
בדוק את הנתונים ודווח על בעיות, טעויות, חוסרים או חריגות.

בדוק:
1. האם כל הסכומים הגיוניים עבור שוק העבודה הישראלי?
2. האם יש רכיבים חסרים שצפויים בתלוש ישראלי רגיל (כמו ביטוח לאומי, מס הכנסה, מס בריאות)?
3. האם שעות העבודה והימים סבירים?
4. האם יש חריגות מהרגיל?
5. האם נקודות הזיכוי ממס הגיוניות?

החזר אך ורק JSON תקין בפורמט הבא:
{
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "field": "שם השדה הרלוונטי",
      "message": "תיאור הבעיה בעברית"
    }
  ]
}

אם אין בעיות, החזר: {"issues": []}
אל תחזיר בעיות על שדות שהם null - רק על ערכים שנראים שגויים.`

export async function validatePayslipData(
  record: ExtractionResult,
  previousPayroll?: { grossSalary: number | null; netSalary: number | null; totalDeductions: number | null } | null
): Promise<ValidationResult> {
  const deterministicIssues = runDeterministicChecks(record)

  let aiIssues: ValidationIssue[] = []
  try {
    let contextNote = ''
    if (previousPayroll?.grossSalary) {
      contextNote = `\n\nהערה: בחודש הקודם השכר ברוטו היה ${previousPayroll.grossSalary}, נטו ${previousPayroll.netSalary}, ניכויים ${previousPayroll.totalDeductions}. בדוק שינויים חריגים.`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `${VALIDATION_PROMPT}${contextNote}\n\nנתוני התלוש:\n${JSON.stringify(record, null, 2)}`,
          },
        ],
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const textContent = data.content?.find((c: { type: string }) => c.type === 'text')
      if (textContent) {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          if (Array.isArray(result.issues)) {
            aiIssues = result.issues.filter(
              (i: ValidationIssue) => i.severity && i.message
            )
          }
        }
      }
    }
  } catch {
    // If AI validation fails, we still have deterministic checks
  }

  const allIssues = [...deterministicIssues, ...aiIssues]
  return {
    issues: allIssues,
    isValid: !allIssues.some((i) => i.severity === 'error'),
  }
}

export async function chatWithPayrollContext(
  messages: ChatMessage[],
  dataContext: string
): Promise<ReadableStream> {
  const systemPrompt = `אתה עוזר AI של מערכת VERED PAY לניהול שכר בקיבוץ. אתה מדבר עברית.
תפקידך לענות על שאלות של ורד, מנהלת השכר, לגבי נתוני השכר של העובדים.

הנה הנתונים העדכניים מהמערכת:
${dataContext}

כללים:
1. ענה תמיד בעברית
2. היה מדויק - השתמש רק בנתונים שקיבלת, אל תמציא מספרים
3. אם אין לך מספיק מידע לענות, אמור זאת
4. פרמט סכומים כספיים בשקלים (₪)
5. היה תמציתי וברור
6. אם שואלים על עובד ספציפי, ציין את שמו ות.ז.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errorBody}`)
  }

  return response.body!
}
