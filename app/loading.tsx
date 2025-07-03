import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-lg shadow-xl p-8 border-0">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Loading...</h3>
            <p className="text-gray-600">
              Please wait while we load your content
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
