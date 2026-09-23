import{a as e,i as t,n,o as r,r as i}from"./index-B0MtBCTx.js";var a=r(e(),1),o=i();function s({invoiceId:e,docType:r=`RECEIPT`,isCopy:i=!1}){let[s,c]=(0,a.useState)(!0),[l,u]=(0,a.useState)(null),[d,f]=(0,a.useState)(null);(0,a.useEffect)(()=>{if(!e){f(`ID Invoice atau Kunjungan tidak ditemukan.`),c(!1);return}p()},[e]);let p=async()=>{c(!0);try{let n=await t.get(`/billing/invoice/${e}`);n&&n.success&&n.data?u(n.data):f(n?.message||`Gagal memuat dokumen cetak.`)}catch(e){f(e.message||`Terjadi kesalahan saat memuat data invoice.`)}finally{c(!1)}},m=e=>e==null||isNaN(e)?`0.00`:Number(e).toLocaleString(`en-US`,{minimumFractionDigits:2,maximumFractionDigits:2}),h=e=>{if(!e)return`-`;try{let t=new Date(e);return`${String(t.getDate()).padStart(2,`0`)}-${[`Jan`,`Feb`,`Mar`,`Apr`,`May`,`Jun`,`Jul`,`Aug`,`Sep`,`Oct`,`Nov`,`Dec`][t.getMonth()]}-${t.getFullYear()}`}catch{return e}},g=e=>{if(!e)return``;try{let t=new Date(e);return`${t.getDate()} ${[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`][t.getMonth()]} ${t.getFullYear()}`}catch{return e}},_=e=>{if(!e||e===0)return`Zero Rupiah`;let t=[``,`One`,`Two`,`Three`,`Four`,`Five`,`Six`,`Seven`,`Eight`,`Nine`,`Ten`,`Eleven`,`Twelve`,`Thirteen`,`Fourteen`,`Fifteen`,`Sixteen`,`Seventeen`,`Eighteen`,`Nineteen`],n=[``,``,`Twenty`,`Thirty`,`Forty`,`Fifty`,`Sixty`,`Seventy`,`Eighty`,`Ninety`];function r(e){return e=Math.floor(e),e<20?t[e]:e<100?n[Math.floor(e/10)]+(e%10?` `+t[e%10]:``):e<1e3?t[Math.floor(e/100)]+` Hundred`+(e%100?` And `+r(e%100):``):e<1e6?r(Math.floor(e/1e3))+` Thousand`+(e%1e3?` `+r(e%1e3):``):e<1e9?r(Math.floor(e/1e6))+` Million`+(e%1e6?` `+r(e%1e6):``):``}return r(e).replace(/\s+/g,` `).trim()+` Rupiah`};if(s)return(0,o.jsx)(`div`,{style:{padding:`60px 20px`,textAlign:`center`,color:`#64748b`,fontFamily:`'Segoe UI', Arial, sans-serif`},children:(0,o.jsxs)(`h3`,{children:[`Memuat Dokumen `,r===`INVOICE`?`Invoice`:`Struk`,`...`]})});if(d||!l||!l.invoice)return(0,o.jsxs)(`div`,{style:{padding:`40px 20px`,textAlign:`center`,fontFamily:`'Segoe UI', Arial, sans-serif`},children:[(0,o.jsxs)(`div`,{style:{maxWidth:500,margin:`0 auto`,background:`#fee2e2`,color:`#dc2626`,padding:20,borderRadius:8},children:[(0,o.jsx)(`b`,{children:`Terjadi Kesalahan:`}),` `,d||`Data invoice tidak ditemukan.`]}),(0,o.jsx)(`div`,{style:{marginTop:20},children:(0,o.jsx)(`button`,{type:`button`,className:`btn btn-light`,onClick:()=>window.close(),style:{padding:`8px 16px`,cursor:`pointer`},children:`Tutup Tab`})})]});let{invoice:v,billing:y,items:b=[],pembayaran:x=[],bank:S}=l,C=v.no_invoice||`INV-00000000-0000`,w=v.jenis_registrasi===`rawat_inap`?C.replace(/^GBRJ/i,`GBRI`):C.replace(/^GBRI/i,`GBRJ`),T={};b.forEach(e=>{let t=(e.kategori||`tindakan`).toLowerCase(),n=`MEDICAL SERVICE`;t.includes(`konsul`)||t.includes(`jasa_dokter`)?n=`CONSULTATION`:t.includes(`obat`)||t.includes(`farmasi`)||t.includes(`alkes`)?n=`PHARMACY`:t.includes(`lab`)?n=`LABORATORY`:t.includes(`rad`)?n=`RADIOLOGY`:t.includes(`admin`)&&(n=`ADMINISTRATION`),T[n]||(T[n]=[]),T[n].push(e)});let E=Number(v.total||y?.total||0),D=Number(y?.diskon||0),O=Number(y?.biaya_admin||0),k=Number(v.terbayar||0);Math.max(0,E-k),v.tanggal||new Date().toISOString();let A=new Date().toISOString(),j=v.admission||v.tgl_kunjungan||A,M=v.tgl_kunjungan||A;return(0,o.jsxs)(`div`,{className:`print-struk-page`,children:[(0,o.jsx)(`style`,{children:`
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #eef2f7;
          color: #1e293b;
          margin: 0;
          padding: 24px;
          display: flex;
          justify-content: center;
        }
        .print-struk-page {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .paper {
          background: #fff;
          width: 720px;
          max-width: 100%;
          padding: 34px 40px;
          box-shadow: 0 2px 10px rgba(0,0,0,.1);
          box-sizing: border-box;
          position: relative;
        }
        ${i?`
        .paper::before {
          content: "COPY";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 160px;
          color: rgba(150, 150, 150, 0.14);
          font-weight: 900;
          letter-spacing: 20px;
          z-index: 0;
          pointer-events: none;
        }
        `:``}
        .head {
          text-align: center;
          border-bottom: 2px solid #1e293b;
          padding-bottom: 10px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .head .clinic {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .head .unit, .head .address {
          font-size: 12px;
          color: #475569;
        }
        .head .address {
          margin-top: 2px;
        }
        .document-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 3px;
          margin: 0 0 12px;
          position: relative;
          z-index: 1;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          margin-bottom: 12px;
          gap: 30px;
          position: relative;
          z-index: 1;
        }
        .meta table {
          border-collapse: collapse;
        }
        .meta td {
          padding: 2px 0;
          vertical-align: top;
        }
        .meta td.k {
          color: #64748b;
          padding-right: 10px;
          white-space: nowrap;
        }
        table.items {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          position: relative;
          z-index: 1;
        }
        table.items th {
          text-align: left;
          border-top: 1.5px solid #1e293b;
          border-bottom: 1.5px solid #1e293b;
          padding: 6px 4px;
          font-size: 11.5px;
          text-transform: uppercase;
        }
        table.items td {
          padding: 4px;
          vertical-align: top;
        }
        table.items .amt-h {
          text-align: right;
        }
        table.items td.amt {
          text-align: right;
          white-space: nowrap;
        }
        .grp td {
          font-weight: 800;
          padding-top: 6px;
          padding-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1e293b;
        }
        .sum {
          margin-top: 14px;
          margin-left: auto;
          width: 340px;
          font-size: 13px;
          position: relative;
          z-index: 1;
        }
        .sum div {
          display: grid;
          grid-template-columns: 1fr auto 100px;
          gap: 8px;
          padding: 3px 0;
          align-items: baseline;
        }
        .sum .cur {
          text-align: right;
          color: #334155;
          white-space: nowrap;
        }
        .sum .val {
          text-align: right;
        }
        .sum .net {
          font-size: 16px;
          font-weight: 800;
          border-top: 1.5px solid #1e293b;
          margin-top: 4px;
          padding-top: 6px;
        }
        .says {
          font-size: 12.5px;
          margin-top: 12px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 8px;
          text-align: right;
          position: relative;
          z-index: 1;
        }
        .pay {
          font-size: 12.5px;
          margin-top: 12px;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .payline {
          display: flex;
          justify-content: space-between;
          max-width: 420px;
          margin: 0 auto;
          padding: 2px 0;
          text-align: left;
        }
        .bank {
          font-size: 12px;
          margin-top: 16px;
          color: #334155;
          position: relative;
          z-index: 1;
        }
        .signature {
          width: 260px;
          margin: 18px 0 0;
          text-align: center;
          font-size: 12.5px;
          position: relative;
          z-index: 1;
        }
        .signature .space {
          height: 52px;
        }
        .signature .name {
          font-weight: 600;
          text-decoration: underline;
        }
        .valid-note {
          margin-top: 10px;
          font-size: 11px;
          font-style: italic;
          color: #475569;
          position: relative;
          z-index: 1;
        }
        .actions {
          margin-top: 24px;
          text-align: center;
        }
        .btn-print {
          background: #2563eb;
          color: #fff;
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(37,99,235,0.25);
        }
        .btn-print:hover {
          background: #1d4ed8;
        }
        @page {
          margin: 0;
        }
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .actions {
            display: none !important;
          }
          .paper {
            box-shadow: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1cm 1.5cm !important;
          }
        }
      `}),(0,o.jsxs)(`div`,{className:`paper`,children:[(0,o.jsxs)(`div`,{className:`head`,children:[(0,o.jsxs)(`div`,{className:`clinic`,children:[(0,o.jsx)(n,{name:`hospital`,style:{fontSize:20}}),`PT Sapta Genki Clinic`]}),(0,o.jsx)(`div`,{className:`unit`,children:`Unit Bayakarta — Karawang`}),(0,o.jsx)(`div`,{className:`address`,children:`Karawang, Jawa Barat`})]}),(0,o.jsx)(`div`,{className:`document-title`,children:r}),(0,o.jsxs)(`div`,{className:`meta`,children:[(0,o.jsx)(`table`,{children:(0,o.jsxs)(`tbody`,{children:[(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`Reference`}),(0,o.jsxs)(`td`,{children:[`: `,v.poli_nama?v.poli_nama.toUpperCase():`POLI UMUM`]})]}),(0,o.jsx)(`tr`,{children:(0,o.jsx)(`td`,{colSpan:`2`,style:{fontWeight:600},children:v.dokter_nama?v.dokter_nama.toUpperCase():`NO CONSULTATION`})}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`No. MR`}),(0,o.jsxs)(`td`,{children:[`: `,v.no_mr]})]}),(0,o.jsx)(`tr`,{children:(0,o.jsx)(`td`,{colSpan:`2`,style:{color:`#64748b`},children:`Page 1 of 1`})})]})}),(0,o.jsx)(`table`,{children:(0,o.jsxs)(`tbody`,{children:[(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`No. Invoice`}),(0,o.jsxs)(`td`,{children:[`: `,w]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`Print Date`}),(0,o.jsxs)(`td`,{children:[`: `,h(A)]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`Admission Date`}),(0,o.jsxs)(`td`,{children:[`: `,h(j)]})]}),r===`RECEIPT`&&(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`Discharge Date`}),(0,o.jsxs)(`td`,{children:[`: `,h(M)]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{className:`k`,children:`Name`}),(0,o.jsxs)(`td`,{children:[`: `,v.pasien_nama]})]})]})})]}),(0,o.jsxs)(`table`,{className:`items`,children:[(0,o.jsx)(`thead`,{children:(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`th`,{style:{width:`90px`},children:`Date`}),(0,o.jsx)(`th`,{style:{width:`95px`},children:`Item Code`}),(0,o.jsx)(`th`,{children:`Description`}),(0,o.jsx)(`th`,{style:{width:`40px`,textAlign:`center`},children:`Qty`}),(0,o.jsx)(`th`,{className:`amt-h`,style:{width:`150px`},children:`Amount`})]})}),(0,o.jsx)(`tbody`,{children:Object.keys(T).map(e=>(0,o.jsxs)(a.Fragment,{children:[(0,o.jsxs)(`tr`,{className:`grp`,children:[(0,o.jsx)(`td`,{}),(0,o.jsx)(`td`,{}),(0,o.jsx)(`td`,{children:e}),(0,o.jsx)(`td`,{}),(0,o.jsx)(`td`,{})]}),T[e].map((e,t)=>(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:h(e.tgl_layanan||v.tgl_kunjungan)}),(0,o.jsx)(`td`,{children:e.item_code||e.kode||`-`}),(0,o.jsx)(`td`,{children:e.deskripsi||e.nama||`-`}),(0,o.jsx)(`td`,{style:{textAlign:`center`},children:e.qty||1}),(0,o.jsxs)(`td`,{className:`amt`,children:[(0,o.jsx)(`span`,{style:{float:`left`},children:`Rp`}),(0,o.jsx)(`span`,{children:m(e.subtotal||e.tarif*e.qty)})]})]},t))]},e))})]}),(0,o.jsxs)(`div`,{className:`sum`,children:[O>0&&(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`span`,{children:`ADMIN`}),(0,o.jsx)(`span`,{className:`cur`,children:`: Rp`}),(0,o.jsx)(`span`,{className:`val`,children:m(O)})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`span`,{children:`TOTAL`}),(0,o.jsx)(`span`,{className:`cur`,children:`: Rp`}),(0,o.jsx)(`span`,{className:`val`,children:m(E)})]}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`span`,{children:`DISCOUNT`}),(0,o.jsx)(`span`,{className:`cur`,children:`: Rp`}),(0,o.jsx)(`span`,{className:`val`,children:m(D)})]}),(0,o.jsxs)(`div`,{className:`net`,children:[(0,o.jsx)(`span`,{children:`NET PAYABLE`}),(0,o.jsx)(`span`,{className:`cur`,children:`Rp`}),(0,o.jsx)(`span`,{className:`val`,children:m(E)})]})]}),(0,o.jsxs)(`div`,{className:`says`,children:[(0,o.jsx)(`b`,{children:`Says :`}),` `,_(E)]}),(0,o.jsx)(`div`,{className:`pay`,children:x.length>0?x.map((e,t)=>(0,o.jsxs)(`div`,{className:`payline`,children:[(0,o.jsx)(`span`,{children:e.metode?e.metode.toUpperCase():`TUNAI`}),(0,o.jsx)(`span`,{children:m(e.jumlah)})]},t)):(0,o.jsxs)(`div`,{className:`payline`,children:[(0,o.jsx)(`span`,{children:v.jenis_penjamin===`umum`?`GBK - A/R PATIENT`:`TANGGUNGAN ${v.jenis_penjamin.toUpperCase()}`}),(0,o.jsx)(`span`,{children:m(E)})]})}),(0,o.jsxs)(`div`,{className:`bank`,children:[(0,o.jsx)(`div`,{children:(0,o.jsx)(`b`,{children:`Bank :`})}),(0,o.jsx)(`div`,{children:`Beneficiary Name : PT Sapta Genki Clinic`}),(0,o.jsx)(`div`,{children:S?`1. ${S.nama_bank} ${S.cabang?S.cabang+` `:``}(IDR) A/c No : ${S.no_rekening}`:`1. BCA KCP Panata Yuda (IDR) A/c No : 7045368149`})]}),(0,o.jsxs)(`div`,{className:`signature`,children:[(0,o.jsxs)(`div`,{children:[`Karawang, `,g(A)]}),(0,o.jsx)(`div`,{children:`Cashier`}),(0,o.jsx)(`div`,{className:`space`}),(0,o.jsx)(`div`,{className:`name`,children:`Super Administrator`})]}),(0,o.jsx)(`div`,{className:`valid-note`,children:`* Payment is deemed valid if receipt sealed by the cashier is issued`}),(0,o.jsx)(`div`,{className:`actions`,children:(0,o.jsxs)(`button`,{type:`button`,className:`btn-print`,onClick:()=>window.print(),children:[(0,o.jsx)(n,{name:`print`}),` Cetak`]})})]})]})}export{s as default};