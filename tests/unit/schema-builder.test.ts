import { describe, expect, it } from "vitest";
import { localBusiness } from "@/templates/local-business";
import {
  completion,
  fieldSchema,
  isEmptyValue,
  sectionSchema,
  templateSchema,
  validateForSubmit,
} from "@/templates/schema-builder";
import type { AnswerField } from "@/templates/types";

const email: AnswerField = { key: "e", type: "email", label: { es: "", en: "" } };
const requiredText: AnswerField = {
  key: "t",
  type: "text",
  required: true,
  maxLength: 5,
  label: { es: "", en: "" },
};
const multi: AnswerField = {
  key: "m",
  type: "multiselect",
  label: { es: "", en: "" },
  options: [{ value: "a", label: { es: "A", en: "A" } }],
};

describe("fieldSchema", () => {
  it("accepts half-typed values in draft mode but not on submit", () => {
    expect(fieldSchema(email, "draft").safeParse("hola@cafe").success).toBe(true);
    expect(fieldSchema(email, "submit").safeParse("hola@cafe").success).toBe(false);
    expect(fieldSchema(email, "submit").safeParse("hola@cafe.com").success).toBe(true);
    expect(fieldSchema(email, "submit").safeParse("").success).toBe(true);
  });

  it("enforces required fields only on submit", () => {
    expect(fieldSchema(requiredText, "draft").safeParse(undefined).success).toBe(true);
    const result = fieldSchema(requiredText, "submit").safeParse("   ");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("required");
  });

  it("enforces max length in every mode", () => {
    expect(fieldSchema(requiredText, "draft").safeParse("123456").error?.issues[0]?.message).toBe("too_long");
  });

  it("rejects unknown options unless the field allows other values", () => {
    expect(fieldSchema(multi, "draft").safeParse(["a"]).success).toBe(true);
    expect(fieldSchema(multi, "draft").safeParse(["zzz"]).success).toBe(false);
    expect(fieldSchema({ ...multi, allowOther: true }, "draft").safeParse(["zzz"]).success).toBe(true);
  });
});

describe("templateSchema", () => {
  it("rejects keys that are not part of the template", () => {
    const schema = templateSchema(localBusiness, "draft");
    expect(schema.safeParse({ business_name: "Nube" }).success).toBe(true);
    expect(schema.safeParse({ business_name: "Nube", __proto_pollution: "x" }).success).toBe(false);
  });

  it("rejects values with the wrong shape", () => {
    const schema = templateSchema(localBusiness, "draft");
    expect(schema.safeParse({ website_goals: "calls" }).success).toBe(false);
    expect(schema.safeParse({ colors: ["red"] }).success).toBe(false);
    expect(schema.safeParse({ colors: ["#ff0000"] }).success).toBe(true);
  });

  it("allows blank times while the client is still typing hours", () => {
    const hours = {
      mon: { closed: false, ranges: [{ open: "09:00", close: "" }] },
      tue: { closed: true, ranges: [] },
      wed: { closed: false, ranges: [] },
      thu: { closed: false, ranges: [] },
      fri: { closed: false, ranges: [] },
      sat: { closed: false, ranges: [] },
      sun: { closed: false, ranges: [] },
    };
    expect(templateSchema(localBusiness, "draft").safeParse({ opening_hours: hours }).success).toBe(true);
    hours.mon.ranges[0]!.open = "25:00";
    expect(templateSchema(localBusiness, "draft").safeParse({ opening_hours: hours }).success).toBe(false);
  });
});

describe("sectionSchema", () => {
  it("reports every missing required field of a step", () => {
    const result = sectionSchema(localBusiness.sections[0]!, "submit").safeParse({});
    const keys = result.error?.issues.map((i) => i.path[0]);
    expect(keys).toEqual(expect.arrayContaining(["business_name", "description"]));
  });
});

describe("validateForSubmit", () => {
  it("points to the first section with an error", () => {
    const { errors, firstInvalidSection } = validateForSubmit(
      localBusiness,
      { business_name: "Nube", description: "Café" },
      {},
    );
    expect(firstInvalidSection).toBe(1);
    expect(errors).toMatchObject({ website_goals: "required", target_audience: "required" });
  });
});

describe("isEmptyValue / completion", () => {
  it("treats untouched structures as empty", () => {
    expect(isEmptyValue([{ url: "", note: "" }])).toBe(true);
    expect(isEmptyValue({ mon: { closed: false, ranges: [] } })).toBe(true);
    expect(isEmptyValue({ mon: { closed: true, ranges: [] } })).toBe(false);
    expect(isEmptyValue(["a"])).toBe(false);
  });

  it("counts files towards completion", () => {
    const none = completion(localBusiness, {}, {});
    const withLogo = completion(localBusiness, {}, { logo: 1 });
    expect(none).toBe(0);
    expect(withLogo).toBeGreaterThan(0);
  });
});
