import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap section">
      <h1>That page is not on a corridor.</h1>
      <p><Link href="/en">Back to Sawa</Link></p>
    </main>
  );
}
