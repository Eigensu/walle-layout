"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, TrendingUp, Shield, ArrowRight } from "lucide-react";
import { PillNavbar } from "@/components/navigation/PillNavbar";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Loading";
import { publicContestsApi, type Contest, type EnrollmentResponse } from "@/lib/api/public/contests";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [loadingContests, setLoadingContests] = useState(false);
  const [contestsError, setContestsError] = useState<string | null>(null);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadActive = async () => {
      try {
        setLoadingContests(true);
        setContestsError(null);
        const res = await publicContestsApi.list({ status: "active", page_size: 8 });
        setActiveContests(res.contests || []);
      } catch (e: any) {
        setContestsError(e?.message || "Failed to load contests");
      } finally {
        setLoadingContests(false);
      }
    };
    loadActive();
  }, []);

  // Detect contests the user is enrolled in
  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const mine: EnrollmentResponse[] = await publicContestsApi.myEnrollments();
        const ids = new Set<string>(mine.map((e) => e.contest_id));
        setJoinedContestIds(ids);
      } catch {
        // ignore when unauthenticated or endpoint unavailable
      }
    };
    loadEnrollments();
  }, []);
  const features = useMemo(
    () => [
      {
        icon: Trophy,
        title: "Compete & Win",
        description:
          "Build your dream cricket team and compete in fantasy leagues",
      },
      {
        icon: Users,
        title: "Team Builder",
        description:
          "Strategic player selection with real-time stats and insights",
      },
      {
        icon: TrendingUp,
        title: "Live Leaderboards",
        description: "Track your ranking and compete with players worldwide",
      },
      {
        icon: Shield,
        title: "Secure Platform",
        description: "Safe and fair gameplay with advanced analytics",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen">
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-primary-50 to-gray-50">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading Wall-E Arena...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Navbar */}
          <PillNavbar
            className=""
            mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
          />

          {/* Spacer to prevent content from hiding under fixed navbar */}
          <div className="h-20"></div>
          {/* Hero Section */}
          <section className="relative rounded-3xl mx-4 mb-8 sm:mb-10">
            {/* Content Container */}
            <div className="relative z-10 container mx-auto px-4 sm:px-6 max-w-screen-xl">
              <div className="grid md:grid-cols-2 gap-12 items-center py-16 sm:py-20 lg:py-24">
                {/* Column 1: Text */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center md:text-left"
                >
                  <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-primary-700 tracking-tight leading-tight mb-4">
                    Cricket Fantasy League
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed">
                    Build your dream team, compete with friends, and rise to the
                    top!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
                    {isAuthenticated ? (
                      <Link
                        href="/contests"
                        className="inline-flex items-center px-10 py-4 rounded-full text-lg font-semibold text-white bg-gradient-primary shadow-lg hover:shadow-[0_0_20px_rgba(191,171,121,0.5)] transition-all duration-300 group"
                      >
                        Explore Contests
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        href="/auth/login"
                        className="inline-flex items-center px-10 py-4 rounded-full text-lg font-semibold text-white bg-gradient-primary shadow-lg hover:shadow-[0_0_20px_rgba(191,171,121,0.5)] transition-all duration-300 group"
                      >
                        Get Started
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}
                  </div>
                </motion.div>

                {/* Column 2: Visual Placeholder */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="hidden md:flex justify-center items-center"
                >
                  <div className="w-full h-80 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center border border-primary-200 shadow-lg">
                    <div className="text-center">
                      <Image
                        src="/logo.jpeg"
                        alt="Wall-E Arena"
                        width={200}
                        height={200}
                        className="rounded-3xl shadow-2xl object-cover mx-auto mb-4"
                        priority
                      />
                      <p className="text-primary-700 text-2xl font-bold">
                        Wall-E Arena
                      </p>
                      <p className="text-sm text-primary-600 mt-2">
                        Your Fantasy Cricket Partner
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Active Contests */}
          <section className="mx-4 mb-10 sm:mb-12">
            <div className="container mx-auto px-4 sm:px-6 max-w-screen-xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">Active Contests</h2>
              {contestsError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
                  {contestsError}
                </div>
              )}
              {loadingContests ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-40 bg-white rounded-2xl shadow animate-pulse" />
                  ))}
                </div>
              ) : activeContests.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-600">
                  No active contests right now. Check back soon!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeContests.map((c) => (
                    <div key={c.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-primary-100 p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{c.name}</h3>
                          {c.description && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{c.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">LIVE</span>
                          {joinedContestIds.has(c.id) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Joined</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Ends: {new Date(c.end_at).toLocaleString()}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {!joinedContestIds.has(c.id) ? (
                          isAuthenticated ? (
                            <Link href={`/contests/${c.id}`} className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium shadow hover:opacity-95">
                              Join Contest
                            </Link>
                          ) : (
                            <Link href={`/auth/login?next=${encodeURIComponent(`/contests/${c.id}/team`)}`} className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium shadow hover:opacity-95">
                              Join Contest
                            </Link>
                          )
                        ) : (
                          <Link href={`/contests/${c.id}/leaderboard`} className="inline-flex justify-center items-center px-4 py-2 rounded-lg border text-sm font-medium text-primary-700 border-primary-200 hover:bg-primary-50">
                            View Leaderboard
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 bg-gradient-to-br from-primary-200 via-primary-100 to-primary-300 relative rounded-3xl mx-4 mb-10 sm:mb-12">
            <div className="container mx-auto px-4 sm:px-6 max-w-screen-xl">
              <div className="text-center mb-10 sm:mb-14">
                <h2 className="text-5xl font-extrabold text-center bg-gradient-primary bg-clip-text text-transparent leading-tight pb-1 mb-8">
                  Why Choose Us?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Experience the most engaging cricket fantasy platform with
                  powerful features
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon as React.ComponentType<{
                    className?: string;
                  }>;
                  return (
                    <div
                      key={feature.title}
                      className="relative bg-white/70 backdrop-blur-lg border border-primary-100 rounded-2xl p-8 shadow-md"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-inner">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          
        </>
      )}
    </div>
  );
}
