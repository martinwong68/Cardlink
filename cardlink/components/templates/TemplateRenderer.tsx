"use client";

import { type TemplateId } from "@/src/lib/templates";
import type { TemplateRendererProps } from "./types";
import ClassicBusinessTemplate from "./ClassicBusinessTemplate";
import MinimalistTemplate from "./MinimalistTemplate";
import ModernTechTemplate from "./ModernTechTemplate";

export type { TemplateRendererProps };

export default function TemplateRenderer(props: TemplateRendererProps) {
  const { template } = props;

  switch (template) {
    case "classic-business":
      return <ClassicBusinessTemplate {...props} />;
    case "minimalist":
      return <MinimalistTemplate {...props} />;
    case "modern-tech":
      return <ModernTechTemplate {...props} />;
    default:
      return <ClassicBusinessTemplate {...props} />;
  }
}
