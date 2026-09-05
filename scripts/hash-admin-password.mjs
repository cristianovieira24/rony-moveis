import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error("Use: node scripts/hash-admin-password.mjs 'uma-senha-com-10-ou-mais-caracteres'");
  process.exit(1);
}

const salt = randomBytes(18);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`);
