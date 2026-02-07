import type { ExtractionResult } from './types'

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
