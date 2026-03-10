import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; QuantumDailyBot/1.0)",
  },
});

try {
  console.log("Testing EurekAlert...");
  const result = await parser.parseURL("https://www.eurekalert.org/rss/quantum-physics.xml");
  console.log(`✓ EurekAlert: ${result.items?.length || 0} items`);
} catch (e) {
  console.log(`✗ EurekAlert: ${e.message}`);
}
