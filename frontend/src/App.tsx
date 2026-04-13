import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

const API = "http://localhost:3000/api";
const ML_API = "http://localhost:8000/api/ml";
const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316"];

interface Transaction {
  id: string; amount: string; type: string; description: string;
  merchant: string | null; date: string;
  category: { id: string; name: string; icon: string; color: string } | null;
  account: { id: string; accountName: string } | null;
}
interface Account { id: string; accountName: string; accountType: string; balance: string; currency: string; }
interface Category { id: string; name: string; icon: string; color: string; }
interface SpendingPattern { category: string; total_spent: number; percentage: number; transaction_count: number; }

function App() {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [patterns, setPatterns] = useState<SpendingPattern[]>([]);
  const [advice, setAdvice] = useState("");
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({ accountName: "", accountType: "CHECKING", balance: "" });
  const [newTx, setNewTx] = useState({ accountId: "", categoryId: "", amount: "", type: "EXPENSE", description: "", merchant: "", date: new Date().toISOString().split("T")[0] });
  const [newBudget, setNewBudget] = useState({ categoryId: "", amount: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [toast, setToast] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");

  const getHeaders = () => ({ Authorization: `Bearer ${token}` });
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const login = async () => {
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      setToken(res.data.token); setUserId(res.data.user.id);
      setUserName(res.data.user.firstName); setLoggedIn(true);
    } catch { alert("Login failed."); }
  };

  const register = async () => {
    if (!regFirstName || !regLastName) { alert("Please enter first and last name"); return; }
    try {
      const res = await axios.post(`${API}/auth/register`, { email, password, firstName: regFirstName, lastName: regLastName });
      setToken(res.data.token); setUserId(res.data.user.id);
      setUserName(res.data.user.firstName); setLoggedIn(true);
    } catch { alert("Registration failed."); }
  };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const [txRes, sumRes, accRes, catRes] = await Promise.all([
        axios.get(`${API}/transactions?limit=20`, { headers: getHeaders() }),
        axios.get(`${API}/transactions/summary?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`, { headers: getHeaders() }),
        axios.get(`${API}/accounts`, { headers: getHeaders() }),
        axios.get(`${API}/accounts/categories`, { headers: getHeaders() }),
      ]);
      setTransactions(txRes.data.transactions);
      setSummary(sumRes.data);
      setAccounts(accRes.data.accounts);
      setCategories(catRes.data.categories);
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchML = useCallback(async () => {
    if (!userId) return;
    try { const r = await axios.get(`${ML_API}/spending-patterns/${userId}`); setPatterns(r.data.patterns || []); } catch {}
    try { const r = await axios.get(`${ML_API}/advice/${userId}`); setAdvice(r.data.ai_advice || r.data.advice || ""); } catch {}
  }, [userId]);

  useEffect(() => { if (loggedIn) { fetchAll(); fetchML(); } }, [loggedIn, fetchAll, fetchML]);

  const createAccount = async () => {
    if (!newAccount.accountName) { alert("Account name is required"); return; }
    try {
      const res = await axios.post(`${API}/accounts`, { accountName: newAccount.accountName, accountType: newAccount.accountType, balance: Number(newAccount.balance) || 0 }, { headers: getHeaders() });
      setActiveForm(null); setNewAccount({ accountName: "", accountType: "CHECKING", balance: "" });
      showToast(res.data.merged ? `Balance added to ${res.data.account.accountName}!` : "Account created!"); fetchAll();
    } catch { alert("Failed"); }
  };

  const createTransaction = async () => {
    if (!newTx.accountId) { alert("Select an account"); return; }
    if (!newTx.amount || Number(newTx.amount) <= 0) { alert("Enter a valid amount"); return; }
    if (newTx.type !== "INCOME" && !newTx.description) { alert("Description required for expenses"); return; }
    try {
      const p: any = { accountId: newTx.accountId, amount: Number(newTx.amount), type: newTx.type, description: newTx.description || "Income payment", date: newTx.date };
      if (newTx.merchant) p.merchant = newTx.merchant;
      if (newTx.categoryId) p.categoryId = newTx.categoryId;
      await axios.post(`${API}/transactions`, p, { headers: getHeaders() });
      setActiveForm(null); setNewTx({ accountId: accounts[0]?.id || "", categoryId: "", amount: "", type: "EXPENSE", description: "", merchant: "", date: new Date().toISOString().split("T")[0] });
      showToast("Transaction created!"); fetchAll(); fetchML();
    } catch { alert("Failed"); }
  };

  const createBudget = async () => {
    if (!newBudget.categoryId) { alert("Select a category"); return; }
    if (!newBudget.amount || Number(newBudget.amount) <= 0) { alert("Enter a valid amount"); return; }
    try {
      await axios.post(`${API}/budgets`, { categoryId: newBudget.categoryId, amount: Number(newBudget.amount), month: Number(newBudget.month), year: Number(newBudget.year) }, { headers: getHeaders() });
      setActiveForm(null); setNewBudget({ categoryId: "", amount: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
      showToast("Budget set!");
    } catch { alert("Failed"); }
  };

  const deleteAccount = async (id: string) => {
    if (!window.confirm("Delete this account? All transactions in this account will also be deleted.")) return;
    try {
      await axios.delete(`${API}/accounts/${id}`, { headers: getHeaders() });
      showToast("Account deleted");
      fetchAll(); fetchML();
    } catch { alert("Failed to delete account"); }
  };

  const deleteTransaction = async (id: string) => {
    if (!window.confirm("Delete?")) return;
    try { await axios.delete(`${API}/transactions/${id}`, { headers: getHeaders() }); showToast("Deleted"); fetchAll(); fetchML(); } catch { alert("Failed"); }
  };

  if (!loggedIn) return (
    <div className="login-page"><div className="login-container"><div className="login-header"><div className="login-logo">FT</div><h1>Finance Tracker</h1><p>AI-powered personal finance</p></div>
    <div className="login-form">{isRegister && <div className="input-row"><div className="input-group"><label>First name</label><input value={regFirstName} onChange={e=>setRegFirstName(e.target.value)} placeholder="Binh"/></div><div className="input-group"><label>Last name</label><input value={regLastName} onChange={e=>setRegLastName(e.target.value)} placeholder="Pham"/></div></div>}
    <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
    <div className="input-group"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 chars, 1 upper, 1 number" onKeyDown={e=>{if(e.key==="Enter")isRegister?register():login()}}/></div>
    {isRegister?<button className="btn-primary" onClick={register}>Create Account</button>:<button className="btn-primary" onClick={login}>Sign In</button>}
    <button className="btn-link" onClick={()=>setIsRegister(!isRegister)}>{isRegister?"Already have an account? Sign in":"New here? Create an account"}</button></div></div></div>
  );

  const deleteAllTransactions = async () => {
    if (!window.confirm("Delete ALL transactions? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/transactions/all/clear`, { headers: getHeaders() });
      showToast("All transactions deleted");
      fetchAll(); fetchML();
    } catch { alert("Failed"); }
  };

  const pieData = summary?.spendingByCategory?.map((s:any)=>({name:s.category?.name||"Uncategorized",value:Number(s.total)}))||[];
  const totalIncome=summary?Number(summary.totalIncome):0;
  const totalExpense=summary?Number(summary.totalExpense):0;
  const netSavings=summary?summary.netSavings:0;
  const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="dashboard">{toast&&<div className="toast">{toast}</div>}
    <nav className="sidebar"><div className="sidebar-logo">FT</div><div className="sidebar-nav"><button className="nav-item active">Dashboard</button></div><div className="sidebar-user"><div className="avatar">{userName.charAt(0)}</div><span>{userName}</span><button className="btn-logout" onClick={()=>{setLoggedIn(false);setToken("")}}>Logout</button></div></nav>
    <main className="main-content">
      <div className="top-bar"><div><h1>Dashboard</h1><p className="subtitle">{mn[new Date().getMonth()]} {new Date().getFullYear()} Overview</p></div>
      <div className="top-actions"><button className="btn-action" onClick={()=>setActiveForm(activeForm==="account"?null:"account")}>+ Account</button><button className="btn-action" onClick={()=>{setActiveForm(activeForm==="transaction"?null:"transaction");if(accounts.length>0)setNewTx(t=>({...t,accountId:accounts[0].id}))}}>+ Transaction</button><button className="btn-action btn-accent" onClick={()=>setActiveForm(activeForm==="budget"?null:"budget")}>+ Budget</button></div></div>

      {activeForm==="account"&&<div className="form-panel"><div className="form-panel-header"><h3>New Account</h3><button className="btn-close" onClick={()=>setActiveForm(null)}>Close</button></div><p className="form-hint">Same name + type = balance merged automatically.</p><div className="form-grid"><div className="input-group"><label>Account name</label><input placeholder="e.g. Chase Bank" value={newAccount.accountName} onChange={e=>setNewAccount({...newAccount,accountName:e.target.value})}/></div><div className="input-group"><label>Type</label><select value={newAccount.accountType} onChange={e=>setNewAccount({...newAccount,accountType:e.target.value})}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option><option value="CREDIT_CARD">Credit Card</option><option value="INVESTMENT">Investment</option></select></div><div className="input-group"><label>Balance ($)</label><input type="number" min="0" step="0.01" placeholder="0.00" value={newAccount.balance} onChange={e=>setNewAccount({...newAccount,balance:e.target.value})}/></div><div className="input-group form-submit"><button className="btn-primary" onClick={createAccount}>Create</button></div></div></div>}

      {activeForm==="transaction"&&<div className="form-panel"><div className="form-panel-header"><h3>New Transaction</h3><button className="btn-close" onClick={()=>setActiveForm(null)}>Close</button></div>{accounts.length===0?<div className="empty-state">Create an account first.</div>:<div className="form-grid"><div className="input-group"><label>Account</label><select value={newTx.accountId} onChange={e=>setNewTx({...newTx,accountId:e.target.value})}>{accounts.map(a=><option key={a.id} value={a.id}>{a.accountName} (${Number(a.balance).toLocaleString()})</option>)}</select></div><div className="input-group"><label>Type</label><div className="type-toggle">{["EXPENSE","INCOME","TRANSFER"].map(t=><button key={t} className={`toggle-btn ${newTx.type===t?"active "+t.toLowerCase():""}`} onClick={()=>setNewTx({...newTx,type:t})}>{t.charAt(0)+t.slice(1).toLowerCase()}</button>)}</div></div><div className="input-group"><label>Amount ($)</label><input type="number" min="0.01" step="0.01" placeholder="0.00" value={newTx.amount} onChange={e=>setNewTx({...newTx,amount:e.target.value})}/></div><div className="input-group"><label>Description {newTx.type==="INCOME"&&<span className="optional">(optional)</span>}</label><input placeholder={newTx.type==="INCOME"?"e.g. Monthly salary":"e.g. Lunch at Chipotle"} value={newTx.description} onChange={e=>setNewTx({...newTx,description:e.target.value})}/></div><div className="input-group"><label>Merchant <span className="optional">(optional)</span></label><input placeholder="e.g. Starbucks" value={newTx.merchant} onChange={e=>setNewTx({...newTx,merchant:e.target.value})}/></div><div className="input-group"><label>Category <span className="optional">(empty = AI auto-detect)</span></label><select value={newTx.categoryId} onChange={e=>setNewTx({...newTx,categoryId:e.target.value})}><option value="">Auto-detect (ML)</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon||"📌"} {c.name}</option>)}</select></div><div className="input-group"><label>Date</label><input type="date" value={newTx.date} onChange={e=>setNewTx({...newTx,date:e.target.value})}/></div><div className="input-group form-submit"><button className="btn-primary" onClick={createTransaction}>Create</button></div></div>}</div>}

      {activeForm==="budget"&&<div className="form-panel"><div className="form-panel-header"><h3>Set Monthly Budget</h3><button className="btn-close" onClick={()=>setActiveForm(null)}>Close</button></div><div className="form-grid"><div className="input-group"><label>Category</label><select value={newBudget.categoryId} onChange={e=>setNewBudget({...newBudget,categoryId:e.target.value})}><option value="">Select a category...</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon||"📌"} {c.name}</option>)}</select></div><div className="input-group"><label>Amount ($)</label><input type="number" min="1" step="0.01" placeholder="500.00" value={newBudget.amount} onChange={e=>setNewBudget({...newBudget,amount:e.target.value})}/></div><div className="input-group"><label>Month</label><select value={newBudget.month} onChange={e=>setNewBudget({...newBudget,month:e.target.value})}>{mn.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div><div className="input-group"><label>Year</label><input type="number" min="2024" max="2030" value={newBudget.year} onChange={e=>setNewBudget({...newBudget,year:e.target.value})}/></div><div className="input-group form-submit"><button className="btn-primary" onClick={createBudget}>Set Budget</button></div></div></div>}

