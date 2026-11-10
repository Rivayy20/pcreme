"use client";

import imageCompression from "browser-image-compression";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  ImagePlus,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Package,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import produkImg from "@/assets/produk.jpg";
import qrisImg from "@/assets/qris.jpg";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChip } from "@/components/public/ChoiceChip";
import { CopyButton } from "@/components/public/CopyButton";
import { CupConfiguratorCard } from "@/components/public/CupConfiguratorCard";
import { Field, describedBy } from "@/components/public/Field";
import { OrderProgressBadge, PaymentStatusBadge } from "@/components/public/StatusBadge";
import { UploadBukti } from "@/components/public/UploadBukti";
import { ambilPoInfo, buatPesanan, kirimBuktiBayar, unggahBukti } from "@/lib/api";
import {
  hitungMinTimePickerWib,
  normalisasiJamAntarWib,
  normalisasiWa,
  pesanErrorJamAntarWib,
  rupiah,
  tampilWa,
  tanggalPanjang,
  waValid,
} from "@/lib/format";
import {
  formatAlamatAntar,
  formatCatatanPesanan,
  gabungDaftarRasa,
  gabungDaftarTopping,
  konversiCupKeRpcItems,
  labelRasaCup,
  statusMetodePengambilan,
  type KonfigurasiCup,
  type MetodePembayaran,
} from "@/lib/order-meta";
import { ASAL_OPTIONS, MAKS_BARIS_ITEM } from "@/lib/schemas";
import { RUTE } from "@/lib/routes";
import {
  bacaSuksesCheckoutMentah,
  hapusSuksesCheckout,
  parseSuksesCheckout,
  simpanSesi,
  simpanSuksesCheckout,
  type SesiSuksesCheckout,
} from "@/lib/session";
import type { Fulfillment, OrderStatus, PoInfoAda } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { linkWa, pesanKeAdmin } from "@/lib/wa";

const noop = () => () => {};

const TIPE_BUKTI_DIIZINKAN: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAKS_BUKTI_BYTE = 5 * 1024 * 1024;

type CheckoutStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { nomor: CheckoutStep; kode: string; label: string; pendek: string }[] = [
  { nomor: 1, kode: "01", label: "Produk", pendek: "Produk" },
  { nomor: 2, kode: "02", label: "Pengambilan", pendek: "Ambil" },
  { nomor: 3, kode: "03", label: "Data Pemesan", pendek: "Pemesan" },
  { nomor: 4, kode: "04", label: "Pembayaran", pendek: "Bayar" },
  { nomor: 5, kode: "05", label: "Review", pendek: "Review" },
  { nomor: 6, kode: "06", label: "Selesai", pendek: "Selesai" },
];

type HasilPesananSukses = SesiSuksesCheckout;

