import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "../src/domain/validation.ts";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../solver/tests/fixtures");
function loadFixture(relPath) {
    const content = fs.readFileSync(path.join(FIXTURES_DIR, relPath), "utf-8");
    return JSON.parse(content);
}
test("Frontend Validation: Valid minimal config passes with 0 errors", () => {
    const req = loadFixture("valid_minimal_config.json");
    const errors = validateConfig(req);
    assert.strictEqual(errors.length, 0, `Expected 0 errors, got: ${JSON.stringify(errors)}`);
});
test("Frontend Validation: Valid medium config passes with 0 errors", () => {
    const req = loadFixture("valid_medium_config.json");
    const errors = validateConfig(req);
    assert.strictEqual(errors.length, 0, `Expected 0 errors, got: ${JSON.stringify(errors)}`);
});
test("Frontend Validation: Duplicate section ID is caught", () => {
    const req = loadFixture("invalid_configs/duplicate_ids.json");
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("DUPLICATE_SECTION_ID"));
    const err = errors.find((e) => e.code === "DUPLICATE_SECTION_ID");
    assert.ok(err?.message.includes("Duplicate section ID detected: 'sec-dup'"));
});
test("Frontend Validation: Overloaded faculty is caught", () => {
    const req = loadFixture("invalid_configs/faculty_overloaded.json");
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("FACULTY_EXCEEDS_WEEKLY_MAX"));
    const err = errors.find((e) => e.code === "FACULTY_EXCEEDS_WEEKLY_MAX");
    assert.ok(err?.message.includes("exceeding the weekly maximum of 8"));
});
test("Frontend Validation: Overloaded section is caught", () => {
    const req = loadFixture("invalid_configs/section_overloaded.json");
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("SECTION_OVERLOADED"));
    const err = errors.find((e) => e.code === "SECTION_OVERLOADED");
    assert.ok(err?.message.includes("requires 32 periods per week, which exceeds total available slots (30)"));
});
test("Frontend Validation: Practical blocked by breaks is caught", () => {
    const req = loadFixture("invalid_configs/practical_blocked_by_breaks.json");
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("PRACTICAL_BLOCKED_BY_BREAKS"));
    const err = errors.find((e) => e.code === "PRACTICAL_BLOCKED_BY_BREAKS");
    assert.ok(err?.message.includes("largest block is 2"));
});
test("Frontend Validation: Unqualified faculty is caught", () => {
    const req = loadFixture("invalid_configs/unqualified_faculty.json");
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("UNQUALIFIED_FACULTY"));
    const err = errors.find((e) => e.code === "UNQUALIFIED_FACULTY");
    assert.ok(err?.message.includes("is not qualified for it"));
});
test("Frontend Validation: Practical requiring unavailable lab is caught", () => {
    const req = loadFixture("invalid_configs/no_compatible_lab.json");
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("NO_COMPATIBLE_LAB"));
    const err = errors.find((e) => e.code === "NO_COMPATIBLE_LAB");
    assert.ok(err?.message.includes("requires a compatible lab (type: 'robotics-bay')"));
});
test("Frontend Validation: Missing department reference is caught", () => {
    const req = loadFixture("valid_minimal_config.json");
    req.sections[0].departmentId = "non-existent-dept";
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("INVALID_DEPARTMENT_REF"));
});
test("Frontend Validation: Practical periods not multiple is caught", () => {
    const req = loadFixture("valid_minimal_config.json");
    req.subjects[2].weeklyPeriods = 3;
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("PRACTICAL_PERIODS_NOT_MULTIPLE"));
});
test("Frontend Validation: Break period exceeding day periods is caught", () => {
    const req = loadFixture("valid_minimal_config.json");
    req.breakSlots.push({
        id: "bad-break",
        name: "Late Break",
        periodAfter: 6,
        durationMinutes: 15,
        appliesToDays: [1],
    });
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("INVALID_BREAK_PERIOD"));
});
test("Frontend Validation: Duplicate section-subject assignment is caught", () => {
    const req = loadFixture("valid_minimal_config.json");
    req.assignments.push({
        ...req.assignments[0],
        id: "assign-dup",
    });
    const errors = validateConfig(req);
    const codes = errors.map((e) => e.code);
    assert.ok(codes.includes("DUPLICATE_ASSIGNMENT"));
});
