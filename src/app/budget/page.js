"use client";

import { useState, useEffect } from 'react';
import { PieChart, BarChart, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, PieChart as PieChartIcon, Plus, Trash2, X, ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';

export default function BudgetPage() {
  // State untuk data budget
  const [budgets, setBudgets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('Makanan');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonthYear, setSelectedMonthYear] = useState('current'); // For filtering
  
  // Google Sheets Web App URL
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyp6PERcjEI7Kc6a_Y-PnAqRoWj8sJau1_kqpQ3Ti0_TJ_tHsEpuV_R1l85B5YYGGyP/exec';
  
  // Kategori pengeluaran
  const categories = ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan', 'Anak', 'Lainnya'];
  
  // Warna untuk chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
  
  // Load budgets and expenses from Google Sheets or localStorage
  useEffect(() => {
    fetchData();
  }, []);
  
  // Fetch data from Google Sheets
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch expenses first
      const savedExpenses = localStorage.getItem('expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
      
      // Try to fetch budgets from Google Sheets
      if (WEBAPP_URL) {
        const response = await fetch(`${WEBAPP_URL}?action=getData&sheet=Budgets`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.status === 'success' && Array.isArray(result.data)) {
            // Skip header row, map to budget objects
            const [header, ...rows] = result.data;
            const budgetsFromSheet = rows.map(row => ({
              id: Number(row[0]),
              category: row[1],
              amount: Number(row[2]),
              monthYear: row[3],
              month: row[4],
              year: parseInt(row[5]),
            }));
            
            setBudgets(budgetsFromSheet);
            localStorage.setItem('budgets', JSON.stringify(budgetsFromSheet));
            return;
          }
        }
      }
      
      // Fallback to localStorage if fetch fails
      const savedBudgets = localStorage.getItem('budgets');
      if (savedBudgets) {
        setBudgets(JSON.parse(savedBudgets));
      } else {
        setBudgets([]);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data budget. Menggunakan data lokal.');
      
      const savedBudgets = localStorage.getItem('budgets');
      if (savedBudgets) {
        setBudgets(JSON.parse(savedBudgets));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save budgets to Google Sheets
  const saveBudgetsToGoogleSheets = async (newBudgets) => {
    // Always save to localStorage as backup
    localStorage.setItem('budgets', JSON.stringify(newBudgets));
    
    if (!WEBAPP_URL) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Format data for Google Sheets
      const values = newBudgets.map(budget => [
        budget.id.toString(),
        budget.category,
        budget.amount.toString(),
        budget.monthYear,
        budget.month,
        budget.year.toString(),
        new Date().toISOString() // timestamp for update
      ]);
      
      // Send data to Apps Script web app
      const formData = new URLSearchParams();
      formData.append('action', 'saveData');
      formData.append('sheet', 'Budgets');
      formData.append('data', JSON.stringify(values));
      
      await fetch(WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });
      
      // We can't check response status with no-cors
      
    } catch (err) {
      console.error('Error saving budget data:', err);
      setError('Gagal menyimpan budget ke Google Sheets. Data disimpan secara lokal.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fungsi untuk menambah budget baru
  const addBudget = () => {
    if (!amount) return;
    
    const monthYear = `${month} ${year}`;
    
    // Check if budget for this category and month already exists
    const existingBudgetIndex = budgets.findIndex(
      b => b.category === category && b.monthYear === monthYear
    );
    
    if (existingBudgetIndex >= 0) {
      // Update existing budget
      const updatedBudgets = [...budgets];
      updatedBudgets[existingBudgetIndex].amount = parseFloat(amount);
      setBudgets(updatedBudgets);
      saveBudgetsToGoogleSheets(updatedBudgets);
    } else {
      // Add new budget
      const newBudget = {
        id: Date.now(),
        category,
        amount: parseFloat(amount),
        monthYear,
        month,
        year: parseInt(year)
      };
      
      const newBudgets = [...budgets, newBudget];
      setBudgets(newBudgets);
      saveBudgetsToGoogleSheets(newBudgets);
    }
    
    // Reset form dan tutup modal
    setAmount('');
    setCategory('Makanan');
    setShowModal(false);
  };
  
  // Fungsi untuk menghapus budget
  const deleteBudget = (id) => {
    const newBudgets = budgets.filter(budget => budget.id !== id);
    setBudgets(newBudgets);
    saveBudgetsToGoogleSheets(newBudgets);
  };
  
  // Get current month and year for filtering
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const currentMonthYear = `${currentMonth} ${currentYear}`;
  
  // Get unique month-year combinations from budgets
  const getUniqueMonthYears = () => {
    const monthYears = {};
    budgets.forEach(budget => {
      monthYears[budget.monthYear] = true;
    });
    
    // Sort by year then month
    return Object.keys(monthYears).sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      return (
        Number(yearA) - Number(yearB) ||
        new Date(`${monthA} 1, 2000`).getMonth() - new Date(`${monthB} 1, 2000`).getMonth()
      );
    });
  };
  
  // Get filtered budgets based on selected month-year
  const getFilteredBudgets = () => {
    if (selectedMonthYear === 'current') {
      return budgets.filter(budget => budget.monthYear === currentMonthYear);
    } else if (selectedMonthYear === 'all') {
      return budgets;
    } else {
      return budgets.filter(budget => budget.monthYear === selectedMonthYear);
    }
  };
  
  // Get filtered expenses based on selected month-year
  const getFilteredExpenses = () => {
    if (selectedMonthYear === 'current') {
      return expenses.filter(
        expense => expense.month === currentMonth && expense.year === currentYear
      );
    } else if (selectedMonthYear === 'all') {
      return expenses;
    } else {
      const [month, year] = selectedMonthYear.split(' ');
      return expenses.filter(
        expense => expense.month === month && expense.year.toString() === year
      );
    }
  };
  
  // Get current filtered data
  const filteredBudgets = getFilteredBudgets();
  const filteredExpenses = getFilteredExpenses();
  const displayMonthYear = selectedMonthYear === 'current' ? currentMonthYear : 
                          selectedMonthYear === 'all' ? 'Semua Bulan' : selectedMonthYear;
  
  // Calculate spending by category for filtered data
  const spendingByCategory = {};
  categories.forEach(cat => {
    spendingByCategory[cat] = 0;
  });
  
  filteredExpenses.forEach(expense => {
    if (spendingByCategory[expense.category] !== undefined) {
      spendingByCategory[expense.category] += expense.amount;
    }
  });
  
  // Prepare data for budget vs actual chart
  const budgetComparisonData = categories.map(cat => {
    const budget = filteredBudgets.find(b => b.category === cat);
    const budgetAmount = budget ? budget.amount : 0;
    const actualAmount = spendingByCategory[cat] || 0;
    const percentUsed = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
    
    return {
      name: cat,
      budget: budgetAmount,
      actual: actualAmount,
      percentUsed: Math.min(percentUsed, 100), // Cap at 100% for display
      overBudget: actualAmount > budgetAmount && budgetAmount > 0
    };
  }).filter(item => item.budget > 0 || item.actual > 0); // Only show categories with budget or spending
  
  // Get months for dropdown
  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(i);
      months.push(date.toLocaleString('default', { month: 'long' }));
    }
    return months;
  };
  
  // Get years for dropdown (current year and next year)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear.toString(), (currentYear + 1).toString()];
  };
  
  // Format currency
  const formatRupiah = (amount) => {
    return `Rp ${amount.toLocaleString()}`;
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold flex items-center">
            <DollarSign className="mr-2" /> Pengelolaan Budget
          </h1>
        </div>
      </header>
      
      <main className="container mx-auto p-4 flex-grow">
        {/* Loading dan Error Message */}
        {isLoading && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 font-medium">
            <p>Memuat data...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 font-medium">
            <p>{error}</p>
          </div>
        )}
        
        {/* Navigation back to home */}
        <div className="mb-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft size={18} className="mr-1" /> Kembali ke Tracking Pengeluaran
          </Link>
        </div>
        
        {/* Button untuk menambah budget dan filter bulan */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors flex items-center font-medium"
          >
            <Plus size={18} className="mr-2" /> Tambah Budget Baru
          </button>
          
          <div className="flex items-center">
            <select
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="p-2 border border-gray-300 rounded text-gray-900 bg-white"
            >
              <option value="current">Bulan Ini ({currentMonthYear})</option>
              <option value="all">Semua Bulan</option>
              {getUniqueMonthYears().map(monthYear => (
                <option key={monthYear} value={monthYear}>{monthYear}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Modal untuk tambah budget */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md text-gray-900">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-900">
                  <Target className="mr-2" /> Tambah Budget
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-gray-800">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Budget (Rp)</label>
                  <input
                    type="text"
                    value={amount ? formatRupiah(amount) : ''}
                    onChange={(e) => {
                      // Remove non-digit characters
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setAmount(raw);
                    }}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Rp 0"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Bulan</label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      {getMonthOptions().map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tahun</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      {getYearOptions().map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition-colors mr-2"
                >
                  Batal
                </button>
                <button
                  onClick={addBudget}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Budget Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
              <Target className="mr-2 text-blue-600" /> Budget vs Pengeluaran Aktual
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={budgetComparisonData}
                  margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
                  barGap={0}
                  barCategoryGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{fill: '#1F2937'}} />
                  <YAxis tick={{fill: '#1F2937'}} />
                  <Tooltip 
                    formatter={(value) => `Rp ${value.toLocaleString()}`}
                    contentStyle={{backgroundColor: 'white', color: '#1F2937', border: '1px solid #E5E7EB'}}
                    labelStyle={{color: '#1F2937'}}
                  />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#3B82F6" />
                  <Bar dataKey="actual" name="Aktual" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
              <PieChartIcon className="mr-2 text-blue-600" /> Persentase Penggunaan Budget
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetComparisonData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="percentUsed"
                    nameKey="name"
                    label={({ name, percentUsed }) => `${name}: ${percentUsed.toFixed(0)}%`}
                  >
                    {budgetComparisonData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.overBudget ? '#EF4444' : COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(0)}%`}
                    contentStyle={{backgroundColor: 'white', color: '#1F2937', border: '1px solid #E5E7EB'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Budget List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
            <DollarSign className="mr-2 text-blue-600" /> Daftar Budget ({displayMonthYear})
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-900">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-800">Kategori</th>
                  <th className="p-3 text-right font-semibold text-gray-800">Budget</th>
                  <th className="p-3 text-right font-semibold text-gray-800">Pengeluaran</th>
                  <th className="p-3 text-right font-semibold text-gray-800">Sisa</th>
                  <th className="p-3 text-center font-semibold text-gray-800">Status</th>
                  <th className="p-3 text-center font-semibold text-gray-800">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500">
                      Belum ada budget untuk periode ini
                    </td>
                  </tr>
                ) : (
                  filteredBudgets.map(budget => {
                    const spent = spendingByCategory[budget.category] || 0;
                    const remaining = budget.amount - spent;
                    const percentUsed = (spent / budget.amount) * 100;
                    
                    return (
                      <tr key={budget.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3">{budget.category}</td>
                        <td className="p-3 text-right">{formatRupiah(budget.amount)}</td>
                        <td className="p-3 text-right">{formatRupiah(spent)}</td>
                        <td className={`p-3 text-right ${remaining < 0 ? 'text-red-600 font-medium' : ''}`}>
                          {formatRupiah(remaining)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                percentUsed > 100 ? 'bg-red-600' : 
                                percentUsed > 80 ? 'bg-yellow-500' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs mt-1 block">
                            {percentUsed > 100 
                              ? `Melebihi ${(percentUsed - 100).toFixed(0)}%` 
                              : `${percentUsed.toFixed(0)}%`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => deleteBudget(budget.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );}