function buatCupBaru(defaultRasa = "", id?: string): KonfigurasiCup {
  return {
    id:
      id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cup-${Date.now()}-${Math.random()}`),
    mode: "single",
    rasaTunggal: defaultRasa,
    rasaMix: [],
    topping: [],
    qty: 1,
  };
}

export function OrderForm({ po: poAwal }: { po: PoInfoAda }) {
  const hydrated = useHydrated();
  const [po, setPo] = useState(poAwal);
  // Checkout terikat pada batch di URL (/pesan/[batchId]). Bila batch aktif di database berganti,
  // pesanan baru tidak boleh dialihkan diam-diam ke batch lain.
  const [batchKadaluarsa, setBatchKadaluarsa] = useState(false);
  const [step, setStep] = useState<CheckoutStep>(1);
  const topRef = useRef<HTMLDivElement | null>(null);

  /** Terapkan data batch terbaru dari database. Mengembalikan false jika batch yang sedang dipesan sudah berganti. */
  function terapkanPoBaru(poBaru: PoInfoAda): boolean {
    if (poBaru.id !== poAwal.id) {
      setBatchKadaluarsa(true);
      toast.error("Batch yang kamu pesan sudah tidak aktif. Silakan lihat Jadwal PO.");
      return false;
    }
    setBatchKadaluarsa(false);
    setPo(poBaru);
    return true;
  }

  const rasaOptions = useMemo(() => gabungDaftarRasa(po.rasa), [po.rasa]);
  const toppingOptions = useMemo(() => gabungDaftarTopping(po.topping), [po.topping]);
  const {
    cfg: cfgPembayaran,
    titikAmbilAktif,
    opsiAmbilTersedia,
    opsiAntarTersedia,
    tidakAdaMetode,
  } = useMemo(() => statusMetodePengambilan(po), [po]);

  const masihBuka =
    po.status === "buka" && po.sisa_kuota > 0 && !tidakAdaMetode && !batchKadaluarsa;
  const maksPerOrder = po.maks_per_order > 0 ? po.maks_per_order : 10;
  const maksTotalCup = Math.max(0, Math.min(maksPerOrder, po.sisa_kuota));
  const maksTopping = po.maks_topping ?? 2;
  const minJamAntar = useMemo(
    () => hitungMinTimePickerWib(cfgPembayaran.jamMulaiAntar),
    [cfgPembayaran.jamMulaiAntar],
  );
  const maxJamAntar = cfgPembayaran.jamSelesaiAntar;

  // State Step 1: Individual Cup Configurations (ID awal deterministik untuk mencegah hydration mismatch SSR vs Client)
  const [cups, setCups] = useState<KonfigurasiCup[]>(() => [buatCupBaru("Vanilla", "cup-initial-1")]);
  const [cupErrors, setCupErrors] = useState<Record<string, { rasa?: string; topping?: string }>>({});
  const [step1GlobalError, setStep1GlobalError] = useState<string | null>(null);

  // State Step 2: Metode Pengambilan (Tersinkronisasi dengan pengaturan aktif admin)
  const statusAwal = useMemo(() => statusMetodePengambilan(poAwal), [poAwal]);
  const [fulfillment, setFulfillment] = useState<Fulfillment>(
    statusAwal.opsiAmbilTersedia ? "ambil" : "antar",
  );
  const [pickupPointId, setPickupPointId] = useState<string>(
    statusAwal.opsiAmbilTersedia && statusAwal.titikAmbilAktif.length >= 1
      ? statusAwal.titikAmbilAktif[0].id
      : "",
  );
  const [pelangganSudahPilihAmbil, setPelangganSudahPilihAmbil] = useState(false);
  const [alamat, setAlamat] = useState("");
  const [patokan, setPatokan] = useState("");
  const [kontakAntar, setKontakAntar] = useState("");
  const [jamAntar, setJamAntar] = useState("");
  const [step2Errors, setStep2Errors] = useState<{
    fulfillment?: string;
    pickupPointId?: string;
    alamat?: string;
    jamAntar?: string;
    kontakAntar?: string;
  }>({});

  // State Step 3: Data Pemesan
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [asal, setAsal] = useState<string>("Mahasiswa");
  const [catatan, setCatatan] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [step3Errors, setStep3Errors] = useState<{
    nama?: string;
    wa?: string;
    asal?: string;
    catatan?: string;
  }>({});

  // State Step 4: Metode Pembayaran & Bukti Bayar
  const [metodeBayar, setMetodeBayar] = useState<MetodePembayaran>("qris");
  const [zoomQris, setZoomQris] = useState(false);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const buktiPreviewRef = useRef<string | null>(null);
  const [unggahSekarang, setUnggahSekarang] = useState(true);
  const [step4Error, setStep4Error] = useState<string | null>(null);

  // State Step 5: Review & Submit
  const [setujuReview, setSetujuReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tahapSubmit, setTahapSubmit] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // State Step 6: Order Success
  const [suksesData, setSuksesData] = useState<HasilPesananSukses | null>(null);

  // Sinkronisasi session sukses checkout agar jika pengguna me-refresh halaman pada tahap 06 (Selesai),
  // tampilan konfirmasi tetap utuh tanpa membuat pesanan duplikat.
  const rawSuksesSession = useSyncExternalStore(noop, bacaSuksesCheckoutMentah, () => "");
  const suksesDariSession = useMemo(
    () => parseSuksesCheckout(rawSuksesSession, po.id),
    [rawSuksesSession, po.id],
  );
  const suksesTampil = suksesData ?? suksesDariSession;
  const stepTampil: CheckoutStep = suksesTampil ? 6 : step;

  // Bebaskan blob URL bukti bayar saat unmount
  useEffect(() => {
    return () => {
      if (buktiPreviewRef.current) URL.revokeObjectURL(buktiPreviewRef.current);
    };
  }, []);

  const totalCup = useMemo(
    () => cups.reduce((sum, c) => sum + (Number(c.qty) || 0), 0),
    [cups],
  );
  const subtotal = totalCup * po.harga;
  const biayaTambahan = 0; // Biaya pengiriman dikonfirmasi admin jika tidak ada tarif tetap
  const totalHarga = subtotal + biayaTambahan;

  const titikTerpilih = useMemo(
    () => titikAmbilAktif.find((t) => t.id === pickupPointId) ?? null,
    [titikAmbilAktif, pickupPointId],
  );

  function scrollKeAtasForm() {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /**
   * Evaluasi ulang pilihan metode pengambilan terhadap data PO terbaru dari database.
   * Jika pelanggan sebelumnya sudah memilih pickup tetapi admin kemudian menonaktifkannya,
   * tampilkan pesan validasi dan arahkan pelanggan untuk memilih metode yang masih tersedia.
   */
  function evaluasiSinkronisasiPengambilan(
    poBaru: PoInfoAda,
    paksaPeringatan = false,
  ): boolean {
    const st = statusMetodePengambilan(poBaru);

    if (st.tidakAdaMetode) {
      setStep2Errors((prev) => ({
        ...prev,
        fulfillment:
          "Pemesanan belum dapat dilakukan karena seluruh metode pengambilan dan pengantaran sedang dinonaktifkan oleh admin.",
      }));
      return false;
    }

    if (fulfillment === "ambil") {
      if (!st.opsiAmbilTersedia) {
        setFulfillment("antar");
        setPickupPointId("");
        if (pelangganSudahPilihAmbil || step >= 2 || paksaPeringatan) {
          const msg =
            "Opsi Ambil di Titik Kumpul baru saja dinonaktifkan oleh admin. Silakan gunakan metode pengambilan yang masih tersedia (Diantar ke Lokasi) dan lengkapi detail pengantaran.";
          setStep2Errors((prev) => ({ ...prev, fulfillment: msg, pickupPointId: undefined }));
          toast.error("Opsi Ambil di Titik Kumpul telah dinonaktifkan admin. Silakan pilih metode yang tersedia.");
          if (step > 2 && step < 6) {
            setStep(2);
            scrollKeAtasForm();
          }
          return false;
        }
      } else {
        const masihAdaTitik = st.titikAmbilAktif.some((t) => t.id === pickupPointId);
        if (pickupPointId && !masihAdaTitik) {
          if (pelangganSudahPilihAmbil || step >= 2 || paksaPeringatan) {
            setPickupPointId("");
            const msg =
              "Titik pengambilan yang dipilih sebelumnya baru saja dinonaktifkan oleh admin. Silakan pilih lokasi titik kumpul lain yang masih aktif.";
            setStep2Errors((prev) => ({ ...prev, pickupPointId: msg }));
            toast.error("Titik pengambilan yang dipilih sudah tidak aktif. Silakan pilih lokasi lain.");
            if (step > 2 && step < 6) {
              setStep(2);
              scrollKeAtasForm();
            }
            return false;
          }
          setPickupPointId(st.titikAmbilAktif[0]?.id ?? "");
        } else if (!pickupPointId && st.titikAmbilAktif.length > 0 && !pelangganSudahPilihAmbil) {
          setPickupPointId(st.titikAmbilAktif[0].id);
        }
      }
    } else if (fulfillment === "antar" && !st.opsiAntarTersedia && st.opsiAmbilTersedia) {
      setFulfillment("ambil");
      setPickupPointId(st.titikAmbilAktif[0]?.id ?? "");
      if (step >= 2 || paksaPeringatan) {
        const msg =
          "Opsi Diantar ke Lokasi baru saja dinonaktifkan oleh admin. Silakan pilih titik pengambilan yang tersedia.";
        setStep2Errors((prev) => ({ ...prev, fulfillment: msg }));
        toast.error(msg);
        if (step > 2 && step < 6) {
          setStep(2);
          scrollKeAtasForm();
        }
        return false;
      }
    } else if (fulfillment === "antar" && st.opsiAntarTersedia && jamAntar.trim()) {
      const errJamBaru = pesanErrorJamAntarWib(
        jamAntar,
        st.cfg.jamMulaiAntar,
        st.cfg.jamSelesaiAntar,
      );
      if (errJamBaru) {
        setStep2Errors((prev) => ({ ...prev, jamAntar: errJamBaru }));
        if (step >= 2 || paksaPeringatan) {
          toast.error(errJamBaru);
          if (step > 2 && step < 6) {
            setStep(2);
            scrollKeAtasForm();
          }
          return false;
        }
      }
    }

    return true;
  }

  // Sinkronisasi otomatis saat tab kembali fokus agar perubahan pengaturan admin langsung tercermin
  useEffect(() => {
    if (stepTampil === 6) return;
    function onFocus() {
      void ambilPoInfo().then((res) => {
        if (res.data?.ada_po && terapkanPoBaru(res.data)) {
          evaluasiSinkronisasiPengambilan(res.data, false);
        }
      });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepTampil, fulfillment, pickupPointId, pelangganSudahPilihAmbil, jamAntar]);

  // ---------- Handlers Step 1 ----------
  function updateCup(id: string, patch: Partial<KonfigurasiCup>) {
    setCups((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setCupErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStep1GlobalError(null);
  }

  function tambahCup() {
    if (cups.length >= MAKS_BARIS_ITEM || totalCup >= maksTotalCup) return;
    setCups((prev) => [...prev, buatCupBaru(rasaOptions[0] ?? "Vanilla")]);
  }

  function duplikatCup(cup: KonfigurasiCup) {
    if (cups.length >= MAKS_BARIS_ITEM || totalCup >= maksTotalCup) {
      toast.error(`Batas maksimal cup (${maksTotalCup} cup) sudah tercapai.`);
      return;
    }
    const salinan: KonfigurasiCup = {
      ...cup,
      id: crypto.randomUUID(),
      rasaMix: [...cup.rasaMix],
      topping: [...cup.topping],
      qty: 1,
    };
    setCups((prev) => [...prev, salinan]);
    toast.success("Konfigurasi cup berhasil diduplikasi");
  }

  function hapusCup(id: string) {
    if (cups.length <= 1) return;
    setCups((prev) => prev.filter((c) => c.id !== id));
    toast.success("Cup dihapus dari daftar pesanan");
  }

  // ---------- Handlers Step 4 (Bukti Bayar) ----------
  function gantiBuktiFile(f: File | null) {
    if (buktiPreviewRef.current) URL.revokeObjectURL(buktiPreviewRef.current);
    buktiPreviewRef.current = f ? URL.createObjectURL(f) : null;
    setBuktiFile(f);
    setBuktiPreview(buktiPreviewRef.current);
    setStep4Error(null);
  }

  function onPilihBukti(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!(f.type in TIPE_BUKTI_DIIZINKAN)) {
      gantiBuktiFile(null);
      setStep4Error("Format file harus JPG, JPEG, PNG, atau WebP.");
      toast.error("Format file harus JPG, JPEG, PNG, atau WebP.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      gantiBuktiFile(null);
      setStep4Error("Ukuran file terlalu besar (maksimal 15 MB sebelum kompresi).");
      toast.error("Ukuran file terlalu besar.");
      return;
    }
    gantiBuktiFile(f);
  }

  // ---------- Validasi Per Tahap ----------
  function validasiStep1(): boolean {
    const errs: Record<string, { rasa?: string; topping?: string }> = {};
    let valid = true;

    if (cups.length === 0 || totalCup < 1) {
      setStep1GlobalError("Pilih minimal 1 cup pudding.");
      return false;
    }
    if (totalCup > maksTotalCup) {
      setStep1GlobalError(`Total cup (${totalCup}) melebihi batas maksimal (${maksTotalCup} cup).`);
      return false;
    }

    for (const c of cups) {
      const cErr: { rasa?: string; topping?: string } = {};
      if (c.mode === "single") {
        if (!c.rasaTunggal.trim()) {
          cErr.rasa = "Pilih salah satu rasa pudding.";
          valid = false;
        }
      } else {
        if (c.rasaMix.length < 2) {
          cErr.rasa = "Pada mode Mix, pilih minimal 2 rasa untuk digabungkan.";
          valid = false;
        }
      }
      if (c.topping.length > maksTopping) {
        cErr.topping = `Maksimal ${maksTopping} topping per cup.`;
        valid = false;
      }
      if (cErr.rasa || cErr.topping) {
        errs[c.id] = cErr;
      }
    }

    setCupErrors(errs);
    if (!valid) {
      toast.error("Lengkapi pilihan rasa pada setiap cup terlebih dahulu.");
    } else {
      setStep1GlobalError(null);
    }
    return valid;
  }

  function validasiStep2(): boolean {
    const errs: typeof step2Errors = {};
    let valid = true;

    if (tidakAdaMetode) {
      errs.fulfillment =
        "Pemesanan belum dapat dilakukan karena metode pengambilan maupun pengantaran belum tersedia pada batch ini.";
      setStep2Errors(errs);
      toast.error("Pemesanan belum dapat dilakukan karena metode pengambilan belum tersedia.");
      return false;
    }

    if (fulfillment === "ambil") {
      if (!opsiAmbilTersedia) {
        if (opsiAntarTersedia) setFulfillment("antar");
        errs.fulfillment =
          "Opsi Ambil di Titik Kumpul sedang tidak aktif. Silakan pilih metode pengambilan yang masih tersedia.";
        valid = false;
      } else if (!pickupPointId || !titikAmbilAktif.some((t) => t.id === pickupPointId)) {
        errs.pickupPointId = "Pilih salah satu lokasi titik pengambilan yang aktif.";
        valid = false;
      }
    } else {
      if (!opsiAntarTersedia) {
        if (opsiAmbilTersedia) setFulfillment("ambil");
        errs.fulfillment =
          "Opsi Diantar ke Lokasi sedang tidak aktif. Silakan pilih metode pengambilan yang masih tersedia.";
        valid = false;
      }
      if (alamat.trim().length < 5) {
        errs.alamat = "Alamat pengiriman wajib diisi dengan jelas (minimal 5 karakter).";
        valid = false;
      }
      const errJam = pesanErrorJamAntarWib(
        jamAntar,
        cfgPembayaran.jamMulaiAntar,
        cfgPembayaran.jamSelesaiAntar,
      );
      if (errJam) {
        errs.jamAntar = errJam;
        valid = false;
      }
      if (kontakAntar.trim() && !waValid(kontakAntar.trim())) {
        errs.kontakAntar = "Nomor kontak penerima tidak valid (contoh: 081234567890).";
        valid = false;
      }
    }

    setStep2Errors(errs);
    if (!valid) {
      toast.error(
        errs.fulfillment ??
          errs.jamAntar ??
          errs.pickupPointId ??
          "Lengkapi informasi pengambilan/pengantaran terlebih dahulu.",
      );
    }
    return valid;
  }

  function validasiStep3(): boolean {
    const errs: typeof step3Errors = {};
    let valid = true;

    if (nama.trim().length < 2) {
      errs.nama = "Nama lengkap wajib diisi (minimal 2 karakter).";
      valid = false;
    } else if (nama.trim().length > 80) {
      errs.nama = "Nama maksimal 80 karakter.";
      valid = false;
    }

    if (!wa.trim()) {
      errs.wa = "Nomor WhatsApp wajib diisi.";
      valid = false;
    } else if (!waValid(wa.trim())) {
      errs.wa = "Nomor WhatsApp Indonesia tidak valid. Contoh: 081234567890";
      valid = false;
    }

    if (!asal || !(ASAL_OPTIONS as readonly string[]).includes(asal)) {
      errs.asal = "Pilih kategori pelanggan.";
      valid = false;
    }

    if (catatan.trim().length > 250) {
      errs.catatan = "Catatan tambahan maksimal 250 karakter.";
      valid = false;
    }

    setStep3Errors(errs);
    if (!valid) toast.error("Periksa kembali data pemesan yang diisi.");
    return valid;
  }

  function validasiStep4(): boolean {
    if (metodeBayar === "mandiri" && !cfgPembayaran.mandiri.aktif) {
      setStep4Error("Rekening Mandiri belum diaktifkan oleh admin. Silakan pilih pembayaran QRIS.");
      toast.error("Silakan pilih metode pembayaran QRIS.");
      return false;
    }
    if (unggahSekarang && !buktiFile) {
      setStep4Error(
        "Unggah foto bukti pembayaran terlebih dahulu, atau pilih opsi unggah bukti di halaman status pesanan setelah konfirmasi.",
      );
      toast.error("Unggah bukti pembayaran atau pilih unggah setelah konfirmasi.");
      return false;
    }
    setStep4Error(null);
    return true;
  }

  function lanjutStep() {
    if (step === 1 && !validasiStep1()) return;
    if (step === 2 && !validasiStep2()) return;
    if (step === 3 && !validasiStep3()) return;
    if (step === 4 && !validasiStep4()) return;

    if (step < 5) {
      const nextStep = (step + 1) as CheckoutStep;
      setStep(nextStep);
      scrollKeAtasForm();
      // Segarkan data PO dari database saat memasuki tahap Metode Pengambilan atau Review
      if (nextStep === 2 || nextStep === 5) {
        void ambilPoInfo().then((res) => {
          if (res.data?.ada_po && terapkanPoBaru(res.data)) {
            evaluasiSinkronisasiPengambilan(res.data, nextStep === 5);
          }
        });
      }
    }
  }

  function kembaliStep() {
    if (step > 1 && step < 6) {
      setStep((s) => (s - 1) as CheckoutStep);
      scrollKeAtasForm();
    }
  }

  function lompatKeStep(target: CheckoutStep) {
    if (step === 6 || target >= step) return;
    setStep(target);
    scrollKeAtasForm();
  }

  async function segarkanPo() {
    const res = await ambilPoInfo();
    if (res.data?.ada_po) terapkanPoBaru(res.data);
  }

  async function konfirmasiPesanan() {
    if (submitting) return;
    if (!validasiStep1() || !validasiStep2() || !validasiStep3() || !validasiStep4()) return;
    if (!setujuReview) {
      toast.error("Centang kotak persetujuan terlebih dahulu sebelum mengonfirmasi pesanan.");
      return;
    }

    if (website) {
      toast.success("Pesanan terkirim!");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setTahapSubmit("Memeriksa kuota & menyimpan pesanan…");

    // 1. Periksa kuota & sinkronisasi pengaturan metode pengambilan terbaru dari server sebelum membuat pesanan
    const infoTerbaru = await ambilPoInfo();
    if (infoTerbaru.data?.ada_po) {
      if (!terapkanPoBaru(infoTerbaru.data)) {
        setSubmitting(false);
        setTahapSubmit(null);
        return;
      }
      if (!evaluasiSinkronisasiPengambilan(infoTerbaru.data, true)) {
        setSubmitting(false);
        setTahapSubmit(null);
        return;
      }
      if (infoTerbaru.data.status !== "buka" || infoTerbaru.data.sisa_kuota < totalCup) {
        const msg =
          infoTerbaru.data.sisa_kuota <= 0
            ? "Mohon maaf, kuota batch PO ini baru saja habis."
            : infoTerbaru.data.status !== "buka"
              ? "Mohon maaf, batch PO ini sudah ditutup."
              : `Sisa kuota saat ini hanya ${infoTerbaru.data.sisa_kuota} cup (pesanan kamu ${totalCup} cup). Silakan sesuaikan jumlah cup.`;
        setFormError(msg);
        toast.error(msg);
        setSubmitting(false);
        setTahapSubmit(null);
        return;
      }
    }

    const dbRasaAktif = infoTerbaru.data?.ada_po ? infoTerbaru.data.rasa : po.rasa;
    const dbToppingAktif = infoTerbaru.data?.ada_po ? infoTerbaru.data.topping : po.topping;

    const rpcItems = konversiCupKeRpcItems(cups, dbRasaAktif, dbToppingAktif, maksTopping);
    const catatanLengkap = formatCatatanPesanan({
      metodeBayar,
      cups,
      catatanPelanggan: catatan,
    });
    const alamatLengkap =
      fulfillment === "antar"
        ? formatAlamatAntar({ alamat, patokan, kontakAntar })
        : null;
    const jamAntarTerkirim =
      fulfillment === "antar" ? (normalisasiJamAntarWib(jamAntar) ?? jamAntar.trim()) : null;

    const res = await buatPesanan({
      p_period_id: po.id,
      p_nama: nama.trim(),
      p_wa: wa.trim(),
      p_asal: asal,
      p_fulfillment: fulfillment,
      p_pickup_point_id: fulfillment === "ambil" ? pickupPointId : null,
      p_alamat: alamatLengkap,
      p_jam_antar: jamAntarTerkirim,
      p_catatan: catatanLengkap,
      p_items: rpcItems,
    });

    if (res.error !== null) {
      setFormError(res.error);
      toast.error(res.error);
      setSubmitting(false);
      setTahapSubmit(null);
      await segarkanPo();
      return;
    }

    const { order_id, kode, jumlah_cup, total } = res.data;
    let statusAkhir: OrderStatus = "menunggu_bayar";
    let sudahBukti = false;

    // 2. Jika pelanggan sudah memilih file bukti pembayaran pada Step 4, unggah sekarang
    if (unggahSekarang && buktiFile) {
      try {
        setTahapSubmit("Mengompres & mengunggah bukti pembayaran…");
        const kecil = await imageCompression(buktiFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        const ext = TIPE_BUKTI_DIIZINKAN[kecil.type] ?? "jpg";
        if (kecil.size <= MAKS_BUKTI_BYTE) {
          const path = `${order_id}/${crypto.randomUUID()}.${ext}`;
          const up = await unggahBukti(path, kecil);
          if (!up.error) {
            setTahapSubmit("Menghubungkan bukti pembayaran dengan pesanan…");
            const konf = await kirimBuktiBayar(kode, wa.trim(), path);
            if (!konf.error && konf.data) {
              statusAkhir = konf.data.status;
              sudahBukti = true;
            }
          } else {
            toast.error(`Pesanan tercatat (${kode}), namun bukti bayar gagal diunggah: ${up.error}. Kamu bisa mengunggahnya di halaman ini.`);
          }
        }
      } catch {
        toast.error(`Pesanan ${kode} berhasil dibuat. Silakan unggah ulang bukti bayar pada kartu di bawah.`);
      }
    }

    // 3. Simpan sesi lengkap di sessionStorage agar halaman status pesanan menampilkan rincian cup secara utuh
    simpanSesi({
      kode,
      wa: wa.trim(),
      order_id,
      metode_bayar: metodeBayar,
      catatan_pelanggan: catatan.trim() || undefined,
      patokan: patokan.trim() || undefined,
      kontak_antar: kontakAntar.trim() || undefined,
      cups: cups.map((c, idx) => ({
        nomor: idx + 1,
        labelRasa: labelRasaCup(c),
        isMix: c.mode === "mix",
        rasaMix: c.rasaMix,
        topping: c.topping,
        qty: c.qty,
      })),
    });

    const lokasiTampil =
      fulfillment === "ambil"
        ? titikTerpilih
          ? `${titikTerpilih.nama} (${titikTerpilih.jam})`
          : "Titik Kumpul"
        : `${alamat.trim()}${patokan.trim() ? ` (Patokan: ${patokan.trim()})` : ""} · Jam ${normalisasiJamAntarWib(jamAntar) ?? jamAntar} WIB`;

    const dataHasilSukses: HasilPesananSukses = {
      batchId: po.id,
      orderId: order_id,
      kode,
      jumlahCup: jumlah_cup,
      total,
      status: statusAkhir,
      sudahKirimBukti: sudahBukti,
      metodeBayar,
      fulfillment,
      lokasiTampil,
      nama: nama.trim(),
      wa: wa.trim(),
      cups: [...cups],
    };

    setSuksesData(dataHasilSukses);
    simpanSuksesCheckout(dataHasilSukses);

    // 4. Bersihkan state checkout sementara yang sudah tidak diperlukan setelah pesanan berhasil dibuat
    setNama("");
    setWa("");
    setCatatan("");
    setAlamat("");
    setPatokan("");
    setKontakAntar("");
    setJamAntar("");
    setCups([buatCupBaru(rasaOptions[0] ?? "Vanilla", "cup-initial-1")]);
    setSetujuReview(false);
    gantiBuktiFile(null);
    setCupErrors({});
    setStep1GlobalError(null);
    setStep2Errors({});
    setStep3Errors({});
    setStep4Error(null);
    setFormError(null);

    setSubmitting(false);
    setTahapSubmit(null);
    setStep(6);
    toast.success("Pesanan berhasil dibuat! 🎉");
    await segarkanPo();
    scrollKeAtasForm();
  }

  const persenProgres = Math.round((stepTampil / 6) * 100);

  const ringkasanHargaContent = (
    <div className="min-w-0 w-full space-y-4 rounded-3xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <h3 className="font-heading text-base font-bold text-foreground">Ringkasan Harga</h3>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-primary">
          {totalCup} cup
        </span>
      </div>

      <ul className="divide-y divide-border/60 text-xs sm:text-sm">
        {cups.map((c, i) => (
          <li key={c.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="wrap-break-word font-semibold text-foreground">
                Cup #{i + 1}: {labelRasaCup(c)}
              </p>
              <p className="wrap-break-word text-xs text-muted-foreground">
                {c.topping.length > 0 ? `Topping: ${c.topping.join(", ")}` : "Tanpa topping"} · {c.qty} cup × {rupiah(po.harga)}
              </p>
            </div>
            <span className="shrink-0 text-right font-heading font-bold tabular-nums text-foreground">
              {rupiah(c.qty * po.harga)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 border-t pt-3 text-xs sm:text-sm">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <dt>Harga per cup</dt>
          <dd className="text-right tabular-nums">{rupiah(po.harga)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <dt>Jumlah cup</dt>
          <dd className="text-right tabular-nums">{totalCup} cup</dd>
        </div>
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <dt>Subtotal produk</dt>
          <dd className="text-right tabular-nums">{rupiah(subtotal)}</dd>
        </div>
        {fulfillment === "antar" && (
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <dt>Biaya tambahan (Pengantaran)</dt>
            <dd className="text-right">Dikonfirmasi Admin</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <dt className="font-heading text-sm font-bold text-foreground sm:text-base">Total Sementara</dt>
          <dd className="text-right font-heading text-lg font-extrabold tabular-nums text-primary sm:text-xl">
            {rupiah(totalHarga)}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div ref={topRef} className="relative min-w-0 w-full max-w-full scroll-mt-20 space-y-5 sm:space-y-6">
      {/* Progress Indicator (Ringkas dengan Progress Bar pada Mobile, Stepper Penuh pada Desktop) */}
      <nav
        aria-label="Tahapan pemesanan"
        className="min-w-0 w-full rounded-3xl border bg-card p-4 shadow-xs sm:p-5"
      >
        {/* Tampilan Mobile (< md): Ringkas dengan Nomor Tahap, Nama Tahap, Persentase, dan Progress Bar */}
        <div className="space-y-2.5 md:hidden">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Langkah {STEPS[stepTampil - 1].kode} dari 06
              </p>
              <p className="truncate font-heading text-base font-bold text-foreground">
                {STEPS[stepTampil - 1].label}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#DFC8AC] bg-secondary px-2.5 py-0.5 font-heading text-xs font-bold tabular-nums text-primary">
              {persenProgres}% Complete
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={`Progres checkout langkah ${stepTampil} dari 6`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={persenProgres}
            className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${persenProgres}%` }}
            />
          </div>

          {/* Indikator langkah yang sudah dilewati pada mobile (bisa diklik untuk kembali) */}
          {stepTampil > 1 && stepTampil < 6 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {STEPS.filter((s) => s.nomor < stepTampil).map((s) => (
                <button
                  key={`mob-done-${s.nomor}`}
                  type="button"
                  onClick={() => lompatKeStep(s.nomor)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-secondary"
                >
                  <Check className="size-3 shrink-0" aria-hidden />
                  <span>{s.kode}. {s.pendek}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tampilan Tablet/Desktop (>= md): Stepper 6 Tahap Lengkap */}
        <ol className="hidden md:grid md:grid-cols-6 md:gap-2">
          {STEPS.map((s) => {
            const selesai = stepTampil > s.nomor || (stepTampil === 6 && s.nomor === 6);
            const aktif = stepTampil === s.nomor && stepTampil !== 6;
            const bisaKlik = stepTampil < 6 && s.nomor < stepTampil;

            return (
              <li key={s.nomor} className="flex min-w-0 flex-col items-center">
                <button
                  type="button"
                  disabled={!bisaKlik}
                  onClick={() => bisaKlik && lompatKeStep(s.nomor)}
                  aria-current={aktif ? "step" : undefined}
                  className={cn(
                    "group flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                    bisaKlik ? "cursor-pointer hover:bg-secondary" : "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      selesai && "border-primary bg-primary text-primary-foreground",
                      aktif && "border-brand-pink bg-brand-pink text-white ring-4 ring-brand-pink/20",
                      !selesai && !aktif && "border-border bg-secondary/60 text-muted-foreground",
                    )}
                  >
                    {selesai ? <Check className="size-4" aria-hidden /> : s.kode}
                  </span>
                  <span
                    className={cn(
                      "text-xs leading-tight",
                      aktif ? "font-bold text-foreground" : selesai ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {s.kode}. {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Peringatan jika PO tiba-tiba habis/tutup atau metode pengambilan tidak tersedia */}
      {!masihBuka && stepTampil < 6 && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertCircle className="size-5 shrink-0 text-amber-700" aria-hidden />
          <p className="min-w-0 wrap-break-word">
            {batchKadaluarsa ? (
              <>
                Batch yang kamu pesan sudah tidak aktif atau telah berganti. Silakan{" "}
                <Link href={RUTE.jadwal} className="font-semibold underline underline-offset-4">
                  lihat Jadwal PO
                </Link>{" "}
                untuk memilih batch yang tersedia.
              </>
            ) : tidakAdaMetode ? (
              "Pemesanan belum dapat dilakukan saat ini karena metode pengambilan maupun pengantaran pada batch ini belum tersedia. Silakan hubungi admin."
            ) : po.sisa_kuota <= 0 ? (
              "Kuota batch PO ini sudah habis. Terima kasih atas antusiasmenya!"
            ) : (
              "Batch PO ini sedang tidak menerima pesanan baru."
            )}
          </p>
        </div>
      )}

      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="min-w-0 wrap-break-word">{formError}</p>
        </div>
      )}

      {/* Honeypot anti-bot */}
      <div aria-hidden className="sr-only">
        <label htmlFor="website-hp">Jangan diisi</label>
        <input
          id="website-hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* Layout 2 Kolom pada Desktop (Step 1–5) & 1 Kolom Penuh pada Step 6 */}
      {stepTampil < 6 ? (
        <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Kolom Kiri: Konten Step Aktif */}
          <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-8">
            {/* ==================== STEP 1: PILIH PRODUK ==================== */}
            {stepTampil === 1 && (
              <section aria-labelledby="step1-heading" className="min-w-0 space-y-5">
                {/* Kartu Informasi Produk Utama (Ukuran Foto Ringkas pada Mobile agar Tidak Mendominasi Layar) */}
                <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-xs sm:p-5">
                  <div className="flex items-start gap-3.5 sm:grid sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-4">
                    <div className="relative size-22 shrink-0 overflow-hidden rounded-2xl border bg-secondary sm:aspect-4/5 sm:size-auto sm:w-full">
                      <Image
                        src={produkImg}
                        alt="P'crème Pudding dengan Es Krim dan Topping"
                        fill
                        sizes="(max-width: 640px) 88px, 140px"
                        className="object-cover object-center"
                        placeholder="blur"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground sm:text-xs">
                          <Sparkles className="size-3 shrink-0" aria-hidden /> {po.nama} · Minggu {po.minggu}
                        </span>
                        <span className="font-heading text-base font-bold text-primary sm:text-xl">
                          {rupiah(po.harga)}
                          <span className="text-xs font-normal text-muted-foreground"> / cup</span>
                        </span>
                      </div>
                      <h2 id="step1-heading" className="font-heading text-base font-bold leading-snug text-foreground sm:text-xl">
                        P&apos;crème Signature Pudding &amp; Ice Cream
                      </h2>
                      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        Pilih varian rasa Vanilla, Stroberi, Cokelat, atau <strong>Mix</strong>, ditambah maksimal {maksTopping} topping per cup.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-[11px] sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:text-left sm:text-xs">
                    <span className="rounded-xl border bg-secondary px-2.5 py-1.5 font-medium text-foreground">
                      Kuota: <strong>{po.sisa_kuota}/{po.kuota}</strong>
                    </span>
                    <span className="rounded-xl border bg-secondary px-2.5 py-1.5 font-medium text-foreground">
                      Maks: <strong>{maksTotalCup} cup</strong>
                    </span>
                    <span className="rounded-xl border bg-secondary px-2.5 py-1.5 font-medium text-foreground">
                      Topping: <strong>Maks {maksTopping}</strong>
                    </span>
                  </div>
                </div>

                {/* Daftar Konfigurasi Individual per Cup */}
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        Atur Konfigurasi Setiap Cup
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Setiap cup memiliki pilihan rasa dan topping masing-masing.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tabular-nums text-primary">
                      Total: {totalCup} / {maksTotalCup} cup
                    </span>
                  </div>

                  {cups.map((cup, idx) => (
                    <CupConfiguratorCard
                      key={cup.id}
                      index={idx}
                      cup={cup}
                      hargaPerCup={po.harga}
                      rasaOptions={rasaOptions}
                      toppingOptions={toppingOptions}
                      maksTopping={maksTopping}
                      totalCup={totalCup}
                      maksTotalCup={maksTotalCup}
                      canRemove={cups.length > 1}
                      canDuplicate={cups.length < MAKS_BARIS_ITEM && totalCup < maksTotalCup}
                      errorRasa={cupErrors[cup.id]?.rasa}
                      errorTopping={cupErrors[cup.id]?.topping}
                      onUpdate={(patch) => updateCup(cup.id, patch)}
                      onDuplicate={() => duplikatCup(cup)}
                      onRemove={() => hapusCup(cup.id)}
                    />
                  ))}

                  {step1GlobalError && (
                    <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                      {step1GlobalError}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-12 w-full whitespace-normal rounded-2xl border-2 border-dashed border-primary/35 bg-secondary/50 px-4 py-3 font-heading text-xs font-semibold text-primary hover:bg-secondary sm:text-sm"
                    disabled={!masihBuka || cups.length >= MAKS_BARIS_ITEM || totalCup >= maksTotalCup}
                    onClick={tambahCup}
                  >
                    <Plus className="size-4 shrink-0" aria-hidden />
                    <span>+ Tambah Cup Baru (Rasa / Topping Berbeda)</span>
                  </Button>
                </div>
              </section>
            )}

            {/* ==================== STEP 2: METODE PENGAMBILAN ==================== */}
            {stepTampil === 2 && (
              <section aria-labelledby="step2-heading" className="min-w-0 space-y-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Tahap 02</span>
                  <h2 id="step2-heading" className="font-heading text-xl font-bold text-foreground">
                    Pilih Metode Pengambilan
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jadwal pengambilan batch ini: <strong>{tanggalPanjang(po.tanggal_ambil)}</strong>.
                  </p>
                </div>

                {step2Errors.fulfillment && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-medium text-amber-950 sm:text-sm"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                    <p className="min-w-0 wrap-break-word">{step2Errors.fulfillment}</p>
                  </div>
                )}

                {tidakAdaMetode ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-5 text-center text-sm text-amber-950"
                  >
                    <p className="font-heading text-base font-bold">Pemesanan Belum Dapat Dilakukan</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900 sm:text-sm">
                      Saat ini metode pengambilan di titik kumpul maupun pengantaran ke lokasi belum tersedia pada batch ini. Silakan hubungi admin atau coba kembali beberapa saat lagi.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Pilihan Card Ambil vs Antar (Opsi Ambil Hanya Muncul Jika Diaktifkan Admin & Ada Titik Aktif) */}
                    <div
                      className={cn(
                        "grid gap-3",
                        opsiAmbilTersedia && opsiAntarTersedia ? "sm:grid-cols-2" : "sm:grid-cols-1",
                      )}
                      role="radiogroup"
                      aria-label="Metode pengambilan"
                    >
                      {opsiAmbilTersedia && (
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillment("ambil");
                            setPelangganSudahPilihAmbil(true);
                            if (!pickupPointId && titikAmbilAktif.length > 0) {
                              setPickupPointId(titikAmbilAktif[0].id);
                            }
                            setStep2Errors({});
                          }}
                          className={cn(
                            "flex min-w-0 flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                            fulfillment === "ambil"
                              ? "border-primary bg-secondary/80 shadow-xs"
                              : "border-border bg-card hover:bg-secondary/40",
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <MapPin className="size-5" aria-hidden />
                            </span>
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full border-2",
                                fulfillment === "ambil" ? "border-primary bg-primary text-white" : "border-border",
                              )}
                            >
                              {fulfillment === "ambil" && <Check className="size-3" aria-hidden />}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading text-base font-bold text-foreground">Ambil di Titik Kumpul</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Ambil langsung pesananmu di lokasi titik kumpul PO yang aktif tanpa biaya pengantaran.
                            </p>
                          </div>
                        </button>
                      )}

                      {opsiAntarTersedia && (
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillment("antar");
                            setStep2Errors({});
                          }}
                          className={cn(
                            "flex min-w-0 flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                            fulfillment === "antar" || !opsiAmbilTersedia
                              ? "border-primary bg-secondary/80 shadow-xs"
                              : "border-border bg-card hover:bg-secondary/40",
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-pink/15 text-primary">
                              <Truck className="size-5" aria-hidden />
                            </span>
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full border-2",
                                fulfillment === "antar" || !opsiAmbilTersedia
                                  ? "border-primary bg-primary text-white"
                                  : "border-border",
                              )}
                            >
                              {(fulfillment === "antar" || !opsiAmbilTersedia) && (
                                <Check className="size-3" aria-hidden />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading text-base font-bold text-foreground">Diantar ke Lokasi</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Pesanan diantar ke alamat tujuan pada tanggal pengambilan PO (setelah pukul {cfgPembayaran.jamMulaiAntar} s.d. {cfgPembayaran.jamSelesaiAntar} WIB).
                            </p>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Detail Opsi A: Ambil di Titik Kumpul (Hanya Menampilkan Titik Aktif) */}
                    {opsiAmbilTersedia && fulfillment === "ambil" ? (
                      <div className="space-y-3 pt-2">
                        <div className="rounded-2xl border bg-secondary/50 p-3.5 text-xs text-muted-foreground">
                          <p className="font-semibold text-foreground">
                            📅 Tanggal Pengambilan: {tanggalPanjang(po.tanggal_ambil)}
                          </p>
                          <p className="mt-0.5">
                            Pilih titik kumpul aktif di bawah ini dan tunjukkan kode pesanan saat pengambilan.
                          </p>
                        </div>

                        <fieldset className="space-y-2.5">
                          <legend className="text-sm font-semibold text-foreground">
                            Pilih Lokasi Titik Kumpul ({titikAmbilAktif.length} Lokasi Aktif)
                          </legend>
                          <div className="grid gap-2.5">
                            {titikAmbilAktif.map((t) => {
                              const terpilih = pickupPointId === t.id;
                              return (
                                <label
                                  key={t.id}
                                  className={cn(
                                    "flex min-w-0 cursor-pointer items-start gap-3.5 rounded-2xl border-2 p-4 transition-all",
                                    terpilih
                                      ? "border-primary bg-accent/50 shadow-xs"
                                      : "border-border bg-card hover:bg-secondary/40",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name="pickup_point_id"
                                    value={t.id}
                                    checked={terpilih}
                                    onChange={() => {
                                      setPickupPointId(t.id);
                                      setPelangganSudahPilihAmbil(true);
                                      setStep2Errors((prev) => ({
                                        ...prev,
                                        pickupPointId: undefined,
                                        fulfillment: undefined,
                                      }));
                                    }}
                                    className="mt-1 size-4 shrink-0 accent-primary"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="wrap-break-word font-heading text-sm font-bold text-foreground">
                                      {t.nama}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
                                        {tanggalPanjang(po.tanggal_ambil)}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="size-3.5 shrink-0 text-primary" aria-hidden />
                                        Jam Ambil: <strong>{t.jam}</strong>
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          {step2Errors.pickupPointId && (
                            <p role="alert" className="text-xs font-medium text-destructive">
                              {step2Errors.pickupPointId}
                            </p>
                          )}
                        </fieldset>
                      </div>
                    ) : (
                      /* Detail Opsi B: Diantar ke Lokasi (Validasi Jam Sesuai Konfigurasi Batch di Database) */
                      opsiAntarTersedia && (
                        <div className="space-y-4 pt-2">
                          <div className="rounded-2xl border border-primary/20 bg-secondary/70 p-3.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <p className="font-semibold text-foreground">Informasi &amp; Jam Pengantaran (WIB)</p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-card px-2.5 py-0.5 text-[11px] font-bold text-primary">
                                <Clock className="size-3" aria-hidden />
                                Setelah {cfgPembayaran.jamMulaiAntar} s.d. {cfgPembayaran.jamSelesaiAntar} WIB ({minJamAntar}–{maxJamAntar} WIB)
                              </span>
                            </div>
                            <p className="mt-1.5 text-muted-foreground">
                              {cfgPembayaran.infoPengantaran
                                ? cfgPembayaran.infoPengantaran
                                : `Pengantaran dilakukan pada ${tanggalPanjang(po.tanggal_ambil)} setelah pukul ${cfgPembayaran.jamMulaiAntar} hingga pukul ${cfgPembayaran.jamSelesaiAntar} WIB (${minJamAntar}–${maxJamAntar} WIB). Informasi biaya pengiriman (jika ada) dikonfirmasi admin melalui WhatsApp sesuai jarak lokasi.`}
                            </p>
                          </div>

                          <Field
                            id="alamat-antar"
                            label="Alamat Pengiriman Lengkap"
                            hint="Tulis nama jalan, gedung, kos, atau nomor rumah secara lengkap."
                            error={step2Errors.alamat}
                          >
                            <Textarea
                              id="alamat-antar"
                              rows={3}
                              placeholder="Contoh: Kos Putri Melati Kamar 12, Jl. Telekomunikasi No. 5"
                              value={alamat}
                              onChange={(e) => {
                                setAlamat(e.target.value);
                                if (step2Errors.alamat) setStep2Errors((p) => ({ ...p, alamat: undefined }));
                              }}
                              aria-invalid={!!step2Errors.alamat}
                              aria-describedby={describedBy("alamat-antar", "hint", step2Errors.alamat)}
                            />
                          </Field>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                              id="patokan-antar"
                              label="Patokan Lokasi"
                              optional
                              hint="Contoh: Sebelah Indomaret / Pagar hitam"
                            >
                              <Input
                                id="patokan-antar"
                                className="h-11"
                                placeholder="Ciri bangunan atau patokan"
                                value={patokan}
                                onChange={(e) => setPatokan(e.target.value)}
                              />
                            </Field>

                            <div className="space-y-1.5">
                              <Field
                                id="jam-antar"
                                label="Jam Pengantaran (WIB)"
                                hint={`Tersedia pukul ${minJamAntar}–${maxJamAntar} WIB (setelah pukul ${cfgPembayaran.jamMulaiAntar} s.d. ${cfgPembayaran.jamSelesaiAntar} WIB)`}
                                error={step2Errors.jamAntar}
                              >
                                <div className="relative flex items-center">
                                  <Input
                                    id="jam-antar"
                                    type="time"
                                    min={minJamAntar}
                                    max={maxJamAntar}
                                    step={60}
                                    lang="id-ID"
                                    className="h-11 pr-14 font-medium tabular-nums"
                                    value={jamAntar}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setJamAntar(val);
                                      const errJam = val.trim()
                                        ? pesanErrorJamAntarWib(
                                            val,
                                            cfgPembayaran.jamMulaiAntar,
                                            cfgPembayaran.jamSelesaiAntar,
                                          )
                                        : undefined;
                                      setStep2Errors((p) => ({
                                        ...p,
                                        jamAntar: errJam ?? undefined,
                                        fulfillment: undefined,
                                      }));
                                    }}
                                    onBlur={() => {
                                      if (!jamAntar.trim()) return;
                                      const errJam = pesanErrorJamAntarWib(
                                        jamAntar,
                                        cfgPembayaran.jamMulaiAntar,
                                        cfgPembayaran.jamSelesaiAntar,
                                      );
                                      setStep2Errors((p) => ({ ...p, jamAntar: errJam ?? undefined }));
                                    }}
                                    aria-invalid={!!step2Errors.jamAntar}
                                    aria-describedby={describedBy("jam-antar", "hint", step2Errors.jamAntar)}
                                  />
                                  <span className="pointer-events-none absolute right-3 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                                    WIB
                                  </span>
                                </div>
                              </Field>
                              {jamAntar.trim() &&
                                !step2Errors.jamAntar &&
                                !pesanErrorJamAntarWib(
                                  jamAntar,
                                  cfgPembayaran.jamMulaiAntar,
                                  cfgPembayaran.jamSelesaiAntar,
                                ) && (
                                  <p className="text-xs font-medium text-emerald-700">
                                    ✓ Jam pengantaran sesuai: <strong>{normalisasiJamAntarWib(jamAntar)} WIB</strong>
                                  </p>
                                )}
                            </div>
                          </div>

                          <Field
                            id="kontak-antar"
                            label="Nomor Kontak Penerima"
                            optional
                            hint="Isi jika penerima berbeda dengan nomor WhatsApp pemesan"
                            error={step2Errors.kontakAntar}
                          >
                            <Input
                              id="kontak-antar"
                              type="tel"
                              inputMode="tel"
                              className="h-11"
                              placeholder="081234567890"
                              value={kontakAntar}
                              onChange={(e) => {
                                setKontakAntar(e.target.value);
                                if (step2Errors.kontakAntar) setStep2Errors((p) => ({ ...p, kontakAntar: undefined }));
                              }}
                              aria-invalid={!!step2Errors.kontakAntar}
                            />
                          </Field>
                        </div>
                      )
                    )}
                  </>
                )}
              </section>
            )}

            {/* ==================== STEP 3: DATA PEMESAN ==================== */}
            {stepTampil === 3 && (
              <section aria-labelledby="step3-heading" className="space-y-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Tahap 03</span>
                  <h2 id="step3-heading" className="font-heading text-xl font-bold text-foreground">
                    Data Pemesan
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Isi nama dan nomor WhatsApp aktif untuk konfirmasi serta pelacakan status pesanan.
                  </p>
                </div>

                <Field id="nama-pemesan" label="Nama Lengkap" error={step3Errors.nama}>
                  <Input
                    id="nama-pemesan"
                    autoComplete="name"
                    placeholder="Masukkan nama lengkap kamu"
                    className="h-11"
                    value={nama}
                    onChange={(e) => {
                      setNama(e.target.value);
                      if (step3Errors.nama) setStep3Errors((p) => ({ ...p, nama: undefined }));
                    }}
                    aria-invalid={!!step3Errors.nama}
                    aria-describedby={describedBy("nama-pemesan", undefined, step3Errors.nama)}
                  />
                </Field>

                <div className="space-y-1.5">
                  <Field
                    id="wa-pemesan"
                    label="Nomor WhatsApp"
                    hint="Contoh format: 081234567890 atau +6281234567890"
                    error={step3Errors.wa}
                  >
                    <Input
                      id="wa-pemesan"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="081234567890"
                      className="h-11"
                      value={wa}
                      onChange={(e) => {
                        setWa(e.target.value);
                        if (step3Errors.wa) setStep3Errors((p) => ({ ...p, wa: undefined }));
                      }}
                      aria-invalid={!!step3Errors.wa}
                      aria-describedby={describedBy("wa-pemesan", "hint", step3Errors.wa)}
                    />
                  </Field>
                  {waValid(wa) && (
                    <p className="text-xs text-emerald-700">
                      ✓ Nomor terformat: <strong>{tampilWa(wa)}</strong> (WhatsApp: +{normalisasiWa(wa)})
                    </p>
                  )}
                </div>

                <fieldset className="space-y-2.5">
                  <legend className="text-sm font-medium text-foreground">Asal / Kategori Pelanggan</legend>
                  <div className="flex flex-wrap gap-2">
                    {ASAL_OPTIONS.map((a) => (
                      <ChoiceChip
                        key={a}
                        type="radio"
                        name="asal-pelanggan"
                        value={a}
                        checked={asal === a}
                        onChange={() => {
                          setAsal(a);
                          if (step3Errors.asal) setStep3Errors((p) => ({ ...p, asal: undefined }));
                        }}
                      >
                        {a}
                      </ChoiceChip>
                    ))}
                  </div>
                  {step3Errors.asal && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {step3Errors.asal}
                    </p>
                  )}
                </fieldset>

                <Field
                  id="catatan-tambahan"
                  label="Catatan Tambahan"
                  optional
                  hint="Tulis permintaan khusus jika ada"
                  error={step3Errors.catatan}
                >
                  <Textarea
                    id="catatan-tambahan"
                    rows={3}
                    placeholder="Contoh: Tolong pisahkan sendok atau hubungi saat sudah sampai di depan"
                    value={catatan}
                    onChange={(e) => {
                      setCatatan(e.target.value);
                      if (step3Errors.catatan) setStep3Errors((p) => ({ ...p, catatan: undefined }));
                    }}
                    aria-invalid={!!step3Errors.catatan}
                  />
                </Field>
              </section>
            )}

            {/* ==================== STEP 4: METODE PEMBAYARAN ==================== */}
            {stepTampil === 4 && (
              <section aria-labelledby="step4-heading" className="space-y-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Tahap 04</span>
                  <h2 id="step4-heading" className="font-heading text-xl font-bold text-foreground">
                    Pilih Metode Pembayaran
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Total yang harus dibayar:{" "}
                    <strong className="font-heading text-base text-primary">{rupiah(totalHarga)}</strong> ({totalCup} cup)
                  </p>
                </div>

                {/* Pilihan Metode Pembayaran: QRIS vs Transfer Bank Mandiri */}
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Metode pembayaran">
                  {/* Card QRIS */}
                  <button
                    type="button"
                    onClick={() => {
                      setMetodeBayar("qris");
                      setStep4Error(null);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                      metodeBayar === "qris"
                        ? "border-primary bg-secondary/80 shadow-xs"
                        : "border-border bg-card hover:bg-secondary/40",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900">
                        <QrCode className="size-4" aria-hidden /> QRIS Resmi
                      </span>
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border-2",
                          metodeBayar === "qris" ? "border-primary bg-primary text-white" : "border-border",
                        )}
                      >
                        {metodeBayar === "qris" && <Check className="size-3" aria-hidden />}
                      </span>
                    </div>
                    <div>
                      <p className="font-heading text-base font-bold text-foreground">QRIS P&apos;crème</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Scan melalui GoPay, OVO, Dana, ShopeePay, Livin&apos; Mandiri, BCA Mobile, atau m-banking lainnya.
                      </p>
                    </div>
                  </button>

                  {/* Card Transfer Bank Mandiri */}
                  <button
                    type="button"
                    disabled={!cfgPembayaran.mandiri.aktif}
                    onClick={() => {
                      if (!cfgPembayaran.mandiri.aktif) return;
                      setMetodeBayar("mandiri");
                      setStep4Error(null);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                      metodeBayar === "mandiri"
                        ? "border-primary bg-secondary/80 shadow-xs"
                        : "border-border bg-card hover:bg-secondary/40",
                      !cfgPembayaran.mandiri.aktif && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-950">
                        <Building2 className="size-4" aria-hidden /> Bank Mandiri
                      </span>
                      {cfgPembayaran.mandiri.aktif ? (
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border-2",
                            metodeBayar === "mandiri" ? "border-primary bg-primary text-white" : "border-border",
                          )}
                        >
                          {metodeBayar === "mandiri" && <Check className="size-3" aria-hidden />}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Belum Diatur Admin
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-heading text-base font-bold text-foreground">Transfer Bank Mandiri</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cfgPembayaran.mandiri.aktif
                          ? `Rekening ${cfgPembayaran.mandiri.nomorRekening} a.n. ${cfgPembayaran.mandiri.atasNama}`
                          : "Nomor rekening Mandiri sedang disiapkan admin. Gunakan QRIS yang mendukung Livin' by Mandiri & semua bank."}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Detail Pembayaran Terpilih */}
                {metodeBayar === "qris" ? (
                  <div className="space-y-4 rounded-3xl border bg-secondary/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Merchant Resmi QRIS
                        </p>
                        <h3 className="font-heading text-lg font-bold text-foreground">
                          P&apos;CREME · NMID: ID1026635613858
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Nominal Pembayaran</p>
                        <p className="font-heading text-xl font-bold text-primary">{rupiah(totalHarga)}</p>
                      </div>
                    </div>

                    <div className="grid items-center gap-5 sm:grid-cols-[13rem_1fr]">
                      <div className="mx-auto w-full max-w-52 space-y-2">
                        <button
                          type="button"
                          onClick={() => setZoomQris(true)}
                          className="group relative block w-full overflow-hidden rounded-2xl border bg-white p-1.5 shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                          aria-label="Perbesar gambar QRIS P'crème"
                        >
                          <Image
                            src={qrisImg}
                            alt="QRIS P'CREME (NMID: ID1026635613858)"
                            className="h-auto w-full rounded-xl object-contain"
                            sizes="220px"
                          />
                          <span className="mt-1.5 flex items-center justify-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                            <Maximize2 className="size-3.5" aria-hidden /> Perbesar QRIS
                          </span>
                        </button>
                      </div>

                      <div className="space-y-3 text-sm">
                        <p className="font-heading font-semibold text-foreground">Instruksi Pembayaran QRIS:</p>
                        <ol className="list-inside list-decimal space-y-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          <li>Buka aplikasi m-banking (Livin&apos; Mandiri, BCA, BRI, BNI) atau e-wallet (GoPay, OVO, Dana, ShopeePay).</li>
                          <li>
                            Scan kode QRIS <strong>P&apos;CREME</strong> di samping (atau klik <strong>Perbesar QRIS</strong>).
                          </li>
                          <li>
                            Masukkan nominal sesuai total pesanan: <strong className="text-foreground">{rupiah(totalHarga)}</strong>.
                          </li>
                          <li>Simpan screenshot/foto bukti pembayaran yang berhasil, lalu unggah di bawah ini.</li>
                        </ol>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-full"
                            onClick={() => setZoomQris(true)}
                          >
                            <Maximize2 className="size-3.5" aria-hidden /> Perbesar QRIS
                          </Button>
                          <CopyButton text={String(totalHarga)} label="Salin Nominal" className="h-9 rounded-full text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-3xl border bg-secondary/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 font-heading text-xs font-extrabold text-amber-950">
                          MANDIRI
                        </span>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Transfer Bank Mandiri</p>
                          <h3 className="font-heading text-base font-bold text-foreground">
                            a.n. {cfgPembayaran.mandiri.atasNama}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Transfer</p>
                        <p className="font-heading text-xl font-bold text-primary">{rupiah(totalHarga)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3.5">
                      <div>
                        <p className="text-xs text-muted-foreground">Nomor Rekening Mandiri</p>
                        <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                          {cfgPembayaran.mandiri.nomorRekening}
                        </p>
                      </div>
                      <CopyButton
                        text={cfgPembayaran.mandiri.nomorRekening}
                        label="Salin Nomor Rekening"
                        className="h-10 rounded-full text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">Instruksi Transfer Mandiri:</p>
                      <ol className="list-inside list-decimal space-y-1">
                        <li>Salin nomor rekening Bank Mandiri di atas.</li>
                        <li>Pastikan nama penerima sesuai: <strong>{cfgPembayaran.mandiri.atasNama}</strong>.</li>
                        <li>Transfer tepat sebesar <strong>{rupiah(totalHarga)}</strong>.</li>
                        <li>Simpan dan unggah bukti transfer di bawah ini.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Bagian Upload Bukti Pembayaran */}
                <div className="space-y-3 rounded-3xl border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading text-sm font-bold text-foreground">
                        Bukti Pembayaran
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Format JPG, JPEG, PNG, atau WebP (maks 5 MB). Status pembayaran akan diverifikasi manual oleh admin.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      Verifikasi Manual Admin
                    </span>
                  </div>

                  {/* Opsi Unggah Sekarang vs Unggah Setelah Dapat Kode */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3 text-xs font-medium transition-colors",
                        unggahSekarang ? "border-primary bg-secondary" : "bg-card hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="waktu-unggah"
                        checked={unggahSekarang}
                        onChange={() => {
                          setUnggahSekarang(true);
                          setStep4Error(null);
                        }}
                        className="size-4 accent-primary"
                      />
                      <span>Unggah bukti bayar sekarang (Direkomendasikan)</span>
                    </label>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3 text-xs font-medium transition-colors",
                        !unggahSekarang ? "border-primary bg-secondary" : "bg-card hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="waktu-unggah"
                        checked={!unggahSekarang}
                        onChange={() => {
                          setUnggahSekarang(false);
                          setStep4Error(null);
                        }}
                        className="size-4 accent-primary"
                      />
                      <span>Unggah sesaat setelah pesanan dibuat</span>
                    </label>
                  </div>

                  {unggahSekarang ? (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-95 has-focus-visible:ring-3 has-focus-visible:ring-ring/60">
                          <ImagePlus className="size-4" aria-hidden />
                          {buktiFile ? "Ganti Foto Bukti Bayar" : "Pilih Foto Bukti Bayar"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={onPilihBukti}
                          />
                        </label>
                        {buktiFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-full text-xs text-destructive"
                            onClick={() => gantiBuktiFile(null)}
                          >
                            <X className="size-3.5" aria-hidden /> Hapus Foto
                          </Button>
                        )}
                      </div>

                      {buktiPreview && buktiFile && (
                        <div className="space-y-2 rounded-2xl border bg-muted/50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                            <span className="min-w-0 truncate font-medium text-foreground">{buktiFile.name}</span>
                            <span className="shrink-0 font-semibold text-emerald-700">✓ Siap diunggah saat konfirmasi</span>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal */}
                          <img
                            src={buktiPreview}
                            alt="Pratinjau bukti pembayaran"
                            className="mx-auto max-h-64 rounded-xl object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
                      Pesanan kamu akan berstatus <strong>Pending Payment (Menunggu Pembayaran)</strong>. Setelah menekan Konfirmasi Pesanan pada tahap berikutnya, kamu dapat langsung mengunggah bukti pembayaran di halaman konfirmasi atau halaman Cek Status Pesanan.
                    </p>
                  )}

                  {step4Error && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {step4Error}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ==================== STEP 5: REVIEW PESANAN ==================== */}
            {stepTampil === 5 && (
              <section aria-labelledby="step5-heading" className="min-w-0 space-y-5 rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Tahap 05</span>
                  <h2 id="step5-heading" className="font-heading text-xl font-bold text-foreground">
                    Review Detail Pesanan
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Periksa kembali seluruh detail pesanan kamu sebelum mengonfirmasi.
                  </p>
                </div>

                {/* 1. Ringkasan Produk & Cup */}
                <div className="min-w-0 space-y-3 rounded-2xl border bg-secondary/40 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 font-heading text-sm font-bold text-foreground">
                      <Package className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate">Detail Cup ({totalCup} cup · {po.nama})</span>
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-primary"
                      onClick={() => lompatKeStep(1)}
                    >
                      <Edit3 className="size-3.5" aria-hidden /> Ubah
                    </Button>
                  </div>
                  <ul className="divide-y rounded-xl border bg-card px-3.5">
                    {cups.map((c, idx) => (
                      <li key={c.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="wrap-break-word font-semibold text-foreground">
                            Cup #{idx + 1}: {labelRasaCup(c)}
                          </p>
                          <p className="wrap-break-word text-xs text-muted-foreground">
                            {c.topping.length > 0 ? `Topping: ${c.topping.join(", ")}` : "Tanpa topping"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right tabular-nums">
                          <span className="font-semibold text-foreground">{c.qty} cup</span>
                          <span className="block text-xs text-muted-foreground">
                            {rupiah(c.qty * po.harga)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Ringkasan Pengambilan */}
                <div className="min-w-0 space-y-2 rounded-2xl border bg-secondary/40 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 font-heading text-sm font-bold text-foreground">
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                      <span>Metode Pengambilan</span>
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-primary"
                      onClick={() => lompatKeStep(2)}
                    >
                      <Edit3 className="size-3.5" aria-hidden /> Ubah
                    </Button>
                  </div>
                  <div className="min-w-0 wrap-break-word rounded-xl border bg-card p-3.5 text-sm">
                    <p className="font-semibold text-foreground">
                      {fulfillment === "ambil" ? "Ambil di Titik Kumpul" : "Diantar ke Lokasi"}
                    </p>
                    {fulfillment === "ambil" ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lokasi: <strong className="text-foreground">{titikTerpilih?.nama ?? "-"}</strong> ({titikTerpilih?.jam ?? "-"})
                        <br />
                        Tanggal Ambil: {tanggalPanjang(po.tanggal_ambil)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Alamat: <strong className="text-foreground">{alamat}</strong>
                        {patokan.trim() && (
                          <>
                            <br />
                            Patokan: {patokan}
                          </>
                        )}
                        {kontakAntar.trim() && (
                          <>
                            <br />
                            Kontak Penerima: {kontakAntar}
                          </>
                        )}
                        <br />
                        Jadwal Antar: {tanggalPanjang(po.tanggal_ambil)} · Jam{" "}
                        {normalisasiJamAntarWib(jamAntar) ?? jamAntar} WIB
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Ringkasan Data Pemesan */}
                <div className="min-w-0 space-y-2 rounded-2xl border bg-secondary/40 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 font-heading text-sm font-bold text-foreground">
                      <User className="size-4 shrink-0 text-primary" aria-hidden />
                      <span>Data Pemesan</span>
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-primary"
                      onClick={() => lompatKeStep(3)}
                    >
                      <Edit3 className="size-3.5" aria-hidden /> Ubah
                    </Button>
                  </div>
                  <dl className="grid gap-2 rounded-xl border bg-card p-3.5 text-xs sm:grid-cols-2 sm:text-sm">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Nama Lengkap</dt>
                      <dd className="wrap-break-word font-semibold text-foreground">{nama}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Nomor WhatsApp</dt>
                      <dd className="wrap-break-word font-semibold text-foreground">{tampilWa(wa)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Kategori</dt>
                      <dd className="wrap-break-word font-semibold text-foreground">{asal}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Catatan Tambahan</dt>
                      <dd className="wrap-break-word font-medium text-foreground">{catatan.trim() || "-"}</dd>
                    </div>
                  </dl>
                </div>

                {/* 4. Ringkasan Metode Pembayaran */}
                <div className="min-w-0 space-y-2 rounded-2xl border bg-secondary/40 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 font-heading text-sm font-bold text-foreground">
                      <CreditCard className="size-4 shrink-0 text-primary" aria-hidden />
                      <span>Metode Pembayaran</span>
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-primary"
                      onClick={() => lompatKeStep(4)}
                    >
                      <Edit3 className="size-3.5" aria-hidden /> Ubah
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">
                        {metodeBayar === "mandiri" ? "Transfer Bank Mandiri" : "QRIS P'crème"}
                      </p>
                      <p className="wrap-break-word text-xs text-muted-foreground">
                        {unggahSekarang && buktiFile
                          ? `Bukti bayar terlampir: ${buktiFile.name}`
                          : "Bukti bayar akan diunggah setelah pesanan dikonfirmasi"}
                      </p>
                    </div>
                    <span className="shrink-0 font-heading text-base font-bold tabular-nums text-primary">
                      {rupiah(totalHarga)}
                    </span>
                  </div>
                </div>

                {/* Checkbox Persetujuan Wajib */}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-primary/25 bg-accent/40 p-4 text-sm transition-colors hover:bg-accent/60">
                  <Checkbox
                    checked={setujuReview}
                    onCheckedChange={(v) => setSetujuReview(v === true)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 leading-relaxed text-foreground">
                    Saya telah memeriksa seluruh detail pesanan dan memastikan informasi yang diberikan sudah benar.
                  </span>
                </label>
              </section>
            )}

            {/* Ringkasan Harga (Tampil di akhir konten tahap pada Mobile/Tablet sebelum tombol navigasi) */}
            <div className="lg:hidden">{ringkasanHargaContent}</div>

            {/* Tombol Navigasi Kontekstual di Akhir Setiap Tahap (Tanpa Sticky Bottom Bar) */}
            <div
              className={cn(
                "pt-1",
                stepTampil === 1
                  ? "flex justify-end"
                  : stepTampil < 5
                    ? "grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between"
                    : "flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between",
              )}
            >
              {stepTampil > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-full px-5 font-semibold sm:w-auto sm:px-6"
                  disabled={submitting}
                  onClick={kembaliStep}
                >
                  <ArrowLeft className="size-4 shrink-0" aria-hidden /> Kembali
                </Button>
              )}

              {stepTampil < 5 ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-full px-6 font-heading text-sm font-semibold shadow-sm sm:w-auto sm:px-8 sm:text-base"
                  disabled={!masihBuka || !hydrated}
                  onClick={lanjutStep}
                >
                  <span>Lanjutkan</span> <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-auto min-h-12 w-full whitespace-normal rounded-full px-6 py-2.5 font-heading text-sm font-semibold shadow-sm sm:w-auto sm:px-8 sm:text-base"
                  disabled={submitting || !setujuReview || !masihBuka || !hydrated}
                  onClick={() => void konfirmasiPesanan()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />{" "}
                      <span>{tahapSubmit ?? "Memproses Pesanan…"}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 shrink-0" aria-hidden />{" "}
                      <span>Konfirmasi Pesanan ({rupiah(totalHarga)})</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Sticky Order Summary (Khusus Desktop) */}
          <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-24 lg:col-span-4 lg:block">
            {ringkasanHargaContent}
          </aside>
        </div>
      ) : (
        /* ==================== STEP 6: ORDER SUCCESS ==================== */
        suksesTampil && (
          <section
            aria-labelledby="sukses-heading"
            className="mx-auto max-w-2xl space-y-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
          >
            <div className="space-y-3 text-center">
              <div className="mx-auto flex items-center justify-center gap-2">
                <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-[#E9DDCE] bg-[#F5E1BE] shadow-xs">
                  <Image
                    src={logoImg}
                    alt="Logo Resmi P'crème"
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                </span>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
                  <CheckCircle2 className="size-8" aria-hidden />
                </div>
              </div>
              <span className="inline-block rounded-full bg-accent px-3.5 py-1 text-xs font-semibold text-accent-foreground">
                Tahap 06 · Selesai
              </span>
              <h2 id="sukses-heading" className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                Pesanan Berhasil Dibuat!
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Terima kasih <strong>{suksesTampil.nama}</strong>! Simpan kode pesanan unik di bawah ini untuk memantau status pesananmu.
              </p>
            </div>

            {/* Kartu Kode Pesanan Unik */}
            <div className="rounded-3xl border-2 border-primary/20 bg-secondary p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kode Pesanan Unik
              </p>
              <p className="mt-1 font-heading text-4xl font-extrabold tracking-wider text-primary">
                {suksesTampil.kode}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <CopyButton text={suksesTampil.kode} label="Salin Kode Pesanan" className="h-9 rounded-full text-xs" />
                <PaymentStatusBadge
                  status={suksesTampil.status}
                  sudahKirimBukti={suksesTampil.sudahKirimBukti}
                />
                <OrderProgressBadge
                  status={suksesTampil.status}
                  fulfillment={suksesTampil.fulfillment}
                />
              </div>
            </div>

            {/* Jika belum unggah bukti pada Step 4, sediakan unggah langsung di sini */}
            {!suksesTampil.sudahKirimBukti && (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold text-amber-950">
                  ⚠️ Kamu belum mengunggah bukti pembayaran. Silakan unggah bukti pembayaran di bawah ini agar pesanan segera diverifikasi admin:
                </p>
                <UploadBukti
                  kode={suksesTampil.kode}
                  wa={suksesTampil.wa}
                  orderId={suksesTampil.orderId}
                  waAdmin={po.wa_admin}
                  sudahKirim={suksesTampil.sudahKirimBukti}
                  onSelesai={() => {
                    const base = suksesTampil ?? suksesData;
                    if (!base) return;
                    const diperbarui: HasilPesananSukses = {
                      ...base,
                      status: "menunggu_verifikasi",
                      sudahKirimBukti: true,
                    };
                    setSuksesData(diperbarui);
                    simpanSuksesCheckout(diperbarui);
                  }}
                />
              </div>
            )}

            {/* Detail Singkat Pesanan */}
            <div className="space-y-3 rounded-2xl border bg-background p-4 text-sm">
              <h3 className="font-heading text-sm font-bold text-foreground">Ringkasan Pesanan</h3>
              <ul className="divide-y text-xs sm:text-sm">
                {suksesTampil.cups.map((c, idx) => (
                  <li key={c.id} className="flex justify-between gap-2 py-2">
                    <span>
                      <strong>Cup #{idx + 1}: {labelRasaCup(c)}</strong>
                      {c.topping.length > 0 ? ` (+ ${c.topping.join(", ")})` : " (Tanpa topping)"}
                    </span>
                    <span className="shrink-0 font-semibold">{c.qty} cup</span>
                  </li>
                ))}
              </ul>
              <dl className="grid gap-2 border-t pt-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Total Pembayaran</dt>
                  <dd className="font-heading text-base font-bold text-primary">
                    {rupiah(suksesTampil.total)} ({suksesTampil.jumlahCup} cup)
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Metode Pembayaran</dt>
                  <dd className="font-semibold text-foreground">
                    {suksesTampil.metodeBayar === "mandiri" ? "Transfer Bank Mandiri" : "QRIS P'crème"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Jadwal Ambil / Antar</dt>
                  <dd className="font-semibold text-foreground">{tanggalPanjang(po.tanggal_ambil)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Lokasi</dt>
                  <dd className="font-semibold text-foreground">{suksesTampil.lokasiTampil}</dd>
                </div>
              </dl>
            </div>

            {/* Instruksi Selanjutnya */}
            <div className="rounded-2xl border bg-secondary/70 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Instruksi Selanjutnya:</p>
              <ol className="mt-1 list-inside list-decimal space-y-1">
                <li>Simpan kode pesanan <strong>{suksesTampil.kode}</strong>.</li>
                <li>
                  {suksesTampil.sudahKirimBukti
                    ? "Bukti pembayaran kamu sudah terkirim dan sedang diverifikasi oleh admin."
                    : "Segera selesaikan pembayaran dan unggah bukti bayar di halaman Status Pesanan."}
                </li>
                <li>Kamu dapat memantau progres pembuatan dan pengambilan pudding kapan saja melalui tombol di bawah ini.</li>
              </ol>
            </div>

            {/* 3 Tombol Utama Sesuai Spesifikasi */}
            <div className="grid gap-2.5 sm:grid-cols-3">
              <Link
                href={`/pesanan/${encodeURIComponent(suksesTampil.kode)}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-heading text-sm font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-95"
              >
                Lihat Status Pesanan
              </Link>

              {po.wa_admin ? (
                <a
                  href={linkWa(po.wa_admin, pesanKeAdmin(suksesTampil.kode))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 font-heading text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
                >
                  <MessageCircle className="size-4" aria-hidden /> Hubungi Admin via WA
                </a>
              ) : (
                <Link
                  href="/pesanan/cek"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border bg-card px-5 font-heading text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  Cek Status Pesanan
                </Link>
              )}

              <Link
                href={RUTE.beranda}
                onClick={() => {
                  hapusSuksesCheckout();
                }}
                className="inline-flex h-12 items-center justify-center rounded-full border bg-card px-5 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                Kembali ke Homepage
              </Link>
            </div>

            {/* Opsi buat pesanan baru untuk batch ini jika diinginkan */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  hapusSuksesCheckout();
                  setSuksesData(null);
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                + Buat pesanan baru untuk batch ini
              </button>
            </div>
          </section>
        )
      )}

      {/* Modal Perbesar QRIS */}
      <Dialog open={zoomQris} onOpenChange={setZoomQris}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QRIS Resmi P&apos;crème</DialogTitle>
            <DialogDescription>
              NMID: ID1026635613858 · Nominal: <strong>{rupiah(totalHarga)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border bg-white p-2">
            <Image
              src={qrisImg}
              alt="QRIS P'CREME Diperbesar"
              className="mx-auto h-auto max-h-[70vh] w-full object-contain"
              sizes="(max-width: 640px) 95vw, 420px"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
