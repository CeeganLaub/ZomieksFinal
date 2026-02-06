import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface DebugInfo {
  apiUrl: string;
  environment: string;
  user: any;
  errors: any[];
  networkRequests: NetworkRequest[];
}

interface NetworkRequest {
  id: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: string;
  error?: string;
}

let requestId = 0;
const networkLog: NetworkRequest[] = [];

// Intercept fetch to log requests
if (import.meta.env.DEV) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const start = Date.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
    const method = (args[1]?.method || 'GET').toUpperCase();
    
    const id = ++requestId;
    const entry: NetworkRequest = {
      id,
      method,
      url: url.replace(/^https?:\/\/[^/]+/, ''),
      status: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
    };
    
    try {
      const response = await originalFetch(...args);
      entry.status = response.status;
      entry.duration = Date.now() - start;
      
      if (!response.ok) {
        entry.error = `HTTP ${response.status}`;
      }
      
      networkLog.unshift(entry);
      if (networkLog.length > 50) networkLog.pop();
      
      return response;
    } catch (err) {
      entry.status = 0;
      entry.duration = Date.now() - start;
      entry.error = (err as Error).message;
      
      networkLog.unshift(entry);
      if (networkLog.length > 50) networkLog.pop();
      
      throw err;
    }
  };
}

export function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'network' | 'storage' | 'api'>('info');
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [apiErrors, setApiErrors] = useState<any[]>([]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const user = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user;
    
    setInfo({
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8787',
      environment: import.meta.env.MODE,
      user,
      errors: [],
      networkRequests: networkLog,
    });
  }, [isOpen]);
  
  async function fetchApiErrors() {
    try {
      const res = await api.get<{ count: number; errors: any[] }>('/debug/errors');
      setApiErrors(res.errors || []);
    } catch (err) {
      console.error('Failed to fetch API errors:', err);
    }
  }
  
  if (!import.meta.env.DEV) {
    return null;
  }
  
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800"
        title="Dev Tools"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>
      
      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-96 max-h-[70vh] bg-gray-900 text-gray-100 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <span className="font-semibold text-sm">Dev Panel</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {(['info', 'network', 'storage', 'api'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'api') fetchApiErrors();
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium ${
                  activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="overflow-auto max-h-80 p-4 text-xs">
            {activeTab === 'info' && info && (
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">API URL:</span>
                  <span className="ml-2 text-green-400">{info.apiUrl}</span>
                </div>
                <div>
                  <span className="text-gray-400">Environment:</span>
                  <span className="ml-2 text-yellow-400">{info.environment}</span>
                </div>
                <div>
                  <span className="text-gray-400">User:</span>
                  {info.user ? (
                    <div className="mt-1 p-2 bg-gray-800 rounded text-gray-300">
                      {info.user.email} ({info.user.isAdmin ? 'Admin' : info.user.isSeller ? 'Seller' : 'Buyer'})
                    </div>
                  ) : (
                    <span className="ml-2 text-red-400">Not logged in</span>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'network' && (
              <div className="space-y-2">
                {networkLog.length === 0 ? (
                  <p className="text-gray-500">No requests logged yet</p>
                ) : (
                  networkLog.slice(0, 20).map(req => (
                    <div key={req.id} className="p-2 bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono ${
                          req.status >= 400 ? 'text-red-400' : req.status >= 300 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {req.status || 'ERR'}
                        </span>
                        <span className="text-blue-400">{req.method}</span>
                        <span className="truncate text-gray-300">{req.url}</span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {req.duration}ms
                        {req.error && <span className="text-red-400 ml-2">{req.error}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'storage' && (
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 mb-2">LocalStorage Keys:</p>
                  <div className="space-y-1">
                    {Object.keys(localStorage).map(key => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                        <span className="text-green-400">{key}</span>
                        <button
                          onClick={() => {
                            const value = localStorage.getItem(key);
                            console.log(`${key}:`, JSON.parse(value || 'null'));
                          }}
                          className="text-blue-400 hover:underline"
                        >
                          Log
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Clear All & Reload
                </button>
              </div>
            )}
            
            {activeTab === 'api' && (
              <div className="space-y-2">
                <button
                  onClick={fetchApiErrors}
                  className="mb-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Refresh
                </button>
                {apiErrors.length === 0 ? (
                  <p className="text-gray-500">No API errors logged</p>
                ) : (
                  apiErrors.map((err, i) => (
                    <div key={i} className="p-2 bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">{err.status}</span>
                        <span className="text-blue-400">{err.method}</span>
                        <span className="truncate text-gray-300">{err.path}</span>
                      </div>
                      {err.error && (
                        <p className="text-red-300 mt-1">{err.error}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default DevPanel;
