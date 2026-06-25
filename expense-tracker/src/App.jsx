import { useState, useMemo, useCallback, useRef } from "react";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
// Palette: Deep ink navy + electric teal accent + warm offwhite surface
// Signature: Animated cash-flow river — a live sparkline that breathes with your data
const COLORS = {
  ink: "#0F1117",
  navy: "#141926",
  card: "#1A2235",
  border: "#252E42",
  teal: "#00D4B4",
  tealDim: "#00A896",
  rose: "#FF4D6D",
  amber: "#FFB703",
  violet: "#7B61FF",
  slate: "#8899AA",
  ghost: "#B8C4D0",
  surface: "#F0F4F8",
};

const CATEGORY_META = {
  Food:        { icon: "🍜", color: "#FF6B6B" },
  Transport:   { icon: "🚗", color: "#FFB703" },
  Shopping:    { icon: "🛍️", color: "#7B61FF" },
  Health:      { icon: "💊", color: "#00D4B4" },
  Housing:     { icon: "🏠", color: "#4ECDC4" },
  Entertainment: { icon: "🎬", color: "#FF6FD8" },
  Utilities:   { icon: "⚡", color: "#45B7D1" },
  Education:   { icon: "📚", color: "#96CEB4" },
  Other:       { icon: "📦", color: "#8899AA" },
};

const CATEGORIES = Object.keys(CATEGORY_META);

// ─── Utilities ─────────────────────────────────────────────────────────────────
const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const today = () => new Date().toISOString().split("T")[0];

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Seed Data ──────────────────────────────────────────────────────────────────
const SEED = [
  { id: uid(), title: "Grocery Run", amount: 2400, category: "Food", date: "2025-06-20", note: "Monthly groceries" },
  { id: uid(), title: "Metro Card Recharge", amount: 500, category: "Transport", date: "2025-06-18", note: "" },
  { id: uid(), title: "Netflix + Hotstar", amount: 899, category: "Entertainment", date: "2025-06-15", note: "Streaming subs" },
  { id: uid(), title: "Electricity Bill", amount: 1850, category: "Utilities", date: "2025-06-14", note: "" },
  { id: uid(), title: "Pharmacy", amount: 620, category: "Health", date: "2025-06-13", note: "Vitamins" },
  { id: uid(), title: "Zomato Dinner", amount: 460, category: "Food", date: "2025-06-12", note: "" },
  { id: uid(), title: "Udemy Course", amount: 399, category: "Education", date: "2025-06-11", note: "React Advanced" },
  { id: uid(), title: "Amazon Order", amount: 1299, category: "Shopping", date: "2025-06-10", note: "Desk lamp" },
  { id: uid(), title: "Rent", amount: 18000, category: "Housing", date: "2025-06-01", note: "June rent" },
  { id: uid(), title: "Cab to Airport", amount: 750, category: "Transport", date: "2025-06-08", note: "" },
];

// ─── Sparkline SVG ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#00D4B4", height = 40, width = 120 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points={`0,${height} ${pts.join(" ")} ${width},${height}`}
        fill={`url(#sg-${color.replace("#","")})`}
      />
    </svg>
  );
}

// ─── DonutChart ─────────────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const size = 160, stroke = 28, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const slice = { ...d, dasharray: `${dash} ${gap}`, dashoffset: -offset * circ };
    offset += pct;
    return slice;
  });
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={s.dasharray}
          strokeDashoffset={s.dashoffset}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="#1A2235" />
    </svg>
  );
}

// ─── ProgressBar ────────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: "#252E42", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`, height: "100%",
        background: color, borderRadius: 99,
        transition: "width 0.6s cubic-bezier(.4,0,.2,1)"
      }} />
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,14,24,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(4px)", padding: "1rem"
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1A2235", border: "1px solid #252E42",
        borderRadius: 20, padding: "2rem", width: "100%", maxWidth: 460,
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)"
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 200,
      background: type === "error" ? "#FF4D6D" : "#00D4B4",
      color: "#fff", padding: "0.75rem 1.5rem", borderRadius: 12,
      fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "slideUp 0.3s ease"
    }}>
      {msg}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{
      background: color + "22", color, borderRadius: 99,
      padding: "2px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.02em"
    }}>
      {CATEGORY_META[label]?.icon} {label}
    </span>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, spark }) {
  return (
    <div style={{
      background: "#1A2235", border: "1px solid #252E42",
      borderRadius: 16, padding: "1.25rem 1.5rem",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 800, color: "#F0F4F8", lineHeight: 1 }}>{value}</span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: 12, color: "#8899AA" }}>{sub}</span>
        {spark && <Sparkline data={spark} color={accent} width={80} height={32} />}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────────
