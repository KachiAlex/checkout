import { useAuthStore } from '../stores/authStore';

export function ReportsPage() {
  const { logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sales Reports</h2>
          <p className="text-gray-600">Reports functionality coming soon...</p>
        </div>
      </div>
    </div>
  );
}
