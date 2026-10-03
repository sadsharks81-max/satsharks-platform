import { HomeActions } from "@/components/home-actions";

export default function HomePage() {
  return (
    <section className="py-10 text-center sm:py-16">
      <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
        Practise the Digital SAT on real past papers
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        Full-length adaptive papers, scored the way the real test is scored.
      </p>
      <HomeActions />
    </section>
  );
}
