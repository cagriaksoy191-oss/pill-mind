const ids = [
  'aspirin-warfarin',
  'ibuprofen-enalapril',
  'omeprazol-warfarin'
];

async function run() {
  console.log("🔥 Starting prewarm for demo combinations...");
  for (const id of ids) {
    try {
      console.log(`\nFetching interaction: ${id}`);
      const res = await fetch('http://localhost:3000/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionId: id })
      });
      const data = await res.json();
      console.log(`Result: ${data.source} - ${data.fallbackReason || 'Success'}`);
      if (data.source === 'gemini_live') {
        console.log(`✅ Cached successfully.`);
      }
    } catch (err) {
      console.error(`❌ Failed:`, err);
    }
    // Backoff for global limits
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("\n🎉 Prewarm complete!");
}

run();
