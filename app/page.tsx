"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileQuestion,
  GraduationCap,
  LibraryBig,
  LineChart,
  LockKeyhole,
  MessageCircleQuestion,
  PenLine,
  PlayCircle,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const packages = [
  {
    name: "Weekly",
    price: "ETB 99",
    access: "7 days",
    detail: "Best for quick revision before a quiz or mock exam.",
  },
  {
    name: "Monthly",
    price: "ETB 299",
    access: "30 days",
    detail: "Practice every week with answers and explanations.",
  },
  {
    name: "Yearly",
    price: "ETB 1,999",
    access: "365 days",
    detail: "Full preparation for the national exam year.",
  },
];

const questionFlow = [
  {
    icon: PenLine,
    title: "Teachers add questions",
    text: "Admins upload Ethiopian national exam questions with correct answers.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Explanations are prepared",
    text: "Each answer includes a clear explanation so students understand the topic.",
  },
  {
    icon: CreditCard,
    title: "Students choose a package",
    text: "Weekly, monthly, or yearly access unlocks questions and explanations.",
  },
  {
    icon: LineChart,
    title: "Progress is tracked",
    text: "Students see subject performance and know what to revise next.",
  },
];

const subjects = [
  ["Mathematics", "1,240 questions", "bg-sky-500"],
  ["Biology", "980 questions", "bg-emerald-500"],
  ["Chemistry", "860 questions", "bg-violet-500"],
  ["Physics", "910 questions", "bg-amber-500"],
];

const teacherTools = [
  ["Question Bank", "Create, edit, and organize questions by grade and subject."],
  ["Answer Keys", "Add correct answers, detailed explanations, and references."],
  ["Student Access", "See which learners have active weekly, monthly, or yearly plans."],
  ["Exam Reports", "Review scores, attempts, weak topics, and class activity."],
];

const adminControls = [
  "Approve teacher/admin accounts",
  "Manage payment packages",
  "Control question visibility",
  "Review content quality",
  "Monitor school and student activity",
  "Protect platform permissions",
];

function HeroScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 7);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    const key = new THREE.DirectionalLight(0x67e8f9, 2.2);
    key.position.set(3, 4, 5);
    scene.add(ambient, key);

    const cardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.05,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.35,
    });
    const nodeMaterials = [0x0ea5e9, 0x14b8a6, 0x8b5cf6, 0xf59e0b].map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.2,
          roughness: 0.4,
        }),
    );

    const positions = [
      [-1.8, 0.95, 0],
      [1.15, 0.35, -0.35],
      [-0.75, -1.05, 0.2],
    ];

    positions.forEach(([x, y, z], index) => {
      const card = new THREE.Mesh(
        new THREE.BoxGeometry(1.95, 1.18, 0.08),
        cardMaterial,
      );
      card.position.set(x, y, z);
      card.rotation.set(-0.08 + index * 0.08, 0.2 - index * 0.12, 0.05);
      group.add(card);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.36, 0.08, 0.095),
        edgeMaterial,
      );
      stripe.position.set(x - 0.1, y + 0.28, z + 0.07);
      stripe.rotation.copy(card.rotation);
      group.add(stripe);

      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.045, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }),
      );
      line.position.set(x - 0.28, y - 0.03, z + 0.08);
      line.rotation.copy(card.rotation);
      group.add(line);
    });

    nodeMaterials.forEach((material, index) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), material);
      const angle = (index / nodeMaterials.length) * Math.PI * 2;
      node.position.set(Math.cos(angle) * 2.4, Math.sin(angle) * 1.35, -0.15);
      group.add(node);
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.012, 16, 140),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.62 }),
    );
    ring.rotation.x = Math.PI / 2.85;
    group.add(ring);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      group.rotation.y = Math.sin(time * 0.35) * 0.16;
      group.rotation.x = Math.sin(time * 0.45) * 0.06;
      ring.rotation.z = time * 0.28;
      group.position.y = Math.sin(time * 0.9) * 0.08;
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);
//comment is added
  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-sky-100/80 md:h-[430px]">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute left-5 top-5 rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          Live Preview
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          Questions, answers, explanations
        </p>
      </div>
      <div className="absolute bottom-5 right-5 rounded-xl bg-slate-950 px-4 py-3 text-white shadow-lg">
        <p className="text-xs text-slate-300">Unlocked by plan</p>
        <p className="text-sm font-semibold">Monthly access active</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white">
              <GraduationCap size={24} />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                ExamMaster Ethiopia
              </span>
              <span className="block text-xs font-medium text-slate-500">
                National exam preparation
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a className="hover:text-sky-700" href="#questions">
              Questions
            </a>
            <a className="hover:text-sky-700" href="#packages">
              Packages
            </a>
            <a className="hover:text-sky-700" href="/admin/login">
              Admin Login
            </a>
            <a className="hover:text-sky-700" href="/super-admin/login">
              Super Admin Login
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-sky-700 sm:flex"
            >
              <Search size={18} />
            </button>
            <a
              href="#packages"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Choose Plan
              <ChevronRight size={17} />
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(20,184,166,0.08)_42%,rgba(255,255,255,0)_72%)]" />
        <motion.div
          aria-hidden="true"
          initial={{ x: "-15%", opacity: 0 }}
          animate={{ x: "12%", opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute left-0 top-24 h-px w-2/3 bg-gradient-to-r from-transparent via-sky-300 to-transparent"
        />
        <motion.div
          aria-hidden="true"
          initial={{ x: "18%", opacity: 0 }}
          animate={{ x: "-8%", opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }}
          className="absolute bottom-16 right-0 h-px w-2/3 bg-gradient-to-r from-transparent via-teal-300 to-transparent"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">
              <Sparkles size={16} />
              Ethiopian national exam questions with explanations
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 md:text-5xl">
              Prepare with real exam questions, clear answers, and guided explanations.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Students unlock weekly, monthly, or yearly access to national
              exam question banks. Teacher admins add trusted questions and
              explanations, while super admins manage the full platform.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#questions"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Start Practicing
                <PlayCircle size={18} />
              </a>
              <a
                href="/admin/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-sky-700"
              >
                Admin Login
                <UserCheck size={18} />
              </a>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22 }}
              className="mt-7 max-w-xl rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Today&apos;s sample question
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Grade 12 Mathematics: 1 answer unlocked, explanation
                    available with active package.
                  </p>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
                >
                  <CheckCircle2 size={20} />
                </motion.span>
              </div>
            </motion.div>

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["8,500+", "Questions"],
                ["20+", "Subjects"],
                ["3", "Access plans"],
                ["24/7", "Study access"],
              ].map(([value, label]) => (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.12 }}
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xl font-semibold text-slate-950">{value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <HeroScene />
          </motion.div>
        </div>
      </section>

      <section id="questions" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
            How It Works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            From teacher question entry to student explanation access.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            The learning flow is simple, transparent, and built around paid
            access to high-quality Ethiopian national exam preparation.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {questionFlow.map((item, index) => (
            <motion.article
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <item.icon size={22} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.text}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              Student Experience
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Students see only the content their plan unlocks.
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              A paid student can open questions, select answers, read
              explanations, and continue learning by subject. Locked content
              clearly shows which package is required.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {subjects.map(([name, count, color]) => (
              <motion.div
                whileHover={{ y: -4 }}
                key={name}
                className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-5"
              >
                <div className={`h-2 w-16 rounded-full ${color}`} />
                <h3 className="mt-5 text-lg font-semibold">{name}</h3>
                <p className="mt-2 text-sm text-slate-500">{count}</p>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200">
                  <span className="font-medium text-slate-700">
                    Answers and explanations
                  </span>
                  <CheckCircle2 className="text-emerald-600" size={18} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700">
              Payment Packages
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Flexible access for every student plan.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-600">
            Weekly, monthly, and yearly packages can unlock question access,
            answers, explanations, mock exams, and progress reports.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {packages.map((plan, index) => (
            <motion.article
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ y: -5 }}
              key={plan.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <Clock3 className="text-sky-700" size={22} />
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-950">
                {plan.price}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {plan.access} of learning access
              </p>
              <p className="mt-5 leading-7 text-slate-600">{plan.detail}</p>
              <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">
                Select Package
                <ChevronRight size={16} />
              </button>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="teachers" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
                Teacher Admin
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                Admins create the question bank students trust.
              </h2>
              <p className="mt-4 leading-8 text-slate-600">
                Teachers can manage questions, answers, explanations, subjects,
                and student access from one professional dashboard.
              </p>
              <a
                href="/admin/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                Login as Admin
                <ChevronRight size={17} />
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {teacherTools.map(([title, text], index) => {
                const icons = [FileQuestion, UploadCloud, Users, ClipboardCheck];
                const Icon = icons[index];
                return (
                  <motion.div
                    whileHover={{ y: -4 }}
                    key={title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                      <Icon size={21} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="super-admin" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-200 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-300">
                Super Admin
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                Full control for platform owners and school leaders.
              </h2>
              <p className="mt-4 leading-8 text-slate-300">
                Super admins manage permissions, packages, content standards,
                schools, and platform activity across the website.
              </p>
              <a
                href="/super-admin/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-50"
              >
                Super Admin Login
                <ChevronRight size={17} />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {adminControls.map((control, index) => {
                const icons = [
                  UserCheck,
                  CreditCard,
                  LockKeyhole,
                  ShieldCheck,
                  School,
                  BookOpen,
                ];
                const Icon = icons[index];
                return (
                  <div
                    key={control}
                    className="rounded-xl border border-white/10 bg-white/10 p-5"
                  >
                    <Icon className="text-sky-300" size={22} />
                    <p className="mt-4 text-sm font-medium leading-6">
                      {control}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#f7fbff]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
              <LibraryBig size={21} />
            </span>
            <div>
              <p className="font-semibold">ExamMaster Ethiopia</p>
              <p className="text-sm text-slate-500">
                National exam questions, answers, and explanations.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
