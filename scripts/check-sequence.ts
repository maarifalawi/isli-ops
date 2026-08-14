import postgres from "postgres";

async function main(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const js = await sql`SELECT * FROM job_sequence ORDER BY 1,2,3`;
  const inv = await sql`SELECT * FROM invoice_sequence ORDER BY 1,2,3`;
  console.log(JSON.stringify(js));
  console.log(JSON.stringify(inv));
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
