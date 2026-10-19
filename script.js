const gallery = document.querySelector('.masonry');
const galleryFragment = document.createDocumentFragment();
window.photoManifest.forEach((photo) => {
  const project = document.createElement('article');
  project.className = 'project';
  const image = document.createElement('img');
  image.src = photo.src;
  image.dataset.full = photo.full;
  image.alt = photo.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  const caption = document.createElement('div');
  caption.className = 'caption';
  const title = document.createElement('span');
  title.textContent = photo.title;
  const credit = document.createElement('span');
  credit.textContent = 'Jessica Luo';
  caption.append(title, credit);
  project.append(image, caption);
  galleryFragment.append(project);
});
gallery.append(galleryFragment);

const projects = [...gallery.querySelectorAll('.project')];
const hero = document.querySelector('.hero');
const stage = hero.querySelector('.hero-stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const projectItems = projects.map((project) => {
  const image = project.querySelector('img');
  const labels = project.querySelectorAll('.caption span');
  return { src: image.src, full: image.dataset.full, alt: image.alt, title: labels[0].textContent, credit: labels[1].textContent };
});
const sphereSpec = [
  [2, 101], [20, 82], [33, 73], [42, 97],
  [4, 79], [25, 89], [37, 115], [9, 69],
  [22, 104], [16, 87], [6, 99], [41, 76],
  [10, 91], [34, 117], [27, 72], [29, 91],
  [24, 110], [7, 83], [38, 100], [14, 81],
  [31, 112], [28, 80], [35, 96], [40, 72],
  [0, 64], [23, 57], [39, 60]
];
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const sphere = sphereSpec.map(([projectIndex, size], index) => {
  const item = projectItems[projectIndex];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sphere-photo';
  button.setAttribute('aria-label', 'View ' + item.title);
  button.setAttribute('title', item.title);
  button.dataset.index = index;
  button.style.setProperty('--ratio', window.photoManifest[projectIndex].ratio);
  const preview = document.createElement('img');
  preview.src = item.src;
  preview.alt = '';
  preview.draggable = false;
  button.append(preview);
  stage.append(button);
  const y = index < 24 ? 1 - 2 * (index + .5) / 24 : 0;
  const ring = Math.sqrt(1 - y * y);
  const anchors = [
    { x: -.35, y: 0, z: .94 },
    { x: -.7, y: .18, z: .69 },
    { x: -.05, y: -.25, z: .97 }
  ];
  const position = index < 24 ? {
    x: Math.cos(index * goldenAngle) * ring,
    y,
    z: Math.sin(index * goldenAngle) * ring
  } : anchors[index - 24];
  return {
    button, size, ...position, item
  };
});
const sphereItems = sphere.map(({ item }) => item);
let yaw = .42;
let pitch = -.08;
let targetYaw = yaw;
let targetPitch = pitch;
let baseYaw = yaw;
let basePitch = pitch;
let hovered = null;
let drag = null;
let frame = 0;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function renderSphere() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const spreadX = Math.min(width * .36, 235);
  const spreadY = Math.min(height * .29, 242);
  const photoFactor = clamp(width / 1440 * .68, .53, .7);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  sphere.forEach((photo, index) => {
    const x = photo.x * cosYaw + photo.z * sinYaw;
    const z = -photo.x * sinYaw + photo.z * cosYaw;
    const y = photo.y * cosPitch - z * sinPitch;
    const depth = photo.y * sinPitch + z * cosPitch;
    const perspective = .87 + depth * .15;
    const scale = .68 + (depth + 1) * .19 + (hovered === index ? .27 : 0);
    const offsetX = x * spreadX * perspective;
    const offsetY = y * spreadY * perspective;
    photo.button.style.setProperty('--photo-width', (photo.size * photoFactor).toFixed(1) + 'px');
    photo.button.style.transform = 'translate(-50%, -50%) translate3d(' +
      offsetX.toFixed(1) + 'px,' + offsetY.toFixed(1) + 'px,0) scale(' +
      scale.toFixed(3) + ') rotateY(' + (-x * 11).toFixed(1) +
      'deg) rotateX(' + (y * 8).toFixed(1) + 'deg)';
    photo.button.style.opacity = (hovered === index ? 1 : clamp((depth + .55) * 5, 0, 1)).toFixed(3);
    photo.button.style.zIndex = hovered === index ? 80 : Math.round((depth + 1) * 24);
    photo.button.style.pointerEvents = depth < -.34 ? 'none' : 'auto';
    photo.button.tabIndex = depth < -.34 ? -1 : 0;
  });
}

