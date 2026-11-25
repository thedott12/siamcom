const compactNavigation = matchMedia("(max-width: 980px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const menuButton = document.querySelector(".menu-toggle");
const menu = document.querySelector("#site-menu");

function closeMenu(restoreFocus = false) {
  if (menuButton.getAttribute("aria-expanded") !== "true") return;
  menuButton.setAttribute("aria-expanded", "false");
  if (restoreFocus && compactNavigation.matches) menuButton.focus();
}

menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
});
compactNavigation.addEventListener("change", () => closeMenu());
document.addEventListener("click", (event) => {
  if (!menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu(true);
});
menu.addEventListener("focusout", (event) => {
  if (event.relatedTarget && !menu.contains(event.relatedTarget) && event.relatedTarget !== menuButton) {
    closeMenu();
  }
});

const notice = document.querySelector("#announcement");
const noticeTrigger = document.querySelector(".announcement-trigger");
const noticeStorageKey = "siamcom-announcement-25907";

if (typeof notice.showModal === "function") {
  noticeTrigger.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeMenu(true);
    notice.showModal();
  });

  if (!("closedBy" in notice)) {
    let pressedOutside = false;
    const outside = ({ clientX, clientY }) => {
      const { top, right, bottom, left } = notice.getBoundingClientRect();
      return clientX < left || clientX > right || clientY < top || clientY > bottom;
    };
    notice.addEventListener("pointerdown", (event) => {
      pressedOutside = event.target === notice && outside(event);
    });
    notice.addEventListener("click", (event) => {
      if (pressedOutside && event.target === notice && outside(event)) notice.close();
      pressedOutside = false;
    });
  }

  let firstVisit = true;
  try {
    firstVisit = !sessionStorage.getItem(noticeStorageKey);
  } catch {
    // The notice remains available through Click it! when storage is disabled.
  }

  if (firstVisit) {
    document.querySelector(".logo").focus({ preventScroll: true });
    notice.showModal();
    try {
      sessionStorage.setItem(noticeStorageKey, "seen");
    } catch {
      // Browsers that restrict storage can still display and reopen the notice.
    }
  }
}

if (document.documentElement.lang === "th") {
  const curriculum = document.querySelector("#curriculum");
  const smartOffice = document.querySelector("#smart-office");

  function arrangeCourseSections() {
    if (compactNavigation.matches) {
      smartOffice.before(curriculum);
    } else {
      curriculum.before(smartOffice);
    }
  }

  arrangeCourseSections();
  compactNavigation.addEventListener("change", arrangeCourseSections);
}

const coverMarkers = [...document.querySelectorAll("[data-cover-slide]")];
let coverPortrait = document.querySelector("[data-cover-portrait]");
let coverLandscape = document.querySelector("[data-cover-landscape]");
const coverStatus = document.querySelector("[data-cover-status]");
const coverPairs = [
  ["workshop", "team"],
  ["team", "classroom"],
  ["group", "workshop"],
  ["classroom", "training"],
];

function setCurrent(buttons, current) {
  for (const [index, button] of buttons.entries()) {
    if (index === current) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
}

async function loadPicture(source) {
  const image = new Image(Number(source.getAttribute("width")), Number(source.getAttribute("height")));
  image.alt = source.alt;
  if (source.lang) image.lang = source.lang;
  image.src = source.src;

  if (typeof image.decode !== "function") return image;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

const pictureFades = new Set();

function swapPicture(previous, next, imageAttribute) {
  const frame = previous.parentElement;
  next.setAttribute(imageAttribute, "");
  if (reducedMotion.matches || typeof next.animate !== "function") {
    frame.replaceChildren(next);
    return next;
  }

  const outgoing = [...frame.children];
  previous.removeAttribute(imageAttribute);
  previous.setAttribute("aria-hidden", "true");
  frame.append(next);

  // Older layers remain beneath an interrupted fade until the new image covers them.
  const fade = next.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 260,
    easing: "cubic-bezier(.22, 1, .36, 1)",
  });
  pictureFades.add(fade);
  fade.onfinish = fade.oncancel = () => {
    pictureFades.delete(fade);
    for (const image of outgoing) image.remove();
  };
  return next;
}

let displayedCover = coverMarkers.findIndex((button) => button.hasAttribute("aria-current"));
let coverRequest = 0;

async function selectCoverPair(index, button) {
  const request = ++coverRequest;
  if (index === displayedCover) return;

  const [landscape, portrait] = coverPairs[index];
  const [nextLandscape, nextPortrait] = await Promise.all([
    loadPicture(document.querySelector(`.gallery-${landscape}`)),
    loadPicture(document.querySelector(`.gallery-${portrait}`)),
  ]);
  if (request !== coverRequest || !nextLandscape || !nextPortrait) return;

  nextPortrait.toggleAttribute("data-contain", portrait !== "training");
  nextLandscape.toggleAttribute("data-contain", landscape === "workshop" || landscape === "team");
  coverPortrait = swapPicture(coverPortrait, nextPortrait, "data-cover-portrait");
  coverLandscape = swapPicture(coverLandscape, nextLandscape, "data-cover-landscape");
  displayedCover = index;
  setCurrent(coverMarkers, index);
  coverStatus.textContent = `${button.getAttribute("aria-label")}. ${coverLandscape.alt}. ${coverPortrait.alt}.`;
}

for (const [index, button] of coverMarkers.entries()) {
  button.addEventListener("click", () => selectCoverPair(index, button));
}

