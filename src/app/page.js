"use client";

import { useState, useEffect } from 'react';
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, PieChart, Plus, Trash2, X, Filter, Target } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // State untuk data pengeluaran
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().substr(0, 10));
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Google Sheets API via Apps Script
  
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxuv4v7qWXLP8TXOx56Ls8VQXTkjuuct-eDV7H9obi5VxAfVz8hvBScSRxed_u_UuG2/exec';
  // Kategori pengeluaran
  const categories = ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan', 'Anak', 'Lainnya'];
  
  // Fungsi untuk mendapatkan data dari Google Sheets
  const fetchDataFromGoogleSheets = async () => {
    if (!WEBAPP_URL) {
      const savedExpenses = localStorage.getItem('expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
      return;
    }
  
    try {
      setIsLoading(true);
      setError(null);
  
      const url = `${WEBAPP_URL}?action=getData`;
  
      // Remove mode: 'no-cors'
      const response = await fetch(url, {
        method: 'GET',
      });
  
      if (response.ok) {
        const result = await response.json();
        // Convert Google Sheets data to your expenses format
        if (result.status === 'success' && Array.isArray(result.data)) {
          // Skip header row, map to your expense object
          const [header, ...rows] = result.data;
          const expensesFromSheet = rows.map(row => ({
            id: Number(row[0]),
            description: row[1],
            amount: Number(row[2]),
            category: row[3],
            date: row[4],
            month: new Date(row[4]).toLocaleString('default', { month: 'long' }),
            year: new Date(row[4]).getFullYear(),
          }));
          setExpenses(expensesFromSheet);
          localStorage.setItem('expenses', JSON.stringify(expensesFromSheet));
          return;
        }
      }
  
      // fallback to localStorage if fetch fails or data is not valid
      const savedExpenses = localStorage.getItem('expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data. Menggunakan data lokal.');
      const savedExpenses = localStorage.getItem('expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Fungsi untuk menyimpan data ke Google Sheets
  const saveToGoogleSheets = async (newExpenses) => {
    // Always save to localStorage as backup
    localStorage.setItem('expenses', JSON.stringify(newExpenses));
    
    if (!WEBAPP_URL) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Format data untuk Google Sheets
      const values = newExpenses.map(expense => [
        expense.id.toString(),
        expense.description,
        expense.amount.toString(),
        expense.category,
        expense.date,
        new Date().toISOString() // timestamp saat update
      ]);
      
      // Send data to Apps Script web app using no-cors
      await fetch(`${WEBAPP_URL}?action=saveData`, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: values
        })
      });
      
      // We can't check response status with no-cors
      // Just assume it worked if no error was thrown
      
    } catch (err) {
      console.error('Error saving data:', err);
      setError('Gagal menyimpan ke Google Sheets. Data disimpan secara lokal.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Memuat data saat aplikasi dimulai
  useEffect(() => {
    fetchDataFromGoogleSheets();
  }, []);
  
  // Filter expenses berdasarkan bulan yang dipilih
  useEffect(() => {
    if (selectedMonth === 'all') {
      setFilteredExpenses(expenses);
    } else {
      const [month, year] = selectedMonth.split(' ');
      setFilteredExpenses(
        expenses.filter(expense => 
          expense.month === month && expense.year.toString() === year
        )
      );
    }
  }, [selectedMonth, expenses]);
  
  // Fungsi untuk menambah pengeluaran baru
  const addExpense = () => {
    if (!description || !amount || !date) return;
    
    const newExpense = {
      id: Date.now(),
      description,
      amount: parseFloat(amount),
      category,
      date,
      month: new Date(date).toLocaleString('default', { month: 'long' }),
      year: new Date(date).getFullYear()
    };
    
    const newExpenses = [...expenses, newExpense];
    setExpenses(newExpenses);
    saveToGoogleSheets(newExpenses);
    
    // Reset form dan tutup modal
    setDescription('');
    setAmount('');
    setCategory('Makanan');
    setShowModal(false);
  };
  
  // Fungsi untuk menghapus pengeluaran
  const deleteExpense = (id) => {
    const newExpenses = expenses.filter(expense => expense.id !== id);
    setExpenses(newExpenses);
    saveToGoogleSheets(newExpenses);
  };
  
  // Mendapatkan daftar bulan unik untuk filter
  const getUniqueMonths = () => {
    const months = {};
    expenses.forEach(expense => {
      const monthYear = `${expense.month} ${expense.year}`;
      months[monthYear] = true;
    });
    return Object.keys(months).sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      // Sort by year ascending, then month ascending
      return (
        Number(yearA) - Number(yearB) ||
        new Date(`${monthA} 1, 2000`).getMonth() - new Date(`${monthB} 1, 2000`).getMonth()
      );
    });
  };
  
  // Fungsi untuk mengelompokkan data pengeluaran berdasarkan bulan
  const getMonthlyData = () => {
    const monthlyData = {};
    
    filteredExpenses.forEach(expense => {
      const monthYear = `${expense.month} ${expense.year}`;
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = 0;
      }
      monthlyData[monthYear] += expense.amount;
    });

    // Sort monthYear keys in chronological order
    return Object.keys(monthlyData)
      .sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        return (
          Number(yearA) - Number(yearB) ||
          new Date(`${monthA} 1, 2000`).getMonth() - new Date(`${monthB} 1, 2000`).getMonth()
        );
      })
      .map(monthYear => ({
        name: monthYear,
        total: monthlyData[monthYear]
      }));
  };
  
  // Fungsi untuk mengelompokkan data pengeluaran berdasarkan kategori
  const getCategoryData = () => {
    const categoryData = {};
    
    categories.forEach(cat => {
      categoryData[cat] = 0;
    });
    
    filteredExpenses.forEach(expense => {
      categoryData[expense.category] += expense.amount;
    });
    
    return Object.keys(categoryData).map(cat => ({
      name: cat,
      total: categoryData[cat]
    }));
  };
  
  // Menghitung total pengeluaran
  const totalExpense = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <DollarSign className="mr-2" /> Aplikasi Tracking Pengeluaran
          </h1>
          <Link href="/budget" className="text-white hover:text-blue-100 flex items-center">
            <Target size={18} className="mr-1" /> Budget
          </Link>
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
        
        {/* Button untuk menambah pengeluaran baru */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors flex items-center font-medium"
          >
            <Plus size={18} className="mr-2" /> Tambah Pengeluaran Baru
          </button>
          
          <div className="flex items-center">
            <Filter size={18} className="mr-2 text-gray-700" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border border-gray-300 rounded text-gray-900 bg-white"
            >
              <option value="all">Semua Bulan</option>
              {getUniqueMonths().map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Modal untuk tambah pengeluaran */}
        {showModal && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl text-gray-900">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-900">
                  <Plus className="mr-2" /> Tambah Pengeluaran Baru
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-gray-800">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-800">Deskripsi</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900 bg-white"
                    placeholder="Deskripsi pengeluaran"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah (Rp)</label>
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
                    min="0"
                  />
                </div>
                
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
                  <label className="text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition-colors mr-2"
                >
                  Batal
                </button>
                <button
                  onClick={addExpense}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
              <Calendar className="mr-2 text-blue-600" /> Pengeluaran Bulanan
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={getMonthlyData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }} // Increased bottom margin
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
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
              <PieChart className="mr-2 text-blue-600" /> Pengeluaran per Kategori
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={getCategoryData()}
                  margin={{ top: 20, right: 30, left: 40, bottom: 40 }} // Increased left margin
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
                  <Bar dataKey="total" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900">
              <DollarSign className="mr-2 text-blue-600" /> Daftar Pengeluaran
            </h2>
            <div className="text-xl font-bold text-blue-700">
              Total: Rp {totalExpense.toLocaleString()}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-900">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-800">Deskripsi</th>
                  <th className="p-3 text-left font-semibold text-gray-800">Kategori</th>
                  <th className="p-3 text-left font-semibold text-gray-800">Tanggal</th>
                  <th className="p-3 text-right font-semibold text-gray-800">Jumlah</th>
                  <th className="p-3 text-center font-semibold text-gray-800">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">
                      {selectedMonth !== 'all' 
                        ? `Tidak ada data pengeluaran untuk bulan ${selectedMonth}` 
                        : "Belum ada data pengeluaran"}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(expense => (
                      <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3">{expense.description}</td>
                        <td className="p-3">{expense.category}</td>
                        <td className="p-3">{new Date(expense.date).toLocaleDateString('id-ID')}</td>
                        <td className="p-3 text-right">Rp {expense.amount.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => deleteExpense(expense.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      {/* <footer className="bg-gray-800 text-white p-4 mt-6">
        <div className="container mx-auto text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Aplikasi Tracking Pengeluaran</p>
          {(!SHEET_ID || !API_KEY) && (
            <p className="mt-2 text-yellow-300">
              <strong>Catatan:</strong> Untuk menggunakan Google Sheets, isi SHEET_ID dan API_KEY di kode aplikasi.
            </p>
          )}
        </div>
      </footer> */}
    </div>
  );
}

// Place this helper function inside your Home component, before the return statement:
function formatRupiah(angka) {
  if (!angka) return '';
  return 'Rp ' + angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}