import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <Link to="/" className="text-3xl font-bold">
          Kiekz
        </Link>
        <div>
          <h1 className="text-4xl font-bold mb-4">
            Find the perfect freelance services for your business
          </h1>
          <p className="text-lg opacity-90">
            Join thousands of South African freelancers and businesses working together.
          </p>
        </div>
        <p className="text-sm opacity-70">
          &copy; {new Date().getFullYear()} Kiekz. All rights reserved.
        </p>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="text-3xl font-bold text-primary">
              Kiekz
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
