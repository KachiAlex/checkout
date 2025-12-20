import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center space-y-8">
        <img 
          src="/assets/checkout-logo-BoYRQlER.png" 
          alt="Checkout POS" 
          className="w-48 h-48 object-contain"
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Checkout POS</h1>
          <p className="text-slate-400">Point of Sale System</p>
        </div>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
}
