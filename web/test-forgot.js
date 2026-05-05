async function test() {
  const res = await fetch("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@classy.com" })
  });
  console.log(await res.json());
}
test();
