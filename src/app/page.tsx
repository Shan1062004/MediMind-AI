import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full bg-foreground px-8 py-4 text-lg font-semibold text-background shadow hover:brightness-95"
        >
          Go to Dashboard
        </Link>
      </main>
    </div>
  );
}
