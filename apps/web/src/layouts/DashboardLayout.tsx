import { Outlet } from 'react-router-dom';
import { Header } from '../components/nav';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
