import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  rupiah,
  normalisasiWa,
  waValid,
  tampilWa,
  normalisasiJamAntarWib,
  pesanErrorJamAntarWib,
  jamKeMenitWib,
} from "@/lib/format";

describe("Format & Validation Utilities", () => {
  test("rupiah() formats currency in Indonesian Rupiah standard", () => {
    assert.equal(rupiah(15000), "Rp15.000");
    assert.equal(rupiah(0), "Rp0");
    assert.equal(rupiah(45000), "Rp45.000");
    assert.equal(rupiah(150000), "Rp150.000");
  });

  test("normalisasiWa() converts 08... and +62... to standard 62...", () => {
    assert.equal(normalisasiWa("081234567890"), "6281234567890");
    assert.equal(normalisasiWa("+6281234567890"), "6281234567890");
    assert.equal(normalisasiWa("6281234567890"), "6281234567890");
    assert.equal(normalisasiWa("0812-3456-7890"), "6281234567890");
    assert.equal(normalisasiWa("81234567890"), "6281234567890");
  });

  test("waValid() strictly checks Indonesian WhatsApp mobile numbers", () => {
    assert.equal(waValid("081234567890"), true);
    assert.equal(waValid("+6281234567890"), true);
    assert.equal(waValid("6281234567890"), true);
    assert.equal(waValid("0812-3456-7890"), true);
    // Invalid numbers
    assert.equal(waValid("0217654321"), false); // Fixed landline (021)
    assert.equal(waValid("12345"), false); // Too short
    assert.equal(waValid("0800123456"), false); // Toll-free (0800)
    assert.equal(waValid("0804123456"), false); // Toll-free (0804)
    assert.equal(waValid("abcdef"), false); // Non-digit
    assert.equal(waValid(""), false); // Empty
  });

  test("tampilWa() formats 628... to friendly local 08xx-xxxx-xxxx display", () => {
    assert.equal(tampilWa("6281234567890"), "0812-3456-7890");
    assert.equal(tampilWa("081234567890"), "0812-3456-7890");
  });

  test("jamKeMenitWib() calculates minutes from midnight accurately", () => {
    assert.equal(jamKeMenitWib("00:00"), 0);
    assert.equal(jamKeMenitWib("15:00"), 900);
    assert.equal(jamKeMenitWib("15:30"), 930);
    assert.equal(jamKeMenitWib("21:00"), 1260);
  });

  test("normalisasiJamAntarWib() normalizes varied time formats to HH:MM", () => {
    assert.equal(normalisasiJamAntarWib("15:30"), "15:30");
    assert.equal(normalisasiJamAntarWib("15.30"), "15:30");
    assert.equal(normalisasiJamAntarWib("15:30:00"), "15:30");
    assert.equal(normalisasiJamAntarWib(" 16:45 "), "16:45");
    assert.equal(normalisasiJamAntarWib("25:00"), null); // Invalid hour
    assert.equal(normalisasiJamAntarWib("15:61"), null); // Invalid minute
    assert.equal(normalisasiJamAntarWib("invalid"), null);
  });

  test("pesanErrorJamAntarWib() validates delivery window accurately", () => {
    const start = "15:00";
    const end = "21:00";

    // Valid times: strictly after 15:00 (15:01) up to 21:00
    assert.equal(pesanErrorJamAntarWib("15:01", start, end), null);
    assert.equal(pesanErrorJamAntarWib("17:30", start, end), null);
    assert.equal(pesanErrorJamAntarWib("21:00", start, end), null);

    // Exact start time is rejected ("setelah pukul 15:00")
    assert.match(
      pesanErrorJamAntarWib("15:00", start, end) ?? "",
      /hanya tersedia setelah pukul 15:00 WIB/
    );

    // Too early
    assert.match(
      pesanErrorJamAntarWib("14:59", start, end) ?? "",
      /hanya tersedia setelah pukul 15:00 WIB/
    );

    // Too late
    assert.match(
      pesanErrorJamAntarWib("21:01", start, end) ?? "",
      /Batas maksimal jam pengantaran adalah pukul 21:00 WIB/
    );

    // Empty time
    assert.match(
      pesanErrorJamAntarWib("", start, end) ?? "",
      /Pilih jam pengantaran/
    );
  });
});
