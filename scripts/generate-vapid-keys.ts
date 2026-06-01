import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Add these to your .env file:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("\nThen restart your dev server.");
