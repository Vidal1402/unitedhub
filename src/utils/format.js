/**
 * Formata valor em reais (R$ 20.000,00).
 * @param {number} value - Valor em reais (não em centavos).
 * @param {boolean} compact - Se true, valores >= 1000 podem ser R$ 1,5k.
 */
export function formatCurrency(value, compact = false) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (compact && n >= 1000) return `R$ ${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formata telefone para padrão brasileiro: (11) 98765-4321 ou (11) 3456-7890.
 * @param {string} phone - Número (apenas dígitos ou com formatação).
 */
export function formatPhone(phone) {
  if (!phone) return "—";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length >= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  return phone;
}

/**
 * Formata valor para exibição em input de moeda (R$ 1.234,56).
 * @param {string|number} value - Número ou string numérica; vazio retorna "".
 */
export function formatCurrencyInput(value) {
  if (value === "" || value == null) return "";
  const n = Number(String(value).replace(",", ".").replace(/\D/g, ""));
  if (Number.isNaN(n)) return "";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Extrai número a partir do texto do input de moeda.
 * Aceita "R$ 1.234,56", "1234,56", "1234" (reais; vírgula = decimais).
 * @param {string} str
 * @returns {number|""} Valor em reais, ou "" se vazio.
 */
export function parseCurrencyInput(str) {
  if (str == null || typeof str !== "string") return "";
  const s = str.trim().replace(/\s/g, "").replace(/R\$/gi, "");
  if (!s) return "";
  const hasComma = s.includes(",");
  const parts = s.split(",");
  const intPart = (parts[0] || "").replace(/\D/g, "");
  const decPart = (parts[1] || "").replace(/\D/g, "").slice(0, 2);
  if (!intPart && !decPart) return "";
  const num = parseInt(intPart || "0", 10) + (decPart ? parseInt(decPart.padEnd(2, "0"), 10) / 100 : 0);
  return Number.isNaN(num) ? "" : num;
}

/**
 * Formata data para exibição no input (DD/MM/AAAA).
 * Aceita ISO (YYYY-MM-DD) ou string parcial digitada (ex.: "12/12/1").
 * @param {string} isoOrPartial - "YYYY-MM-DD" ou texto parcial.
 */
export function formatDateInput(isoOrPartial) {
  if (!isoOrPartial || typeof isoOrPartial !== "string") return "";
  const s = isoOrPartial.trim();
  if (s.length === 10 && s.includes("-")) {
    const [y, m, d] = s.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return s.replace(/-/g, "/");
}

/**
 * Converte DD/MM/AAAA para YYYY-MM-DD (para API).
 * @param {string} str
 * @returns {string} "YYYY-MM-DD" ou "" se inválido.
 */
export function parseDateInput(str) {
  if (!str || typeof str !== "string") return "";
  const digits = str.replace(/\D/g, "");
  if (digits.length === 8) {
    const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  if (digits.length < 8) return "";
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
}

/**
 * Formata telefone para input: (11) 98765-4321.
 * @param {string} value
 */
export function formatPhoneInput(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Extrai apenas dígitos do telefone (para enviar à API).
 * @param {string} str
 */
export function parsePhoneInput(str) {
  if (!str) return "";
  return String(str).replace(/\D/g, "").slice(0, 11);
}

/**
 * Gera CSV a partir de array de objetos (usa primeira chave de cada coluna como header).
 * @param {Array<Record<string, string|number>>} rows
 * @param {string[]} headers - Nomes das colunas no CSV.
 * @param {string[]} keys - Chaves dos objetos para cada coluna.
 */
export function buildCSV(rows, headers, keys) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (row) => keys.map((k) => escape(row[k])).join(",");
  return [headers.join(","), ...rows.map(line)].join("\r\n");
}
