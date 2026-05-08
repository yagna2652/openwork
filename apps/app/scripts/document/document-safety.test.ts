import { describe, expect, test } from "bun:test";

import { getPrettyModeAvailability } from "../../src/react-app/domains/document/document-safety";

describe("getPrettyModeAvailability", () => {
  test("allows basic prose markdown", () => {
    const result = getPrettyModeAvailability("# Title\n\nA paragraph with **bold** and [link](https://example.com).\n\n- One\n- Two");

    expect(result.available).toBe(true);
  });

  test("disables pretty mode for CriticMarkup", () => {
    const result = getPrettyModeAvailability("This is {++new++} text.");

    expect(result.available).toBe(false);
    expect(result.reason).toContain("CriticMarkup");
  });

  test("disables pretty mode for images and tables", () => {
    expect(getPrettyModeAvailability("![alt](image.png)").available).toBe(false);
    expect(getPrettyModeAvailability("| A | B |\n|---|---|\n| 1 | 2 |").available).toBe(false);
  });
});
