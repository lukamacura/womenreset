/**
 * Safety Validator - Validates queries for Menopause Specialist persona
 * Implements refusal logic for medication/dosage queries
 */

import type { QueryValidation } from "./types";

/**
 * List of refused medication names (case-insensitive matching)
 */
const REFUSED_MEDICATIONS = [
  "premarin", "estrace", "provera", "prometrium", "climara", "vivelle",
  "estradiol", "estrogen", "progesterone", "testosterone", "dhea",
  "prempak", "prempro", "premphase", "activella", "angeliq", "climara pro",
  "combipatch", "duavee", "prefest", "premphase", "prempro", "prempak"
];

/**
 * Patterns that indicate dosage questions (refused)
 */
const DOSAGE_PATTERNS = [
  /how much.*should i take/i,
  /what.*dosage/i,
  /what.*dose/i,
  /how many.*mg/i,
  /how many.*mcg/i,
  /how many.*units/i,
  /prescription.*dosage/i,
  /recommended.*dosage/i,
  /how much.*per day/i,
  /how much.*daily/i,
  /dosing.*schedule/i,
  /how to take.*mg/i,
];

/**
 * Patterns that indicate general HRT/menopause education (allowed)
 */
const ALLOWED_PATTERNS = [
  /what is hrt/i,
  /what is hormone replacement/i,
  /how does hrt work/i,
  /explain.*hrt/i,
  /tell me about.*hrt/i,
  /what are.*hormones/i,
  /how do.*hormones.*work/i,
  /menopause.*symptoms/i,
  /what causes.*symptoms/i,
  /why.*symptoms/i,
  /menopause.*phases/i,
  /perimenopause/i,
  /postmenopause/i,
];

/**
 * Validate a query for Menopause Specialist persona
 * Returns whether the query should be refused, allowed, or requires KB
 */
export function validateMenopauseQuery(query: string): QueryValidation {
  const lowerQuery = query.toLowerCase();

  // Check for refused medication names
  for (const medication of REFUSED_MEDICATIONS) {
    if (lowerQuery.includes(medication)) {
      // Check if it's asking about dosage specifically
      if (DOSAGE_PATTERNS.some(pattern => pattern.test(query))) {
        return "refused";
      }
      // If medication name appears but not asking about dosage, still refuse
      // (we don't want to give specific medication advice)
      if (/(should i|can i|do you recommend|what about|tell me about).*medication/i.test(query)) {
        return "refused";
      }
    }
  }

  // Check for dosage questions (even without specific medication names)
  if (DOSAGE_PATTERNS.some(pattern => pattern.test(query))) {
    // But allow if it's about general supplements (calcium, vitamin D, etc.)
    const generalSupplements = ["calcium", "vitamin d", "vitamin", "magnesium", "supplement"];
    if (generalSupplements.some(supp => lowerQuery.includes(supp))) {
      // These are generally safe to discuss, but still route to KB if possible
      return "kb_required";
    }
    return "refused";
  }

  // Check for prescription advice
  if (/(prescription|prescribe|doctor.*prescribe|should.*prescribe)/i.test(query)) {
    return "refused";
  }

  // Check for allowed patterns (general education)
  if (ALLOWED_PATTERNS.some(pattern => pattern.test(query))) {
    return "allowed";
  }

  // Default: prefer KB but allow LLM fallback for general questions
  // This is safer than refusing - we'll use LLM with safety boundaries
  return "allowed";
}

/**
 * Generate a polite refusal response for refused queries
 */
export function generateRefusalResponse(query: string): string {
  return `I understand you're looking for information about medications or dosages. I'm not able to provide specific medication recommendations or dosage advice, as these need to be determined by your healthcare provider based on your individual health profile.

For questions about:
- **Specific medications** (like Premarin, Estrace, etc.) → Please consult your doctor or pharmacist
- **Dosage questions** → Your healthcare provider will determine the right dosage for you
- **Prescription advice** → This requires a medical evaluation

I can help you with:
- General information about HRT and how it works
- Understanding menopause symptoms and phases
- Lifestyle strategies to support your menopause journey
- Questions about your symptoms and experiences

Would you like to explore any of these topics instead? 💜`;
}




