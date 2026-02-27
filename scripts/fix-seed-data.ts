import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Reviews already fixed in previous run, verify
  const [reviewCheck] = await conn.query(
    "SELECT COUNT(*) as cnt FROM doctor_reviews WHERE doctorId >= 810155"
  ) as any[];
  console.log(`Reviews linked to real doctors: ${(reviewCheck as any[])[0].cnt}`);

  // 1. Create medications for patients
  console.log("\n=== Creating medications for patients ===");

  const [links] = await conn.query(
    "SELECT dp.doctorId, dp.patientId FROM doctor_patients dp WHERE dp.accepted = 1 ORDER BY dp.doctorId"
  ) as any[];
  console.log(`Found ${links.length} doctor-patient links`);

  const medNames = [
    "Losartana", "Metformina", "Atenolol", "Sinvastatina",
    "Omeprazol", "Amlodipina", "Hidroclorotiazida", "Enalapril",
    "AAS", "Levotiroxina", "Captopril", "Fluoxetina",
  ];
  const dosages = ["50mg", "850mg", "25mg", "20mg", "5mg", "10mg", "100mg", "50mcg"];
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

  // Insert medications
  const medBatch: any[] = [];
  const medTimesMap: { patientId: number; times: string[] }[] = [];

  for (const link of links) {
    const numMeds = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...medNames].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numMeds; i++) {
      const times = ["08:00"];
      if (Math.random() > 0.5) times.push("20:00");
      if (Math.random() > 0.7) times.push("14:00");

      const createdDaysAgo = 30 + Math.floor(Math.random() * 330);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - createdDaysAgo);

      medBatch.push([
        link.patientId,
        link.doctorId, // caregiverId = doctorId (who prescribed)
        shuffled[i],
        dosages[Math.floor(Math.random() * dosages.length)],
        colors[Math.floor(Math.random() * colors.length)],
        1, // active
        createdAt.toISOString().slice(0, 19).replace("T", " "),
        createdAt.toISOString().slice(0, 19).replace("T", " "),
      ]);

      medTimesMap.push({ patientId: link.patientId, times });
    }
  }

  // Batch insert medications
  const batchSize = 200;
  for (let i = 0; i < medBatch.length; i += batchSize) {
    const batch = medBatch.slice(i, i + batchSize);
    await conn.query(
      `INSERT INTO medications (patientId, caregiverId, name, dosage, color, active, createdAt, updatedAt) VALUES ${batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      batch.flat()
    );
  }
  console.log(`Created ${medBatch.length} medications`);

  // Get inserted medication IDs
  const [insertedMeds] = await conn.query(
    "SELECT id, patientId FROM medications ORDER BY id"
  ) as any[];

  // Insert medication_times
  const timesBatch: any[] = [];
  let medIdx = 0;
  for (const entry of medTimesMap) {
    if (medIdx < insertedMeds.length) {
      const medId = (insertedMeds as any[])[medIdx].id;
      for (const t of entry.times) {
        timesBatch.push([medId, t]);
      }
      medIdx++;
    }
  }

  for (let i = 0; i < timesBatch.length; i += batchSize) {
    const batch = timesBatch.slice(i, i + batchSize);
    await conn.query(
      `INSERT INTO medication_times (medicationId, time) VALUES ${batch.map(() => "(?, ?)").join(", ")}`,
      batch.flat()
    );
  }
  console.log(`Created ${timesBatch.length} medication_times`);

  // 2. Create dose_records
  console.log("\n=== Creating dose_records ===");

  const [allMeds] = await conn.query(`
    SELECT m.id, m.patientId, m.name, mt.time
    FROM medications m
    JOIN medication_times mt ON mt.medicationId = m.id
    WHERE m.active = 1
    ORDER BY m.id
  `) as any[];
  console.log(`Found ${(allMeds as any[]).length} medication-time combinations`);

  const now = new Date();
  const doseBatch: any[] = [];

  for (const med of allMeds as any[]) {
    // Generate dose records for last 60 days
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 60);

    const current = new Date(startDate);
    while (current <= now) {
      const rand = Math.random();
      const status = rand < 0.80 ? "taken" : rand < 0.95 ? "missed" : "cancelled";
      const dateStr = current.toISOString().slice(0, 10);
      const takenAt = status === "taken"
        ? new Date(`${dateStr}T${med.time}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}Z`)
        : null;

      doseBatch.push([
        med.id,        // medicationId
        med.patientId, // patientId
        med.name,      // medicationName
        med.time,      // scheduledTime
        dateStr,       // date
        status,        // status
        takenAt ? takenAt.toISOString().slice(0, 19).replace("T", " ") : null, // takenAt
        new Date().toISOString().slice(0, 19).replace("T", " "), // createdAt
      ]);

      current.setDate(current.getDate() + 1);
    }
  }

  console.log(`Inserting ${doseBatch.length} dose records...`);
  for (let i = 0; i < doseBatch.length; i += batchSize) {
    const batch = doseBatch.slice(i, i + batchSize);
    await conn.query(
      `INSERT INTO dose_records (medicationId, patientId, medicationName, scheduledTime, date, status, takenAt, createdAt) VALUES ${batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      batch.flat()
    );
    if ((i + batchSize) % 2000 === 0) {
      console.log(`  Inserted ${Math.min(i + batchSize, doseBatch.length)}/${doseBatch.length}...`);
    }
  }
  console.log(`Created ${doseBatch.length} dose records`);

  // 3. Final verification
  console.log("\n=== Final verification ===");
  const [doseStats] = await conn.query("SELECT status, COUNT(*) as cnt FROM dose_records GROUP BY status") as any[];
  console.log("Dose records by status:");
  console.table(doseStats);

  const [medCount] = await conn.query("SELECT COUNT(*) as cnt FROM medications") as any[];
  console.log(`Total medications: ${(medCount as any[])[0].cnt}`);

  const [reviewStats] = await conn.query(
    "SELECT COUNT(*) as cnt, ROUND(AVG(rating),1) as avg FROM doctor_reviews WHERE doctorId = 810155"
  ) as any[];
  console.log(`Ricardo reviews: ${(reviewStats as any[])[0].cnt}, avg: ${(reviewStats as any[])[0].avg}`);

  await conn.end();
  console.log("\n✅ Data fix complete!");
}

main().catch(console.error);