export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState(SEED);
  const [modal, setModal] = useState(null); // "add" | "edit" | "delete"
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterMonth, setFilterMonth] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [tab, setTab] = useState("dashboard"); // "dashboard" | "transactions"
  const [budgets, setBudgets] = useState({ Food: 5000, Transport: 2000, Shopping: 3000, Health: 1500, Housing: 20000, Entertainment: 1000, Utilities: 2500, Education: 1000, Other: 1000 });
  const [budgetModal, setBudgetModal] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Food", date: today(), note: "" });
  const [formErr, setFormErr] = useState({});
  const toastTimer = useRef(null);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  // ── Filtered & Sorted Expenses ──
  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search) list = list.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.note.toLowerCase().includes(search.toLowerCase()));
    if (filterCat !== "All") list = list.filter(e => e.category === filterCat);
    if (filterMonth !== "all") list = list.filter(e => e.date.slice(0, 7) === filterMonth);
    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "amount") { av = +av; bv = +bv; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [expenses, search, filterCat, filterMonth, sortKey, sortDir]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const thisMonth = expenses.filter(e => e.date.slice(0, 7) === today().slice(0, 7)).reduce((s, e) => s + e.amount, 0);
    const byCategory = CATEGORIES.map(cat => ({
      label: cat,
      value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
      color: CATEGORY_META[cat].color,
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    const byDay = (() => {
      const map = {};
      expenses.forEach(e => { map[e.date] = (map[e.date] || 0) + e.amount; });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([, v]) => v);
    })();
    const largest = [...expenses].sort((a, b) => b.amount - a.amount)[0];
    const avg = expenses.length ? total / expenses.length : 0;
    const months = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
    return { total, thisMonth, byCategory, byDay, largest, avg, months };
  }, [expenses]);

  const availableMonths = useMemo(() => {
    const ms = [...new Set(expenses.map(e => e.date.slice(0, 7)))].sort().reverse();
    return ms;
  }, [expenses]);

  // ── Form Validation ──
  const validate = () => {
    const err = {};
    if (!form.title.trim()) err.title = "Title is required";
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) err.amount = "Enter a valid amount";
    if (!form.date) err.date = "Date is required";
    setFormErr(err);
    return Object.keys(err).length === 0;
  };

  const resetForm = () => { setForm({ title: "", amount: "", category: "Food", date: today(), note: "" }); setFormErr({}); };

  // ── CRUD ──
  const addExpense = () => {
    if (!validate()) return;
    setExpenses(prev => [{ ...form, id: uid(), amount: +form.amount }, ...prev]);
    showToast("Expense added ✓");
    setModal(null); resetForm();
  };

  const updateExpense = () => {
    if (!validate()) return;
    setExpenses(prev => prev.map(e => e.id === editing.id ? { ...form, id: editing.id, amount: +form.amount } : e));
    showToast("Expense updated ✓");
    setModal(null); setEditing(null); resetForm();
  };

  const deleteExpense = useCallback((id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast("Expense deleted", "error");
    setModal(null); setEditing(null);
  }, []);

  const openEdit = (exp) => { setEditing(exp); setForm({ ...exp, amount: String(exp.amount) }); setModal("edit"); };
  const openDelete = (exp) => { setEditing(exp); setModal("delete"); };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleBudgetChange = (cat, val) => setBudgets(b => ({ ...b, [cat]: +val || 0 }));

  // ── CSS-in-JS helpers ──
  const inp = {
    width: "100%", background: "#141926", border: "1.5px solid #252E42",
    borderRadius: 10, padding: "0.6rem 0.85rem", color: "#F0F4F8",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s"
  };
  const label = { fontSize: 12, fontWeight: 600, color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };
  const btn = (bg, color = "#fff") => ({
    background: bg, color, border: "none", borderRadius: 10, padding: "0.65rem 1.4rem",
    fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
    transition: "opacity 0.15s, transform 0.12s"
  });

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const budgetUsed = stats.thisMonth;

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", fontFamily: "'Inter', system-ui, sans-serif", color: "#F0F4F8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #141926; }
        ::-webkit-scrollbar-thumb { background: #252E42; border-radius: 99px; }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .row-hover:hover { background: #1f2d44 !important; }
        .pill:hover { background: #00D4B4 !important; color: #0F1117 !important; }
        .btn-icon:hover { background: #252E42 !important; }
        .sort-btn:hover { color: #00D4B4 !important; }
        input:focus, select:focus, textarea:focus { border-color: #00D4B4 !important; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        background: "#141926", borderBottom: "1px solid #252E42",
        padding: "0 2rem", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #00D4B4, #7B61FF)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💰</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>Spendwise</div>
            <div style={{ fontSize: 11, color: "#8899AA", fontWeight: 500 }}>Personal Finance</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {["dashboard", "transactions"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#252E42" : "transparent", color: tab === t ? "#00D4B4" : "#8899AA",
              border: "none", borderRadius: 8, padding: "0.4rem 1rem",
              fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize", transition: "all 0.15s"
            }}>{t === "dashboard" ? "📊 Dashboard" : "📋 Transactions"}</button>
          ))}
        </nav>
        <button onClick={() => { resetForm(); setModal("add"); }} style={{
          ...btn("linear-gradient(135deg, #00D4B4, #00A896)"), display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 20px rgba(0,212,180,0.3)"
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Expense
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ════ DASHBOARD TAB ════ */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              <StatCard label="Total Spent" value={fmtCurrency(stats.total)} sub={`across ${expenses.length} expenses`} accent="#00D4B4" spark={stats.byDay} />
              <StatCard label="This Month" value={fmtCurrency(stats.thisMonth)} sub={`Budget: ${fmtCurrency(totalBudget)}`} accent="#7B61FF" />
              <StatCard label="Avg Per Expense" value={fmtCurrency(stats.avg)} sub="lifetime average" accent="#FFB703" />
              <StatCard label="Largest Expense" value={stats.largest ? fmtCurrency(stats.largest.amount) : "—"} sub={stats.largest?.title || ""} accent="#FF4D6D" />
            </div>

            {/* Budget Overview Bar */}
            <div style={{ background: "#1A2235", border: "1px solid #252E42", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Monthly Budget</div>
                  <div style={{ fontSize: 12, color: "#8899AA" }}>{fmtCurrency(budgetUsed)} of {fmtCurrency(totalBudget)} used</div>
                </div>
                <button onClick={() => setBudgetModal(true)} style={{ ...btn("#252E42", "#B8C4D0"), fontSize: 12, padding: "0.4rem 0.9rem" }}>⚙️ Set Budgets</button>
              </div>
              <ProgressBar pct={(budgetUsed / totalBudget) * 100} color={budgetUsed > totalBudget ? "#FF4D6D" : "#00D4B4"} />
              {budgetUsed > totalBudget && <div style={{ fontSize: 12, color: "#FF4D6D", marginTop: 6 }}>⚠ Over budget by {fmtCurrency(budgetUsed - totalBudget)}</div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Donut + Legend */}
              <div style={{ background: "#1A2235", border: "1px solid #252E42", borderRadius: 16, padding: "1.5rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Spending by Category</div>
                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                  <div style={{ flexShrink: 0 }}>
                    <DonutChart data={stats.byCategory} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.byCategory.slice(0, 6).map(d => (
                      <div key={d.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: "#B8C4D0" }}>{CATEGORY_META[d.label]?.icon} {d.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{fmtCurrency(d.value)}</span>
                        </div>
                        <ProgressBar pct={(d.value / stats.total) * 100} color={d.color} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Per-Category Budget Progress */}
              <div style={{ background: "#1A2235", border: "1px solid #252E42", borderRadius: 16, padding: "1.5rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Budget vs Actual</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 260 }}>
                  {CATEGORIES.map(cat => {
                    const spent = expenses.filter(e => e.category === cat && e.date.slice(0, 7) === today().slice(0, 7)).reduce((s, e) => s + e.amount, 0);
                    const budget = budgets[cat] || 0;
                    const over = spent > budget;
                    return (
                      <div key={cat}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: "#B8C4D0" }}>{CATEGORY_META[cat].icon} {cat}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: over ? "#FF4D6D" : "#B8C4D0" }}>
                            {fmtCurrency(spent)} / {fmtCurrency(budget)}
                          </span>
                        </div>
                        <ProgressBar pct={budget ? (spent / budget) * 100 : 0} color={over ? "#FF4D6D" : CATEGORY_META[cat].color} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div style={{ background: "#1A2235", border: "1px solid #252E42", borderRadius: 16, padding: "1.5rem", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ fontWeight: 700 }}>Recent Transactions</div>
                <button onClick={() => setTab("transactions")} style={{ ...btn("transparent", "#00D4B4"), fontSize: 12, padding: "0.3rem 0.8rem" }}>View All →</button>
              </div>
              {expenses.slice(0, 5).map(e => (
                <div key={e.id} className="row-hover" style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "0.7rem 0.5rem", borderRadius: 10, cursor: "pointer",
                  transition: "background 0.15s"
                }} onClick={() => openEdit(e)}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: CATEGORY_META[e.category].color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {CATEGORY_META[e.category].icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: "#8899AA" }}>{fmtDate(e.date)}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#FF4D6D", fontSize: 15 }}>−{fmtCurrency(e.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ TRANSACTIONS TAB ════ */}
        {tab === "transactions" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Filters */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 220px" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8899AA" }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…"
                  style={{ ...inp, paddingLeft: 36 }} />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inp, width: "auto", cursor: "pointer" }}>
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...inp, width: "auto", cursor: "pointer" }}>
                <option value="all">All Months</option>
                {availableMonths.map(m => <option key={m} value={m}>{new Date(m + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}</option>)}
              </select>
              {(search || filterCat !== "All" || filterMonth !== "all") && (
                <button onClick={() => { setSearch(""); setFilterCat("All"); setFilterMonth("all"); }} style={{ ...btn("#252E42", "#FF4D6D"), fontSize: 12, padding: "0.5rem 0.9rem" }}>✕ Clear</button>
              )}
            </div>

            {/* Table Header */}
            <div style={{ background: "#1A2235", border: "1px solid #252E42", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 100px 80px", gap: 0, padding: "0.75rem 1.25rem", borderBottom: "1px solid #252E42", fontSize: 11, fontWeight: 700, color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {[["title", "Title"], ["category", "Category"], ["date", "Date"], ["amount", "Amount"]].map(([k, l]) => (
                  <button key={k} className="sort-btn" onClick={() => toggleSort(k)} style={{ background: "none", border: "none", color: sortKey === k ? "#00D4B4" : "#8899AA", fontWeight: 700, fontSize: 11, cursor: "pointer", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                    {l} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                ))}
                <span>Actions</span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#8899AA" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🪹</div>
                  <div style={{ fontWeight: 600 }}>No expenses found</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters or add a new expense.</div>
                </div>
              ) : filtered.map((e, i) => (
                <div key={e.id} className="row-hover" style={{
                  display: "grid", gridTemplateColumns: "1fr 140px 120px 100px 80px",
                  gap: 0, padding: "0.85rem 1.25rem",
                  borderBottom: i < filtered.length - 1 ? "1px solid #1e2a3a" : "none",
                  transition: "background 0.12s", alignItems: "center"
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                    {e.note && <div style={{ fontSize: 11, color: "#8899AA", marginTop: 2 }}>{e.note}</div>}
                  </div>
                  <div><Badge label={e.category} color={CATEGORY_META[e.category].color} /></div>
                  <div style={{ fontSize: 13, color: "#8899AA" }}>{fmtDate(e.date)}</div>
                  <div style={{ fontWeight: 800, color: "#FF4D6D", fontSize: 14 }}>−{fmtCurrency(e.amount)}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(e)} title="Edit" style={{ background: "transparent", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 15, transition: "background 0.15s" }}>✏️</button>
                    <button className="btn-icon" onClick={() => openDelete(e)} title="Delete" style={{ background: "transparent", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 15, transition: "background 0.15s" }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: 12, color: "#8899AA" }}>
              Showing {filtered.length} of {expenses.length} expenses
              {filtered.length > 0 && <> · Total: <strong style={{ color: "#FF4D6D" }}>{fmtCurrency(filtered.reduce((s, e) => s + e.amount, 0))}</strong></>}
            </div>
          </div>
        )}
      </main>

      {/* ── Add / Edit Modal ── */}
      <Modal open={modal === "add" || modal === "edit"} onClose={() => { setModal(null); resetForm(); }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{modal === "add" ? "Add Expense" : "Edit Expense"}</div>
          <button onClick={() => { setModal(null); resetForm(); }} style={{ background: "#252E42", border: "none", borderRadius: 8, width: 32, height: 32, color: "#8899AA", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={label}>Title *</label>
            <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Grocery Run" />
            {formErr.title && <div style={{ color: "#FF4D6D", fontSize: 11, marginTop: 3 }}>{formErr.title}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Amount (₹) *</label>
              <input style={inp} type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              {formErr.amount && <div style={{ color: "#FF4D6D", fontSize: 11, marginTop: 3 }}>{formErr.amount}</div>}
            </div>
            <div>
              <label style={label}>Date *</label>
              <input style={inp} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              {formErr.date && <div style={{ color: "#FF4D6D", fontSize: 11, marginTop: 3 }}>{formErr.date}</div>}
            </div>
          </div>
          <div>
            <label style={label}>Category</label>
            <select style={{ ...inp, cursor: "pointer" }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].icon} {c}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Note <span style={{ color: "#525e75", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <textarea style={{ ...inp, resize: "vertical", minHeight: 64 }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Add a note…" />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={() => { setModal(null); resetForm(); }} style={btn("#252E42", "#B8C4D0")}>Cancel</button>
            <button onClick={modal === "add" ? addExpense : updateExpense} style={{ ...btn("linear-gradient(135deg, #00D4B4, #00A896)"), boxShadow: "0 4px 16px rgba(0,212,180,0.3)" }}>
              {modal === "add" ? "Add Expense" : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={modal === "delete"} onClose={() => setModal(null)}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Delete Expense?</div>
          <div style={{ color: "#8899AA", fontSize: 14, marginBottom: "1.5rem" }}>
            "<strong style={{ color: "#F0F4F8" }}>{editing?.title}</strong>" — {editing && fmtCurrency(editing.amount)}<br />
            This action cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => setModal(null)} style={btn("#252E42", "#B8C4D0")}>Cancel</button>
            <button onClick={() => deleteExpense(editing?.id)} style={{ ...btn("#FF4D6D"), boxShadow: "0 4px 16px rgba(255,77,109,0.3)" }}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* ── Budget Settings Modal ── */}
      <Modal open={budgetModal} onClose={() => setBudgetModal(false)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>⚙️ Monthly Budgets</div>
          <button onClick={() => setBudgetModal(false)} style={{ background: "#252E42", border: "none", borderRadius: 8, width: 32, height: 32, color: "#8899AA", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto" }}>
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 100, fontSize: 13, color: "#B8C4D0" }}>{CATEGORY_META[cat].icon} {cat}</span>
              <input type="number" min="0" value={budgets[cat]} onChange={e => handleBudgetChange(cat, e.target.value)}
                style={{ ...inp, flex: 1 }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button onClick={() => setBudgetModal(false)} style={{ ...btn("linear-gradient(135deg, #00D4B4, #00A896)"), boxShadow: "0 4px 16px rgba(0,212,180,0.2)" }}>Save Budgets</button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