{accounts.length>0&&<div className="accounts-bar">{accounts.map(a=><div key={a.id} className="account-chip"><span className="account-type">{a.accountType==="CHECKING"?"🏦":a.accountType==="SAVINGS"?"🐷":a.accountType==="CREDIT_CARD"?"💳":"📈"}</span><div><div className="account-name">{a.accountName}</div><div className="account-balance">${Number(a.balance).toLocaleString()}</div></div><button className="btn-del" onClick={()=>deleteAccount(a.id)} title="Delete account">&#x2715;</button></div>)}</div>}
      <div className="summary-row"><div className="summary-card card-income"><p className="summary-label">Income</p><p className="summary-value">${totalIncome.toLocaleString()}</p></div><div className="summary-card card-expense"><p className="summary-label">Expenses</p><p className="summary-value">${totalExpense.toLocaleString()}</p></div><div className="summary-card card-savings"><p className="summary-label">Net Savings</p><p className="summary-value">${netSavings.toLocaleString()}</p></div></div>

      <div className="charts-row"><div className="chart-card"><h3>Spending by category</h3>{pieData.length>0?<ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} label={({name,percent}:any)=>`${name} ${(percent*100).toFixed(0)}%`}>{pieData.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/></PieChart></ResponsiveContainer>:<div className="empty-state">No spending data yet</div>}</div>
      <div className="chart-card"><h3>Spending patterns (ML)</h3>{patterns.length>0?<ResponsiveContainer width="100%" height={260}><BarChart data={patterns} layout="vertical" margin={{left:80}}><XAxis type="number" tick={{fontSize:12}}/><YAxis dataKey="category" type="category" tick={{fontSize:12}} width={80}/><Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/><Bar dataKey="total_spent" fill="#6366f1" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>:<div className="empty-state">Need more transactions for ML</div>}</div></div>

      <div className="advice-section"><h3>AI Budget Advisor</h3><div className="advice-content">{advice||"Add transactions to get AI advice..."}</div></div>

      <div className="transactions-section"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}><h3>Recent transactions</h3>{transactions.length>0&&<button className="btn-del" style={{width:"auto",padding:"6px 14px",borderRadius:"8px",fontSize:"12px"}} onClick={deleteAllTransactions}>Clear all</button>}</div>{transactions.length===0?<div className="empty-state">No transactions yet.</div>:<div className="tx-table">{transactions.map(tx=><div key={tx.id} className="tx-row"><div className="tx-icon-wrap"><span className="tx-icon">{tx.category?.icon||"📌"}</span></div><div className="tx-info"><div className="tx-desc">{tx.description}</div><div className="tx-meta">{tx.category?.name||"Uncategorized"} · {tx.account?.accountName} · {new Date(tx.date).toLocaleDateString()}</div></div><div className="tx-end"><span className={`tx-amount ${tx.type.toLowerCase()}`}>{tx.type==="INCOME"?"+":"-"}${Number(tx.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</span><button className="btn-del" onClick={()=>deleteTransaction(tx.id)}>&#x2715;</button></div></div>)}</div>}</div>    </main></div>
  );
}

export default App;
