import { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import "./App.css";

const API = "http://localhost:3000/api";
const ML_API = "http://localhost:8000/api/ml";

const COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#10B981", "#EC4899", "#F97316", "#06B6D4"];

interface Transaction {
  id: string;
  amount: string;
  type: string;
  description: string;
  merchant: string | null;
  date: string;
  category: { name: string; icon: string; color: string } | null;
}

interface SpendingPattern {
  category: string;
  total_spent: number;
  percentage: number;
  transaction_count: number;
}

function App() {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("binh@gmail.com");
  const [password, setPassword] = useState("MyPassword123");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [patterns, setPatterns] = useState<SpendingPattern[]>([]);
  const [advice, setAdvice] = useState("");

  const login = async () => {
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      setToken(res.data.token);
      setUserId(res.data.user.id);
      setUserName(res.data.user.firstName);
      setLoggedIn(true);
    } catch {
      alert("Login failed");
    }
  };

  useEffect(() => {
    if (!loggedIn || !token) return;
    const headers = { Authorization: `Bearer ${token}` };

    axios.get(`${API}/transactions?limit=10`, { headers })
      .then(res => setTransactions(res.data.transactions))
      .catch(console.error);

    axios.get(`${API}/transactions/summary?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`, { headers })
      .then(res => setSummary(res.data))
      .catch(console.error);
  }, [loggedIn, token]);

  useEffect(() => {
    if (!userId) return;

    axios.get(`${ML_API}/spending-patterns/${userId}`)
      .then(res => setPatterns(res.data.patterns))
      .catch(console.error);

    axios.get(`${ML_API}/advice/${userId}`)
      .then(res => setAdvice(res.data.ai_advice))
      .catch(console.error);
  }, [userId]);

  if (!loggedIn) {
    return (
      <div className="app">
        <div className="login-card">
          <h1>💰 Finance Tracker</h1>
          <p>Personal Finance with AI Advisor</p>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={login}>Login</button>
        </div>
      </div>
    );
  }

  const pieData = summary?.spendingByCategory?.map((s: any) => ({
    name: s.category?.name || "Uncategorized",
    value: Number(s.total),
  })) || [];

  return (
    <div className="app">
      <header>
        <h1>💰 Finance Tracker</h1>
        <span>Welcome, {userName}!</span>
      </header>

      <div className="grid">
        <div className="card">
          <h2>Monthly Summary</h2>
          {summary && (
            <div className="stats">
              <div className="stat income">
                <span className="label">Income</span>
                <span className="value">${Number(summary.totalIncome).toLocaleString()}</span>
              </div>
              <div className="stat expense">
                <span className="label">Expenses</span>
                <span className="value">${Number(summary.totalExpense).toLocaleString()}</span>
              </div>
              <div className="stat savings">
                <span className="label">Savings</span>
                <span className="value">${summary.netSavings.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Spending by Category</h2>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>Spending Patterns (ML)</h2>
          {patterns.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={patterns}>
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value}`} />
                <Bar dataKey="total_spent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card advice-card">
          <h2>🤖 AI Budget Advisor</h2>
          <div className="advice-text">{advice || "Loading AI advice..."}</div>
        </div>

        <div className="card transactions-card">
          <h2>Recent Transactions</h2>
          <div className="tx-list">
            {transactions.map(tx => (
              <div key={tx.id} className={`tx-item ${tx.type.toLowerCase()}`}>
                <div className="tx-left">
                  <span className="tx-icon">{tx.category?.icon || "📌"}</span>
                  <div>
                    <div className="tx-desc">{tx.description}</div>
                    <div className="tx-meta">{tx.category?.name || "Uncategorized"} · {new Date(tx.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <span className={`tx-amount ${tx.type.toLowerCase()}`}>
                  {tx.type === "INCOME" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
