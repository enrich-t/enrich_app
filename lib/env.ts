export const ENV = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE_URL || "",
};

export function assertEnv() {
  if (!ENV.API_BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
}
