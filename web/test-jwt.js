const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

async function testFullFlow() {
  const secret = "classy-super-gizli-token-anahtari-2026-!#";
  const email = "admin@classy.com";
  
  // 1. Generate token
  const token = jwt.sign(
    { userId: "some-id", email, purpose: "password-reset" },
    secret,
    { expiresIn: "1h" }
  );
  console.log("Token generated:", token);
  
  // 2. Verify token
  try {
    const payload = jwt.verify(token, secret);
    console.log("Token verified:", payload);
  } catch (err) {
    console.error("Token verification failed:", err);
  }
}
testFullFlow();
