// 저장·불러오기·내보내기 보조 함수 (DOM/브라우저 API만 다룬다).

export function storageGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : v;
  } catch { return null; }
}

export function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

/** 파일 이름으로 쓸 수 없는 문자를 걸러낸다. */
export function safeFileName(name, fallback = '장구 악보') {
  const s = String(name ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
  return s || fallback;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text, filename, type = 'application/json') {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}

/** 파일 선택 창을 열어 텍스트를 읽는다. 취소하면 null. */
export function pickTextFile(accept = '.json,application/json') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      file.text().then((text) => resolve({ name: file.name, text }), reject);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/**
 * SVG 요소를 PNG Blob으로 바꾼다. 페이지 CSS가 없는 상태에서도 색이 풀리도록
 * vars(CSS 변수 값)를 SVG 안의 <style>로 넣는다.
 */
export async function svgToPng(svg, { scale = 2, background = '#ffffff', vars = {} } = {}) {
  const copy = svg.cloneNode(true);
  const w = Number(svg.getAttribute('width')) || svg.viewBox.baseVal?.width || svg.getBoundingClientRect().width;
  const h = Number(svg.getAttribute('height')) || svg.viewBox.baseVal?.height || svg.getBoundingClientRect().height;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', w);
  copy.setAttribute('height', h);
  if (!copy.getAttribute('viewBox')) copy.setAttribute('viewBox', `0 0 ${w} ${h}`);
  copy.removeAttribute('style');
  const decl = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `:root{${decl}}`;
  copy.insertBefore(style, copy.firstChild);

  const xml = new XMLSerializer().serializeToString(copy);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('악보 그림을 만들지 못했습니다'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(h * scale);
    const g = canvas.getContext('2d');
    g.fillStyle = background;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG를 만들지 못했습니다'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
