const SCREENSHOTS = ['hypercube', '24-cell', '120-cell'] as const;

export function renderUnsupported(root: HTMLElement, baseUrl: string): HTMLElement {
  root.querySelector('#stage')?.remove();
  const section = document.createElement('section');
  section.className = 'unsupported';
  section.innerHTML = `
    <h1>NTH</h1>
    <p>4D polytopes, projected live on the GPU.</p>
    <div class="unsupported-gallery"></div>
    <p class="unsupported-note">NTH needs a desktop browser with WebGPU. Open it in Chrome on a Mac or PC.</p>
    <p class="unsupported-url"></p>
  `;
  const gallery = section.querySelector('.unsupported-gallery');
  for (const name of SCREENSHOTS) {
    const img = document.createElement('img');
    img.src = `${baseUrl}screenshots/${name}.jpg`;
    img.alt = `${name} rendered in NTH`;
    img.loading = 'lazy';
    gallery?.append(img);
  }
  const url = section.querySelector('.unsupported-url');
  if (url) url.textContent = window.location.origin + baseUrl;
  root.append(section);
  root.classList.add('is-unsupported');
  document.documentElement.classList.add('is-unsupported');
  document.documentElement.dataset.unsupported = 'true';
  return section;
}