const carousel = document.querySelector(".carousel");
const courseImages = [...carousel.querySelectorAll("[data-course-image]")];
const courseMarkers = [...carousel.querySelectorAll("[data-course-slide]")];
const courseStatus = carousel.querySelector("[data-course-status]");
const rotation = carousel.querySelector("[data-course-rotation]");
let activeCourse = 0;
let requestedCourse = activeCourse;
let displayedCourseImage = courseImages[activeCourse];
let courseRequest = 0;
let rotationEnabled = !reducedMotion.matches;
let carouselVisible = false;
let timer;

function updateRotationButton() {
  rotation.toggleAttribute("data-playing", rotationEnabled);
  rotation.setAttribute("aria-label", rotationEnabled ? rotation.dataset.pause : rotation.dataset.play);
}

function scheduleCourseRotation() {
  clearTimeout(timer);
  if (
    !rotationEnabled ||
    notice.open ||
    !carouselVisible ||
    document.hidden ||
    carousel.matches(":hover, :focus-within")
  ) return;

  timer = setTimeout(async () => {
    await showCourseSlide(activeCourse + 1);
    scheduleCourseRotation();
  }, 5000);
}

async function showCourseSlide(index, announce = false) {
  const request = ++courseRequest;
  const nextCourse = (index + courseImages.length) % courseImages.length;
  requestedCourse = nextCourse;
  if (nextCourse === activeCourse) return;

  const next = await loadPicture(courseImages[nextCourse]);
  if (request !== courseRequest) return;
  if (!next || (!announce && !rotationEnabled)) {
    requestedCourse = activeCourse;
    return;
  }

  displayedCourseImage = swapPicture(displayedCourseImage, next, "data-course-image");
  activeCourse = nextCourse;
  setCurrent(courseMarkers, activeCourse);
  if (announce) courseStatus.textContent = next.alt;
}

function setRotation(enabled) {
  rotationEnabled = enabled;
  updateRotationButton();
  scheduleCourseRotation();
}

function selectCourseSlide(index) {
  showCourseSlide(index, true);
  setRotation(false);
}

for (const button of carousel.querySelectorAll("[data-course-step]")) {
  button.addEventListener("click", () => selectCourseSlide(requestedCourse + Number(button.dataset.courseStep)));
}
for (const [index, button] of courseMarkers.entries()) {
  button.addEventListener("click", () => selectCourseSlide(index));
}
const coursePictures = carousel.querySelector(".carousel-pictures");
let swipeStart;

coursePictures.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch" && event.isPrimary) {
    swipeStart = { x: event.clientX, y: event.clientY };
  }
});
coursePictures.addEventListener("pointercancel", () => {
  swipeStart = undefined;
});
coursePictures.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;
  const horizontal = event.clientX - swipeStart.x;
  const vertical = event.clientY - swipeStart.y;
  swipeStart = undefined;

  if (Math.abs(horizontal) > 40 && Math.abs(horizontal) > Math.abs(vertical)) {
    selectCourseSlide(requestedCourse - Math.sign(horizontal));
  }
});

rotation.addEventListener("click", () => setRotation(!rotationEnabled));
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    for (const fade of pictureFades) fade.finish();
    document.querySelector(".hero").removeAttribute("data-intro-motion");
    for (const section of document.querySelectorAll("[data-entry-motion]")) {
      section.removeAttribute("data-entry-motion");
    }
  }
  setRotation(!reducedMotion.matches);
});
carousel.addEventListener("pointerenter", scheduleCourseRotation);
carousel.addEventListener("pointerleave", scheduleCourseRotation);
carousel.addEventListener("focusin", scheduleCourseRotation);
carousel.addEventListener("focusout", () => setTimeout(scheduleCourseRotation, 0));
document.addEventListener("visibilitychange", scheduleCourseRotation);
notice.addEventListener("close", scheduleCourseRotation);
notice.addEventListener("toggle", scheduleCourseRotation);

const observer = new IntersectionObserver(([entry]) => {
  carouselVisible = entry.isIntersecting;
  scheduleCourseRotation();
}, { threshold: .25 });

observer.observe(carousel);
updateRotationButton();

function startPageMotion() {
  if (reducedMotion.matches) return;

  const hero = document.querySelector(".hero");
  const heroTop = hero.getBoundingClientRect().top;
  if (heroTop >= 0 && heroTop < window.innerHeight) hero.setAttribute("data-intro-motion", "");

  const revealObserver = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      revealObserver.unobserve(target);
      if (!reducedMotion.matches && !target.matches(":target, :focus-within")) {
        target.setAttribute("data-entry-motion", "");
      }
    }
  }, { rootMargin: "0px 0px 28px" });

  for (const section of document.querySelectorAll(".features, .curriculum, .smart, .assessment, .social, .gallery, .office")) {
    if (section.getBoundingClientRect().top >= window.innerHeight) revealObserver.observe(section);
  }
}

if (notice.open) notice.addEventListener("close", startPageMotion, { once: true });
else startPageMotion();

const map = document.querySelector("[data-map]");
const activateMap = map.querySelector(".map-activate");

activateMap.hidden = false;
activateMap.addEventListener("click", () => {
  const frame = document.createElement("iframe");
  frame.src = map.dataset.src;
  frame.title = map.dataset.title;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  map.replaceChildren(frame);
  frame.focus({ preventScroll: true });
});
