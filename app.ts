type GalleryKey = "2f" | "3f" | "others";

type GallerySet = {
  main: string;
  left: string;
  right: string;
  alt: [string, string, string];
};

const galleryImages: Record<GalleryKey, GallerySet> = {
  "2f": {
    main: "./assets/lulla/gallery-2f-main.png",
    left: "./assets/lulla/gallery-2f-left.png",
    right: "./assets/lulla/gallery-2f-right.png",
    alt: ["2F main room", "2F bedroom", "2F floor plan"],
  },
  "3f": {
    main: "./assets/lulla/gallery-3f-main.png?v=20260817-gallery-3f",
    left: "./assets/lulla/gallery-3f-left.png?v=20260817-gallery-3f",
    right: "./assets/lulla/gallery-3f-right.png?v=20260817-gallery-3f",
    alt: ["3F main room", "3F bedroom", "3F floor plan"],
  },
  others: {
    main: "./assets/lulla/gallery-others-main.png?v=20260817-gallery-others",
    left: "./assets/lulla/gallery-others-left.png?v=20260817-gallery-others",
    right: "./assets/lulla/gallery-others-right.png?v=20260817-gallery-others",
    alt: ["LULLA exterior", "Bathroom vanity", "Bath with ocean view"],
  },
};

const loaderStartedAt = performance.now();
const loadingOverlay = document.querySelector<HTMLElement>(".loading-overlay");
const loadingDuration = 5400;

function finishLoadingAnimation() {
  document.body.classList.remove("is-loading");
  loadingOverlay?.remove();
}

function scheduleLoadingFinish() {
  const elapsed = performance.now() - loaderStartedAt;
  window.setTimeout(finishLoadingAnimation, Math.max(0, loadingDuration - elapsed));
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  finishLoadingAnimation();
} else {
  window.addEventListener("load", scheduleLoadingFinish, { once: true });
  window.setTimeout(finishLoadingAnimation, loadingDuration + 900);
}

const galleryGrid = document.querySelector<HTMLElement>(".gallery-grid");
const galleryMain = document.querySelector<HTMLImageElement>("[data-gallery-main]");
const galleryLeft = document.querySelector<HTMLImageElement>("[data-gallery-left]");
const galleryRight = document.querySelector<HTMLImageElement>("[data-gallery-right]");
const fv = document.querySelector<HTMLElement>(".fv");
const fvStage = document.querySelector<HTMLElement>(".fv-stage");
const messageSection = document.querySelector<HTMLElement>(".invitation-section");
const parallaxSections = document.querySelectorAll<HTMLElement>(".parallax-bg");
const revealElements = document.querySelectorAll<HTMLElement>(".reveal-on-scroll");
let isSnappingFromFirstView = false;
let frozenFirstViewHeight: number | null = null;
let touchStartY = 0;
let parallaxFrame = 0;
let revealFrame = 0;

function cssNumber(element: Element, property: string) {
  return Number.parseFloat(getComputedStyle(element).getPropertyValue(property));
}

function clampStageOffset(offset: number, viewportSize: number, stageSize: number) {
  if (stageSize <= viewportSize) return (viewportSize - stageSize) / 2;
  return Math.min(0, Math.max(viewportSize - stageSize, offset));
}

function layoutFirstView() {
  if (!fv || !fvStage) return;
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const fullViewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const reserveHeight = cssNumber(document.documentElement, "--footer-space") || 0;
  const viewportHeight = frozenFirstViewHeight ?? Math.max(1, fullViewportHeight - reserveHeight);
  fv.style.height = `${viewportHeight}px`;
  const stageWidth = cssNumber(fv, "--fv-stage-width");
  const stageHeight = cssNumber(fv, "--fv-stage-height");
  const cardCenterX = cssNumber(fv, "--fv-card-center-x");
  const cardCenterY = cssNumber(fv, "--fv-card-center-y");
  const scale = Math.max(viewportWidth / stageWidth, viewportHeight / stageHeight);
  const stageRenderedWidth = stageWidth * scale;
  const stageRenderedHeight = stageHeight * scale;
  const centeredX = viewportWidth / 2 - cardCenterX * scale;
  const centeredY = viewportHeight / 2 - cardCenterY * scale;
  const x = clampStageOffset(centeredX, viewportWidth, stageRenderedWidth);
  const y = clampStageOffset(centeredY, viewportHeight, stageRenderedHeight);
  fv.style.setProperty("--fv-stage-scale", String(scale));
  fv.style.setProperty("--fv-stage-x", `${x}px`);
  fv.style.setProperty("--fv-stage-y", `${y}px`);
}

