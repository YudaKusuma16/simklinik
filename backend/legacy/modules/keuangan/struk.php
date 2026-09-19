<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/keuangan_lib.php';
require_once __DIR__ . '/../../includes/billing_lib.php';
require_once __DIR__ . '/../../includes/icons.php';
require_role('kasir', 'admin', 'superadmin');

$invoiceId = (int) ($_GET['invoice_id'] ?? 0);
$inv = db()->prepare(
    "SELECT i.*, k.no_kunjungan, k.tgl_kunjungan, k.jenis_penjamin, k.no_jaminan, k.jenis_registrasi, k.created_at AS admission,
            p.no_mr, p.nama AS pasien, po.nama AS poli, d.nama AS dokter,
            a.nama AS asuransi_nama, c.nama AS corporate_nama
     FROM invoice i
     JOIN kunjungan k ON k.id = i.kunjungan_id
     JOIN pasien p ON p.id = k.pasien_id
     JOIN poli po ON po.id = k.poli_id
     LEFT JOIN dokter d ON d.id = k.dokter_id
     LEFT JOIN asuransi a ON a.id = k.asuransi_id
     LEFT JOIN corporate c ON c.id = k.corporate_id
     WHERE i.id = ?");
$inv->execute([$invoiceId]);
$inv = $inv->fetch();
if (!$inv) { set_flash('danger', t('common.err_invoice_not_found')); legacy_redirect('modules/keuangan/index.php'); }

$detail = db()->prepare("SELECT id,kategori,item_code,deskripsi,qty,subtotal,tgl_layanan FROM billing_detail WHERE billing_id=? ORDER BY id");
$detail->execute([$inv['billing_id']]);
$detail = $detail->fetchAll();

// Urutkan seluruh item berdasarkan tanggal terawal (ascending)
usort($detail, function($a, $b) use ($inv) {
    $tA = !empty($a['tgl_layanan']) ? strtotime($a['tgl_layanan']) : strtotime($inv['tgl_kunjungan']);
    $tB = !empty($b['tgl_layanan']) ? strtotime($b['tgl_layanan']) : strtotime($inv['tgl_kunjungan']);
    if ($tA === $tB) {
        return ($a['id'] ?? 0) <=> ($b['id'] ?? 0);
    }
    return $tA <=> $tB;
});

$pmts = db()->prepare("SELECT metode,jumlah,tanggal FROM pembayaran WHERE invoice_id=? AND status='valid' ORDER BY id");
$pmts->execute([$invoiceId]);
$pmts = $pmts->fetchAll();

$billing = db()->prepare("SELECT subtotal,diskon,total FROM billing WHERE id=?");
$billing->execute([$inv['billing_id']]); $billing = $billing->fetch();

$bank = db()->query("SELECT nama_bank,no_rekening,atas_nama,cabang FROM bank WHERE status='aktif' ORDER BY id LIMIT 1")->fetch();
$sisa = (float) $inv['total'] - (float) $inv['terbayar'];
$tglDate = fn($d) => date('d-M-Y', strtotime($d));
$amt = fn($v) => number_format((float) $v, 2, '.', ','); // format angka struk: 1,234,567.00
$locale = app_locale();
$months = ($locale === 'en')
    ? ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
$tglTandaTangan = fn($d) => date('j', strtotime($d)) . ' ' . $months[(int) date('n', strtotime($d))] . ' ' . date('Y', strtotime($d));
$cashier = current_user() ?? [];
$cashierName = $cashier['nama'] ?? $cashier['username'] ?? '-';


// Ada konsultasi dokter? (kategori jasa_dokter). Bila tidak -> "NO CONSULTATION".
$hasConsult = false;
foreach ($detail as $d) { if ($d['kategori'] === 'jasa_dokter') { $hasConsult = true; break; } }

// Kode prefix dan nama unit / cabang (dari profile klinik) pada keterangan pembayaran.
$codePrefix = defined('CODE_PREFIX') ? CODE_PREFIX : 'GBK';
$clinicBranchName = defined('CLINIC_UNIT') && CLINIC_UNIT !== '' ? CLINIC_UNIT : CLINIC_NAME;

// Deskripsi penjamin spesifik untuk pembayaran metode 'penjamin'
// (ASURANSI: nama, BPJS: nama, CORPORATE: nama) + no. jaminan bila ada.
$penjaminLabel = (function () use ($inv) {
    switch ($inv['jenis_penjamin']) {
        case 'asuransi':  $t = 'INSURANCE: ' . ($inv['asuransi_nama'] ?: '-'); break;
        case 'bpjs':      $t = 'BPJS: ' . ($inv['asuransi_nama'] ?: 'BPJS KESEHATAN'); break;
        case 'corporate': $t = 'CORPORATE: ' . ($inv['corporate_nama'] ?: '-'); break;
        default:          $t = 'PENJAMIN';
    }
    if (!empty($inv['no_jaminan'])) $t .= ' (No. ' . $inv['no_jaminan'] . ')';
    return $t;
})();
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Receipt <?= e($inv['no_invoice']) ?></title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#eef2f7;color:#1e293b;padding:24px;
      display:flex;justify-content:center}
    .paper{background:#fff;width:720px;padding:34px 40px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
    .head{text-align:center;border-bottom:2px solid #1e293b;padding-bottom:10px;margin-bottom:14px}
    .head .clinic{font-size:20px;font-weight:800}
    .head .unit,.head .address{font-size:12px;color:#475569}
    .head .address{margin-top:2px}
    .document-title{text-align:center;font-size:16px;font-weight:700;letter-spacing:3px;margin:0 0 12px}
    .meta{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:12px;gap:30px}
    .meta table{border-collapse:collapse}
    .meta td{padding:2px 0;vertical-align:top}
    .meta td.k{color:#64748b;padding-right:10px;white-space:nowrap}
    table.items{width:100%;border-collapse:collapse;font-size:12.5px}
    table.items th{text-align:left;border-top:1.5px solid #1e293b;border-bottom:1.5px solid #1e293b;padding:6px 4px;font-size:11.5px;text-transform:uppercase}
    table.items td{padding:4px;vertical-align:top}
    table.items .amt-h{text-align:right}
    table.items td:nth-child(4),table.items th:nth-child(4){text-align:center;padding-right:16px}
    table.items td.amt{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}
    .grp td{font-weight:800;padding-top:4px;padding-bottom:1px;text-transform:uppercase}
    .sum{margin-top:14px;margin-left:auto;width:340px;font-size:13px}
    .sum div{display:grid;grid-template-columns:1fr auto 100px;gap:8px;padding:3px 0;align-items:baseline}
    .sum .cur{text-align:right;color:#334155;white-space:nowrap}
    .sum .val{text-align:right}
    .sum .net{font-size:16px;font-weight:800;border-top:1.5px solid #1e293b;margin-top:4px;padding-top:6px}
    .says{font-size:12.5px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:8px;text-align:right}
    .pay{font-size:12.5px;margin-top:12px;text-align:center}
    .payline{display:grid;grid-template-columns:1fr auto;gap:20px;max-width:390px;margin:0 auto;padding:2px 0;text-align:left}
    .payline span:last-child{text-align:right}
    .signature{width:230px;margin:18px 0 0;text-align:center;font-size:12.5px}
    .signature .space{height:58px}
    .signature .name{font-weight:600;text-decoration:underline}
    .valid-note{margin-top:10px;font-size:11px;font-weight:700;font-style:italic}
    .bank{font-size:12px;margin-top:16px;color:#334155}
    .stamp{display:inline-block;margin-top:10px;padding:4px 14px;border:2px solid #16a34a;color:#16a34a;
      font-weight:800;border-radius:6px;letter-spacing:2px}
    .stamp.red{border-color:#dc2626;color:#dc2626}
    .actions{margin-top:18px;text-align:center}
    .actions button,.actions a{padding:9px 18px;border:none;border-radius:8px;cursor:pointer;font-size:14px;text-decoration:none}
    .btn-print{background:#2563eb;color:#fff}.btn-back{background:#e2e8f0;color:#1e293b}
    .clinic svg{width:.95em;height:.95em;vertical-align:-.12em}
    .stamp svg{width:1em;height:1em;vertical-align:-.14em}
    .actions svg{width:16px;height:16px;vertical-align:-3px}
    @page { margin: 0; }
    @media print{body{background:#fff;padding:0}.actions{display:none}.paper{box-shadow:none;width:100%;margin:0;padding:1cm 1.5cm}}
    <?php if (!empty($_GET['copy'])): ?>
    .paper { position: relative; overflow: hidden; }
    .paper::before {
      content: "COPY";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 160px;
      color: rgba(150, 150, 150, 0.15);
      font-weight: 900;
      letter-spacing: 20px;
      z-index: 0;
      pointer-events: none;
    }
    .head, .document-title, .meta, .items, .sum, .says, .pay, .bank, .signature, .valid-note, .actions { position: relative; z-index: 1; }
    <?php endif; ?>
  </style>
</head>
<body>
  <div class="paper">
    <div class="head">
      <div class="clinic">
        <?php if (defined('CLINIC_LOGO') && CLINIC_LOGO !== ''): ?>
          <img src="<?= legacy_url(CLINIC_LOGO) ?>" alt="Logo" style="height:28px;width:auto;vertical-align:-.2em;margin-right:6px">
        <?php else: ?>
          <?= app_icon('hospital') ?>
        <?php endif; ?>
        <?= CLINIC_NAME ?>
      </div>
      <div class="unit"><?= defined('CLINIC_UNIT') ? CLINIC_UNIT : '' ?></div>
      <div class="address"><?= e(CLINIC_ADDRESS) ?></div>
    </div>
    <div class="document-title">RECEIPT<?= !empty($_GET['copy']) ? ' - COPY' : '' ?></div>

    <div class="meta">
      <table>
        <tr><td class="k">Payment Date</td><td>: <?= $tglDate($inv['tanggal']) ?></td></tr>
        <tr><td class="k">Reference</td><td>: <?= e(strtoupper($inv['poli'])) ?></td></tr>
        <tr><td colspan="2"><?= !empty($inv['dokter']) ? e(strtoupper($inv['dokter'])) : 'NO CONSULTATION' ?></td></tr>
        <tr><td class="k">No. MR</td><td>: <?= e($inv['no_mr']) ?></td></tr>
        <tr><td colspan="2">Page 1 of 1</td></tr>
      </table>
      <table>
        <tr><td class="k">No. Invoice</td><td>: <?= e(($inv['jenis_registrasi'] ?? '') === 'rawat_inap' ? preg_replace('/^GBRJ/i', 'GBRI', $inv['no_invoice']) : preg_replace('/^GBRI/i', 'GBRJ', $inv['no_invoice'])) ?></td></tr>
        <tr><td class="k">Print Date</td><td>: <?= $tglDate(date('Y-m-d')) ?></td></tr>
        <tr><td class="k">Admission Date</td><td>: <?= $tglDate($inv['admission']) ?></td></tr>
        <tr><td class="k">Discharge Date</td><td>: <?= $tglDate($inv['tgl_kunjungan']) ?></td></tr>
        <tr><td class="k">Name</td><td>: <?= e($inv['pasien']) ?></td></tr>
      </table>
    </div>

    <table class="items">
      <thead>
        <tr><th style="width:88px">Date</th><th style="width:92px">Item Code</th>
            <th>Description</th><th style="width:40px">Qty</th><th class="amt-h" style="width:150px">Amount</th></tr>
      </thead>
      <tbody>
        <?php 
        $groupedDetail = group_billing_items($detail, $inv['tgl_kunjungan'] ?? '');
        $renderedCount = 0;
        foreach ($groupedDetail as $groupLabel => $items):
            $renderedCount += count($items);
        ?>
          <tr class="grp">
            <td></td>
            <td></td>
            <td style="font-weight:800;padding-top:4px;padding-bottom:1px;text-transform:uppercase;letter-spacing:0.5px;color:#1e293b"><?= e($groupLabel) ?></td>
            <td></td>
            <td></td>
          </tr>
          <?php foreach ($items as $d):
            $dVal = !empty($d['tgl_layanan']) ? $tglDate($d['tgl_layanan']) : $tglDate($inv['tgl_kunjungan']);
          ?>
            <tr>
              <td><?= $dVal ?></td>
              <td><?= e($d['item_code'] ?? '') ?></td>
              <td><?= e($d['deskripsi']) ?></td>
              <td><?= (int) $d['qty'] ?></td>
              <td class="amt"><span>Rp</span><span><?= $amt($d['subtotal']) ?></span></td>
            </tr>
          <?php endforeach; ?>
        <?php endforeach; ?>
        <?php if ($renderedCount === 0): ?>
          <tr><td colspan="5" style="text-align:center;color:#64748b;padding:16px"><?= e(t('common.no_details')) ?></td></tr>
        <?php endif; ?>
      </tbody>
    </table>

<?php
$admFee = 0;
foreach ($detail as $d) { if ($d['kategori'] === 'administrasi') $admFee += (float) $d['subtotal']; }
?>
    <div class="sum">
      <div><span class="lbl">ADMIN</span><span class="cur">: Rp</span><span class="val"><?= $amt($admFee) ?></span></div>
      <div><span class="lbl">TOTAL</span><span class="cur">: Rp</span><span class="val"><?= $amt($billing['subtotal']) ?></span></div>
      <div><span class="lbl">DOWN PAYMENT</span><span class="cur">: Rp</span><span class="val"></span></div>
      <div><span class="lbl">DISCOUNT</span><span class="cur">: Rp</span><span class="val"><?= $amt($billing['diskon']) ?></span></div>
      <div class="net"><span class="lbl">NET PAYABLE</span><span class="cur">Rp</span><span class="val"><?= $amt($inv['total']) ?></span></div>
    </div>

    <div class="says"><b>Says</b> : <?= e(terbilang_en_rupiah($inv['total'])) ?></div>

    <div class="pay">
      <?php foreach ($pmts as $pm): ?>
        <div class="payline">
          <?php if ($pm['metode'] === 'penjamin'): ?>
            <span><?= e($codePrefix) ?> - <?= e(strtoupper($penjaminLabel)) ?></span>
          <?php else: ?>
            <span><?= e($codePrefix) ?> - A/R PATIENT</span>
          <?php endif; ?>
          <span><?= $amt($pm['jumlah']) ?></span>
        </div>
      <?php endforeach; ?>
      <?php if ($sisa > 0): ?>
        <div class="payline"><span><?= e($codePrefix) ?> - A/R PATIENT</span><span><?= $amt($sisa) ?></span></div>
      <?php endif; ?>
    </div>

    <?php if ($bank): ?>
    <div class="bank">
      <b>Bank :</b><br>
      Beneficiary Name : <?= e($bank['atas_nama']) ?><br>
      1. <?= e($bank['nama_bank']) ?> <?= e($bank['cabang']) ?> (IDR) A/c No : <?= e($bank['no_rekening']) ?>
    </div>
    <?php endif; ?>

    <div class="signature">
      <div>Karawang, <?= e($tglTandaTangan(date('Y-m-d'))) ?></div>
      <div>Cashier</div>
      <div class="space"></div>
      <div class="name"><?= e($cashierName) ?></div>
    </div>
    <div class="valid-note">* Payment is deemed valid if receipt sealed by the cashier is issued</div>

    <div class="actions">
      <button class="btn-print" onclick="window.print()"><?= app_icon('print') ?> <?= e(t('common.print')) ?></button>
      <a class="btn-back" href="<?= legacy_url('modules/keuangan/index.php') ?>" onclick="if(window.opener){window.close();return false;}"><?= e(t('common.done')) ?></a>
    </div>

  </div>
</body>
</html>
