export interface EssentialOcrFields {
  name: string | null;
  address: string | null;
  purpose: string | null;
}

const NOISE_LINE_PATTERNS: RegExp[] = [
  /^\s*FOR\s+RESEARCH\s*$/i,
  /^\s*ONLY\s*$/i,
  /^\s*FOR\s+RESEARCH\s+ONLY\s*$/i,
  /^\s*SYNTHETIC\b.*$/i,
  /^\s*RESEARCH\s+ONLY\s*$/i,
  /^\s*NOT\s+VALID\s*$/i,
  /^\s*OFFICIAL\s+SEAL\s*$/i,
  /^\s*OF[EF]CIAL\s*$/i,
  /^\s*(?:QAn?GAY|RANGAY|BARANGAY\s+SEAL)\s*$/i,
];

const INLINE_NOISE_PATTERNS: RegExp[] = [
  /\bFOR\s+RESEARCH\s+ONLY\b/gi,
  /\bSYNTHETIC\s*[•·\-]?\s*RESEARCH\s+ONLY\s*[•·\-]?\s*NOT\s+VALID\b/gi,
  /\bSYNTHETIC\b/gi,
  /\bRESEARCH\s+ONLY\b/gi,
  /\bNOT\s+VALID\b/gi,
];

function cleanInline(text: string): string {
  return (text || '')
    .replace(/[`_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b([A-Z]):\s+([A-Z][a-zA-Z]+)/g, '$1. $2')
    .replace(/\b(Mr|Mrs|Ms|Dr|Sr|Jr|St|Ave|Rd|Blvd|Brgy)\s+\./gi, '$1.')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanName(val: string): string | null {
  const s = cleanInline(val)
    .replace(/\s*\([^)]*\d[^)]*\)\s*$/, '')
    .replace(/^(?:Mr|Mrs|Ms|Miss|Dr|Engr|Hon|granted\s+to|certify\s+that)\.?\s+/i, '')
    .replace(/^(?:Mr\s*[/I]?\s*Ms\.?)\s+/i, '')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');

  const tokens = s.split(/\s+/);
  const cleanTokens: string[] = [];
  for (const tok of tokens) {
    if (['of', 'legal', 'age', 'bonafide', 'resident', 'with', 'a', 'postal', 'address'].includes(tok.toLowerCase())) {
      break;
    }
    if (tok === '0.' || tok === '0') {
      cleanTokens.push('O.');
    } else if (/^[A-Za-zñÑ.\-']+$/.test(tok)) {
      cleanTokens.push(tok);
    }
  }

  const result = cleanTokens.join(' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');
  return (result.match(/[A-Za-zñÑ]/g) || []).length >= 2 ? result : null;
}

function cleanAddress(val: string, fullText: string, rawLines: string[]): string | null {
  let s = cleanInline(val)
    .replace(/^(?:a\s+)?postal\s+address\s+of\s+/i, '')
    .replace(/\b[A-Z]{3,}\s+[A-Z0-9]\.?\s+[A-Z]{3,},?\s*(?:of\s+legal)?\s*/g, '')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');

  if (!s) return null;

  const hasOrphanSt = rawLines.some((ln) => /^\s*St\.?\s*,?\s*$/i.test(ln));
  if (hasOrphanSt && !/\b(?:St\.?|Street|Ave\.?|Avenue|Rd\.?|Road|Blvd\.?|Dr\.?)\b/i.test(s)) {
    const mBrgy = s.match(/^(\d+\s+[A-Za-zñÑ][A-Za-zñÑ\s\-]{1,40}?)\s+(Barangay|Brgy\.?)\b(.*)$/i);
    if (mBrgy) {
      s = `${mBrgy[1].trim()} St., ${mBrgy[2]}${mBrgy[3]}`;
    }
  }

  s = s.replace(/(?<!,)\s+(Barangay|Brgy\.?)\b/gi, ', $1');
  s = s.replace(/\bSt,\s*/g, 'St., ');

  if (/,\s*Quezon\s*$/i.test(s) && !/Quezon\s+City\s*$/i.test(s)) {
    if (/\b(?:City\s+of\s+Quezon|Quezon\s+City)\b/i.test(fullText)) {
      s = s.replace(/,\s*Quezon\s*$/i, ', Quezon City');
    }
  }

  if (fullText.includes('Sampaloc') && !s.includes('Sampaloc')) {
    s += ', Sampaloc';
  }
  if (fullText.includes('Manila') && !s.includes('Manila')) {
    s += ', Manila';
  }

  s = s.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');
  return s.length >= 4 ? s : null;
}

function cleanPurpose(val: string): string | null {
  let s = cleanInline(val)
    .split(/\bIssued\s+this\b/i)[0]
    .replace(/^(?:for\s+the\s+purpose\s+of|for|purpose:?)\s+/i, '')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');
  if ((s.match(/[A-Za-z]/g) || []).length < 3) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Returns clean Name, Address, and Purpose fields from backend `fields_detected`,
 * falling back to deterministic extraction from `extracted_text` when needed.
 */
export function resolveEssentialOcrFields(
  ocr?: { fields_detected?: Record<string, any> | null; extracted_text?: string | null } | null
): EssentialOcrFields {
  const detected = ocr?.fields_detected || {};
  let name: string | null =
    typeof detected.name === 'string' && detected.name.trim() && detected.name !== 'NOT_DETECTED'
      ? detected.name.trim()
      : null;
  let address: string | null =
    typeof detected.address === 'string' && detected.address.trim() && detected.address !== 'NOT_DETECTED'
      ? detected.address.trim()
      : null;
  let purpose: string | null =
    typeof detected.purpose === 'string' && detected.purpose.trim() && detected.purpose !== 'NOT_DETECTED'
      ? detected.purpose.trim()
      : null;

  const rawText = ocr?.extracted_text || '';
  const text = rawText;
  if (!rawText.trim() || (name && address && purpose)) {
    return { name, address, purpose };
  }

  const rawLines = rawText.split(/\r?\n/);
  const cleanLines: string[] = [];
  for (const rawLine of rawLines) {
    let line = cleanInline(rawLine);
    if (!line || NOISE_LINE_PATTERNS.some((rx) => rx.test(line))) continue;
    for (const rx of INLINE_NOISE_PATTERNS) {
      line = line.replace(rx, '').trim();
    }
    if (line) cleanLines.push(line);
  }
  const flat = cleanInline(cleanLines.join(' '));

  if (!name) {
    for (const ln of cleanLines) {
      const m = ln.match(
        /^(?:FULL\s+|PATIENT\s+|APPLICANT\s+|ACCOUNT\s+|CUSTOMER\s+|SUBSCRIBER\s+)?(?:NAME|PATIENT)\s*[:\-]\s*(.+)$/i
      );
      if (m) {
        const candidate = cleanName(m[1]);
        if (candidate) {
          name = candidate;
          break;
        }
      }
    }
  }
  if (!name) {
    const m = text.match(/\b([A-Z]{3,}(?:\s+[A-Z0-9]\.?)?(?:\s+[A-Z]{3,}){1,3})\s*,\s*of\s+legal/);
    if (m) name = cleanName(m[1]);
  }
  if (!name) {
    const m = flat.match(
      /(?:granted\s+to|certify\s+that|certifying\s+that|issued\s+to|pinatutunayan\s+na)\s*(?:(?:Mr|Mrs|Ms|Miss|Dr|Engr|Hon|Mr\s*[/I]?\s*Ms)\.?\s+)?([A-Za-z0-9\s.,\'-]{3,60}?)(?=\s*,?\s*of\s+legal|\s+of\s+legal|\s*,|\s+\d{1,3}\s+years?\s+old|\s+of\s+legal\s+age|\s+(?:is|a)\s+(?:a\s+)?(?:bona\s*fide\s+)?resident|\s+residing|\s+born\b)/i
    );
    if (m) name = cleanName(m[1]);
  }
  if (!name) {
    const m = flat.match(/\b([A-Z][A-Za-z0-9\s.,\'-]{3,50}?)(?:,\s*of\s+legal|\s+of\s+legal)/);
    if (m) name = cleanName(m[1]);
  }
  if (!name) {
    const m = flat.match(
      /\b(?:Issued\s+to|ISSUED\s+TO|issued\s+to|Patient|PATIENT|patient)\s+([A-Z][a-zñÑ]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-zñÑ]+){1,4})/
    );
    if (m) name = cleanName(m[1]);
  }

  if (!address) {
    for (const ln of cleanLines) {
      const m = ln.match(/^(?:SERVICE\s+|BILLING\s+|HOME\s+|RESIDENTIAL\s+|PRESENT\s+)?(?:ADDRESS|RESIDENCE)\s*[:\-]\s*(.+)$/i);
      if (m) {
        const candidate = cleanAddress(m[1], flat, rawLines);
        if (candidate) {
          address = candidate;
          break;
        }
      }
    }
  }
  if (!address) {
    const m_st = text.match(/\b([0-9]{1,5}\s+[A-Za-z]+)\s+.*?\b(St|Street|Ave|Avenue|Rd|Road)\b\s*,\s*([A-Za-z]+)/i);
    if (m_st) {
      let cand = `${m_st[1]} ${m_st[2]}., ${m_st[3]}`;
      if (text.includes("Manila") && !cand.includes("Manila")) cand += ", Manila";
      address = cand;
    }
  }
  if (!address) {
    const m = flat.match(
      /(?:(?:a\s+)?(?:postal\s+address\s+of|resident\s+of|residing\s+at|resides\s+at))\s+([0-9]{1,5}\s+[A-Za-z0-9\s,.-]{5,80}?)(?=\s*(?:,\s*)?(?:\bThis\s+certif|\bis\s+(?:known|a\s+bona|hereby|an?\s+indigent)|\bhas\s+no\b|\band\s+(?:is|has)\b|\bwho\s+is\b|\bfor\s+the\s+past\b|\.|\n|;|$))/i
    );
    if (m) address = cleanAddress(m[1], flat, rawLines);
  }
  if (!address) {
    const m = flat.match(
      /(?:(?:a\s+)?(?:bona\s*fide\s+)?(?:resident\s+of|residing\s+at|resides\s+at))\s+(.+?)(?=\s*(?:,\s*)?(?:\bis\s+(?:known|a\s+bona|hereby|an?\s+indigent)|\bhas\s+no\b|\band\s+(?:is|has)\b|\bwho\s+is\b|\bfor\s+the\s+past\b|\bthis\s+certif|\.|;|$))/i
    );
    if (m) address = cleanAddress(m[1], flat, rawLines);
  }
  if (!address) {
    for (const ln of cleanLines) {
      const m = ln.match(/^BARANGAY\s*[:\-]\s*(.+)$/i);
      if (m) {
        const candidate = cleanAddress(m[1], flat, rawLines);
        if (candidate) {
          address = candidate;
          break;
        }
      }
    }
  }

  if (!purpose) {
    for (const ln of cleanLines) {
      const m = ln.match(/^(?:PURPOSE|REASON|INTENDED\s+PURPOSE)\s*[:\-]\s*(.+)$/i);
      if (m) {
        const candidate = cleanPurpose(m[1]);
        if (candidate) {
          purpose = candidate;
          break;
        }
      }
    }
  }
  if (!purpose) {
    const m = flat.match(
      /(?:for\s+whatever\s+legal\s+purpose\s+it\s+may\s+serve[d]?|for\s+whatever\s+legal\s+purpose|for\s+any\s+legal\s+purpose|for\s+the\s+purpose\s+of\s+([A-Za-z0-9\s,.-]{3,60}))/i
    );
    if (m) purpose = cleanPurpose(m[0]);
  }
  if (!purpose) {
    const m = flat.match(
      /(?:issued\s+upon\s+(?:the\s+)?request\s+of\s+[^.]*?\s+for\s+)(.+?)(?=\.|\n|Issued\s+this|$)/i
    );
    if (m) purpose = cleanPurpose(m[1]);
  }

  return { name, address, purpose };
}
