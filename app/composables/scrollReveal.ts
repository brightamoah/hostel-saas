import type { ComponentPublicInstance } from "vue";

export function useScrollReveal(scrollOptions?: {
  threshold?: number;
  rootMargin?: string;
  stagger?: boolean;
  once?: boolean;
}) {
  const {
    threshold = 0.12,
    rootMargin = "0px 0px -60px 0px",
    stagger = false,
    once = true,
  } = scrollOptions ?? {};

  const revealRef = (el: Element | ComponentPublicInstance | null) => {
    if (!el || !(el instanceof Element)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");

          if (stagger) {
            const children = entry.target.querySelectorAll(".reveal-child");
            children.forEach((child, i) => {
              ; (child as HTMLElement).style.transitionDelay = `${i * 80}ms`;
              child.classList.add("is-visible");
            });
          }

          if (once) observer.unobserve(entry.target);
        }
        else if (!once) {
          entry.target.classList.remove("is-visible");
          if (stagger) {
            entry.target
              .querySelectorAll(".reveal-child")
              .forEach(c => c.classList.remove("is-visible"));
          }
        }
      });
    }, { threshold, rootMargin });

    observer.observe(el);
  };
  return { revealRef };
}