layoutFirstView();
window.addEventListener("load", layoutFirstView);
window.addEventListener("resize", layoutFirstView);
window.visualViewport?.addEventListener("resize", layoutFirstView);

function getMessageTop() {
  if (!messageSection) return 0;
  return messageSection.getBoundingClientRect().top + window.scrollY;
}

function shouldSnapFromFirstView(deltaY: number) {
  if (!fv || !messageSection || isSnappingFromFirstView || deltaY <= 0) return false;
  const messageTop = getMessageTop();
  return window.scrollY < messageTop - 8;
}

function snapToMessageSection() {
  if (!fv || !messageSection) return;
  isSnappingFromFirstView = true;
  frozenFirstViewHeight = fv.getBoundingClientRect().height;
  layoutFirstView();
  window.scrollTo({ top: getMessageTop(), behavior: "smooth" });
  window.setTimeout(() => {
    isSnappingFromFirstView = false;
    frozenFirstViewHeight = null;
    layoutFirstView();
    window.scrollTo({ top: getMessageTop(), behavior: "auto" });
  }, 900);
}

window.addEventListener("wheel", (event) => {
  if (!shouldSnapFromFirstView(event.deltaY)) return;
  if (event.cancelable) event.preventDefault();
  snapToMessageSection();
}, { passive: false });

window.addEventListener("touchstart", (event) => {
  touchStartY = event.touches[0]?.clientY ?? 0;
}, { passive: true });

window.addEventListener("touchmove", (event) => {
  const currentY = event.touches[0]?.clientY ?? touchStartY;
  const deltaY = touchStartY - currentY;
  if (!shouldSnapFromFirstView(deltaY)) return;
  if (event.cancelable) event.preventDefault();
  snapToMessageSection();
}, { passive: false });

function updateParallaxBackgrounds() {
  parallaxFrame = 0;
  const viewportHeight = window.innerHeight || 1;
  parallaxSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const progress = (rect.top + rect.height / 2 - viewportHeight / 2) / (viewportHeight + rect.height);
    const offset = Math.max(-80, Math.min(80, progress * -160));
    section.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
  });
}

function requestParallaxUpdate() {
  if (parallaxFrame) return;
  parallaxFrame = window.requestAnimationFrame(updateParallaxBackgrounds);
}

updateParallaxBackgrounds();
window.addEventListener("load", updateParallaxBackgrounds);
window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
window.addEventListener("resize", requestParallaxUpdate);
window.visualViewport?.addEventListener("resize", requestParallaxUpdate);

function updateRevealElements() {
  revealFrame = 0;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const triggerY = viewportHeight * 0.78;
  const nearPageEnd = window.scrollY + viewportHeight >= document.documentElement.scrollHeight - 24;
  revealElements.forEach((element) => {
    if (element.classList.contains("is-visible")) return;
    if (element.getBoundingClientRect().top <= triggerY || nearPageEnd) {
      element.classList.add("is-visible");
    }
  });
}

function requestRevealUpdate() {
  if (revealFrame) return;
  revealFrame = window.requestAnimationFrame(updateRevealElements);
}

updateRevealElements();
window.addEventListener("load", updateRevealElements);
window.addEventListener("scroll", requestRevealUpdate, { passive: true });
window.addEventListener("resize", requestRevealUpdate);
window.visualViewport?.addEventListener("resize", requestRevealUpdate);

document.querySelectorAll<HTMLButtonElement>("[data-gallery-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const key = tab.dataset.galleryTab as GalleryKey | undefined;
    const nextImages = key ? galleryImages[key] : null;
    if (!galleryGrid || !galleryMain || !galleryLeft || !galleryRight || !nextImages || tab.classList.contains("is-active")) return;

    document.querySelectorAll<HTMLButtonElement>("[data-gallery-tab]").forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    galleryGrid.classList.add("is-fading");
    window.setTimeout(() => {
      galleryMain.src = nextImages.main;
      galleryLeft.src = nextImages.left;
      galleryRight.src = nextImages.right;
      galleryMain.alt = nextImages.alt[0];
      galleryLeft.alt = nextImages.alt[1];
      galleryRight.alt = nextImages.alt[2];
      galleryGrid.classList.remove("is-fading");
    }, 240);
  });
});

document.querySelectorAll<HTMLButtonElement>(".accordion-item").forEach((item) => {
  item.addEventListener("click", () => {
    const isOpen = item.getAttribute("aria-expanded") === "true";
    item.setAttribute("aria-expanded", String(!isOpen));
    const marker = item.querySelector<HTMLElement>("b");
    if (!marker) return;
    marker.textContent = item.classList.contains("access-item")
      ? isOpen ? "▽" : "△"
      : isOpen ? "+" : "-";
  });
});
