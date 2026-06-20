"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Z, type LayerKey } from "@/lib/layers";

interface LayeredPortalProps {
  /** Which layer this content belongs to. See `Z` in `@/lib/layers`. */
  level: LayerKey;
  /** Whether the portal should also cover the dynamic safe-area insets. */
  children: ReactNode;
  /**
   * Optional id on the wrapping div. If provided, components above can
   * `document.getElementById` it for stacking tests.
   */
  id?: string;
}

/**
 * Renders children into a fixed-positioned container at the given z-layer.
 *
 * The container uses inline `z-index` derived from `Z[level]`, so it
 * participates in the documented layer ordering and never collides with
 * another component using the same system.
 *
 * IMPORTANT: this is a thin wrapper around `createPortal`. The actual
 * portal target is `document.body` — place the provider as high as
 * possible in the React tree (typically in the root layout) for it to work.
 */
export function LayeredPortal({ level, children, id }: LayeredPortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div id={id} data-edyfra-layer={level} style={{ zIndex: Z[level] }}>
      {children}
    </div>,
    document.body,
  );
}
