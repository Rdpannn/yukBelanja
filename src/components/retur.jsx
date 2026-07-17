import { useRef, useState } from 'react'
import supabase from '../lib/supabase'

// modal ajukan pengembalian barang, kebuka dari card pesanan yang udah sampai
export default function Retur({ order, tutup, sukses }) {
  const [alasan, setAlasan] = useState('')
  const [files, setFiles] = useState([]) // { file, preview }
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  // masukin file bukti yang dipilih / di-drop, maksimal 3 file 20MB an
  function tambahFile(baru) {
    setError('')
    const dipilih = baru.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (dipilih.some((f) => f.size > 20 * 1024 * 1024)) {
      setError('Ukuran filenya kegedean, maksimal 20MB per file ya.')
      return
    }
    const sisa = 3 - files.length
    setFiles([
      ...files,
      ...dipilih.slice(0, sisa).map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ])
  }

  // upload bukti ke storage dulu, baru simpen pengajuannya
  async function kirim(e) {
    e.preventDefault()
    setError('')
    setProses(true)

    const urls = []
    for (const f of files) {
      const namaFile = order.id + '/' + Date.now() + '_' + f.file.name
      const { error: errUpload } = await supabase.storage.from('retur').upload(namaFile, f.file)
      if (errUpload) {
        setProses(false)
        setError(errUpload.message)
        return
      }
      urls.push(supabase.storage.from('retur').getPublicUrl(namaFile).data.publicUrl)
    }

    const { error: err } = await supabase
      .from('returns')
      .insert({ order_id: order.id, alasan, media: urls })
    setProses(false)
    if (err) {
      setError('Waduh, ada masalah. Coba lagi ya.')
      return
    }
    sukses()
  }

  return (
    <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
      <form onSubmit={kirim} className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h2 className="font-bold text-2xl">Ajukan Pengembalian</h2>
          <button
            type="button"
            onClick={tutup}
            className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>
        <p className="text-kabut text-sm mt-2">
          Ceritain masalahnya dan lampirin bukti biar toko bisa ninjau ya.
        </p>

        <div className="mt-6">
          <label className="text-sm font-medium">Alasan Pengembalian</label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Barang yang dateng gak sesuai pesanan"
            rows={3}
            className="w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon mt-1.5 resize-none"
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Bukti Foto/Video</label>

          {/* input file aslinya disembunyiin, dipanggil dari tombol Pilih File / + */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              tambahFile(Array.from(e.target.files))
              e.target.value = ''
            }}
            className="hidden"
          />

          {files.length === 0 ? (
            // belum ada file: box drag & drop
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                tambahFile(Array.from(e.dataTransfer.files))
              }}
              className="border-2 border-dashed border-naik rounded-(--radius-input) py-8 flex flex-col items-center gap-1 text-center mt-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={32} height={32} className="text-kabut">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-sm text-kabut mt-2">Tarik fotomu ke sini</p>
              <p className="text-xs text-kabut">atau</p>
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="bg-naik hover:bg-neon text-putih text-sm font-medium rounded-full px-5 py-2 mt-2 transition duration-200 cursor-pointer"
              >
                Pilih File
              </button>
            </div>
          ) : (
            // udah ada file: barisan preview, video ditandain icon play
            <div className="flex flex-wrap gap-3 mt-1.5">
              {files.map((f, i) => (
                <div key={f.preview} className="relative">
                  {f.file.type.startsWith('video/') ? (
                    <video src={f.preview} muted className="w-20 h-20 object-cover rounded-(--radius-input)" />
                  ) : (
                    <img src={f.preview} alt="" className="w-20 h-20 object-cover rounded-(--radius-input)" />
                  )}
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, x) => x !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-naik text-putih text-xs rounded-full flex items-center justify-center cursor-pointer hover:bg-neon"
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* tombol nambah file lagi, ilang kalau udah 3 */}
              {files.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="w-20 h-20 border-2 border-dashed border-naik rounded-(--radius-input) text-kabut text-2xl hover:border-neon hover:text-neon transition duration-200 cursor-pointer"
                >
                  +
                </button>
              )}
            </div>
          )}
          <p className="text-kabut text-xs mt-2">
            Maksimal 3 file, boleh foto atau video, ukuran per file maksimal 20MB.
          </p>
        </div>

        {error && <p className="text-merah text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={tutup}
            className="flex-1 border border-naik text-putih hover:border-neon text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={proses || !alasan.trim() || files.length === 0}
            className="flex-1 bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {proses ? 'Sebentar ya...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  )
}
