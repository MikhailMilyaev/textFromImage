import React, { useEffect, useMemo, useRef, useState } from 'react';
import s from './App.module.css';
import {
  FiUpload, FiSun, FiMoon, FiDownload
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const isImgType = (t) => (t || '').startsWith('image/');

// Заглушка «OCR»
async function fakeOcr(file) {
  if (file && /\.txt$/i.test(file.name)) {
    const text = await file.text();
    return text.slice(0, 200000);
  }
  await new Promise(r => setTimeout(r, 450));
  return `Файл: ${file?.name || 'неизвестно'}\n(здесь будет распознанный текст этого файла)`;
}

export default function App() {
  // Тема
  const [dark, setDark] = useState(() => {
    const m = matchMedia?.('(prefers-color-scheme: dark)').matches;
    return m;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  // Состояние страницы (макс. 1 файл)
  const [file, setFile] = useState(null);     // {name,type,url,isImage}
  const [text, setText] = useState('');
  const [rating, setRating] = useState(null);
  const [busy, setBusy] = useState(false);

  const fileRef = useRef(null);
  const pickFile = () => fileRef.current?.click();

  const image = useMemo(() => (file?.isImage ? file : null), [file]);
  const empty = !file;

  // Загрузка файла (заменяет существующий)
  const onFileChange = async (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    setBusy(true);
    try {
      // очистим предыдущий objectURL
      if (file?.url) URL.revokeObjectURL(file.url);

      const mapped = {
        name: f.name,
        type: f.type || '',
        url: URL.createObjectURL(f),
        isImage: isImgType(f.type),
      };
      setFile(mapped);

      const out = await fakeOcr(f);
      setText(out);
      setRating(null);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  // Скачивания
  function downloadTXT(filename, txt) {
    const blob = new Blob([txt ?? ''], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }
  async function downloadDOCX(filename, txt) {
    const doc = new Document({
      sections: [{ children: (txt || '').split(/\r?\n/).map(line => new Paragraph({ children: [new TextRun(line)] })) }],
    });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }
  function downloadPDF(filename, txt) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const maxWidth = 595.28 - margin * 2;
    const lines = doc.splitTextToSize(txt ?? '', maxWidth);
    let y = margin;
    const lineHeight = 16;
    lines.forEach((line) => {
      if (y > 842 - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += lineHeight;
    });
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }
  const onDownload = async (fmt) => {
    const base = (file?.name || 'document').replace(/\.[^.]+$/, '');
    if (fmt === 'txt') return downloadTXT(base, text);
    if (fmt === 'docx') return downloadDOCX(base, text);
    if (fmt === 'pdf') return downloadPDF(base, text);
  };

  return (
    <div className={s.page}>
      {/* HEADER */}
      <header className={s.header}>
        <div className={s.left}>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,image/*,application/pdf"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <button
            className={`${s.primaryBtn} ${busy ? s.disabled : ''}`}
            onClick={pickFile}
            disabled={busy}
            title="Загрузить файл"
          >
            <FiUpload />
            <span>{busy ? 'Обработка…' : 'Загрузить файл'}</span>
          </button>
        </div>

        <div className={s.center} />

        <div className={s.right}>
          <button className={s.iconBtn} onClick={() => setDark(v => !v)} title={dark ? 'Светлая тема' : 'Тёмная тема'}>
            {dark ? <FiSun /> : <FiMoon />}
          </button>
        </div>
      </header>

      {/* BODY */}
      {empty ? (
        <main className={s.emptyWrap}>
          {/* SVG иллюстрация загрузки */}
          <div className={s.illustration} aria-hidden="true">
            <svg viewBox="0 0 220 160" className={s.svg}>
              {/* облако */}
              <path className={s.cloud}
                d="M165 90a25 25 0 0 0-6-49c-5-17-22-29-41-29-20 0-37 13-42 31a28 28 0 0 0-8-1c-16 0-29 13-29 29 0 1 0 2 0 3A24 24 0 0 0 24 98c0 13 11 24 24 24h110a22 22 0 0 0 7-43z"
                />
              {/* папка */}
              <path className={s.folder}
                d="M40 82h140a6 6 0 0 1 6 6v38a10 10 0 0 1-10 10H44a10 10 0 0 1-10-10V88a6 6 0 0 1 6-6z"
              />
              {/* стрелка загрузки */}
              <g className={s.arrowGroup}>
                <path className={s.arrow} d="M110 64v40" />
                <path className={s.arrowHead} d="M98 90l12-12 12 12" />
              </g>
            </svg>
          </div>

          <div className={s.emptyTitle}>Загрузите файл</div>
          <div className={s.emptyText}>
            Расшифруем текст из картинки.
          </div>
          <button className={s.primaryBtn} onClick={pickFile}>
            <FiUpload />
            <span>Загрузите файл</span>
          </button>
        </main>
      ) : (
        <main className={s.split}>
          <section className={s.previewPane}>
            {image ? (
              <div className={s.viewer}>
                <div className={s.stage}>
                  <img className={s.image} src={image.url} alt={image.name || 'image'} />
                </div>
              </div>
            ) : (
              <div className={s.noPreview}>Предпросмотр недоступен</div>
            )}
          </section>

          <section className={s.textPane}>
            <textarea
              className={s.textArea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder=""
            />
            <div className={s.bottomBar}>
              <div className={s.ratingGroup} aria-label="Оцените работу от 0 до 5">
                <span className={s.muted}>Оцените:</span>
                {[0,1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    className={`${s.rateBtn} ${rating === n ? s.rateActive : ''}`}
                    onClick={() => setRating(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className={s.downloadGroup}>
                <span className={s.muted}>Скачать как:</span>
                <button className={s.iconBtn} onClick={() => onDownload('txt')} title="TXT">
                  <FiDownload /><span className={s.btnText}>TXT</span>
                </button>
                <button className={s.iconBtn} onClick={() => onDownload('docx')} title="DOCX">
                  <FiDownload /><span className={s.btnText}>DOCX</span>
                </button>
                <button className={s.iconBtn} onClick={() => onDownload('pdf')} title="PDF">
                  <FiDownload /><span className={s.btnText}>PDF</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
