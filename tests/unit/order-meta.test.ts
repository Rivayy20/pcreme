import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalisasiNamaRasa,
  gabungDaftarRasa,
  gabungDaftarTopping,
  labelRasaCup,
  parseInfoPembayaran,
  statusMetodePengambilan,
  formatAlamatAntar,
  parseAlamatAntar,
  formatCatatanPesanan,
  parseCatatanPesanan,
  konversiCupKeRpcItems,
} from "@/lib/order-meta";
import type { PoInfoAda } from "@/lib/types";

describe("Order Meta & Normalization", () => {
  test("normalisasiNamaRasa() standardizes flavor casing and spelling", () => {
    assert.equal(normalisasiNamaRasa("coklat"), "Cokelat");
    assert.equal(normalisasiNamaRasa("chocolate"), "Cokelat");
    assert.equal(normalisasiNamaRasa("strawberry"), "Stroberi");
    assert.equal(normalisasiNamaRasa("vanila"), "Vanilla");
    assert.equal(normalisasiNamaRasa("Matcha"), "Matcha");
  });

  test("gabungDaftarRasa() merges base flavors with DB flavors without duplicates", () => {
    const dbFlavors = ["Coklat", "Matcha", "Vanilla", "Mix"];
    const merged = gabungDaftarRasa(dbFlavors);
    assert.deepEqual(merged, ["Vanilla", "Stroberi", "Cokelat", "Matcha"]);
  });

  test("gabungDaftarTopping() merges default toppings with additional DB toppings", () => {
    const dbToppings = ["Oreo", "Keju", "  ", "Choco Crunch"];
    const merged = gabungDaftarTopping(dbToppings);
    assert.deepEqual(merged, ["Oreo", "Nyam-nyam", "Choco Crunch", "Sprinkle", "Keju"]);
  });

  test("labelRasaCup() formats single and mix cup descriptions", () => {
    assert.equal(
      labelRasaCup({ mode: "single", rasaTunggal: "Vanilla", rasaMix: [] }),
      "Vanilla"
    );
    assert.equal(
      labelRasaCup({ mode: "mix", rasaTunggal: "", rasaMix: ["Vanilla", "Stroberi"] }),
      "Mix (Vanilla + Stroberi)"
    );
    assert.equal(
      labelRasaCup({ mode: "mix", rasaTunggal: "", rasaMix: [] }),
      "Mix (Pilih minimal 2 rasa)"
    );
  });

  test("formatAlamatAntar() and parseAlamatAntar() handle structured delivery address", () => {
    const formatted = formatAlamatAntar({
      alamat: "Gedung A R.302",
      patokan: "Sebelah kantin",
      kontakAntar: "08123456789",
    });
    assert.equal(
      formatted,
      "Gedung A R.302 | Patokan: Sebelah kantin | Kontak Penerima: 08123456789"
    );

    const parsed = parseAlamatAntar(formatted);
    assert.equal(parsed.alamat, "Gedung A R.302");
    assert.equal(parsed.patokan, "Sebelah kantin");
    assert.equal(parsed.kontakAntar, "08123456789");
  });

  test("formatCatatanPesanan() and parseCatatanPesanan() serialize and parse metadata correctly", () => {
    const cups = [
      {
        id: "cup-1",
        mode: "mix" as const,
        rasaTunggal: "",
        rasaMix: ["Vanilla", "Cokelat"],
        topping: ["Oreo", "Sprinkle"],
        qty: 1,
      },
    ];

    const raw = formatCatatanPesanan({
      metodeBayar: "qris",
      cups,
      catatanPelanggan: "Jangan terlalu manis ya",
    });

    const parsed = parseCatatanPesanan(raw);
    assert.equal(parsed.metodeBayar, "qris");
    assert.equal(parsed.labelMetodeBayar, "QRIS");
    assert.equal(parsed.catatanPelanggan, "Jangan terlalu manis ya");
    assert.equal(parsed.cups.length, 1);
    assert.equal(parsed.cups[0].labelRasa, "Mix (Vanilla + Cokelat)");
    assert.deepEqual(parsed.cups[0].topping, ["Oreo", "Sprinkle"]);
  });

  test("parseInfoPembayaran() extracts Mandiri account & delivery settings", () => {
    const rawText = `[MANDIRI: 1300012345678 | Pcreme Bakery]
[DELIVERY_HOURS: 16:00-20:30]
[QRIS: ON]
    `;
    const cfg = parseInfoPembayaran(rawText);
    assert.equal(cfg.mandiri.aktif, true);
    assert.equal(cfg.mandiri.nomorRekening, "1300012345678");
    assert.equal(cfg.mandiri.atasNama, "Pcreme Bakery");
    assert.equal(cfg.jamMulaiAntar, "16:00");
    assert.equal(cfg.jamSelesaiAntar, "20:30");
    assert.equal(cfg.qrisAktif, true);
  });

  test("statusMetodePengambilan() correctly identifies pickup and delivery availability", () => {
    const mockPo: PoInfoAda = {
      ada_po: true,
      id: "po-1",
      nama: "Batch 1",
      minggu: 1,
      status: "buka",
      harga: 15000,
      kuota: 100,
      sisa_kuota: 50,
      maks_per_order: 5,
      maks_topping: 2,
      buka_at: "2026-11-01T00:00:00Z",
      tutup_at: "2026-11-20T23:59:59Z",
      tanggal_ambil: "2026-11-21",
      info_pembayaran: "[PICKUP: ON]\n[DELIVERY: ON]",
      wa_admin: "6281234567890",
      instagram: "pcreme.id",
      rasa: ["Vanilla", "Stroberi", "Cokelat"],
      topping: ["Oreo"],
      titik_ambil: [
        { id: "tp-1", nama: "Kantin Pusat", jam: "16:00" },
      ],
      server_time: new Date().toISOString(),
    };

    const status = statusMetodePengambilan(mockPo);
    assert.equal(status.opsiAmbilTersedia, true);
    assert.equal(status.opsiAntarTersedia, true);
    assert.equal(status.tidakAdaMetode, false);
    assert.equal(status.titikAmbilAktif.length, 1);
  });

  test("konversiCupKeRpcItems() maps cups to database order item inputs", () => {
    const cups = [
      {
        id: "cup-1",
        mode: "single" as const,
        rasaTunggal: "Vanilla",
        rasaMix: [],
        topping: ["Oreo"],
        qty: 2,
      },
      {
        id: "cup-2",
        mode: "mix" as const,
        rasaTunggal: "",
        rasaMix: ["Vanilla", "Stroberi"],
        topping: ["Sprinkle", "Nyam-nyam"],
        qty: 1,
      },
    ];
    const items = konversiCupKeRpcItems(
      cups,
      ["Vanilla", "Stroberi", "Cokelat"],
      ["Oreo", "Sprinkle", "Nyam-nyam", "Choco Crunch"],
      2
    );
    assert.equal(items.length, 2);
    assert.equal(items[0].rasa, "Vanilla");
    assert.deepEqual(items[0].topping, ["Oreo"]);
    assert.equal(items[0].qty, 2);
    assert.equal(items[1].qty, 1);
  });
});
