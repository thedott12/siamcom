const compactNavigation = matchMedia("(max-width: 980px)");
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
const coverPortrait = document.querySelector("[data-cover-portrait]");
const coverLandscape = document.querySelector("[data-cover-landscape]");
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

function setCoverImage(target, original) {
  const image = document.querySelector(`.gallery-${original}`);
  target.src = image.src;
  target.alt = image.alt;
  target.width = image.width;
  target.height = image.height;
}

for (const [index, button] of coverMarkers.entries()) {
  button.addEventListener("click", () => {
    const [landscape, portrait] = coverPairs[index];
    setCoverImage(coverLandscape, landscape);
    setCoverImage(coverPortrait, portrait);
    coverPortrait.toggleAttribute("data-contain", portrait !== "training");
    coverLandscape.toggleAttribute("data-contain", landscape === "workshop" || landscape === "team");
    setCurrent(coverMarkers, index);
    coverStatus.textContent = `${button.getAttribute("aria-label")}. ${coverLandscape.alt}. ${coverPortrait.alt}.`;
  });
}

const carousel = document.querySelector(".carousel");
const courseImages = [...carousel.querySelectorAll("[data-course-image]")];
const courseMarkers = [...carousel.querySelectorAll("[data-course-slide]")];
const courseStatus = carousel.querySelector("[data-course-status]");
const rotation = carousel.querySelector("[data-course-rotation]");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let activeCourse = 0;
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

  timer = setTimeout(() => {
    showCourseSlide(activeCourse + 1);
    scheduleCourseRotation();
  }, 5000);
}

function showCourseSlide(index, announce = false) {
  activeCourse = (index + courseImages.length) % courseImages.length;
  for (const [imageIndex, image] of courseImages.entries()) {
    image.hidden = imageIndex !== activeCourse;
  }
  setCurrent(courseMarkers, activeCourse);
  if (announce) courseStatus.textContent = courseImages[activeCourse].alt;
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
  button.addEventListener("click", () => selectCourseSlide(activeCourse + Number(button.dataset.courseStep)));
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
    selectCourseSlide(activeCourse - Math.sign(horizontal));
  }
});

rotation.addEventListener("click", () => setRotation(!rotationEnabled));
reducedMotion.addEventListener("change", () => setRotation(!reducedMotion.matches));
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
