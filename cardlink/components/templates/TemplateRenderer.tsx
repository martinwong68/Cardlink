"use client";

import type { TemplateRendererProps } from "./types";
import ClassicBusinessTemplate from "./ClassicBusinessTemplate";

export type { TemplateRendererProps };

export default function TemplateRenderer(props: TemplateRendererProps) {
  return <ClassicBusinessTemplate {...props} />;
}
