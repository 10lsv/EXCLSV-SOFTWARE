// eslint-disable-next-line @typescript-eslint/no-require-imports
const ResendModule = require("resend");
const ResendClass = ResendModule.Resend || ResendModule.default?.Resend || ResendModule;

// Lazy init to avoid crash during build when RESEND_API_KEY is not set
let _resend: InstanceType<typeof ResendClass> | null = null;

export const resend = new Proxy({} as { emails: { send: (opts: unknown) => Promise<unknown> } }, {
  get(_target, prop) {
    if (!_resend) {
      _resend = new ResendClass(process.env.RESEND_API_KEY || "re_placeholder");
    }
    return (_resend as Record<string, unknown>)[prop as string];
  },
});
