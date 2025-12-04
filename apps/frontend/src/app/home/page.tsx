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
import {
  publicContestsApi,
  type Contest,
  type EnrollmentResponse,
} from "@/lib/api/public/contests";
import { getActiveCarouselImages, type CarouselImage } from "@/lib/api/public/carousel";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { ROUTES } from "@/common/consts";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [loadingContests, setLoadingContests] = useState(false);
  const [contestsError, setContestsError] = useState<string | null>(null);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(
    new Set()
  );
  const [liveContests, setLiveContests] = useState<Contest[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [loadingCarousel, setLoadingCarousel] = useState(true);

  useEffect(() => {
    const loadActive = async () => {
      try {
        setLoadingContests(true);
        setContestsError(null);
        const res = await publicContestsApi.list({
          status: "ongoing",
          page_size: 8,
        });
        setActiveContests(res.contests || []);
      } catch (e: any) {
        setContestsError(e?.message || "Failed to load contests");
      } finally {
        setLoadingContests(false);
      }
    };
    loadActive();
  }, []);

  // Load carousel images - use sponsor logos as temporary carousel
  useEffect(() => {
    const loadCarousel = async () => {
      try {
        setLoadingCarousel(true);

        // Try to get carousel images first
        let images = await getActiveCarouselImages();

        // If no carousel images, use sponsor logos as carousel
        if (images.length === 0) {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/sponsors/?active=true&page_size=10`);
            if (response.ok) {
              const data = await response.json();
              // Convert sponsors to carousel format
              images = data.sponsors.map((sponsor: any, index: number) => ({
                _id: sponsor._id,
                title: sponsor.name,
                subtitle: sponsor.description || `${sponsor.tier} Sponsor`,
                image_url: sponsor.logo,
                link_url: sponsor.website,
                display_order: index,
                active: true,
                created_at: sponsor.created_at,
                updated_at: sponsor.updated_at,
              }));
            }
          } catch (e) {
            console.error("Failed to load sponsors for carousel:", e);
          }
        }

        setCarouselImages(images);
      } catch (e) {
        console.error("Failed to load carousel images:", e);
      } finally {
        setLoadingCarousel(false);
      }
    };
    loadCarousel();
  }, []);

  // Humanize time remaining until a given ISO date string
  const formatEndsIn = (isoDate: string): string => {
    const now = new Date().getTime();
    const end = new Date(isoDate).getTime();
    const diffMs = end - now;
    if (isNaN(end)) return "Ends soon";
    if (diffMs <= 0) return "Ended";

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days >= 1) return `Ends in ${days} day${days === 1 ? "" : "s"}`;
    if (hours >= 1) return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
    return `Ends in ${Math.max(1, minutes)} min${minutes === 1 ? "" : "s"}`;
  };

  useEffect(() => {
    const loadLive = async () => {
      try {
        setLoadingLive(true);
        const res = await publicContestsApi.list({
          status: "live",
          page_size: 8,
        });
        setLiveContests(res.contests || []);
      } catch {
        // ignore live failures separately for now
      } finally {
        setLoadingLive(false);
      }
    };
    loadLive();
  }, []);

  // Detect contests the user is enrolled in
  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const mine: EnrollmentResponse[] =
          await publicContestsApi.myEnrollments();
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

          {/* Hero Section - Full Width Carousel */}
          <section className="relative mx-4 mb-8 sm:mb-10">
            <div className="relative z-10 container mx-auto px-4 sm:px-6 max-w-screen-xl">
              {loadingCarousel ? (
                <div className="w-full h-96 md:h-[500px] bg-gradient-to-br from-primary-100 to-primary-50 rounded-3xl flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : carouselImages.length > 0 ? (
                <HeroCarousel images={carouselImages} />
              ) : (
                // Fallback hero section when no carousel images
                <div className="w-full h-64 md:h-80 bg-gradient-to-br from-primary-100 to-primary-50 rounded-3xl flex items-center justify-center border border-primary-200 shadow-lg">
                  <div className="text-center px-6">
                    <Image
                      src="/logo.jpeg"
                      alt="Wall-E Arena"
                      width={200}
                      height={200}
                      className="rounded-3xl shadow-2xl object-cover mx-auto mb-6"
                      priority
                    />
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-700 tracking-tight leading-tight mb-4">
                      MWPL Season 2 Fantasy League
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-xl mx-auto leading-relaxed">
                      Build your dream team, compete with friends, and rise to the top!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Ongoing Contests */}
          <section className="mx-4 mb-10 sm:mb-12">
            <div className="container mx-auto px-4 sm:px-6 max-w-screen-xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Ongoing Contests
              </h2>
              {contestsError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
                  {contestsError}
                </div>
              )}
              {loadingContests ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-40 bg-white rounded-2xl shadow animate-pulse"
                    />
                  ))}
                </div>
              ) : activeContests.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-600">
                  No active contests right now. Check back soon!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                  {activeContests.map((c) => (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/contests/${c.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/contests/${c.id}`);
                        }
                      }}
                      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-primary-100 p-5 shadow-sm cursor-pointer hover:shadow md:transition min-h-[160px] h-full"
                    >
                      <div className="flex items-start justify-between h-full">
                        <div className="min-w-0 flex flex-col h-full">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words whitespace-normal overflow-visible hyphens-auto">
                            {c.name}
                          </h3>
                          {c.description && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {c.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {formatEndsIn(c.end_at)}
                          </div>
                          <div className="mt-auto pt-3 flex items-center gap-2">
                            {joinedContestIds.has(c.id) ? (
                              <Link
                                href={`/contests/${c.id}/team`}
                                className="inline-flex justify-center items-center px-4 py-2 rounded-lg border text-sm font-medium text-primary-700 border-primary-200 hover:bg-primary-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Team
                              </Link>
                            ) : (
                              <Link
                                href={`/contests/${c.id}/leaderboard`}
                                className="inline-flex justify-center items-center px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 border-gray-200 hover:bg-gray-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Leaderboard
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
                              ONGOING
                            </span>
                            {joinedContestIds.has(c.id) && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                Joined
                              </span>
                            )}
                          </div>
                          <Image
                            src="/Contests/logo.png"
                            alt="Contest logo"
                            width={120}
                            height={32}
                            className="w-[120px] h-auto opacity-90"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Live Contests */}
          <section className="mx-4 mb-10 sm:mb-12">
            <div className="container mx-auto px-4 sm:px-6 max-w-screen-xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Live Contests
              </h2>
              {loadingLive ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-40 bg-white rounded-2xl shadow animate-pulse"
                    />
                  ))}
                </div>
              ) : liveContests.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-600">
                  No live contests at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                  {liveContests.map((c) => (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/contests/${c.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/contests/${c.id}`);
                        }
                      }}
                      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-primary-100 p-5 shadow-sm cursor-pointer hover:shadow md:transition min-h-[140px] h-full"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words whitespace-normal overflow-visible hyphens-auto">
                            {c.name}
                          </h3>
                          {c.description && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {c.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const fmtIST = (iso: string) => {
                                const d = new Date(iso);
                                const utc =
                                  d.getTime() + d.getTimezoneOffset() * 60000;
                                const ist = new Date(
                                  utc + (5 * 60 + 30) * 60000
                                );
                                return ist.toLocaleString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                });
                              };
                              return `Starts: ${fmtIST(c.start_at)} IST`;
                            })()}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {!joinedContestIds.has(c.id) ? (
                              isAuthenticated ? (
                                <Link
                                  href={`/contests/${c.id}`}
                                  className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium shadow hover:opacity-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Join Contest
                                </Link>
                              ) : (
                                <Link
                                  href={`${ROUTES.LOGIN}?next=${encodeURIComponent(`/contests/${c.id}/team`)}`}
                                  className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium shadow hover:opacity-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Login to Join Contest
                                </Link>
                              )
                            ) : (
                              <Link
                                href={`/contests/${c.id}/leaderboard`}
                                className="inline-flex justify-center items-center px-4 py-2 rounded-lg border text-sm font-medium text-primary-700 border-primary-200 hover:bg-primary-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Leaderboard
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                              LIVE
                            </span>
                            {joinedContestIds.has(c.id) && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                Joined
                              </span>
                            )}
                          </div>
                          <Image
                            src="/Contests/logo.png"
                            alt="Contest logo"
                            width={120}
                            height={32}
                            className="w-[120px] h-auto opacity-90"
                          />
                        </div>
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

          {/* CTA Section */}
          <section className="relative py-20 bg-gradient-primary text-white overflow-hidden rounded-3xl mx-4 mb-8 sm:mb-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="container mx-auto px-6 text-center relative z-10 max-w-screen-xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl sm:text-5xl font-bold mb-6 drop-shadow-md">
                  Ready to Play?
                </h2>
                <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                  Join thousands of cricket fans and start your fantasy league
                  journey today
                </p>
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center bg-white text-primary-600 font-semibold px-8 py-3 rounded-full text-lg shadow-lg hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all duration-300 animate-pulse-slow"
                  >
                    Visit Your Dashboard
                    <ArrowRight className="ml-2" />
                  </Link>
                ) : (
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center bg-white text-primary-600 font-semibold px-8 py-3 rounded-full text-lg shadow-lg hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all duration-300 animate-pulse-slow"
                  >
                    Create Your Team Now
                  </Link>
                )}
              </motion.div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
