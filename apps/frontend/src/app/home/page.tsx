import { PillNavbar } from "@/components/navigation/PillNavbar";

export default function HomeAppPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
      {/* Header: Pill Navbar */}
      <div className="relative z-50 py-5">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative">
          <PillNavbar />
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 py-10 max-w-screen-xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Welcome to WalleFantasy</h1>
        <p className="text-gray-600">
          This is your Home. Use the navbar to explore Leaderboards, build your team, and more.
        </p>
      </main>
    </div>
  );
}
