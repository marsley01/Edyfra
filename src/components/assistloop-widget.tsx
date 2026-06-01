"use client";

import Script from "next/script";

export function AssistLoopWidget() {
  return (
    <Script
      src="https://assistloop.ai/assistloop-widget.js"
      strategy="afterInteractive"
      onLoad={() => {
        (window as any).AssistLoopWidget.init({
          agentId: "61719134-d7b6-4998-9750-c92b8b6dca1b",
        });
      }}
    />
  );
}
