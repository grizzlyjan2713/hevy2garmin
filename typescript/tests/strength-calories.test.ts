import { describe, it, expect } from "vitest";
import { calcStrengthCalories, calcCalories, DEFAULT_PROFILE, generateFit } from "../src/fit";
import { Decoder, Stream } from "@garmin/fitsdk";
import workout from "./fixtures/workout.json";

describe("optional strength estimate", () => {
  it("compares the supplied 2026 session without inventing VO2max", () => {
    expect(calcStrengthCalories(112, 1761, 3724)).toBe(528);
    expect(calcCalories([89], 5485, 2026, { ...DEFAULT_PROFILE, weightKg:112, birthYear:1980 })).toBe(774);
  });
  it("counts recovery energy and handles boundaries", () => {
    expect(calcStrengthCalories(112, 0, 60)).toBe(3);
    expect(calcStrengthCalories(112, 60, 0)).toBe(12);
    expect(calcStrengthCalories(112, 0, 0)).toBe(0);
    for (const args of [[0,1,1], [112,-1,1], [112,1,NaN], [Infinity,1,1]]) {
      expect(() => calcStrengthCalories(...args as [number,number,number])).toThrow();
    }
  });
  it("keeps the legacy default and changes only FIT calorie fields", () => {
    const legacy = generateFit(workout, [89]);
    expect(generateFit(workout, [89], {profile:{calorieMethod:"keytel"}}).fit).toEqual(legacy.fit);
    const strength = generateFit(workout, [89], {profile:{calorieMethod:"strength"}});
    const decode = (fit:Uint8Array) => new Decoder(Stream.fromByteArray(Buffer.from(fit))).read();
    const a = decode(legacy.fit), b = decode(strength.fit);
    expect(b.errors).toEqual([]);
    expect(b.messages.setMesgs).toEqual(a.messages.setMesgs);
    expect(b.messages.recordMesgs).toEqual(a.messages.recordMesgs);
    expect(b.messages.sessionMesgs[0].totalCalories).toBe(strength.calories);
    expect(b.messages.lapMesgs[0].totalCalories).toBe(strength.calories);
    expect(strength.calories).not.toBe(legacy.calories);
  });
  it("clips active time to the session and counts trailing time as recovery", () => {
    const w = {start_time:"2026-11-11T10:00:00Z", end_time:"2026-11-11T10:01:00Z", exercises:[{title:"Squat",sets:[{duration_seconds:1000}]}]};
    expect(generateFit(w,null,{profile:{calorieMethod:"strength",weightKg:112}}).calories).toBe(12);
    w.end_time = "2026-11-11T11:00:00Z";
    w.exercises[0].sets[0].duration_seconds = 10;
    expect(generateFit(w,null,{profile:{calorieMethod:"strength",weightKg:112}}).calories).toBe(calcStrengthCalories(112,20,3580));
  });
});
