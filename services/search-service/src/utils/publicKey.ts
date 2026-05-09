import http from "http";

let cachedPublicKey: string | null = null;

export async function getPublicKey(): Promise<string> {
  if (cachedPublicKey !== null) return cachedPublicKey;

  return new Promise((resolve, reject) => {
    const url = `${process.env.AUTH_SERVICE_URL ?? "http://localhost:3001"}/auth/.well-known/public-key`;
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk: string) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            cachedPublicKey = parsed.data.publicKey;
            console.log("🔑 Public key fetched from auth service");
            resolve(cachedPublicKey!);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}
