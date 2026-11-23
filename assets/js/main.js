document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const nav = document.getElementById("site-nav");
const menuToggle = document.querySelector(".menu-toggle");
const desktop = window.matchMedia("(min-width: 64rem)");
const navTriggers = [...document.querySelectorAll(".nav-trigger")];

function setDropdown(trigger, isOpen) {
  const panel = document.getElementById(trigger.getAttribute("aria-controls"));
  trigger.setAttribute("aria-expanded", String(isOpen));
  panel.hidden = !isOpen;
}

function closeDropdowns(except) {
  navTriggers.forEach((trigger) => {
    if (trigger !== except) setDropdown(trigger, false);
  });
}

function setMobileMenu(isOpen) {
  nav.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "关闭导航菜单" : "打开导航菜单");

  if (!isOpen) closeDropdowns();
}

if (header && nav && menuToggle) {
  closeDropdowns();

  menuToggle.addEventListener("click", () => {
    setMobileMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  navTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      if (desktop.matches) closeDropdowns(trigger);
      setDropdown(trigger, !isOpen);
    });
  });

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    if (!link) return;
    const isMobile = !desktop.matches;
    setMobileMenu(false);

    // 折叠菜单后，将锚点导航的焦点移到目标区块。
    const href = link.getAttribute("href");
    if (href?.startsWith("#")) {
      const target = document.getElementById(href.slice(1));
      if (target) {
        if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    } else if (isMobile && href?.startsWith("tel:")) {
      menuToggle.focus();
    }
  });

  header.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const group = event.target.closest(".nav-group");
    const trigger = group?.querySelector('.nav-trigger[aria-expanded="true"]');

    if (trigger) {
      setDropdown(trigger, false);
      trigger.focus();
      event.preventDefault();
    } else if (!desktop.matches && nav.classList.contains("is-open")) {
      setMobileMenu(false);
      menuToggle.focus();
      event.preventDefault();
    }
  });

  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setMobileMenu(false);
  });

  desktop.addEventListener("change", () => {
    const focusWasInNav = nav.contains(document.activeElement);
    setMobileMenu(false);
    if (!desktop.matches && focusWasInNav) menuToggle.focus();
  });

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

const wechatDialog = document.getElementById("wechat-dialog");
const caseDialog = document.getElementById("case-dialog");

function showDialog(dialog, trigger) {
  if (!dialog || dialog.open) return;

  dialog.showModal();
  dialog.addEventListener("close", () => {
    if (trigger.getClientRects().length) trigger.focus();
  }, { once: true });
}

document.querySelectorAll("[data-wechat]").forEach((trigger) => {
  trigger.addEventListener("click", () => showDialog(wechatDialog, trigger));
});

if (caseDialog) {
  const dialogImage = document.getElementById("case-dialog-image");
  const fields = {
    "case-dialog-category": ".case-tag",
    "case-dialog-title": "h3",
    "case-dialog-industry": ".case-industry",
    "case-dialog-material": ".case-material",
    "case-dialog-lead": ".case-lead"
  };

  document.querySelectorAll("[data-case]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const card = trigger.closest(".case-card");
      const image = trigger.querySelector("img");
      dialogImage.src = image.getAttribute("src");
      dialogImage.alt = image.alt;

      Object.entries(fields).forEach(([id, selector]) => {
        document.getElementById(id).textContent = card.querySelector(selector).textContent;
      });

      showDialog(caseDialog, trigger);
    });
  });
}

document.querySelectorAll(".dialog").forEach((dialog) => {
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());

  // 内部留白也可能以 dialog 为点击目标，因此额外判断点击是否在边框外。
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;

    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right ||
        event.clientY < top || event.clientY > bottom) {
      dialog.close();
    }
  });
});

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const formatNumber = new Intl.NumberFormat("zh-CN");
  const duration = 1050;

  function animateStat(stat) {
    const finalText = stat.textContent.trim();
    const target = Number(finalText.replaceAll(",", ""));

    if (!Number.isSafeInteger(target) || target <= 0) return;

    // 保留最终数字供辅助技术读取，逐帧变化的数字仅用于视觉展示。
    const finalValue = document.createElement("span");
    finalValue.className = "stat-count-final";
    finalValue.textContent = finalText;

    const animatedValue = document.createElement("span");
    animatedValue.className = "stat-count-digit";
    animatedValue.setAttribute("aria-hidden", "true");
    animatedValue.textContent = "0";

    stat.replaceChildren(finalValue, animatedValue);
    stat.classList.add("is-counting");

    let startedAt;

    function update(timestamp) {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);

      if (progress >= 1 || reducedMotion.matches) {
        stat.classList.remove("is-counting");
        animatedValue.remove();
        return;
      }

      // 前段较快，接近目标值时减速。
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = formatNumber.format(Math.floor(target * eased));

      if (animatedValue.textContent !== nextValue) {
        animatedValue.textContent = nextValue;
      }

      requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;

      observer.unobserve(target);
      if (reducedMotion.matches) return;

      if (target.matches(".factory-stats")) {
        target.querySelectorAll("[data-count]").forEach(animateStat);
      } else {
        target.classList.add("has-entered");
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll([
    ".factory-stats",
    ".product-grid > .card",
    ".case-grid > .case-card",
    ".process-list > li",
    ".trust-grid > .trust-card"
  ].join(", ")).forEach((element) => observer.observe(element));
})();