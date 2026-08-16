import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diisi di .env.local");
  }

  const sql = postgres(url, { max: 1, prepare: false });
  const js = await sql`SELECT * FROM job_sequence ORDER BY 1,2,3`;
  const inv = await sql`SELECT * FROM invoice_sequence ORDER BY 1,2,3`;
  // biome-ignore lint/suspicious/noConsoleLog: CLI script output
  console.log(JSON.stringify(js));
  // biome-ignore lint/suspicious/noConsoleLog: CLI script output
  console.log(JSON.stringify(inv));
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
