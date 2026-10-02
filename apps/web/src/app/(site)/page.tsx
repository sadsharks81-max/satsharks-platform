import Link from "next/link";

export default function HomePage() {
  return (
    <section className="py-10 text-center sm:py-16">
      <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
        Practise the Digital SAT on real past papers
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        Full-length adaptive papers, scored the way the real test is scored.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Create a free account
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-100"
        >
          Log in
        </Link>
      </div>
    </section>
  );
}
