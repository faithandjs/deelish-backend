import axios from "axios";

let cachedPublicKey: string | null = null;

export async function getPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  const url = `${process.env.AUTH_SERVICE_URL}/auth/.well-known/public-key`;
  const res = await axios.get<{ data: { publicKey: string } }>(url);
  cachedPublicKey = res.data.data.publicKey;
  console.log("🔑 Public key fetched from auth service");
  return cachedPublicKey;
}
