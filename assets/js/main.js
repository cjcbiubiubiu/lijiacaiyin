const CONTACTS = {
  default: { phone: "17786885315", qr: "assets/images/wxcode/jun.png" },
  zhb:     { phone: "17786885315", qr: "assets/images/wxcode/zhb.png" },
  zjy:     { phone: "13042061151", qr: "assets/images/wxcode/jun.png" },
  cjc:     { phone: "17677438121", qr: "assets/images/wxcode/cjc.jpg" }
};

function getContactByCode() {
  const code = new URLSearchParams(location.search).get("code")?.toLowerCase();
  return CONTACTS[code] || CONTACTS.default;
}

function applyContact(contact) {
  // 1) 所有 tel: 链接的号码
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    a.setAttribute("href", `tel:${contact.phone}`);
    // 纯号码文本同步更新，避免显示旧号码
    if (/^\d[\d\s-]*$/.test(a.textContent.trim())) {
      a.textContent = contact.phone;
    }
  });

  // 2) 页脚地址里电话链接文本
  document.querySelectorAll(".footer-contact address a[href^='tel:']").forEach((a) => {
    a.textContent = contact.phone;
  });

  // 3) 微信二维码图片
  const qrImg = document.querySelector("#wechat-dialog .qr-placeholder img");
  if (qrImg) {
    qrImg.src = contact.qr;
    qrImg.alt = "微信二维码";
  }

  // 4) 记录当前 code，便于调试/统计
  const code = new URLSearchParams(location.search).get("code") || "default";
  document.body.dataset.contactCode = code;
}

// 脚本是 defer，DOM 已就绪，直接执行
applyContact(getContactByCode());

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

const photoDialog = document.getElementById("photo-dialog");

if (photoDialog) {
  const photoDialogImage = document.getElementById("photo-dialog-image");
  const photoZoom = document.getElementById("photo-zoom");

  let scale = 1;
  let minScale = 1;
  let maxScale = 4;
  let translateX = 0;
  let translateY = 0;

  function applyTransform() {
    photoDialogImage.style.transform =
      `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    photoZoom.classList.toggle("is-zoomed", scale > 1.01);
  }

  function resetTransform() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  }

  // 滚轮缩放（以鼠标位置为中心）
  photoZoom.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      const rect = photoZoom.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;

      const delta = event.deltaY > 0 ? -0.12 : 0.12;
      const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
      if (newScale === scale) return;

      // 让缩放围绕鼠标位置
      const ratio = newScale / scale;
      translateX = offsetX - (offsetX - translateX) * ratio;
      translateY = offsetY - (offsetY - translateY) * ratio;
      scale = newScale;

      applyTransform();
    },
    { passive: false }
  );

  // 拖动平移
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;

  photoZoom.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startTranslateX = translateX;
    startTranslateY = translateY;
    photoZoom.classList.add("is-dragging");
    photoZoom.setPointerCapture(event.pointerId);
  });

  photoZoom.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    translateX = startTranslateX + (event.clientX - startX);
    translateY = startTranslateY + (event.clientY - startY);
    applyTransform();
  });

  function stopDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    photoZoom.classList.remove("is-dragging");
    if (event.pointerId != null && photoZoom.hasPointerCapture(event.pointerId)) {
      photoZoom.releasePointerCapture(event.pointerId);
    }
  }

  photoZoom.addEventListener("pointerup", stopDrag);
  photoZoom.addEventListener("pointercancel", stopDrag);
  photoZoom.addEventListener("pointerleave", stopDrag);

  // 双击复位
  photoZoom.addEventListener("dblclick", () => {
    resetTransform();
  });

  // 打开大图时重置缩放
  document.querySelectorAll("[data-factory-photo]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const image = trigger.querySelector("img");
      if (!image) return;

      resetTransform();
      photoDialogImage.src = image.currentSrc || image.src;
      photoDialogImage.alt = image.alt || "工厂实拍大图";

      // 等待图片加载后重置一次，避免尺寸变化导致偏移
      photoDialogImage.decode?.().catch(() => {}).finally(resetTransform);

      showDialog(photoDialog, trigger);
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