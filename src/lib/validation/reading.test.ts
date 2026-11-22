import { describe, expect, it } from "bun:test";
import { addDays, todayInBogota } from "@/domain/maintenance/dates";
import { fieldErrorsFrom } from "./auth";
import { addReadingSchema, correctReadingSchema, deleteReadingSchema } from "./reading";

const today = todayInBogota();
const ID = "6f1c1f9e-6c5a-4b8e-9a7b-2d3c4e5f6a7b";

describe("addReadingSchema", () => {
  it.each([
    { name: "today", input: { readingDate: today, km: "45500" }, expected: { readingDate: today, km: 45500 } },
    {
      name: "oldest allowed date",
      input: { readingDate: "1950-01-01", km: "0" },
      expected: { readingDate: "1950-01-01", km: 0 },
    },
  ])("accepts $name", ({ input, expected }) => {
    expect(addReadingSchema.parse(input)).toEqual(expected);
  });

  it.each([
    {
      name: "a future date",
      input: { readingDate: addDays(today, 1), km: "1" },
      field: "readingDate",
      message: "La fecha no puede ser futura.",
    },
    {
      name: "a date before 1950",
      input: { readingDate: "1949-12-31", km: "1" },
      field: "readingDate",
      message: "La fecha es demasiado antigua.",
    },
    {
      name: "an impossible date",
      input: { readingDate: "2026-02-30", km: "1" },
      field: "readingDate",
      message: "Escribe una fecha válida.",
    },
    { name: "a missing date", input: { km: "1" }, field: "readingDate", message: "Escribe la fecha de la lectura." },
    {
      name: "km with separators",
      input: { readingDate: today, km: "45.500" },
      field: "km",
      message: "Escribe el kilometraje solo con números, sin puntos ni comas.",
    },
    {
      name: "km above the maximum",
      input: { readingDate: today, km: "2000001" },
      field: "km",
      message: "El kilometraje parece demasiado alto. Revísalo.",
    },
  ])("rejects $name", ({ input, field, message }) => {
    const result = addReadingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrorsFrom(result.error)[field]).toBe(message);
  });
});

describe("correctReadingSchema / deleteReadingSchema", () => {
  const correction = { readingId: ID, readingDate: today, km: "100", reason: "Error de digitación" };

  it("accepts a correction and trims the reason", () => {
    expect(correctReadingSchema.parse({ ...correction, reason: "  Error de digitación  " })).toEqual({
      readingId: ID,
      readingDate: today,
      km: 100,
      reason: "Error de digitación",
    });
  });

  it.each([
    { name: "a reason shorter than 5 characters", input: { ...correction, reason: "  abc " }, field: "reason" },
    { name: "a reason longer than 200 characters", input: { ...correction, reason: "a".repeat(201) }, field: "reason" },
    { name: "a reading id that is not a UUID", input: { ...correction, readingId: "1 or 1=1" }, field: "readingId" },
  ])("rejects $name", ({ input, field }) => {
    const result = correctReadingSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrorsFrom(result.error))).toEqual([field]);
  });

  it("deleting only needs the id and a reason", () => {
    expect(deleteReadingSchema.parse({ readingId: ID, reason: "Lectura duplicada" })).toEqual({
      readingId: ID,
      reason: "Lectura duplicada",
    });
    expect(deleteReadingSchema.safeParse({ readingId: ID }).success).toBe(false);
  });
});
