"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const FEEDBACK_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
].join(",");

function canShowFeedback(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element.closest("[data-no-click-feedback]")) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;
  if ("disabled" in element && Boolean((element as HTMLButtonElement).disabled)) return false;
  return true;
}

function clearFeedback(element: HTMLElement) {
  window.clearTimeout(Number(element.dataset.clickFeedbackTimer ?? 0));
  delete element.dataset.clickFeedback;
  delete element.dataset.clickFeedbackTimer;
}

export function ClickFeedback() {
  const pathname = usePathname();

  useEffect(() => {
    const active = new Set<HTMLElement>();

    function showFeedback(event: Event) {
      const target = event.target instanceof Element
        ? event.target.closest(FEEDBACK_SELECTOR)
        : null;

      if (!target || !canShowFeedback(target)) return;

      clearFeedback(target);
      active.add(target);
      target.dataset.clickFeedback = "true";

      const isNavigation = target instanceof HTMLAnchorElement || target.closest("form");
      const timeout = window.setTimeout(
        () => {
          clearFeedback(target);
          active.delete(target);
        },
        isNavigation ? 3600 : 1100,
      );

      target.dataset.clickFeedbackTimer = String(timeout);
    }

    function clearAll() {
      active.forEach(clearFeedback);
      active.clear();
    }

    document.addEventListener("click", showFeedback, true);
    window.addEventListener("pagehide", clearAll);
    return () => {
      document.removeEventListener("click", showFeedback, true);
      window.removeEventListener("pagehide", clearAll);
      clearAll();
    };
  }, []);

  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>("[data-click-feedback]")
      .forEach(clearFeedback);
  }, [pathname]);

  return null;
}
