export default function TestSimple2Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          Simple Test Working
        </h1>
        <p className="text-gray-600">
          This page loads without database or auth.
        </p>
      </div>
    </div>
  );
}
