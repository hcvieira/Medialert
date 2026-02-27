import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe("Resend API key validation", () => {
  it("should have a valid RESEND_API_KEY env var", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set").toBeTruthy();
    expect(key).toMatch(/^re_/);
  });

  it("should be able to list domains (validates API key)", async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.domains.list();
    expect(error, `Resend API error: ${JSON.stringify(error)}`).toBeNull();
    expect(data).toBeDefined();
  });
});