function animateSphere() {
  if (reduceMotion.matches) {
    yaw = targetYaw;
    pitch = targetPitch;
  } else {
    yaw += (targetYaw - yaw) * .115;
    pitch += (targetPitch - pitch) * .115;
  }
  renderSphere();
  if (Math.abs(targetYaw - yaw) + Math.abs(targetPitch - pitch) > .0005) {
    frame = requestAnimationFrame(animateSphere);
  } else {
    frame = 0;
  }
}
function scheduleSphere() { if (!frame) frame = requestAnimationFrame(animateSphere); }

stage.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.sphere-photo')) return;
  event.preventDefault();
  drag = { x: event.clientX, y: event.clientY, yaw: targetYaw, pitch: targetPitch, id: event.pointerId };
  stage.setPointerCapture(event.pointerId);
  stage.classList.add('is-dragging');
});
stage.addEventListener('pointermove', (event) => {
  const rect = stage.getBoundingClientRect();
  if (drag) {
    targetYaw = drag.yaw + (event.clientX - drag.x) * .0045;
    targetPitch = clamp(drag.pitch - (event.clientY - drag.y) * .005, -1.15, 1.15);
  } else if (finePointer.matches && !event.target.closest('.sphere-photo')) {
    targetYaw = baseYaw + ((event.clientX - rect.left) / rect.width - .5) * .86;
    targetPitch = clamp(basePitch + ((event.clientY - rect.top) / rect.height - .5) * .36, -1.15, 1.15);
  }
  scheduleSphere();
});
function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  baseYaw = targetYaw;
  basePitch = targetPitch;
  drag = null;
  stage.classList.remove('is-dragging');
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('pointerleave', () => { hovered = null; scheduleSphere(); });
stage.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  targetYaw += event.key === 'ArrowLeft' ? -.28 : event.key === 'ArrowRight' ? .28 : 0;
  targetPitch = clamp(targetPitch + (event.key === 'ArrowUp' ? .2 : event.key === 'ArrowDown' ? -.2 : 0), -1.15, 1.15);
  baseYaw = targetYaw;
  basePitch = targetPitch;
  scheduleSphere();
});
sphere.forEach(({ button }, index) => {
  button.addEventListener('pointerenter', () => {
    hovered = index;
    targetYaw = yaw;
    targetPitch = pitch;
    renderSphere();
  });
  button.addEventListener('pointerleave', () => { if (hovered === index) hovered = null; renderSphere(); });
  button.addEventListener('focus', () => { hovered = index; renderSphere(); });
  button.addEventListener('blur', () => { if (hovered === index) hovered = null; renderSphere(); });
  button.addEventListener('click', () => { previousFocus = button; showImage(sphereItems, index); });
});
new ResizeObserver(renderSphere).observe(stage);
renderSphere();

const lightbox = document.querySelector('#lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxCaption = lightbox.querySelectorAll('figcaption span');
let activeItems = projectItems;
let activeIndex = 0;
let previousFocus = null;

function showImage(items, index) {
  activeItems = items;
  activeIndex = (index + items.length) % items.length;
  const item = items[activeIndex];
  lightboxImage.src = item.full || item.src;
  lightboxImage.alt = item.alt;
  lightboxCaption[0].textContent = item.title;
  lightboxCaption[1].textContent = item.credit;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  lightbox.querySelector('.lightbox-close').focus();
}

function closeImage() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  previousFocus?.focus();
}

projects.forEach((project, index) => {
  project.tabIndex = 0;
  project.setAttribute('role', 'button');
  project.setAttribute('aria-label', `View ${project.querySelector('.caption span').textContent}`);
  project.addEventListener('click', () => { previousFocus = project; showImage(projectItems, index); });
  project.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      previousFocus = project;
      showImage(projectItems, index);
    }
  });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', closeImage);
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showImage(activeItems, activeIndex - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => showImage(activeItems, activeIndex + 1));
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeImage(); });
document.addEventListener('keydown', (event) => {
  if (lightbox.hidden) return;
  if (event.key === 'Escape') closeImage();
  if (event.key === 'ArrowLeft') showImage(activeItems, activeIndex - 1);
  if (event.key === 'ArrowRight') showImage(activeItems, activeIndex + 1);
});

