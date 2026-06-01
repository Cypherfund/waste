import { useState } from 'react';
import { supportApi } from '../services/api/admin';
import { Search, Phone, Key, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SupportPage() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    phone: string;
    otp: string | null;
    expiresInSeconds: number;
    expiresInMinutes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await supportApi.lookupOtp(phone.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to lookup OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tools</h1>
      </div>

      {/* OTP Lookup Card */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">OTP Lookup</h2>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Lookup the recent verification code sent to a user's phone number. 
          Codes are stored for 24 hours for support purposes.
        </p>

        <form onSubmit={handleLookup} className="mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237612345678"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !phone.trim()}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Lookup
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              {result.otp ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium text-gray-900">
                {result.otp ? 'OTP Found' : 'No Active OTP'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3">
                <p className="mb-1 text-xs text-gray-500">Phone Number</p>
                <p className="font-mono text-sm font-medium text-gray-900">{result.phone}</p>
              </div>

              <div className="rounded-lg bg-white p-3">
                <p className="mb-1 text-xs text-gray-500">Verification Code</p>
                <p className={`font-mono text-lg font-bold ${result.otp ? 'text-green-600' : 'text-gray-400'}`}>
                  {result.otp || 'N/A'}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires In</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {result.otp ? (
                    result.expiresInMinutes > 0 ? (
                      <span className={result.expiresInMinutes <= 5 ? 'text-red-600' : 'text-amber-600'}>
                        {result.expiresInMinutes} minutes
                      </span>
                    ) : (
                      <span className="text-red-600">{result.expiresInSeconds} seconds</span>
                    )
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3">
                <p className="mb-1 text-xs text-gray-500">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  result.otp
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {result.otp ? 'Active' : 'Expired / Not Found'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Notes */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">Support Guidelines</p>
            <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
              <li>Only use this tool to assist users who cannot receive SMS</li>
              <li>Verify user identity before providing the OTP</li>
              <li>All lookups are logged for security audit purposes</li>
              <li>OTP codes expire after 5 minutes for security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
