// app/page.tsx  -  public landing page
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Smart Attendance | ESUT",
  description:
    "Fingerprint attendance verified by Bluetooth proximity, built for Enugu State University of Science and Technology.",
};

const steps = [
  {
    n: "1",
    title: "Be in the room",
    text: "The lecturer's phone sends out a Bluetooth signal that changes every 30 seconds. Your phone can only pick it up when you are actually in class.",
  },
  {
    n: "2",
    title: "Confirm it's you",
    text: "Your phone asks for your fingerprint or face unlock, so nobody can sign in on your behalf.",
  },
  {
    n: "3",
    title: "Attendance recorded",
    text: "The server checks your phone, your course and the live code, then records your attendance within seconds.",
  },
];

const features = [
  { title: "Fingerprint verified", text: "Every check-in needs the phone owner's fingerprint or face unlock." },
  { title: "Proximity checked", text: "A rotating Bluetooth code proves the student is inside the classroom." },
  { title: "One phone per student", text: "Each account is tied to one registered phone. Lost phones are reset by the admin." },
  { title: "Live class view", text: "Lecturers watch attendance fill in as students check in." },
  { title: "Instant reports", text: "Attendance percentages per course, students below the minimum flagged, export to CSV or PDF." },
  { title: "Manual fallback", text: "If a phone dies, the lecturer can mark a student present with a reason that is recorded." },
];

const roles = [
  { title: "Students", text: "Add your courses, then mark attendance from your phone in a few seconds." },
  { title: "Lecturers", text: "Add your courses, start a class session and see who is present live." },
  { title: "Admins", text: "Add lecturers, reset student phones and view attendance reports on the web dashboard." },
];

export default function Landing() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_URL;

  return (
    <div className="bg-white text-slate-900">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-1.5">
              <Image src="/logo.jpg" alt="ESUT logo" width={36} height={40} priority />
            </div>
            <div className="leading-tight text-white">
              <p className="font-bold">Smart Attendance</p>
              <p className="text-xs text-white/70">ESUT</p>
            </div>
          </div>
          <Link
            href="/admin/login"
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold ring-1 ring-white/30 hover:bg-white/20"
          >
            Admin sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2b0a05] via-[#4d1006] to-[#681609] text-white">
        <div className="mx-auto max-w-6xl px-6 pt-36 pb-24 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="inline-block text-xs font-semibold tracking-wide uppercase rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">
              Enugu State University of Science and Technology
            </p>
            <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
              Attendance that can't be signed for you.
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl">
              Students check in with their fingerprint, but only when they are really in the classroom.
              No paper registers, no proxy signing, and reports ready when you need them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#how" className="px-5 py-3 rounded-lg bg-white text-[#681609] font-semibold hover:bg-slate-100">
                See how it works
              </a>
              <a href="#get-app" className="px-5 py-3 rounded-lg ring-1 ring-white/40 font-semibold hover:bg-white/10">
                Get the app
              </a>
            </div>
          </div>

          {/* Phone mock-up */}
          <div className="mx-auto w-64 rounded-[2rem] bg-white p-3 shadow-2xl ring-1 ring-black/10">
            <div className="rounded-[1.5rem] bg-slate-50 p-5 text-slate-900">
              <p className="text-xs font-semibold text-[#681609]">CPE 401</p>
              <p className="font-semibold">Embedded Systems</p>
              <div className="my-7 flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-4xl text-green-600">
                  ✓
                </div>
                <p className="mt-4 font-bold">Attendance marked</p>
                <p className="text-xs text-slate-500 mt-1">Verified by fingerprint</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs flex justify-between">
                <span className="text-slate-500">Class beacon</span>
                <span className="text-green-600 font-semibold">In range</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold">How it works</h2>
        <p className="mt-2 text-slate-500 max-w-2xl">Three quick steps for every class.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-slate-200 p-6">
              <div className="h-10 w-10 rounded-full bg-[#681609] text-white flex items-center justify-center font-bold">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold">Built to stop cheating</h2>
          <p className="mt-2 text-slate-500 max-w-2xl">
            Two checks work together: the phone must be in the room, and the owner must confirm it's them.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-6">
                <div className="h-2 w-10 rounded-full bg-[#681609]" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold">Made for everyone in the lecture hall</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {roles.map((r) => (
            <div key={r.title} className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-[#681609]">{r.title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Get the app */}
      <section id="get-app" className="bg-[#681609] text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold">Get the Android app</h2>
            <p className="mt-2 text-white/80 max-w-xl">
              Students and lecturers use the mobile app. Install it, choose your role and sign in.
            </p>
          </div>
          {apkUrl ? (
            <a
              href={apkUrl}
              className="px-6 py-3.5 rounded-lg bg-white text-[#681609] font-semibold hover:bg-slate-100 text-center"
            >
              Download for Android
            </a>
          ) : (
            <span className="px-6 py-3.5 rounded-lg bg-white/10 ring-1 ring-white/30 font-semibold text-center">
              Download link coming soon
            </span>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1">
              <Image src="/logo.jpg" alt="ESUT logo" width={28} height={31} />
            </div>
            <div>
              <p className="text-slate-200 font-medium">Enugu State University of Science and Technology</p>
              <p>Final-year project · Department of Computer Engineering</p>
            </div>
          </div>
          <div className="md:text-right">
            <p>Industrial training: SPOTWEB TECH</p>
            <Link href="/admin/login" className="hover:text-white">Admin sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
