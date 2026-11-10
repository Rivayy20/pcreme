import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderSchema,
  cekStatusSchema,
  periodeSchema,
} from "@/lib/schemas";

describe("Validation Schemas", () => {
  describe("buildOrderSchema", () => {
    const baseConfig = {
      maksTotalCup: 5,
      maksTopping: 2,
      opsiAmbilTersedia: true,
      opsiAntarTersedia: true,
      activePickupPointIds: ["tp-1", "tp-2"],
      jamMulaiAntar: "15:00",
      jamSelesaiAntar: "21:00",
    };

    test("accepts valid pickup order", () => {
      const schema = buildOrderSchema(baseConfig);
      const res = schema.safeParse({
        nama: "Budi Santoso",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "ambil",
        pickup_point_id: "tp-1",
        alamat: "",
        jam_antar: "",
        catatan: "Terima kasih",
        website: "",
        items: [
          { rasa: "Vanilla", topping: ["Oreo"], qty: 2 },
          { rasa: "Mix (Vanilla + Cokelat)", topping: ["Sprinkle"], qty: 1 },
        ],
      });

      assert.equal(res.success, true);
    });

    test("rejects order exceeding maximum allowed cups", () => {
      const schema = buildOrderSchema(baseConfig);
      const res = schema.safeParse({
        nama: "Budi Santoso",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "ambil",
        pickup_point_id: "tp-1",
        alamat: "",
        jam_antar: "",
        catatan: "",
        website: "",
        items: [{ rasa: "Vanilla", topping: ["Oreo"], qty: 6 }], // 6 > 5
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error.issues[0].message, /Total cup melebihi batas/);
      }
    });

    test("rejects order exceeding maximum toppings per cup", () => {
      const schema = buildOrderSchema(baseConfig);
      const res = schema.safeParse({
        nama: "Budi Santoso",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "ambil",
        pickup_point_id: "tp-1",
        alamat: "",
        jam_antar: "",
        catatan: "",
        website: "",
        items: [
          {
            rasa: "Vanilla",
            topping: ["Oreo", "Sprinkle", "Nyam-nyam"], // 3 > 2
            qty: 1,
          },
        ],
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error.issues[0].message, /Topping maksimal 2 per cup/);
      }
    });

    test("rejects pickup with inactive or unknown pickup point ID", () => {
      const schema = buildOrderSchema(baseConfig);
      const res = schema.safeParse({
        nama: "Budi Santoso",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "ambil",
        pickup_point_id: "tp-999-inactive",
        alamat: "",
        jam_antar: "",
        catatan: "",
        website: "",
        items: [{ rasa: "Vanilla", topping: [], qty: 1 }],
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error.issues[0].message, /Titik pengambilan yang dipilih sudah tidak aktif/);
      }
    });

    test("validates delivery address length and delivery time window", () => {
      const schema = buildOrderSchema(baseConfig);

      // Address too short (< 5 chars)
      const resShort = schema.safeParse({
        nama: "Budi",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "antar",
        pickup_point_id: "",
        alamat: "Kos",
        jam_antar: "16:00",
        catatan: "",
        website: "",
        items: [{ rasa: "Vanilla", topping: [], qty: 1 }],
      });
      assert.equal(resShort.success, false);

      // Delivery time outside delivery window (e.g. 14:00 before 15:00)
      const resEarly = schema.safeParse({
        nama: "Budi",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "antar",
        pickup_point_id: "",
        alamat: "Gedung Kuliah Bersama B204",
        jam_antar: "14:00",
        catatan: "",
        website: "",
        items: [{ rasa: "Vanilla", topping: [], qty: 1 }],
      });
      assert.equal(resEarly.success, false);

      // Valid delivery
      const resValid = schema.safeParse({
        nama: "Budi",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "antar",
        pickup_point_id: "",
        alamat: "Gedung Kuliah Bersama B204",
        jam_antar: "16:30",
        catatan: "",
        website: "",
        items: [{ rasa: "Vanilla", topping: [], qty: 1 }],
      });
      assert.equal(resValid.success, true);
    });

    test("detects bot activity when honeypot field is populated", () => {
      const schema = buildOrderSchema(baseConfig);
      const res = schema.safeParse({
        nama: "Spam Bot",
        wa: "081234567890",
        asal: "Mahasiswa",
        fulfillment: "ambil",
        pickup_point_id: "tp-1",
        alamat: "",
        jam_antar: "",
        catatan: "",
        website: "https://spamlink.com", // Honeypot populated!
        items: [{ rasa: "Vanilla", topping: [], qty: 1 }],
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error.issues[0].message, /bot terdeteksi/i);
      }
    });
  });

  describe("cekStatusSchema", () => {
    test("validates valid order code and WhatsApp number", () => {
      const res = cekStatusSchema.safeParse({
        kode: "PC-1-0001",
        wa: "081234567890",
      });
      assert.equal(res.success, true);
    });

    test("rejects invalid WhatsApp numbers", () => {
      const res = cekStatusSchema.safeParse({
        kode: "PC-1-0001",
        wa: "0800123456", // Toll-free
      });
      assert.equal(res.success, false);
    });
  });

  describe("periodeSchema", () => {
    test("rejects tutup_at earlier than or equal to buka_at", () => {
      const res = periodeSchema.safeParse({
        minggu: 1,
        nama: "PO Batch 1",
        harga: 15000,
        kuota: 100,
        maks_per_order: 5,
        maks_topping: 2,
        buka_at: "2026-11-20T10:00",
        tutup_at: "2026-11-20T09:00", // Earlier!
        tanggal_ambil: "2026-11-21",
        info_pembayaran: "",
        wa_admin: "081234567890",
        instagram: "pcreme",
      });

      assert.equal(res.success, false);
      if (!res.success) {
        assert.match(res.error.issues[0].message, /Waktu tutup harus setelah waktu buka/);
      }
    });
  });
});
