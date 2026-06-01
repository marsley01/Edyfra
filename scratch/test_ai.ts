import "dotenv/config";

async function main() {
  const key = process.env.GOOGLE_AI_KEY || "";
  console.log("Using Key:", key);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  
  if (!response.ok) {
    console.log("Status:", response.status);
    console.log("Text:", await response.text());
  } else {
    const data = await response.json();
    console.log("Models:", data.models.map((m: any) => m.name));
  }
}

main().catch(console.error);
