"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Trophy,
  Brain,
  Clock3,
  BarChart3,
  Moon,
  Sun,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  Star,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* Background Effects */}
      <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-3xl"></div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-3">
              <GraduationCap size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                ExamMaster
              </h1>
              <p className="text-xs text-gray-400">
                Ethiopia National Exam Platform
              </p>
            </div>
          </motion.div>

          <nav className="hidden items-center gap-8 md:flex">
            {[
              "Home",
              "Subjects",
              "Past Exams",
              "Leaderboard",
              "Pricing",
              "About",
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm font-medium text-gray-300 transition hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="rounded-full border border-white/10 p-3 transition hover:bg-white/10">
              <Moon size={18} />
            </button>

            <button className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold transition hover:scale-105">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-sm text-blue-300">
              <Star size={16} />
              #1 Ethiopian National Exam Preparation Platform
            </div>

            <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
              Learn Smarter.
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {" "}
                Score Higher.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-gray-300">
              Practice with past national exam questions, AI-powered
              recommendations, smart analytics, and detailed explanations
              designed for Ethiopian students.
            </p>

            <div className="mt-10 flex flex-wrap gap-5">
              <button className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 font-semibold shadow-2xl transition hover:scale-105">
                Start Learning
              </button>

              <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-semibold backdrop-blur-xl transition hover:bg-white/10">
                Explore Subjects
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 gap-5 md:grid-cols-4">
              {[
                ["50K+", "Students"],
                ["20+", "Subjects"],
                ["4 Years", "Past Exams"],
                ["95%", "Pass Rate"],
              ].map(([number, label]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                >
                  <h2 className="text-3xl font-bold">{number}</h2>
                  <p className="mt-2 text-sm text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-[35px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl">
              {/* Top */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">
                    Student Dashboard
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    Welcome Back 👋
                  </h3>
                </div>

                <div className="rounded-2xl bg-green-500/20 px-4 py-2 text-sm text-green-400">
                  Active
                </div>
              </div>

              {/* Progress */}
              <div className="mt-8 rounded-3xl bg-[#0F172A] p-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Weekly Progress</h4>
                  <span className="text-blue-400">78%</span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Questions Solved</p>
                    <h2 className="mt-2 text-2xl font-bold">1,240</h2>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Rank</p>
                    <h2 className="mt-2 text-2xl font-bold">#12</h2>
                  </div>
                </div>
              </div>

              {/* Countdown */}
              <div className="mt-6 rounded-3xl bg-gradient-to-r from-orange-500 to-red-500 p-6">
                <div className="flex items-center gap-3">
                  <Clock3 />
                  <h3 className="text-xl font-bold">
                    National Exam Countdown
                  </h3>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-4 text-center">
                  {[
                    ["120", "Days"],
                    ["08", "Hours"],
                    ["12", "Min"],
                    ["45", "Sec"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-white/10 p-4 backdrop-blur"
                    >
                      <h2 className="text-3xl font-bold">{value}</h2>
                      <p className="text-sm">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold">
            Powerful Learning Features
          </h2>

          <p className="mt-5 text-lg text-gray-400">
            Everything students need to achieve top results.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Brain className="text-blue-400" />,
              title: "AI Recommendations",
              desc: "Personalized question recommendations powered by AI.",
            },
            {
              icon: <BookOpen className="text-purple-400" />,
              title: "Past Exam Questions",
              desc: "Access 4 years of real national exam questions.",
            },
            {
              icon: <BarChart3 className="text-green-400" />,
              title: "Progress Analytics",
              desc: "Track your strengths and weak areas.",
            },
            {
              icon: <Trophy className="text-yellow-400" />,
              title: "Leaderboard Rankings",
              desc: "Compete with top students nationwide.",
            },
            {
              icon: <ShieldCheck className="text-cyan-400" />,
              title: "Premium Explanations",
              desc: "Understand every answer with detailed explanations.",
            },
            {
              icon: <Clock3 className="text-orange-400" />,
              title: "Timed Mock Exams",
              desc: "Practice under real exam conditions.",
            },
          ].map((feature) => (
            <motion.div
              whileHover={{ y: -10 }}
              key={feature.title}
              className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                {feature.icon}
              </div>

              <h3 className="text-2xl font-bold">
                {feature.title}
              </h3>

              <p className="mt-4 leading-7 text-gray-400">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Payment Section */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl rounded-[40px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <div className="text-center">
            <h2 className="text-5xl font-extrabold">
              Flexible Subscription Plans
            </h2>

            <p className="mt-5 text-lg text-gray-400">
              Pay monthly, yearly, or per subject using Ethiopian payment
              systems.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              "Chapa Integration",
              "Telebirr Payment",
              "CBE Birr Support",
            ].map((payment) => (
              <div
                key={payment}
                className="rounded-3xl border border-white/10 bg-[#0F172A] p-8 text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600">
                  <CreditCard />
                </div>

                <h3 className="mt-6 text-2xl font-bold">
                  {payment}
                </h3>

                <p className="mt-4 text-gray-400">
                  Secure and fast Ethiopian online payment integration.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 md:flex-row">
          <div>
            <h3 className="text-2xl font-bold">
              ExamMaster Ethiopia
            </h3>

            <p className="mt-2 text-gray-400">
              Smart National Exam Preparation Platform
            </p>
          </div>

          <div className="flex gap-6 text-gray-400">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}